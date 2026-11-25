import { calculateExchange } from '../shared/order-exchange';
import { allocateFlavorRevenue, type FlavorLine } from './flavor-lines';

export function exchangeReportLines(
  lines: FlavorLine[],
  orders: { id: string; exchange_units?: number }[],
) {
  const exchanges = new Map(
    orders
      .filter((o) => o.exchange_units)
      .map((o) => [o.id, o.exchange_units!]),
  );
  if (!exchanges.size) return { sold: lines, losses: [] };
  const groups = new Map<string, Map<string, FlavorLine[]>>();
  const sold: FlavorLine[] = [];
  const losses: FlavorLine[] = [];
  for (const line of lines) {
    if (!exchanges.has(line.order_id) || line.kit_id) {
      sold.push(line);
      continue;
    }
    const order = groups.get(line.order_id) ?? new Map<string, FlavorLine[]>();
    const item = order.get(line.item_id) ?? [];
    item.push(line);
    order.set(line.item_id, item);
    groups.set(line.order_id, order);
  }
  for (const [id, items] of groups) {
    const total = (rows: FlavorLine[]) =>
      rows.reduce((n, line) => n + line.allocated_cents, 0);
    const { replacements } = calculateExchange(
      [...items].map(([item, rows]) => ({
        id: item,
        units: rows.reduce((n, line) => n + line.units, 0),
        cents: total(rows),
      })),
      exchanges.get(id)!,
    );
    for (const [item, rows] of items) {
      const replacement = replacements.get(item);
      if (!replacement) {
        sold.push(...rows);
        continue;
      }
      let remaining = replacement.units;
      const billed: FlavorLine[] = [];
      // A troca não escolhe sabor. Dentro da caixa, a ordem do snapshot resolve o empate.
      for (const line of rows) {
        const removed = Math.min(remaining, line.units);
        remaining -= removed;
        if (removed)
          losses.push({
            ...line,
            units: removed,
            boxes: 0,
            allocated_cents: 0,
          });
        if (line.units > removed)
          billed.push({
            ...line,
            units: line.units - removed,
            boxes: line.boxes ? (line.units - removed) / line.units_per_box : 0,
          });
      }
      if (!billed.length) continue;
      const allocation = allocateFlavorRevenue(
        total(rows) - replacement.cents,
        billed.map((l) => ({ id: l.variant_id, units: l.units })),
      );
      sold.push(
        ...billed.map((l) => ({
          ...l,
          allocated_cents: allocation.get(l.variant_id)!,
        })),
      );
    }
  }
  return { sold, losses };
}
