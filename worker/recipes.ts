import {
  recipeBatchQuantity,
  type RecipeQuantityBasis,
} from '../shared/recipe-quantity';
import { weightCostingReady, weightSupplyInUse } from './weight-costing';
import { readKitItems } from './kit-order-items';
import { flavorLines, type FlavorLine } from './flavor-lines';
import { z } from 'zod';
import { recipeUnmeasuredReady } from './recipe-percent';
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
  product_id: string | null;
  weight_grams: number | null;
  yield_units: number;
  packaging_cents: number;
  labor_cents: number;
  overhead_cents: number;
  margin_bps: number;
  active: number;
  version: number;
  units_per_box: number | null;
  unmeasured_bps: number | null;
  components: (CostComponent & { unit: string })[];
}
async function recipeQuantityBasisReady(db: D1Database) {
  return !!(await db
    .prepare(
      "SELECT 1 FROM pragma_table_info('recipe_components') WHERE name='quantity_basis'",
    )
    .first());
}
export async function readRecipes(
  db: D1Database,
  org: string,
  options: { unmeasured?: boolean; basis?: boolean; lines?: FlavorLine[] } = {},
) {
  const { lines } = options;
  if (lines?.length === 0) return [];
  const ready = options.unmeasured ?? (await recipeUnmeasuredReady(db));
  const variantIds = lines
    ? [
        ...new Set(
          lines.filter((line) => !line.kit_id).map((line) => line.variant_id),
        ),
      ]
    : [];
  const kitWeights = lines
    ? [
        ...new Set(
          lines.flatMap((line) =>
            line.kit_id && line.product_id
              ? [JSON.stringify([line.product_id, line.weight_grams])]
              : [],
          ),
        ),
      ].map((pair) => JSON.parse(pair))
    : [];
  const scope = lines
    ? `AND r.active=1 AND (r.variant_id IN (SELECT value FROM json_each(?))
      OR r.variant_id IN (
        SELECT pv.id FROM json_each(?) k
        JOIN product_variants pv ON pv.organization_id=?
          AND pv.product_id=json_extract(k.value,'$[0]')
          AND pv.weight_grams=json_extract(k.value,'$[1]')
      ))`
    : '';
  const limit = lines ? 1000 : 200;
  const rows = (
    await db
      .prepare(
        `SELECT r.id,r.name,r.variant_id,r.yield_units,r.packaging_cents,r.labor_cents,r.overhead_cents,r.margin_bps,r.active,r.version,v.units_per_box,v.product_id,v.weight_grams,${ready ? 'r.unmeasured_bps' : 'NULL'} AS unmeasured_bps FROM recipes r LEFT JOIN product_variants v ON v.organization_id=r.organization_id AND v.id=r.variant_id WHERE r.organization_id=? ${scope} ORDER BY r.active DESC,r.name LIMIT ${limit + 1}`,
      )
      .bind(
        org,
        ...(lines
          ? [JSON.stringify(variantIds), JSON.stringify(kitWeights), org]
          : []),
      )
      .all<Omit<Recipe, 'components'>>()
  ).results;
  if (rows.length > limit)
    throw new HttpError(
      409,
      lines
        ? 'Mais de 1000 fichas no cálculo; reduza o período.'
        : 'Mais de 200 fichas; implemente paginação.',
    );
  if (!rows.length) return [];
  const basis = options.basis ?? (await recipeQuantityBasisReady(db));
  const components = (
    await db
      .prepare(
        `SELECT c.recipe_id,c.supply_id,c.quantity_milli,${basis ? 'c.quantity_basis' : "'batch'"} AS quantity_basis,s.name,s.unit,s.pack_quantity_milli,s.pack_cost_cents,s.active AS supply_active FROM recipe_components c JOIN supplies s ON s.organization_id=c.organization_id AND s.id=c.supply_id WHERE c.organization_id=? AND c.recipe_id IN(SELECT value FROM json_each(?))`,
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
    const [ready, basis] = await Promise.all([
      recipeUnmeasuredReady(db),
      recipeQuantityBasisReady(db),
    ]);
    const rows = await readRecipes(db, org, { unmeasured: ready, basis });
    if (resource === 'recipes')
      return json({
        role: a.role,
        unmeasured_supported: ready,
        quantity_basis_supported: basis,
        items: rows.map((r) => ({
          ...r,
          estimate: estimateRecipe(r, r.components),
        })),
      });
    const { from, to } = requestRange(req, 30);
    const orders = (
      await db
        .prepare(
          "SELECT id FROM orders WHERE organization_id=? AND active=1 AND status IN('confirmed','in_production') AND due_at>=? AND due_at<? LIMIT 1001",
        )
        .bind(org, utcStart(from), utcStart(addDays(to, 1)))
        .all<{ id: string }>()
    ).results;
    if (orders.length > 1000)
      throw new HttpError(
        409,
        'Compras excedem 1000 pedidos; reduza o período.',
      );
    const lines = await flavorLines(
      db,
      org,
      orders.map((o) => o.id),
    );
    const byVariant = new Map<
      string,
      {
        variant_id: string;
        product_id: string | null;
        weight_grams: number;
        kit: boolean;
        name: string;
        units: number;
        orders: Set<string>;
      }
    >();
    for (const line of lines) {
      const key = JSON.stringify([line.variant_id, line.weight_grams]);
      const d = byVariant.get(key) ?? {
        product_id: line.product_id,
        weight_grams: line.weight_grams,
        kit: !!line.kit_id,
        variant_id: line.variant_id,
        name: line.display_name,
        units: 0,
        orders: new Set<string>(),
      };
      d.units = safeQuantity(BigInt(d.units) + BigInt(line.units));
      d.orders.add(line.order_id);
      byVariant.set(key, d);
    }
    const demand = [...byVariant.values()];
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
      const candidates = rows.filter(
        (r) =>
          r.active &&
          (d.kit
            ? r.product_id === d.product_id && r.weight_grams === d.weight_grams
            : r.variant_id === d.variant_id),
      );
      const recipe =
        d.kit && candidates.length !== 1 ? undefined : candidates[0];
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
            BigInt(count) *
              BigInt(
                recipeBatchQuantity(
                  c.quantity_milli,
                  c.quantity_basis ?? 'batch',
                  recipe.yield_units,
                ),
              ),
        );
        totals.set(c.supply_id, previous);
      }
    }
    const kitItems = await readKitItems(
      db,
      org,
      orders.map((o) => o.id),
    );
    const packaging = kitItems.length
      ? (
          await db
            .prepare(
              'SELECT id,name,unit,pack_quantity_milli,pack_cost_cents,active FROM supplies WHERE organization_id=? AND id IN(SELECT value FROM json_each(?))',
            )
            .bind(
              org,
              JSON.stringify(kitItems.map((i) => i.packaging_supply_id)),
            )
            .all<{
              id: string;
              name: string;
              unit: string;
              pack_quantity_milli: number;
              pack_cost_cents: number | null;
              active: number;
            }>()
        ).results
      : [];
    for (const kit of kitItems) {
      const supply = packaging.find((s) => s.id === kit.packaging_supply_id);
      if (!supply || supply.unit !== 'unit') {
        missing.push(
          'Embalagem não informada: kit ' +
            kit.units_per_kit +
            ' · ' +
            kit.weight_grams +
            ' g',
        );
        continue;
      }
      if (!supply.active) missing.push('Insumo inativo: ' + supply.name);
      const previous = totals.get(supply.id);
      totals.set(supply.id, {
        supply_id: supply.id,
        name: supply.name,
        unit: supply.unit,
        pack_quantity_milli: supply.pack_quantity_milli,
        pack_cost_cents: supply.pack_cost_cents,
        active: supply.active,
        required_milli: safeQuantity(
          BigInt(previous?.required_milli ?? 0) + BigInt(kit.quantity) * 1000n,
        ),
      });
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
      const weightSchema = !!id && (await weightCostingReady(db));
      const stockSchema =
        id &&
        (await db
          .prepare(
            "SELECT 1 FROM sqlite_schema WHERE name='inventory_balances'",
          )
          .first());
      if (id && stockSchema) {
        const old = await db
          .prepare('SELECT unit FROM supplies WHERE organization_id=? AND id=?')
          .bind(org, id)
          .first<{ unit: string }>();
        if (
          old?.unit !== d.unit &&
          (await db
            .prepare(
              'SELECT 1 FROM inventory_balances WHERE organization_id=? AND id=?',
            )
            .bind(org, id)
            .first())
        )
          throw new HttpError(
            409,
            'Unidade em uso por estoque: crie outro insumo.',
          );
      }
      if (id) {
        const old = await db
          .prepare('SELECT unit FROM supplies WHERE organization_id=? AND id=?')
          .bind(org, id)
          .first<{ unit: string }>();
        if (!old) throw new HttpError(404, 'Insumo não encontrado.');
        if (old.unit !== d.unit && (await weightSupplyInUse(db, org, id!)))
          throw new HttpError(
            409,
            'Unidade em uso na calculadora por peso: crie outro insumo.',
          );
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
                'UPDATE supplies SET name=?,unit=?,pack_quantity_milli=?,pack_cost_cents=?,active=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?' +
                  (stockSchema
                    ? ' AND (unit=? OR NOT EXISTS(SELECT 1 FROM inventory_balances WHERE organization_id=? AND id=?))'
                    : '') +
                  (weightSchema
                    ? ' AND (unit=? OR (NOT EXISTS(SELECT 1 FROM weight_recipe_supplies WHERE organization_id=? AND supply_id=?) AND NOT EXISTS(SELECT 1 FROM costing_setting_supplies WHERE organization_id=? AND supply_id=?)))'
                    : ''),
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
                ...(stockSchema ? [d.unit, org, id] : []),
                ...(weightSchema ? [d.unit, org, id, org, id] : []),
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
    const ready = await recipeUnmeasuredReady(db);
    if (!ready && d.unmeasured_bps !== undefined)
      throw new HttpError(
        409,
        'Custos não calculados aguardam a migração 0030.',
      );
    const unmeasured = ready ? [d.unmeasured_bps ?? null] : [];
    if (
      id &&
      !(await db
        .prepare('SELECT 1 FROM recipes WHERE organization_id=? AND id=?')
        .bind(org, id)
        .first())
    )
      throw new HttpError(404, 'Ficha não encontrada.');
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
    const basis = await recipeQuantityBasisReady(db);
    if (!basis && d.components.some((c) => c.quantity_basis === 'unit'))
      throw new HttpError(409, 'Quantidade por doce aguarda a migração 0031.');
    const previous =
      basis && id && d.components.some((c) => c.quantity_basis === undefined)
        ? (
            await db
              .prepare(
                'SELECT supply_id,quantity_basis FROM recipe_components WHERE organization_id=? AND recipe_id=?',
              )
              .bind(org, id)
              .all<{ supply_id: string; quantity_basis: RecipeQuantityBasis }>()
          ).results
        : [];
    const previousBasis = new Map(
      previous.map((c) => [c.supply_id, c.quantity_basis]),
    );
    const components = d.components.map((c) => ({
      ...c,
      quantity_basis:
        c.quantity_basis ?? previousBasis.get(c.supply_id) ?? 'batch',
    }));
    try {
      for (const c of components)
        recipeBatchQuantity(c.quantity_milli, c.quantity_basis, d.yield_units);
    } catch (error) {
      throw new HttpError(400, (error as Error).message);
    }
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
              `UPDATE recipes SET name=?,variant_id=?,yield_units=?,packaging_cents=?,labor_cents=?,overhead_cents=?,margin_bps=?,active=?${ready ? ',unmeasured_bps=COALESCE(?,unmeasured_bps)' : ''},version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?`,
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
              ...unmeasured,
              nonce,
              org,
              entity,
              d.version,
            )
        : db
            .prepare(
              `INSERT INTO recipes(id,organization_id,name,variant_id,yield_units,packaging_cents,labor_cents,overhead_cents,margin_bps,active,mutation_id${ready ? ',unmeasured_bps' : ''}) VALUES(?,?,?,?,?,?,?,?,?,?,?${ready ? ',COALESCE(?,2000)' : ''})`,
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
              ...unmeasured,
            ),
      rest: (g, args) => [
        db
          .prepare(
            `DELETE FROM recipe_components WHERE organization_id=? AND recipe_id=? AND ${g}`,
          )
          .bind(org, entity, ...args),
        db
          .prepare(
            `INSERT INTO recipe_components(organization_id,recipe_id,supply_id,quantity_milli${basis ? ',quantity_basis' : ''}) SELECT ?,?,json_extract(value,'$.supply_id'),json_extract(value,'$.quantity_milli')${basis ? ",json_extract(value,'$.quantity_basis')" : ''} FROM json_each(?) WHERE ${g}`,
          )
          .bind(org, entity, JSON.stringify(components), ...args),
      ],
    };
  });
}
