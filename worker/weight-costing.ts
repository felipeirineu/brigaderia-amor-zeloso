import { productRecipeRates, rateForWeight } from './recipe-percent';
import { z } from 'zod';
import {
  calculateWeightKit,
  defaultCostingSettings,
  type CostingSettings,
  type WeightRecipeData,
  type WeightSupply,
} from '../shared/weight-costing';
import type { Kit } from '../shared/kits';
import {
  costingSettingsSchema,
  weightRecipeSchema,
} from './weight-costing-domain';
import { ownerOnly, p1Mutation } from './p1-common';
import { HttpError, json, type Actor } from './security';
export async function weightCostingReady(db: D1Database) {
  const r = await db
    .prepare(
      "SELECT COUNT(*) n FROM sqlite_schema WHERE type='table' AND name IN('weight_recipes','weight_recipe_supplies','costing_settings','costing_setting_supplies')",
    )
    .first<{ n: number }>();
  return r?.n === 4;
}
const settingsRefs = (d: CostingSettings) => [
  ...new Set(
    [
      ...d.optional_supply_ids,
      ...d.liners.map((l) => l.supply_id),
      d.ifood_packaging_supply_id,
      d.ifood_label_supply_id,
      d.ifood_bag_supply_id,
    ].filter((id): id is string => !!id),
  ),
];
const reserved = (d: CostingSettings) =>
  new Set([
    ...d.optional_supply_ids,
    ...d.liners.map((l) => l.supply_id).filter((id): id is string => !!id),
  ]);
export async function readCostingSettings(db: D1Database, org: string) {
  const r = await db
    .prepare(
      'SELECT data,version FROM costing_settings WHERE organization_id=? AND id=?',
    )
    .bind(org, org)
    .first<{ data: string; version: number }>();
  return {
    data: r
      ? (JSON.parse(r.data) as CostingSettings)
      : defaultCostingSettings(),
    version: r?.version ?? 0,
  };
}
/** Usado também pelo cadastro de insumos: quantidade nunca troca de unidade silenciosamente. */
export async function weightSupplyInUse(
  db: D1Database,
  org: string,
  id: string,
) {
  if (!(await weightCostingReady(db))) return false;
  return !!(await db
    .prepare(
      'SELECT supply_id FROM weight_recipe_supplies WHERE organization_id=? AND supply_id=? UNION ALL SELECT supply_id FROM costing_setting_supplies WHERE organization_id=? AND supply_id=? LIMIT 1',
    )
    .bind(org, id, org, id)
    .first());
}
interface Profile {
  id: string;
  product_id: string;
  product_name: string;
  product_active: number;
  photo_key: string | null;
  data: string;
  version: number;
  active: number;
}
async function profiles(db: D1Database, org: string, id?: string) {
  const r = (
    await db
      .prepare(
        `SELECT r.*,p.name product_name,p.active product_active,p.photo_key FROM weight_recipes r JOIN products p ON p.organization_id=r.organization_id AND p.id=r.product_id WHERE r.organization_id=?${id ? ' AND r.id=?' : ''} ORDER BY r.active DESC,p.name LIMIT 201`,
      )
      .bind(org, ...(id ? [id] : []))
      .all<Profile>()
  ).results;
  if (r.length > 200)
    throw new HttpError(409, 'Mais de 200 fichas; reduza o cadastro.');
  if (id && !r.length) throw new HttpError(404, 'Ficha não encontrada.');
  return r;
}
export async function weightCosting(
  req: Request,
  db: D1Database,
  a: Actor,
  resource: string,
  id?: string,
) {
  if (!(await weightCostingReady(db)))
    throw new HttpError(503, 'Calculadora por peso aguarda a migração 0023.');
  const org = a.organization_id,
    url = new URL(req.url),
    action = url.pathname.split('/')[5];
  if (id && !z.uuid().safeParse(id).success)
    throw new HttpError(404, 'Não encontrado.');
  if (url.pathname.split('/').length > 6)
    throw new HttpError(404, 'Não encontrado.');
  if (resource === 'costing-settings') {
    if (action) throw new HttpError(404, 'Não encontrado.');
    if (id && id !== org)
      throw new HttpError(404, 'Configuração não encontrada.');
    if (req.method === 'GET')
      return json({ role: a.role, ...(await readCostingSettings(db, org)) });
    ownerOnly(a);
    if (req.method !== 'PUT') throw new HttpError(405, 'Método não permitido.');
    return p1Mutation(req, db, a, async (raw, nonce) => {
      const d = costingSettingsSchema.parse(raw),
        ids = settingsRefs(d.data),
        forbidden = [...reserved(d.data)];
      const supplies = ids.length
        ? (
            await db
              .prepare(
                'SELECT * FROM supplies WHERE organization_id=? AND id IN(SELECT value FROM json_each(?))',
              )
              .bind(org, JSON.stringify(ids))
              .all<WeightSupply>()
          ).results
        : [];
      if (supplies.length !== ids.length)
        throw new HttpError(404, 'Insumo não encontrado.');
      if (supplies.some((s) => s.unit !== 'unit' || !s.active))
        throw new HttpError(
          400,
          'Configuração exige insumos ativos em unidades.',
        );
      const clash = await db
        .prepare(
          'SELECT 1 FROM weight_recipe_supplies s JOIN weight_recipes r ON r.organization_id=s.organization_id AND r.id=s.recipe_id WHERE s.organization_id=? AND r.active=1 AND s.supply_id IN(SELECT value FROM json_each(?)) LIMIT 1',
        )
        .bind(org, JSON.stringify(forbidden))
        .first();
      if (clash)
        throw new HttpError(
          409,
          'Retire a forminha/opcional das fichas por peso antes de configurar; não deve entrar duas vezes.',
        );
      const guardRefs =
        "NOT EXISTS(SELECT 1 FROM supplies s WHERE s.organization_id=? AND s.id IN(SELECT value FROM json_each(?)) AND (s.unit<>'unit' OR s.active<>1)) AND NOT EXISTS(SELECT 1 FROM weight_recipe_supplies s JOIN weight_recipes r ON r.organization_id=s.organization_id AND r.id=s.recipe_id WHERE s.organization_id=? AND r.active=1 AND s.supply_id IN(SELECT value FROM json_each(?)))";
      return {
        table: 'costing_settings',
        id: org,
        action: 'costing.settings_saved',
        response: { id: org },
        first: d.version
          ? db
              .prepare(
                `UPDATE costing_settings SET data=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=? AND ${guardRefs}`,
              )
              .bind(
                JSON.stringify(d.data),
                nonce,
                org,
                org,
                d.version,
                org,
                JSON.stringify(ids),
                org,
                JSON.stringify(forbidden),
              )
          : db
              .prepare(
                `INSERT OR IGNORE INTO costing_settings(organization_id,id,data,mutation_id) SELECT ?,?,?,? WHERE ${guardRefs}`,
              )
              .bind(
                org,
                org,
                JSON.stringify(d.data),
                nonce,
                org,
                JSON.stringify(ids),
                org,
                JSON.stringify(forbidden),
              ),
        rest: (guard, args) => [
          db
            .prepare(
              `DELETE FROM costing_setting_supplies WHERE organization_id=? AND ${guard}`,
            )
            .bind(org, ...args),
          db
            .prepare(
              `INSERT INTO costing_setting_supplies(organization_id,supply_id) SELECT ?,value FROM json_each(?) WHERE ${guard}`,
            )
            .bind(org, JSON.stringify(ids), ...args),
        ],
      };
    });
  }
  if (req.method === 'GET') {
    const rows = await profiles(db, org, id);
    if (action === 'calculate') {
      if (!id) throw new HttpError(404, 'Ficha não encontrada.');
      const row = rows[0],
        data = JSON.parse(row.data) as WeightRecipeData;
      if (!row.active || !row.product_active)
        throw new HttpError(409, 'Ative o sabor e a ficha antes de calcular.');
      const selected = z
        .array(z.uuid())
        .max(50)
        .parse(
          (url.searchParams.get('optional') ?? '').split(',').filter(Boolean),
        );
      if (new Set(selected).size !== selected.length)
        throw new HttpError(400, 'Opcional repetido.');
      const settings = await readCostingSettings(db, org);
      const recipeRates = await productRecipeRates(db, org, row.product_id);
      if (selected.some((s) => !settings.data.optional_supply_ids.includes(s)))
        throw new HttpError(400, 'Opcional não autorizado.');
      const margin = url.searchParams.has('margin')
        ? z.coerce
            .number()
            .int()
            .min(0)
            .max(9500)
            .parse(url.searchParams.get('margin'))
        : data.margin_bps;
      const kits = (
        await db
          .prepare(
            'SELECT * FROM kits WHERE organization_id=? AND active=1 ORDER BY weight_grams,units_per_kit LIMIT 201',
          )
          .bind(org)
          .all<Kit>()
      ).results;
      if (kits.length > 200)
        throw new HttpError(409, 'Mais de 200 kits; reduza o cálculo.');
      const ids = [
        ...new Set([
          ...data.components.map((c) => c.supply_id),
          ...settingsRefs(settings.data),
          ...kits
            .map((k) => k.packaging_supply_id)
            .filter((s): s is string => !!s),
        ]),
      ];
      const supplies = (
        await db
          .prepare(
            'SELECT * FROM supplies WHERE organization_id=? AND id IN(SELECT value FROM json_each(?))',
          )
          .bind(org, JSON.stringify(ids))
          .all<WeightSupply>()
      ).results;
      try {
        return json({
          recipe: { ...row, data, mutation_id: undefined },
          settings: settings.data,
          optional: selected,
          rows: kits.map((k) =>
            calculateWeightKit(
              data,
              {
                ...settings.data,
                overhead_bps: rateForWeight(
                  recipeRates,
                  k.weight_grams,
                  settings.data.overhead_bps,
                ),
              },
              k,
              supplies,
              selected,
              margin,
            ),
          ),
          rounding:
            'Cada custo parcial e unitário, adicional, margem e iFood arredondam para cima ao centavo; rendimento calculado arredonda para baixo.',
        });
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
    }
    if (action) throw new HttpError(404, 'Não encontrado.');
    const output = rows.map((r) => ({
      ...r,
      data: JSON.parse(r.data),
      mutation_id: undefined,
    }));
    return json(id ? output[0] : { role: a.role, items: output });
  }
  ownerOnly(a);
  if (
    action ||
    !['POST', 'PUT'].includes(req.method) ||
    (req.method === 'PUT') !== !!id
  )
    throw new HttpError(405, 'Método não permitido.');
  return p1Mutation(req, db, a, async (raw, nonce) => {
    if (id) await profiles(db, org, id);
    const d = weightRecipeSchema.parse(raw),
      entity = id ?? crypto.randomUUID();
    if (id && !d.version) throw new HttpError(400, 'Informe versão.');
    const product = await db
      .prepare('SELECT active FROM products WHERE organization_id=? AND id=?')
      .bind(org, d.product_id)
      .first<{ active: number }>();
    if (!product) throw new HttpError(404, 'Sabor não encontrado.');
    if (d.active && !product.active)
      throw new HttpError(400, 'Escolha um sabor ativo.');
    const ids = [...new Set(d.data.components.map((c) => c.supply_id))],
      supplies = (
        await db
          .prepare(
            'SELECT * FROM supplies WHERE organization_id=? AND id IN(SELECT value FROM json_each(?))',
          )
          .bind(org, JSON.stringify(ids))
          .all<WeightSupply>()
      ).results;
    if (supplies.length !== ids.length)
      throw new HttpError(404, 'Insumo não encontrado.');
    if (d.active && supplies.some((s) => !s.active))
      throw new HttpError(400, 'Use insumos ativos.');
    const settings = await readCostingSettings(db, org),
      reservedIds = reserved(settings.data);
    if (d.active && ids.some((id) => reservedIds.has(id)))
      throw new HttpError(
        400,
        'Forminhas e opcionais são configurados fora da ficha; remova a duplicação.',
      );
    const refs = JSON.stringify(
        supplies.map((s) => ({ id: s.id, unit: s.unit })),
      ),
      suppliesGuard = `NOT EXISTS(SELECT 1 FROM json_each(?) j LEFT JOIN supplies s ON s.organization_id=? AND s.id=json_extract(j.value,'$.id') WHERE s.id IS NULL OR s.unit<>json_extract(j.value,'$.unit')${d.active ? ' OR s.active<>1' : ''}) AND COALESCE((SELECT version FROM costing_settings WHERE organization_id=? AND id=?),0)=?`;
    return {
      table: 'weight_recipes',
      id: entity,
      action: 'weight_recipe.saved',
      response: { id: entity },
      first: id
        ? db
            .prepare(
              `UPDATE weight_recipes SET product_id=?,data=?,active=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=? AND ${suppliesGuard} AND NOT EXISTS(SELECT 1 FROM weight_recipes WHERE organization_id=? AND product_id=? AND id<>?)`,
            )
            .bind(
              d.product_id,
              JSON.stringify(d.data),
              +d.active,
              nonce,
              org,
              id,
              d.version,
              refs,
              org,
              org,
              org,
              settings.version,
              org,
              d.product_id,
              id,
            )
        : db
            .prepare(
              `INSERT INTO weight_recipes(organization_id,id,product_id,data,active,mutation_id) SELECT ?,?,?,?,?,? WHERE ${suppliesGuard} AND NOT EXISTS(SELECT 1 FROM weight_recipes WHERE organization_id=? AND product_id=?)`,
            )
            .bind(
              org,
              entity,
              d.product_id,
              JSON.stringify(d.data),
              +d.active,
              nonce,
              refs,
              org,
              org,
              org,
              settings.version,
              org,
              d.product_id,
            ),
      rest: (guard, args) => [
        db
          .prepare(
            `DELETE FROM weight_recipe_supplies WHERE organization_id=? AND recipe_id=? AND ${guard}`,
          )
          .bind(org, entity, ...args),
        db
          .prepare(
            `INSERT INTO weight_recipe_supplies(organization_id,recipe_id,supply_id) SELECT ?,?,value FROM json_each(?) WHERE ${guard}`,
          )
          .bind(org, entity, JSON.stringify(ids), ...args),
      ],
    };
  });
}
