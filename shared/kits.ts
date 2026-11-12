export const kitWeights = [15, 23, 30] as const;
export const kitCapacities = [12, 25, 50, 100] as const;
export interface Kit {
  id: string;
  weight_grams: number;
  dough_weight_grams: number | null;
  units_per_kit: number;
  price_cents: number;
  max_flavors: number;
  packaging_supply_id: string | null;
  active: number;
  version: number;
}
export interface KitSettings {
  limit_flavors: boolean;
  version: number;
}
export const kitLabel = (kit: Pick<Kit, 'weight_grams' | 'units_per_kit'>) =>
  `Kit ${kit.units_per_kit} · ${kit.weight_grams} g`;
