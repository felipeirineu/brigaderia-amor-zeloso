import { fortalezaDay } from '../shared/workday';
import { todayDeliveryCycles } from './delivery-cycle';
import { addDays, utcStart } from './operations-domain';
import { authorizedDevice } from './push-authorization';

export const deliveryCyclePushPrefix = 'delivery-cycle:';

export async function enqueueDeliveryCyclePush(db: D1Database, clock: Date) {
  const day = fortalezaDay(clock);
  const hour = (clock.getUTCHours() + 21) % 24;
  const key = deliveryCyclePushPrefix + day;
  const eligible = new Set<string>();
  if (hour < 8 || hour >= 12) return { key, eligible };
  if (
    !(await db
      .prepare(
        "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='order_terms'",
      )
      .first())
  )
    return { key, eligible };

  const { results } = await db
    .prepare(
      `SELECT DISTINCT o.organization_id
     FROM orders o
     WHERE o.active=1 AND EXISTS (
       SELECT 1 FROM orders prior JOIN order_terms t ON t.organization_id=prior.organization_id AND t.order_id=prior.id
       WHERE prior.organization_id=o.organization_id AND prior.customer_id=o.customer_id
         AND t.payment_mode='credit' AND json_extract(t.data,'$.cycle')='deliveries'
     )
       AND (o.due_at>=?1 AND o.due_at<?2 OR EXISTS (
         SELECT 1 FROM order_status_events e WHERE e.organization_id=o.organization_id AND e.order_id=o.id
         AND e.to_status IN ('delivered','picked_up') AND e.created_at>=unixepoch(?1) AND e.created_at<unixepoch(?2)
       ))
       AND EXISTS(SELECT 1 FROM push_subscriptions s WHERE s.organization_id=o.organization_id AND s.active=1)
     ORDER BY o.organization_id LIMIT 20`,
    )
    .bind(utcStart(day), utcStart(addDays(day, 1)))
    .all<{ organization_id: string }>();
  for (const { organization_id } of results) {
    const cards = await todayDeliveryCycles(db, organization_id, day);
    if (
      cards.some(
        (c) =>
          (c.position === c.size || c.closed_on_change) &&
          c.balance_cents > 0 &&
          (c.due_on === day || (c.projected && c.days.at(-1) === day)),
      )
    )
      eligible.add(organization_id);
  }
  if (eligible.size)
    await db
      .prepare(
        `INSERT OR IGNORE INTO push_jobs(organization_id,id,subscription_id,schedule_key,created_at,mutation_id)
       SELECT s.organization_id,?1||':'||s.id,s.id,?1,?2,''
       FROM push_subscriptions s JOIN sessions session ON session.organization_id=s.organization_id
         AND session.token_hash=s.session_hash AND session.user_id=s.user_id AND session.expires_at>unixepoch()
       WHERE s.active=1 AND s.organization_id IN (SELECT value FROM json_each(?3)) AND ${authorizedDevice}`,
      )
      .bind(key, clock.toISOString(), JSON.stringify([...eligible]))
      .run();

  return { key, eligible };
}
