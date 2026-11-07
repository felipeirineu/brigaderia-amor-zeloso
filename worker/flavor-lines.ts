import { compositionSchema } from './mixed';
import { HttpError } from './security';
export interface FlavorLine {
  item_id: string;
  order_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  weight_grams: number;
  units_per_box: number;
  item_quantity: number;
  per_box_units: number;
  units: number;
  boxes: number;
  mixed: boolean;
  allocated_cents: number;
}
interface RawLine extends Omit<FlavorLine, 'allocated_cents' | 'mixed'> {
  mixed: number;
  item_total_cents: number;
  box_capacity: number;
}
/** Rateio por unidades: maior resto, sem perder centavos, inclusive em caixas iguais. */
export function allocateFlavorRevenue(
  total: number,
  shares: { id: string; units: number }[],
) {
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    !shares.length ||
    shares.some((s) => !Number.isSafeInteger(s.units) || s.units <= 0)
  )
    throw new HttpError(
      409,
      'Composição ou valor inconsistente. Revise o pedido.',
    );
  const denominator = shares.reduce((n, s) => n + BigInt(s.units), 0n);
  const rows = shares.map((s) => ({
    id: s.id,
    cents: (BigInt(total) * BigInt(s.units)) / denominator,
    remainder: (BigInt(total) * BigInt(s.units)) % denominator,
  }));
  let remaining = BigInt(total) - rows.reduce((n, s) => n + s.cents, 0n);
  for (const row of [...rows].sort((a, b) =>
    a.remainder === b.remainder
      ? a.id.localeCompare(b.id)
      : a.remainder > b.remainder
        ? -1
        : 1,
  )) {
    if (remaining === 0n) break;
    row.cents++;
    remaining--;
  }
  return new Map(rows.map((r) => [r.id, Number(r.cents)]));
}
/** Uma consulta de linhas e uma checagem de schema, sem N+1 nem catálogo atual. */
export async function flavorLines(
  db: D1Database,
  org: string,
  orderIds: string[],
): Promise<FlavorLine[]> {
  if (!orderIds.length) return [];
  const mixed = await compositionSchema(db);
  const simple = `SELECT i.id item_id,i.order_id,i.variant_id,i.product_name,i.variant_label,i.weight_grams,i.units_per_box,i.quantity item_quantity,i.units_per_box per_box_units,i.quantity*i.units_per_box units,i.quantity boxes,0 mixed,i.quantity*i.unit_price_cents item_total_cents,i.units_per_box box_capacity FROM selected i${mixed ? ' WHERE NOT EXISTS(SELECT 1 FROM order_item_components c WHERE c.organization_id=i.organization_id AND c.item_id=i.id)' : ''}`;
  const components = mixed
    ? ` UNION ALL SELECT i.id,i.order_id,c.variant_id,c.product_name,c.variant_label,c.weight_grams,c.units_per_box,i.quantity,c.units,i.quantity*c.units,0,1,i.quantity*i.unit_price_cents,i.units_per_box FROM selected i JOIN order_item_components c ON c.organization_id=i.organization_id AND c.item_id=i.id`
    : '';
  const rows = (
    await db
      .prepare(
        `WITH selected AS (SELECT i.* FROM order_items i JOIN orders o ON o.organization_id=i.organization_id AND o.id=i.order_id WHERE i.organization_id=? AND i.order_id IN(SELECT value FROM json_each(?))) ${simple}${components} ORDER BY item_id,variant_id LIMIT 10001`,
      )
      .bind(org, JSON.stringify(orderIds))
      .all<RawLine>()
  ).results;
  if (rows.length > 10000)
    throw new HttpError(
      409,
      'Mais de 10000 linhas de sabores; reduza o período.',
    );
  const grouped = new Map<string, RawLine[]>();
  for (const row of rows) {
    const group = grouped.get(row.item_id) ?? [];
    group.push(row);
    grouped.set(row.item_id, group);
  }
  const output: FlavorLine[] = [];
  for (const group of grouped.values()) {
    const first = group[0];
    if (
      first.mixed &&
      group.reduce((n, r) => n + r.per_box_units, 0) !== first.box_capacity
    )
      throw new HttpError(
        409,
        'Composição inconsistente. Revise a caixa mista antes de calcular.',
      );
    const amounts = allocateFlavorRevenue(
      first.item_total_cents,
      group.map((r) => ({ id: r.variant_id, units: r.per_box_units })),
    );
    for (const r of group) {
      output.push({
        ...r,
        mixed: !!r.mixed,
        allocated_cents: amounts.get(r.variant_id)!,
      });
    }
  }
  return output;
}
export function flavorItemTexts(lines: FlavorLine[]) {
  const groups = new Map<string, FlavorLine[]>();
  for (const line of lines) {
    const g = groups.get(line.item_id) ?? [];
    g.push(line);
    groups.set(line.item_id, g);
  }
  return [...groups.values()].map((group) =>
    group[0].mixed
      ? `${group[0].item_quantity}× Mista: ${group.map((c) => `${c.per_box_units} ${c.product_name} — ${c.variant_label}`).join(' + ')}`
      : `${group[0].item_quantity}× ${group[0].product_name} — ${group[0].variant_label}`,
  );
}
