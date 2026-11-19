import { HttpError } from './security';
import {
  kitSnapshotInput,
  type KitItemInput,
  type KitItemSnapshot,
} from '../shared/kit-orders';
import { prepareKitItems } from './kit-order-domain';
import {
  kitOrdersReady,
  loadKitCatalog,
  readKitItems,
} from './kit-order-items';
export type KitCatalog = Awaited<ReturnType<typeof loadKitCatalog>>;
export async function recurringKits(
  db: D1Database,
  org: string,
  ids: string[],
) {
  return (await readKitItems(db, org, ids, 'recurring')).map(
    ({ order_id, ...item }) => ({ ...item, template_id: order_id }),
  );
}
/** Modelo intocado mantém o limite histórico; pedido novo sempre fotografa o catálogo atual. */
export function generateKitSnapshots(
  items: KitItemSnapshot[],
  catalog: KitCatalog,
  mixed: boolean,
  enforceLimit = false,
) {
  if (!mixed && items.some((i) => i.components.length > 1))
    throw new HttpError(503, 'Caixas Mistas ainda não ativadas.');
  return prepareKitItems(
    items.map((i) => {
      const { item_id, ...input } = kitSnapshotInput(i);
      void item_id;
      return input;
    }),
    [],
    catalog.kits,
    catalog.flavors,
    enforceLimit && catalog.limit,
  );
}
export async function prepareKitModel(
  db: D1Database,
  org: string,
  input: KitItemInput[] | undefined,
  old: KitItemSnapshot[],
  mixed: boolean,
  active = true,
) {
  if (old.length && input === undefined)
    throw new HttpError(
      409,
      'Este modelo contém kits. Atualize o editor antes de salvar.',
    );
  if (!input?.length) return [];
  if (!(await kitOrdersReady(db, 'recurring')))
    throw new HttpError(503, 'Kits em modelos aguardam a migração 0021.');
  if (!mixed && input.some((i) => i.components.length > 1))
    throw new HttpError(503, 'Caixas Mistas ainda não ativadas.');
  const catalog = await loadKitCatalog(db, org, input);
  return prepareKitItems(
    input,
    old,
    active ? catalog.kits : catalog.kits.map((k) => ({ ...k, active: 1 })),
    active
      ? catalog.flavors
      : catalog.flavors.map((p) => ({ ...p, active: 1 })),
    catalog.limit,
  );
}
export function writeGeneratedKits(
  db: D1Database,
  org: string,
  nonce: string,
  items: (KitItemSnapshot & { order_id: string })[],
) {
  const components = items.flatMap((i) =>
    i.components.map((c) => ({ ...c, item_id: i.id })),
  );
  return [
    db
      .prepare(
        `INSERT INTO kit_order_items(organization_id,id,order_id,kit_id,quantity,weight_grams,dough_weight_grams,units_per_kit,unit_price_cents,packaging_supply_id) SELECT ?,json_extract(j.value,'$.id'),json_extract(j.value,'$.order_id'),json_extract(j.value,'$.kit_id'),json_extract(j.value,'$.quantity'),json_extract(j.value,'$.weight_grams'),json_extract(j.value,'$.dough_weight_grams'),json_extract(j.value,'$.units_per_kit'),json_extract(j.value,'$.unit_price_cents'),json_extract(j.value,'$.packaging_supply_id') FROM json_each(?) j JOIN orders o ON o.organization_id=? AND o.id=json_extract(j.value,'$.order_id') AND o.mutation_id=?`,
      )
      .bind(
        org,
        JSON.stringify(items.map((i) => ({ ...i, components: undefined }))),
        org,
        nonce,
      ),
    db
      .prepare(
        `INSERT INTO kit_order_components(organization_id,item_id,product_id,units,product_name,photo_key,contains_alcohol) SELECT ?,json_extract(j.value,'$.item_id'),json_extract(j.value,'$.product_id'),json_extract(j.value,'$.units'),json_extract(j.value,'$.product_name'),json_extract(j.value,'$.photo_key'),json_extract(j.value,'$.contains_alcohol') FROM json_each(?) j JOIN kit_order_items i ON i.organization_id=? AND i.id=json_extract(j.value,'$.item_id') JOIN orders o ON o.organization_id=i.organization_id AND o.id=i.order_id AND o.mutation_id=?`,
      )
      .bind(org, JSON.stringify(components), org, nonce),
  ];
}
