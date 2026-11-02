export interface ComponentInput {
  variant_id: string;
  units: number;
}
export interface ComponentSnapshot extends ComponentInput {
  product_name: string;
  variant_label: string;
  weight_grams: number;
  units_per_box: number;
}
export interface ItemInput {
  item_id?: string;
  variant_id: string;
  quantity: number;
  components?: ComponentInput[];
}
export interface ItemSnapshot {
  id: string;
  variant_id: string;
  quantity: number;
  product_name: string;
  variant_label: string;
  weight_grams: number;
  units_per_box: number;
  unit_price_cents: number;
  components?: ComponentSnapshot[];
}
export function compositionKey(
  item: Pick<ItemInput, 'variant_id' | 'components'>,
) {
  return (
    item.variant_id +
    ':' +
    JSON.stringify(
      (item.components ?? [])
        .map((c) => [c.variant_id, c.units])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    )
  );
}
