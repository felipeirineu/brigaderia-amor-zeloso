export interface KitComponentInput {
  product_id: string;
  units: number;
}
export interface KitItemInput {
  item_id?: string;
  kit_id: string;
  quantity: number;
  components: KitComponentInput[];
}
export interface KitComponentSnapshot extends KitComponentInput {
  product_name: string;
  photo_key: string | null;
  contains_alcohol: number;
}
export interface KitItemSnapshot {
  id: string;
  kit_id: string;
  quantity: number;
  weight_grams: number;
  dough_weight_grams: number | null;
  units_per_kit: number;
  unit_price_cents: number;
  packaging_supply_id: string | null;
  components: KitComponentSnapshot[];
}
export function kitCompositionKey(
  item: Pick<KitItemInput, 'kit_id' | 'components'>,
) {
  return (
    item.kit_id +
    ':' +
    JSON.stringify(
      item.components
        .map((c) => [c.product_id, c.units])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    )
  );
}
/** Não recalcula preços de um ajuste só de quantidade. */
export function kitItemPrice(
  item: KitItemInput,
  kits: readonly { id: string; price_cents: number }[],
  old: readonly KitItemSnapshot[] = [],
) {
  const prior = old.find(
    (i) =>
      i.id === item.item_id && kitCompositionKey(i) === kitCompositionKey(item),
  );
  return (
    prior?.unit_price_cents ??
    kits.find((k) => k.id === item.kit_id)?.price_cents ??
    null
  );
}
export const kitSnapshotInput = (item: KitItemSnapshot): KitItemInput => ({
  item_id: item.id,
  kit_id: item.kit_id,
  quantity: item.quantity,
  components: item.components.map(({ product_id, units }) => ({
    product_id,
    units,
  })),
});
