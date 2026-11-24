export type RecipeQuantityBasis = 'batch' | 'unit';

export function recipeBatchQuantity(
  quantityMilli: number,
  basis: RecipeQuantityBasis,
  yieldUnits: number,
) {
  const batch = basis === 'unit' ? quantityMilli * yieldUnits : quantityMilli;
  if (
    !Number.isSafeInteger(quantityMilli) ||
    quantityMilli <= 0 ||
    !Number.isSafeInteger(yieldUnits) ||
    yieldUnits <= 0 ||
    !Number.isSafeInteger(batch) ||
    batch > 1000000000000
  )
    throw new Error('A quantidade no lote está fora do limite.');
  return batch;
}

/** Consumo de insumo arredondado para cima ao centavo, inclusive na prévia. */
export function recipeIngredientCost(
  batchMilli: number,
  packMilli: number,
  packCostCents: number,
) {
  const pack = BigInt(packMilli);
  return (BigInt(batchMilli) * BigInt(packCostCents) + pack - 1n) / pack;
}
