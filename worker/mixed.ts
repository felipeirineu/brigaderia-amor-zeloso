import { HttpError, type Env } from './security';
import {
  compositionKey,
  type ItemInput,
  type ItemSnapshot,
  type ComponentSnapshot,
} from '../shared/mixed';
export async function compositionSchema(db: D1Database) {
  return !!(await db
    .prepare(
      "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='order_item_components'",
    )
    .first());
}
export async function mixedReady(env: Env) {
  return (
    env.MIXED_BOXES_ENABLED === 'true' &&
    !!env.DB &&
    (await compositionSchema(env.DB))
  );
}
/** Consulta única por lote, sem uma invocação D1 por componente. */
export async function attachComponents(
  db: D1Database,
  org: string,
  items: { id?: unknown; components?: ComponentSnapshot[] }[],
) {
  if (!items.length || !(await compositionSchema(db))) return;
  const rows = (
    await db
      .prepare(
        'SELECT * FROM order_item_components WHERE organization_id=? AND item_id IN(SELECT value FROM json_each(?)) ORDER BY item_id,product_name,variant_id',
      )
      .bind(org, JSON.stringify(items.map((i) => i.id)))
      .all<ComponentSnapshot & { item_id: string }>()
  ).results;
  const groups = new Map<string, ComponentSnapshot[]>();
  for (const row of rows) {
    const list = groups.get(row.item_id) ?? [];
    list.push({
      variant_id: row.variant_id,
      units: row.units,
      product_name: row.product_name,
      variant_label: row.variant_label,
      weight_grams: row.weight_grams,
      units_per_box: row.units_per_box,
    });
    groups.set(row.item_id, list);
  }
  for (const item of items) item.components = groups.get(String(item.id)) ?? [];
}
export async function prepareItems(
  env: Env,
  org: string,
  input: ItemInput[],
  old: ItemSnapshot[],
  version?: number,
): Promise<ItemSnapshot[]> {
  if (old.some((i) => i.components?.length) && version !== 1)
    throw new HttpError(
      409,
      'Este pedido tem caixa mista. Abra um editor com suporte à composição.',
    );
  const hasMixed = input.some((i) => i.components?.length);
  if (hasMixed && !(await mixedReady(env)))
    throw new HttpError(503, 'Caixas mistas ainda não ativadas.');
  const ids = [
    ...new Set(
      input.flatMap((i) => [
        i.variant_id,
        ...(i.components ?? []).map((c) => c.variant_id),
      ]),
    ),
  ];
  const catalog = (
    await env
      .DB!.prepare(
        'SELECT v.*,p.name,p.active AS product_active FROM product_variants v JOIN products p ON p.organization_id=v.organization_id AND p.id=v.product_id WHERE v.organization_id=? AND v.id IN(SELECT value FROM json_each(?))',
      )
      .bind(org, JSON.stringify(ids))
      .all<{
        id: string;
        name: string;
        label: string;
        weight_grams: number;
        units_per_box: number;
        price_cents: number;
        active: number;
        product_active: number;
      }>()
  ).results;
  const map = new Map(catalog.map((v) => [v.id, v]));
  return input.map((i) => {
    const previous = i.item_id
      ? old.find((o) => o.id === i.item_id && o.variant_id === i.variant_id)
      : old.find((o) => compositionKey(o) === compositionKey(i));
    if (i.item_id && !previous)
      throw new HttpError(400, 'Item histórico não encontrado neste pedido.');
    const v = map.get(i.variant_id),
      active = v?.active && v.product_active;
    if ((!previous && !active) || (i.components?.length && !active))
      throw new HttpError(
        400,
        'Selecione variantes ativas da sua organização.',
      );
    const snapshot: ItemSnapshot = previous
      ? { ...previous, quantity: i.quantity }
      : {
          id: crypto.randomUUID(),
          variant_id: i.variant_id,
          quantity: i.quantity,
          product_name: v!.name,
          variant_label: v!.label,
          weight_grams: v!.weight_grams,
          units_per_box: v!.units_per_box,
          unit_price_cents: v!.price_cents,
        };
    snapshot.components = [];
    if (i.components?.length) {
      if (
        i.components.reduce((n, c) => n + c.units, 0) !== snapshot.units_per_box
      )
        throw new HttpError(
          400,
          `A composição deve somar ${snapshot.units_per_box} unidades por caixa.`,
        );
      snapshot.components = i.components.map((c) => {
        const flavor = map.get(c.variant_id);
        if (!flavor?.active || !flavor.product_active)
          throw new HttpError(
            400,
            'Sabor ativo da sua organização obrigatório.',
          );
        if (flavor.weight_grams !== snapshot.weight_grams)
          throw new HttpError(
            400,
            'Os sabores devem ter o mesmo peso por unidade da embalagem.',
          );
        const saved = previous?.components?.find(
          (p) => p.variant_id === c.variant_id,
        );
        return saved
          ? { ...saved, units: c.units }
          : {
              variant_id: c.variant_id,
              units: c.units,
              product_name: flavor.name,
              variant_label: flavor.label,
              weight_grams: flavor.weight_grams,
              units_per_box: flavor.units_per_box,
            };
      });
    }
    return snapshot;
  });
}
export function writeComponents(
  db: D1Database,
  org: string,
  items: ItemSnapshot[],
  guard: string,
  args: unknown[],
) {
  const rows = items.flatMap((i) =>
    (i.components ?? []).map((c) => ({ ...c, item_id: i.id })),
  );
  if (!rows.length) return [];
  return [
    db
      .prepare(
        `INSERT INTO order_item_components(organization_id,item_id,variant_id,units,product_name,variant_label,weight_grams,units_per_box) SELECT ?,json_extract(value,'$.item_id'),json_extract(value,'$.variant_id'),json_extract(value,'$.units'),json_extract(value,'$.product_name'),json_extract(value,'$.variant_label'),json_extract(value,'$.weight_grams'),json_extract(value,'$.units_per_box') FROM json_each(?) WHERE ${guard}`,
      )
      .bind(org, JSON.stringify(rows), ...args),
  ];
}

/** Revalidar rascunhos na confirmação, inclusive na confirmação em lote. */
export async function validateMixedConfirmation(
  env: Env,
  org: string,
  order: string,
) {
  const db = env.DB!;
  if (!(await compositionSchema(db))) return;
  const rows = (
    await db
      .prepare(
        `SELECT i.id,i.units_per_box,SUM(c.units) AS units,MAX(CASE WHEN v.id IS NULL OR b.id IS NULL OR v.active<>1 OR p.active<>1 OR b.active<>1 OR bp.active<>1 OR v.weight_grams<>i.weight_grams THEN 1 ELSE 0 END) AS invalid FROM order_items i JOIN order_item_components c ON c.organization_id=i.organization_id AND c.item_id=i.id LEFT JOIN product_variants v ON v.organization_id=c.organization_id AND v.id=c.variant_id LEFT JOIN products p ON p.organization_id=v.organization_id AND p.id=v.product_id LEFT JOIN product_variants b ON b.organization_id=i.organization_id AND b.id=i.variant_id LEFT JOIN products bp ON bp.organization_id=b.organization_id AND bp.id=b.product_id WHERE i.organization_id=? AND i.order_id=? GROUP BY i.id,i.units_per_box`,
      )
      .bind(org, order)
      .all<{ units_per_box: number; units: number; invalid: number }>()
  ).results;
  if (!rows.length) return;
  if (env.MIXED_BOXES_ENABLED !== 'true')
    throw new HttpError(503, 'Caixas mistas ainda não ativadas.');
  if (rows.some((r) => r.invalid || r.units !== r.units_per_box))
    throw new HttpError(
      400,
      'Revise a caixa mista: composição e sabores ativos da embalagem são obrigatórios.',
    );
}
