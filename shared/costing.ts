/** Preço por margem sobre venda, em centavos inteiros, arredondado para cima. */
export function priceForMargin(cost: number, marginBps: number) {
  if (
    !Number.isSafeInteger(cost) ||
    cost < 0 ||
    !Number.isInteger(marginBps) ||
    marginBps < 0 ||
    marginBps > 9500
  )
    throw Error('Custo/margem inválidos.');
  const numerator = BigInt(cost) * 10000n,
    denominator = BigInt(10000 - marginBps),
    price = (numerator + denominator - 1n) / denominator;
  if (price > 1000000000000n) throw Error('Estimativa excede o limite.');
  return Number(price);
}
