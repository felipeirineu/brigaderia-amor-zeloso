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
  closed_on_change?: boolean;
}

/** Recebe somente entregas efetivas e, opcionalmente, as projeções do dia. */
export function deliveryCycles(entries: readonly CycleEntry[]) {
  const closures = new Map<string, DeliveryCycle>();
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
    const previous = current.get(entry.customer);
    if (
      !entry.projected &&
      previous &&
      !previous.due_on &&
      previous.size !== entry.count
    ) {
      previous.due_on = entry.day;
      previous.closed_on_change = true;
      closures.set(entry.id, previous);
    }
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
    if (cycle.orders.length === cycle.size && !cycle.projected) {
      cycle.due_on = entry.day;
      closures.set(entry.id, cycle);
    }
    positions.set(entry.id, { cycle, position: cycle.orders.length });
  }
  return { closures, current, positions };
}

export interface DeliveryCycleCard {
  order_id: string;
  customer_id: string;
  order_ids: string[];
  days: string[];
  size: number;
  position: number;
  closed_on_change?: boolean;
  projected: boolean;
  due_on: string | null;
  total_cents: number;
  balance_cents: number;
}
