export async function recipeUnmeasuredReady(db: D1Database) {
  return !!(await db
    .prepare(
      "SELECT 1 FROM pragma_table_info('recipes') WHERE name='unmeasured_bps'",
    )
    .first());
}

interface RecipePercent {
  weight_grams: number | null;
  unmeasured_bps: number | null;
}

export function rateForWeight(
  rows: RecipePercent[],
  weight: number,
  fallback: number,
) {
  const rates = new Set(
    rows
      .filter((r) => r.weight_grams === weight && r.unmeasured_bps !== null)
      .map((r) => r.unmeasured_bps!),
  );
  return rates.size === 1 ? [...rates][0] : fallback;
}

export async function productRecipeRates(
  db: D1Database,
  org: string,
  product: string,
) {
  if (!(await recipeUnmeasuredReady(db))) return [];
  return (
    await db
      .prepare(
        `SELECT v.weight_grams,r.unmeasured_bps FROM recipes r
       JOIN product_variants v ON v.organization_id=r.organization_id AND v.id=r.variant_id
       WHERE r.organization_id=? AND v.product_id=? AND r.active=1 AND v.active=1`,
      )
      .bind(org, product)
      .all<RecipePercent>()
  ).results;
}
