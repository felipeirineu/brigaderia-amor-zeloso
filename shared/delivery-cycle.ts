export const deliveryCycleMin = 2;
export const deliveryCycleMax = 12;
export const deliveryCycleDefault = 4;

export interface CycleEntry {
  id: string;
  customer: string;
  day: string;
  time: number;
  sequence: number;
  count: number | null;
  projected?: boolean;
}
export interface DeliveryCycle {
  customer: string;
  size: number;
  orders: string[];
  days: string[];
  due_on: string | null;
  projected: boolean;
}

/** Recebe somente entregas efetivas e, opcionalmente, as projeções do dia. */
export function deliveryCycles(entries: readonly CycleEntry[]) {
  const current = new Map<string, DeliveryCycle>();
  const positions = new Map<
    string,
    { cycle: DeliveryCycle; position: number }
  >();
  const ordered = [...entries].sort(
    (a, b) =>
      Number(!!a.projected) - Number(!!b.projected) ||
      a.time - b.time ||
      a.sequence - b.sequence ||
      a.id.localeCompare(b.id),
  );
  for (const entry of ordered) {
    if (entry.count === null) {
      current.delete(entry.customer);
      continue;
    }
    let cycle = current.get(entry.customer);
    if (
      !cycle ||
      cycle.size !== entry.count ||
      cycle.orders.length === cycle.size
    ) {
      cycle = {
        customer: entry.customer,
        size: entry.count,
        orders: [],
        days: [],
        due_on: null,
        projected: false,
      };
      current.set(entry.customer, cycle);
    }
    cycle.orders.push(entry.id);
    cycle.days.push(entry.day);
    cycle.projected ||= !!entry.projected;
    if (cycle.orders.length === cycle.size && !cycle.projected)
      cycle.due_on = entry.day;
    positions.set(entry.id, { cycle, position: cycle.orders.length });
  }
  return { current, positions };
}

export interface DeliveryCycleCard {
  order_id: string;
  customer_id: string;
  order_ids: string[];
  days: string[];
  size: number;
  position: number;
  projected: boolean;
  due_on: string | null;
  total_cents: number;
  balance_cents: number;
}
