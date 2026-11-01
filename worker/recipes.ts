import { z } from 'zod';
import { HttpError, json, type Actor } from './security';
import { ownerOnly, p1Mutation, requestRange } from './p1-common';
import { addDays, utcStart } from './operations-domain';
import {
  ceilDivide,
  estimateRecipe,
  recipeSchema,
  safeQuantity,
  supplySchema,
  type CostComponent,
} from './recipe-domain';
interface Recipe {
  id: string;
  name: string;
  variant_id: string | null;
  yield_units: number;
  packaging_cents: number;
  labor_cents: number;
  overhead_cents: number;
  margin_bps: number;
  active: number;
  version: number;
  units_per_box: number | null;
  components: (CostComponent & { unit: string })[];
}
async function readRecipes(db: D1Database, org: string) {
  const rows = (
    await db
      .prepare(
        'SELECT r.id,r.name,r.variant_id,r.yield_units,r.packaging_cents,r.labor_cents,r.overhead_cents,r.margin_bps,r.active,r.version,v.units_per_box FROM recipes r LEFT JOIN product_variants v ON v.organization_id=r.organization_id AND v.id=r.variant_id WHERE r.organization_id=? ORDER BY r.active DESC,r.name LIMIT 201',
      )
      .bind(org)
      .all<Omit<Recipe, 'components'>>()
  ).results;
  if (rows.length > 200)
    throw new HttpError(409, 'Mais de 200 fichas; implemente paginação.');
  const components = (
    await db
      .prepare(
        'SELECT c.recipe_id,c.supply_id,c.quantity_milli,s.name,s.unit,s.pack_quantity_milli,s.pack_cost_cents,s.active AS supply_active FROM recipe_components c JOIN supplies s ON s.organization_id=c.organization_id AND s.id=c.supply_id WHERE c.organization_id=? AND c.recipe_id IN(SELECT value FROM json_each(?))',
      )
      .bind(org, JSON.stringify(rows.map((r) => r.id)))
      .all<CostComponent & { recipe_id: string; unit: string }>()
  ).results;
  return rows.map((r) => ({
    ...r,
    components: components.filter((c) => c.recipe_id === r.id),
  }));
}
export async function recipes(
  req: Request,
  db: D1Database,
  a: Actor,
  resource: string,
  id?: string,
) {
  const org = a.organization_id;
  if (id && !z.uuid().safeParse(id).success)
    throw new HttpError(404, 'Não encontrado.');
  if (req.method === 'GET') {
    if (resource === 'supplies') {
      const rows = (
        await db
          .prepare(
            'SELECT id,name,unit,pack_quantity_milli,pack_cost_cents,active,version FROM supplies WHERE organization_id=? ORDER BY active DESC,name LIMIT 501',
          )
          .bind(org)
          .all()
      ).results;
      if (rows.length > 500)
        throw new HttpError(409, 'Mais de 500 insumos; implemente paginação.');
      return json({ role: a.role, items: rows });
    }
    const rows = await readRecipes(db, org);
    if (resource === 'recipes')
      return json({
        role: a.role,
        items: rows.map((r) => ({
          ...r,
          estimate: estimateRecipe(r, r.components),
        })),
      });
    const { from, to } = requestRange(req, 30),
      demand = (
        await db
          .prepare(
            "SELECT i.variant_id,MIN(i.product_name||' — '||i.variant_label) AS name,SUM(i.quantity*i.units_per_box) AS units,COUNT(DISTINCT o.id) AS orders_count FROM order_items i JOIN orders o ON o.organization_id=i.organization_id AND o.id=i.order_id WHERE o.organization_id=? AND o.active=1 AND o.status IN('confirmed','in_production') AND o.due_at>=? AND o.due_at<? GROUP BY i.variant_id",
          )
          .bind(org, utcStart(from), utcStart(addDays(to, 1)))
          .all<{
            variant_id: string;
            name: string;
            units: number;
            orders_count: number;
          }>()
      ).results;
    if (demand.reduce((n, d) => n + d.orders_count, 0) > 1000)
      throw new HttpError(
        409,
        'Compras excedem 1000 linhas de pedido; reduza o período.',
      );
    const missing: string[] = [],
      batches: {
        recipe_id: string;
        name: string;
        needed_units: number;
        batches: number;
        produced_units: number;
      }[] = [],
      totals = new Map<
        string,
        {
          supply_id: string;
          name: string;
          unit: string;
          required_milli: number;
          pack_quantity_milli: number;
          pack_cost_cents: number | null;
          active: number;
        }
      >();
    for (const d of demand) {
      const recipe = rows.find(
        (r) => r.variant_id === d.variant_id && r.active,
      );
      if (!recipe) {
        missing.push('Sem ficha: ' + d.name);
        continue;
      }
      const count = safeQuantity(
        ceilDivide(BigInt(d.units), BigInt(recipe.yield_units)),
      );
      batches.push({
        recipe_id: recipe.id,
        name: recipe.name,
        needed_units: d.units,
        batches: count,
        produced_units: safeQuantity(
          BigInt(count) * BigInt(recipe.yield_units),
        ),
      });
      for (const c of recipe.components) {
        if (!c.supply_active) missing.push('Insumo inativo: ' + c.name);
        const previous = totals.get(c.supply_id) || {
          supply_id: c.supply_id,
          name: c.name,
          unit: c.unit,
          required_milli: 0,
          pack_quantity_milli: c.pack_quantity_milli,
          pack_cost_cents: c.pack_cost_cents,
          active: c.supply_active,
        };
        previous.required_milli = safeQuantity(
          BigInt(previous.required_milli) +
            BigInt(count) * BigInt(c.quantity_milli),
        );
        totals.set(c.supply_id, previous);
      }
    }
    const items = [...totals.values()].map((s) => {
      const packs = safeQuantity(
        ceilDivide(BigInt(s.required_milli), BigInt(s.pack_quantity_milli)),
      );
      return {
        ...s,
        packs,
        estimated_purchase_cents:
          s.pack_cost_cents === null || !s.active
            ? null
            : safeQuantity(BigInt(packs) * BigInt(s.pack_cost_cents)),
      };
    });
    return json({
      from,
      to,
      missing: [...new Set(missing)],
      batches,
      items,
      estimated_purchase_cents:
        missing.length || items.some((s) => s.estimated_purchase_cents === null)
          ? null
          : items.reduce((n, s) => n + s.estimated_purchase_cents!, 0),
    });
  }
  ownerOnly(a);
  if (
    !['POST', 'PUT'].includes(req.method) ||
    (req.method === 'PUT') !== !!id ||
    !['supplies', 'recipes'].includes(resource)
  )
    throw new HttpError(405, 'Método não permitido.');
  return p1Mutation(req, db, a, async (raw, nonce) => {
    const entity = id || crypto.randomUUID();
    if (resource === 'supplies') {
      const d = supplySchema.parse(raw);
      if (id && !d.version) throw new HttpError(400, 'Informe versão.');
      if (id) {
        const old = await db
          .prepare('SELECT unit FROM supplies WHERE organization_id=? AND id=?')
          .bind(org, id)
          .first<{ unit: string }>();
        if (!old) throw new HttpError(404, 'Insumo não encontrado.');
        if (
          old.unit !== d.unit &&
          (await db
            .prepare(
              'SELECT 1 FROM recipe_components WHERE organization_id=? AND supply_id=? LIMIT 1',
            )
            .bind(org, id)
            .first())
        )
          throw new HttpError(
            409,
            'Unidade em uso por ficha: crie outro insumo para trocar unidade.',
          );
      }
      return {
        table: 'supplies',
        id: entity,
        response: { id: entity },
        action: 'supply.saved',
        first: id
          ? db
              .prepare(
                'UPDATE supplies SET name=?,unit=?,pack_quantity_milli=?,pack_cost_cents=?,active=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
              )
              .bind(
                d.name,
                d.unit,
                d.pack_quantity_milli,
                d.pack_cost_cents,
                +d.active,
                nonce,
                org,
                entity,
                d.version,
              )
          : db
              .prepare(
                'INSERT INTO supplies(id,organization_id,name,unit,pack_quantity_milli,pack_cost_cents,active,mutation_id) VALUES(?,?,?,?,?,?,?,?)',
              )
              .bind(
                entity,
                org,
                d.name,
                d.unit,
                d.pack_quantity_milli,
                d.pack_cost_cents,
                +d.active,
                nonce,
              ),
        rest: () => [],
      };
    }
    const d = recipeSchema.parse(raw);
    if (id && !d.version) throw new HttpError(400, 'Informe versão.');
    if (
      d.variant_id &&
      !(await db
        .prepare(
          'SELECT 1 FROM product_variants WHERE organization_id=? AND id=?',
        )
        .bind(org, d.variant_id)
        .first())
    )
      throw new HttpError(400, 'Variante não pertence à organização.');
    const found = (
      await db
        .prepare(
          `SELECT id FROM supplies WHERE organization_id=? AND id IN(SELECT json_extract(value,'$.supply_id') FROM json_each(?))${d.active ? ' AND active=1' : ''}`,
        )
        .bind(org, JSON.stringify(d.components))
        .all()
    ).results;
    if (found.length !== d.components.length)
      throw new HttpError(400, 'Insumos ativos da organização obrigatórios.');
    return {
      table: 'recipes',
      id: entity,
      response: { id: entity },
      action: 'recipe.saved',
      first: id
        ? db
            .prepare(
              'UPDATE recipes SET name=?,variant_id=?,yield_units=?,packaging_cents=?,labor_cents=?,overhead_cents=?,margin_bps=?,active=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
            )
            .bind(
              d.name,
              d.variant_id,
              d.yield_units,
              d.packaging_cents,
              d.labor_cents,
              d.overhead_cents,
              d.margin_bps,
              +d.active,
              nonce,
              org,
              entity,
              d.version,
            )
        : db
            .prepare(
              'INSERT INTO recipes(id,organization_id,name,variant_id,yield_units,packaging_cents,labor_cents,overhead_cents,margin_bps,active,mutation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
            )
            .bind(
              entity,
              org,
              d.name,
              d.variant_id,
              d.yield_units,
              d.packaging_cents,
              d.labor_cents,
              d.overhead_cents,
              d.margin_bps,
              +d.active,
              nonce,
            ),
      rest: (g, args) => [
        db
          .prepare(
            `DELETE FROM recipe_components WHERE organization_id=? AND recipe_id=? AND ${g}`,
          )
          .bind(org, entity, ...args),
        db
          .prepare(
            `INSERT INTO recipe_components(organization_id,recipe_id,supply_id,quantity_milli) SELECT ?,?,json_extract(value,'$.supply_id'),json_extract(value,'$.quantity_milli') FROM json_each(?) WHERE ${g}`,
          )
          .bind(org, entity, JSON.stringify(d.components), ...args),
      ],
    };
  });
}
