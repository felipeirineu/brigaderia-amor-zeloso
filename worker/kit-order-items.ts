import type {
  KitItemInput,
  KitItemSnapshot,
  KitComponentSnapshot,
} from '../shared/kit-orders';
import type { Kit } from '../shared/kits';
import { prepareKitItems, type KitFlavor } from './kit-order-domain';
import { HttpError } from './security';
export async function kitOrdersReady(db: D1Database) {
  const r = await db
    .prepare(
      "SELECT COUNT(*) n FROM sqlite_schema WHERE type='table' AND name IN('kit_order_items','kit_order_components')",
    )
    .first<{ n: number }>();
  return r?.n === 2;
}
/** Só leitura: projeções não geram dados artificiais e não entram no backup como tabelas. */
export async function saleItemSource(db: D1Database) {
  return (await kitOrdersReady(db))
    ? `(SELECT id,organization_id,order_id,variant_id,product_name,variant_label,weight_grams,units_per_box,unit_price_cents,quantity,NULL AS kit_id,NULL AS dough_weight_grams,NULL AS packaging_supply_id FROM order_items UNION ALL SELECT id,organization_id,order_id,kit_id,'Kit '||units_per_kit||' · '||weight_grams||' g','',weight_grams,units_per_kit,unit_price_cents,quantity,kit_id,dough_weight_grams,packaging_supply_id FROM kit_order_items)`
    : 'order_items';
}
export async function saleComponentSource(db: D1Database) {
  return (await kitOrdersReady(db))
    ? `(SELECT organization_id,item_id,variant_id,units,product_name,variant_label,weight_grams,units_per_box,NULL AS product_id,NULL AS photo_key,NULL AS contains_alcohol FROM order_item_components UNION ALL SELECT c.organization_id,c.item_id,c.product_id,c.units,c.product_name,'',i.weight_grams,i.units_per_kit,c.product_id,c.photo_key,c.contains_alcohol FROM kit_order_components c JOIN kit_order_items i ON i.organization_id=c.organization_id AND i.id=c.item_id)`
    : 'order_item_components';
}
export async function readKitItems(
  db: D1Database,
  org: string,
  orderIds: string[],
) {
  if (!orderIds.length || !(await kitOrdersReady(db))) return [];
  const [parents, children] = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        'SELECT id,order_id,kit_id,quantity,weight_grams,dough_weight_grams,units_per_kit,unit_price_cents,packaging_supply_id FROM kit_order_items WHERE organization_id=? AND order_id IN(SELECT value FROM json_each(?)) ORDER BY order_id,id',
      )
      .bind(org, JSON.stringify(orderIds)),
    db
      .prepare(
        'SELECT c.* FROM kit_order_components c JOIN kit_order_items i ON i.organization_id=c.organization_id AND i.id=c.item_id WHERE i.organization_id=? AND i.order_id IN(SELECT value FROM json_each(?)) ORDER BY c.item_id,c.product_id',
      )
      .bind(org, JSON.stringify(orderIds)),
  ]);
  const grouped = new Map<string, KitComponentSnapshot[]>();
  for (const c of children.results) {
    const item = grouped.get(String(c.item_id)) ?? [];
    item.push({
      product_id: String(c.product_id),
      units: Number(c.units),
      product_name: String(c.product_name),
      photo_key: c.photo_key as string | null,
      contains_alcohol: Number(c.contains_alcohol),
    });
    grouped.set(String(c.item_id), item);
  }
  return parents.results.map((p) => ({
    ...p,
    components: grouped.get(String(p.id)) ?? [],
  })) as unknown as (KitItemSnapshot & { order_id: string })[];
}
export async function prepareOrderKits(
  db: D1Database,
  org: string,
  input: KitItemInput[],
  old: KitItemSnapshot[],
) {
  if (!input.length) return [];
  if (!(await kitOrdersReady(db)))
    throw new HttpError(503, 'Pedidos com kits ainda indisponíveis.');
  const ids = [...new Set(input.map((i) => i.kit_id))],
    products = [
      ...new Set(input.flatMap((i) => i.components.map((c) => c.product_id))),
    ];
  const [kits, flavors, settings] = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        'SELECT id,weight_grams,dough_weight_grams,units_per_kit,price_cents,max_flavors,packaging_supply_id,active,version FROM kits WHERE organization_id=? AND id IN(SELECT value FROM json_each(?))',
      )
      .bind(org, JSON.stringify(ids)),
    db
      .prepare(
        'SELECT id,name,description,photo_key,active FROM products WHERE organization_id=? AND id IN(SELECT value FROM json_each(?))',
      )
      .bind(org, JSON.stringify(products)),
    db
      .prepare(
        'SELECT limit_flavors FROM kit_settings WHERE organization_id=? AND id=?',
      )
      .bind(org, org),
  ]);
  return prepareKitItems(
    input,
    old,
    kits.results as unknown as Kit[],
    flavors.results as unknown as KitFlavor[],
    settings.results.length ? !!settings.results[0].limit_flavors : true,
  );
}
/** Chamado no batch do cabeçalho; guard/CAS impedem apagar itens numa atualização perdedora. */
export function writeKitItems(
  db: D1Database,
  org: string,
  order: string,
  items: KitItemSnapshot[],
  guard: string,
  args: string[],
) {
  const components = items.flatMap((i) =>
    i.components.map((c) => ({ ...c, item_id: i.id })),
  );
  return [
    db
      .prepare(
        `DELETE FROM kit_order_items WHERE organization_id=? AND order_id=? AND ${guard}`,
      )
      .bind(org, order, ...args),
    db
      .prepare(
        `INSERT INTO kit_order_items(organization_id,id,order_id,kit_id,quantity,weight_grams,dough_weight_grams,units_per_kit,unit_price_cents,packaging_supply_id) SELECT ?,json_extract(value,'$.id'),?,json_extract(value,'$.kit_id'),json_extract(value,'$.quantity'),json_extract(value,'$.weight_grams'),json_extract(value,'$.dough_weight_grams'),json_extract(value,'$.units_per_kit'),json_extract(value,'$.unit_price_cents'),json_extract(value,'$.packaging_supply_id') FROM json_each(?) WHERE ${guard}`,
      )
      .bind(
        org,
        order,
        JSON.stringify(items.map((i) => ({ ...i, components: undefined }))),
        ...args,
      ),
    db
      .prepare(
        `INSERT INTO kit_order_components(organization_id,item_id,product_id,units,product_name,photo_key,contains_alcohol) SELECT ?,json_extract(value,'$.item_id'),json_extract(value,'$.product_id'),json_extract(value,'$.units'),json_extract(value,'$.product_name'),json_extract(value,'$.photo_key'),json_extract(value,'$.contains_alcohol') FROM json_each(?) WHERE ${guard}`,
      )
      .bind(org, JSON.stringify(components), ...args),
  ];
}

/** Representação de leitura explícita: kit_id distingue o kit das variantes legadas. */
export function kitDisplayItem(
  item: KitItemSnapshot & { order_id: string },
): Record<string, unknown> {
  return {
    ...item,
    variant_id: null,
    product_name: `Kit ${item.units_per_kit} · ${item.weight_grams} g`,
    variant_label: '',
    units_per_box: item.units_per_kit,
    photo_key: item.components[0]?.photo_key ?? null,
    components: item.components.map((c) => ({
      ...c,
      variant_id: null,
      variant_label: '',
      weight_grams: item.weight_grams,
      units_per_box: item.units_per_kit,
    })),
  };
}

export async function validateKitConfirmation(
  db: D1Database,
  org: string,
  order: string,
  mixed: boolean,
) {
  if (!(await kitOrdersReady(db))) return;
  const rows = (
    await db
      .prepare(
        `SELECT i.units_per_kit,COALESCE(SUM(c.units),0) units,COUNT(c.product_id) flavors,MAX(CASE WHEN k.active<>1 OR p.active<>1 OR p.id IS NULL OR k.id IS NULL THEN 1 ELSE 0 END) invalid FROM kit_order_items i LEFT JOIN kit_order_components c ON c.organization_id=i.organization_id AND c.item_id=i.id LEFT JOIN kits k ON k.organization_id=i.organization_id AND k.id=i.kit_id LEFT JOIN products p ON p.organization_id=c.organization_id AND p.id=c.product_id WHERE i.organization_id=? AND i.order_id=? GROUP BY i.id,i.units_per_kit`,
      )
      .bind(org, order)
      .all<{
        units_per_kit: number;
        units: number;
        flavors: number;
        invalid: number;
      }>()
  ).results;
  if (rows.some((r) => r.invalid || r.units !== r.units_per_kit))
    throw new HttpError(
      400,
      'Revise os kits: composição completa e sabores ativos são obrigatórios.',
    );
  if (!mixed && rows.some((r) => r.flavors > 1))
    throw new HttpError(503, 'Caixas mistas ainda não ativadas.');
}
