import {
  recipeBatchQuantity,
  recipeIngredientCost,
  type RecipeQuantityBasis,
} from '../shared/recipe-quantity';
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
    unmeasured_bps: z.number().int().min(0).max(10000).optional(),
    active: z.boolean().default(true),
    version: z.number().int().positive().optional(),
    components: z
      .array(
        z
          .object({
            supply_id: z.uuid(),
            quantity_milli: quantity,
            quantity_basis: z.enum(['batch', 'unit']).optional(),
          })
          .strict(),
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
  quantity_basis?: RecipeQuantityBasis;
  pack_quantity_milli: number;
  pack_cost_cents: number | null;
  supply_active: number;
}
export function nearestCents(numerator: bigint, denominator: bigint) {
  if (numerator < 0n || denominator <= 0n) throw Error('Divisão inválida.');
  return (numerator + denominator / 2n) / denominator;
}
export function estimateRecipe(
  recipe: {
    yield_units: number;
    packaging_cents: number;
    labor_cents: number;
    overhead_cents: number;
    margin_bps: number;
    units_per_box?: number | null;
    unmeasured_bps?: number | null;
  },
  components: CostComponent[],
) {
  const yieldUnits = BigInt(recipe.yield_units);
  const legacy = recipe.unmeasured_bps == null;
  const byYield = (cents: bigint) =>
    (legacy ? ceilDivide : nearestCents)(cents, yieldUnits);
  const missing: string[] = [];
  let ingredientTotal = 0n;
  const ingredient_costs = components.map((c) => {
    if (c.pack_cost_cents === null || !c.supply_active) {
      missing.push(c.name);
      return { supply_id: c.supply_id, batch_cents: null, unit_cents: null };
    }
    const batch = recipeIngredientCost(
      recipeBatchQuantity(
        c.quantity_milli,
        c.quantity_basis ?? 'batch',
        recipe.yield_units,
      ),
      c.pack_quantity_milli,
      c.pack_cost_cents,
    );
    ingredientTotal += batch;
    return {
      supply_id: c.supply_id,
      batch_cents: safeQuantity(batch),
      unit_cents: safeQuantity(byYield(batch)),
    };
  });
  if (missing.length)
    return {
      missing,
      ingredient_costs,
      production_cents: null,
      production_unit_cents: null,
      unmeasured_cents: null,
      unmeasured_unit_cents: null,
      total_cents: null,
      unit_cost_cents: null,
      box_cost_cents: null,
      suggested_price_cents: null,
      suggested_batch_cents: null,
      suggested_unit_cents: null,
    };
  const production =
    ingredientTotal +
    BigInt(recipe.packaging_cents) +
    BigInt(recipe.labor_cents) +
    BigInt(recipe.overhead_cents);
  const unmeasured = nearestCents(
    production * BigInt(recipe.unmeasured_bps ?? 0),
    10000n,
  );
  const total = production + unmeasured;
  const unit = byYield(total);
  const suggested = priceForMargin(safeQuantity(total), recipe.margin_bps);
  const boxUnits = BigInt(recipe.units_per_box ?? 0);
  const box = boxUnits
    ? legacy
      ? unit * boxUnits
      : nearestCents(total * boxUnits, yieldUnits)
    : null;
  return {
    missing,
    ingredient_costs,
    production_cents: safeQuantity(production),
    production_unit_cents: safeQuantity(byYield(production)),
    unmeasured_cents: safeQuantity(unmeasured),
    unmeasured_unit_cents: safeQuantity(byYield(unmeasured)),
    total_cents: safeQuantity(total),
    unit_cost_cents: safeQuantity(unit),
    box_cost_cents: box === null ? null : safeQuantity(box),
    suggested_price_cents:
      box === null
        ? null
        : legacy
          ? priceForMargin(safeQuantity(box), recipe.margin_bps)
          : safeQuantity(
              nearestCents(BigInt(suggested) * boxUnits, yieldUnits),
            ),
    suggested_batch_cents: suggested,
    suggested_unit_cents: safeQuantity(
      nearestCents(BigInt(suggested), yieldUnits),
    ),
  };
}
export type RecipeEstimate = ReturnType<typeof estimateRecipe>;
