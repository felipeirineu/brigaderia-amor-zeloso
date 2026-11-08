import type { ItemInput } from '../../shared/mixed';
export interface CompositionOption {
  id: string;
  name: string;
  units_per_box: number;
  weight_grams: number;
}
export function compositionValid(
  item: ItemInput,
  options: CompositionOption[],
) {
  if (!item.components) return true;
  const base = options.find((v) => v.id === item.variant_id);
  return (
    !!base &&
    item.components.reduce((n, c) => n + c.units, 0) === base.units_per_box &&
    item.components.length > 0 &&
    item.components.every(
      (c) =>
        Number.isSafeInteger(c.units) &&
        c.units > 0 &&
        options.some(
          (v) =>
            v.id === c.variant_id &&
            v.units_per_box === base.units_per_box &&
            v.weight_grams === base.weight_grams,
        ),
    )
  );
}
