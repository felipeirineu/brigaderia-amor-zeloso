import { authorizedOwnerDevice } from './push-authorization';

export async function feedbackPushReady(db: D1Database) {
  return !!(await db
    .prepare(
      "SELECT 1 FROM sqlite_schema WHERE type='index' AND name='push_feedback_once'",
    )
    .first());
}

export const validFeedbackJob = `${authorizedOwnerDevice} AND EXISTS(
  SELECT 1 FROM feedback_messages f WHERE f.organization_id=j.organization_id
  AND f.id=j.feedback_id AND f.read_at IS NULL)`;

export async function enqueueFeedbackPush(db: D1Database, clock: Date) {
  await db
    .prepare(
      `
    INSERT OR IGNORE INTO push_jobs(organization_id,id,subscription_id,schedule_key,created_at,mutation_id,feedback_id)
    SELECT f.organization_id,lower(hex(randomblob(16))),s.id,'feedback-'||f.id,?,'',f.id
    FROM feedback_messages f
    JOIN push_subscriptions s ON s.organization_id=f.organization_id AND s.active=1 AND s.created_at<=f.created_at
    JOIN sessions session ON session.organization_id=s.organization_id AND session.token_hash=s.session_hash
      AND session.user_id=s.user_id AND session.expires_at>unixepoch()
    WHERE f.read_at IS NULL AND f.created_at>? AND f.created_at<=? AND ${authorizedOwnerDevice}
      AND NOT EXISTS(SELECT 1 FROM push_jobs j WHERE j.organization_id=s.organization_id AND j.subscription_id=s.id AND j.feedback_id=f.id)
    ORDER BY f.created_at,f.id LIMIT 501`,
    )
    .bind(
      clock.toISOString(),
      new Date(clock.getTime() - 86400000).toISOString(),
      clock.toISOString(),
    )
    .run();
}
