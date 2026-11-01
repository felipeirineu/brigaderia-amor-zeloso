import { priceForMargin } from '../shared/costing';
import { z } from 'zod';
const cents = z.number().int().min(0).max(100000000),
  quantity = z.number().int().positive().max(1000000000000);
export const supplySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    unit: z.enum(['g', 'ml', 'unit']),
    pack_quantity_milli: quantity,
    pack_cost_cents: cents.nullable(),
    active: z.boolean().default(true),
    version: z.number().int().positive().optional(),
  })
  .strict();
export const recipeSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    variant_id: z.uuid().nullable(),
    yield_units: z.number().int().positive().max(1000000),
    packaging_cents: cents,
    labor_cents: cents,
    overhead_cents: cents,
    margin_bps: z.number().int().min(0).max(9500),
    active: z.boolean().default(true),
    version: z.number().int().positive().optional(),
    components: z
      .array(
        z.object({ supply_id: z.uuid(), quantity_milli: quantity }).strict(),
      )
      .min(1)
      .max(50),
  })
  .strict()
  .refine(
    (r) =>
      new Set(r.components.map((c) => c.supply_id)).size ===
      r.components.length,
    'Insumo repetido.',
  );
export const ceilDivide = (a: bigint, b: bigint) => {
  if (b <= 0n || a < 0n) throw Error('Divisão inválida.');
  return (a + b - 1n) / b;
};
export function safeQuantity(value: bigint) {
  if (value > 1000000000000n || value < 0n)
    throw Error('Cálculo excede o limite.');
  return Number(value);
}
export interface CostComponent {
  supply_id: string;
  name: string;
  quantity_milli: number;
  pack_quantity_milli: number;
  pack_cost_cents: number | null;
  supply_active: number;
}
export function estimateRecipe(
  recipe: {
    yield_units: number;
    packaging_cents: number;
    labor_cents: number;
    overhead_cents: number;
    margin_bps: number;
    units_per_box?: number | null;
  },
  components: CostComponent[],
) {
  const missing = components
    .filter((c) => c.pack_cost_cents === null || !c.supply_active)
    .map((c) => c.name);
  if (missing.length)
    return {
      missing,
      total_cents: null,
      unit_cost_cents: null,
      box_cost_cents: null,
      suggested_price_cents: null,
    };
  const ingredients = components.reduce(
      (n, c) =>
        n +
        ceilDivide(
          BigInt(c.quantity_milli) * BigInt(c.pack_cost_cents!),
          BigInt(c.pack_quantity_milli),
        ),
      0n,
    ),
    total =
      ingredients +
      BigInt(recipe.packaging_cents) +
      BigInt(recipe.labor_cents) +
      BigInt(recipe.overhead_cents),
    unit = ceilDivide(total, BigInt(recipe.yield_units)),
    box = recipe.units_per_box ? unit * BigInt(recipe.units_per_box) : null;
  return {
    missing: [],
    total_cents: safeQuantity(total),
    unit_cost_cents: safeQuantity(unit),
    box_cost_cents: box === null ? null : safeQuantity(box),
    suggested_price_cents:
      box === null
        ? null
        : priceForMargin(safeQuantity(box), recipe.margin_bps),
  };
}
