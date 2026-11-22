import { resolveDeliveryCycles } from './delivery-cycle';
import { HttpError } from './security';
import { readTerms } from './finance-domain';
import { termsDueDate } from '../shared/finance';
import {
  completionDay,
  completedAt,
  completionSequence,
  completionDates,
} from './order-completion';
import { businessDay } from './operations-domain';
export async function receivables(db: D1Database, org: string) {
  const rows = (
    await db
      .prepare(
        `${completionDates()} SELECT o.id,o.customer_id,o.customer_name,o.total_cents,o.due_at,o.status,t.data,co.closing_id,cl.due_on,${completedAt} AS completed_at,${completionSequence} AS completion_sequence,d.next_delivery_on,COALESCE((SELECT SUM(CASE WHEN e.kind='reversal' THEN -p.amount_cents ELSE p.amount_cents END) FROM payment_allocations p JOIN payment_events e ON e.organization_id=p.organization_id AND e.id=p.event_id WHERE p.organization_id=o.organization_id AND p.order_id=o.id),0) AS paid_cents FROM orders o LEFT JOIN completion_dates d ON d.id=o.id LEFT JOIN order_terms t ON t.organization_id=o.organization_id AND t.order_id=o.id LEFT JOIN closing_orders co ON co.organization_id=o.organization_id AND co.order_id=o.id LEFT JOIN closings cl ON cl.organization_id=co.organization_id AND cl.id=co.closing_id WHERE o.organization_id=?1 AND o.active=1 AND o.status IN('delivered','picked_up') LIMIT 5001`,
      )
      .bind(org)
      .all<{
        id: string;
        customer_id: string;
        customer_name: string;
        total_cents: number;
        due_at: string;
        status: string;
        data: string | null;
        closing_id: string | null;
        due_on: string | null;
        completed_at: number | null;
        completion_sequence: number | null;
        next_delivery_on: string | null;
        paid_cents: number;
      }>()
  ).results;
  if (rows.length > 5000)
    throw new HttpError(
      409,
      'Mais de 5000 entregas; paginação necessária antes de calcular.',
    );
  const today = businessDay();
  const { positions } = resolveDeliveryCycles(
    rows.map((o) => ({ ...o, order_id: o.id, terms: o.data })),
  );
  return rows.map((o) => {
    const terms = readTerms(o.data),
      day = completionDay(o.completed_at, o.due_at),
      due = termsDueDate(day, terms, {
        closing: o.due_on,
        nextDelivery: o.next_delivery_on,
        deliveryCycle: positions.get(o.id)?.cycle.due_on,
      }),
      balance = Math.max(0, o.total_cents - o.paid_cents);
    return {
      ...o,
      terms,
      business_date: day,
      due_on: due,
      balance_cents: balance,
      overdue_days:
        due && due < today && balance
          ? Math.floor(
              (Date.parse(today + 'T12:00:00Z') -
                Date.parse(due + 'T12:00:00Z')) /
                86400000,
            )
          : 0,
    };
  });
}
