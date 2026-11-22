import { deliveryCycles } from '../shared/delivery-cycle';
import { deliveryCycleSize } from '../shared/finance';
import { readTerms } from './finance-domain';
import {
  completionDay,
  completedAt,
  completionSequence,
} from './order-completion';
import { addDays, utcStart } from './operations-domain';
import { HttpError } from './security';

interface CycleRow {
  order_id: string;
  customer_id: string;
  due_at: string;
  active?: number;
  status: string;
  completed_at: number | null;
  completion_sequence: number | null;
  terms: string | null;
}

export function resolveDeliveryCycles(
  rows: readonly CycleRow[],
  projectDay?: string,
) {
  return deliveryCycles(
    rows.flatMap((o) => {
      if (o.active === 0) return [];
      const complete = o.status === 'delivered' || o.status === 'picked_up';
      const planned =
        !complete &&
        ['confirmed', 'in_production', 'ready', 'out_for_delivery'].includes(
          o.status,
        );
      const day = completionDay(complete ? o.completed_at : null, o.due_at);
      const count = deliveryCycleSize(readTerms(o.terms));
      return complete || (planned && day === projectDay && count !== null)
        ? [
            {
              id: o.order_id,
              customer: o.customer_id,
              day,
              time:
                (complete ? o.completed_at : null) ??
                Date.parse(o.due_at) / 1000,
              sequence: o.completion_sequence ?? 0,
              count,
              projected: !complete,
            },
          ]
        : [];
    }),
  );
}

export async function todayDeliveryCycles(
  db: D1Database,
  org: string,
  day: string,
  customerIds: string[] | null = null,
) {
  if (customerIds?.length === 0) return [];
  const filter = customerIds ? JSON.stringify(customerIds) : null;
  // Uma consulta para os clientes que têm a condição no dia, incluindo o histórico efetivo.
  const rows = (
    await db
      .prepare(
        `WITH clients AS (
      SELECT DISTINCT x.customer_id
      FROM orders x JOIN order_terms xt ON xt.organization_id=x.organization_id AND xt.order_id=x.id
      WHERE x.organization_id=?1 AND x.active=1
        AND (x.customer_id IN (SELECT value FROM json_each(?4)) OR ?4 IS NULL)
        AND xt.payment_mode='credit' AND json_extract(xt.data,'$.cycle')='deliveries'
        AND (x.due_at>=?2 AND x.due_at<?3 OR x.id IN (
          SELECT order_id FROM order_status_events WHERE organization_id=?1
          AND to_status IN ('delivered','picked_up') AND created_at>=unixepoch(?2) AND created_at<unixepoch(?3)
        ))
    )
    SELECT o.id AS order_id,o.customer_id,o.status,o.due_at,o.total_cents,t.data AS terms,
      ${completedAt} AS completed_at,${completionSequence} AS completion_sequence,
      MAX(0,o.total_cents-COALESCE((SELECT SUM(CASE WHEN e.kind='reversal' THEN -a.amount_cents ELSE a.amount_cents END)
        FROM payment_allocations a JOIN payment_events e ON e.organization_id=a.organization_id AND e.id=a.event_id
        WHERE a.organization_id=o.organization_id AND a.order_id=o.id),0)) AS balance_cents
    FROM orders o LEFT JOIN order_terms t ON t.organization_id=o.organization_id AND t.order_id=o.id
    WHERE o.organization_id=?1 AND o.active=1 AND o.customer_id IN (SELECT customer_id FROM clients)
      AND (o.status IN ('delivered','picked_up') OR (o.due_at>=?2 AND o.due_at<?3
        AND o.status IN ('confirmed','in_production','ready','out_for_delivery')))
    LIMIT 5001`,
      )
      .bind(org, utcStart(day), utcStart(addDays(day, 1)), filter)
      .all<CycleRow & { total_cents: number; balance_cents: number }>()
  ).results;
  if (rows.length > 5000)
    throw new HttpError(409, 'Mais de 5000 entregas nas contas do dia.');
  const { positions } = resolveDeliveryCycles(rows, day);
  const orders = new Map(rows.map((row) => [row.order_id, row]));
  return [...positions].map(([order_id, { cycle, position }]) => ({
    customer_id: cycle.customer,
    order_id,
    order_ids: cycle.orders,
    days: cycle.days,
    position,
    size: cycle.size,
    due_on: cycle.due_on,
    projected: cycle.projected,
    total_cents: cycle.orders.reduce(
      (sum, id) => sum + orders.get(id)!.total_cents,
      0,
    ),
    balance_cents: cycle.orders.reduce(
      (sum, id) => sum + orders.get(id)!.balance_cents,
      0,
    ),
  }));
}
