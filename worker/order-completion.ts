// Alias fixos nas consultas financeiras. A ordem do evento desempata entregas no mesmo segundo.
function latestCompletion(order: string) {
  return `(SELECT e.rowid FROM order_status_events e
    WHERE e.organization_id=${order}.organization_id AND e.order_id=${order}.id
      AND e.to_status IN ('delivered','picked_up')
    ORDER BY e.created_at DESC,e.rowid DESC LIMIT 1)`;
}
export const completedAt = `(SELECT e.created_at FROM order_status_events e WHERE e.rowid=${latestCompletion('o')})`;
export const completionSequence = latestCompletion('o');

// Calcula uma sequência por cliente, sem repetir uma busca por entrega para cada pedido.
export function completionDates(singleCustomer = false) {
  return `WITH completion_dates AS (
    SELECT n.id,
      date(MIN(CASE WHEN n.status='delivered' THEN e.created_at END) OVER (
        PARTITION BY n.customer_id
        ORDER BY COALESCE(e.created_at,unixepoch(n.due_at)),COALESCE(e.rowid,0),n.id
        ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING
      ),'unixepoch','-3 hours') next_delivery_on
    FROM orders n LEFT JOIN order_status_events e ON e.rowid=${latestCompletion('n')}
    WHERE n.organization_id=?1 AND n.active=1 AND n.status IN ('delivered','picked_up')
      ${singleCustomer ? 'AND n.customer_id=?2' : ''}
      AND n.customer_id IN (
        SELECT o.customer_id FROM order_terms t JOIN orders o ON o.organization_id=t.organization_id AND o.id=t.order_id
        WHERE t.organization_id=?1 AND t.payment_mode='next_delivery'
        ${singleCustomer ? 'AND o.customer_id=?2' : ''}
      )
  )`;
}

export function completionDay(
  timestamp: number | null | undefined,
  scheduled: string,
) {
  return new Date(
    (timestamp == null ? Date.parse(scheduled) : timestamp * 1000) - 10800000,
  )
    .toISOString()
    .slice(0, 10);
}
