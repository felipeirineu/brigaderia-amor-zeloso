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
