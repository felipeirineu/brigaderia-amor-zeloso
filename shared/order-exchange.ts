export interface ExchangeLine {
  id: string;
  units: number;
  cents: number;
}

export function calculateExchange(lines: ExchangeLine[], collected: number) {
  const eligible = lines.reduce((sum, line) => sum + line.units, 0);
  if (!Number.isSafeInteger(collected) || collected < 0 || collected > eligible)
    throw new Error('A troca deve caber na quantidade de doces fora dos kits.');
  const ranked = collected
    ? [...lines].sort((a, b) => {
        const diff =
          BigInt(a.cents) * BigInt(b.units) - BigInt(b.cents) * BigInt(a.units);
        return diff < 0n ? -1 : diff > 0n ? 1 : a.id.localeCompare(b.id);
      })
    : [];
  const replacements = new Map<string, { units: number; cents: number }>();
  let remaining = collected;
  let discount = 0;
  for (const line of ranked) {
    if (!remaining) break;
    const units = Math.min(remaining, line.units);
    const denominator = BigInt(line.units);
    const cents = Number(
      (BigInt(units) * BigInt(line.cents) + denominator / 2n) / denominator,
    );
    replacements.set(line.id, { units, cents });
    discount += cents;
    remaining -= units;
  }
  return { eligible, discount, replacements };
}

export function exchangePreview(lines: ExchangeLine[], units: number) {
  const eligible = lines.reduce((total, line) => total + line.units, 0);
  const collected = Math.min(units, eligible);
  return { ...calculateExchange(lines, collected), collected };
}

export interface ExchangeOrder {
  exchange_units?: number;
  exchange_discount_cents?: number;
  exchange_delivered_units?: number;
  items?: {
    quantity: number;
    units_per_box?: number;
    units_per_kit?: number;
  }[];
}

export function exchangeDelivered(order: ExchangeOrder) {
  return (
    order.exchange_delivered_units ??
    order.items?.reduce(
      (sum, item) =>
        sum + item.quantity * (item.units_per_box ?? item.units_per_kit ?? 0),
      0,
    ) ??
    0
  );
}

export function exchangeLabel(order: ExchangeOrder) {
  const units = order.exchange_units ?? 0;
  if (!units) return '';
  const delivered = exchangeDelivered(order);
  return `Troca: ${units} ${units === 1 ? 'doce' : 'doces'} · ${delivered} entregues · cobrados ${delivered - units}`;
}
