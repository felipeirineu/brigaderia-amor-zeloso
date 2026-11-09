import {
  buildPushPayload,
  type PushSubscription,
} from '@block65/webcrypto-web-push';
import type { Env } from './security';
import { pushConfigured, pushSchema, pushEndpoint } from './push-config';
import { fortalezaDay, relativeDateTime } from '../shared/workday';
interface Job {
  id: string;
  organization_id: string;
  subscription_id: string;
  reminder_id: string | null;
  schedule_key: string;
  subscription: string;
  title: string | null;
  due_at: string | null;
}
/** Claim atômico antes da chamada externa: não repetir automaticamente um envio incerto. */
export async function processPushJobs(
  env: Env,
  only?: { org: string; id: string },
  clock = new Date(),
) {
  const db = env.DB;
  if (!db || !pushConfigured(env) || !(await pushSchema(db)))
    return { configured: false, claimed: 0, sent: 0, failed: 0 };
  const now = clock.toISOString(),
    old = new Date(clock.getTime() - 600000).toISOString(),
    nonce = crypto.randomUUID();
  await db
    .prepare(
      "UPDATE push_jobs SET state='unknown' WHERE state='processing' AND attempted_at<?",
    )
    .bind(old)
    .run();
  if (!only)
    await db
      .prepare(
        `INSERT OR IGNORE INTO push_jobs(organization_id,id,subscription_id,reminder_id,schedule_key,created_at,mutation_id)
 SELECT a.organization_id,lower(hex(randomblob(16))),s.id,a.reminder_id,a.schedule_key,?,'' FROM reminder_alerts a
 JOIN reminders r ON r.organization_id=a.organization_id AND r.id=a.reminder_id
 JOIN reminder_recipients p ON p.organization_id=a.organization_id AND p.reminder_id=a.reminder_id
 JOIN push_subscriptions s ON s.organization_id=p.organization_id AND s.user_id=p.user_id AND s.active=1
 JOIN sessions session ON session.organization_id=s.organization_id AND session.token_hash=s.session_hash AND session.expires_at>unixepoch()
 WHERE a.alert_at IS NOT NULL AND a.alert_at<=? AND (a.alert_at>=s.created_at OR a.updated_at>=s.created_at) AND r.active=1 AND r.done=0 AND NOT EXISTS(SELECT 1 FROM push_jobs j WHERE j.organization_id=a.organization_id AND j.reminder_id=a.reminder_id AND j.schedule_key=a.schedule_key AND j.subscription_id=s.id)
 LIMIT 501`,
      )
      .bind(now, now)
      .run();
  // Concluir, arquivar, mudar o horário ou revogar o aparelho cancela o pendente.
  await db
    .prepare(
      `UPDATE push_jobs SET state='cancelled' WHERE state='pending' AND (
 NOT EXISTS(SELECT 1 FROM push_subscriptions s JOIN memberships m ON m.organization_id=s.organization_id AND m.user_id=s.user_id JOIN sessions session ON session.organization_id=s.organization_id AND session.token_hash=s.session_hash WHERE s.organization_id=push_jobs.organization_id AND s.id=push_jobs.subscription_id AND s.active=1 AND session.expires_at>unixepoch())
 OR (reminder_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM reminders r JOIN reminder_alerts a ON a.organization_id=r.organization_id AND a.reminder_id=r.id JOIN reminder_recipients p ON p.organization_id=r.organization_id AND p.reminder_id=r.id JOIN push_subscriptions s ON s.organization_id=p.organization_id AND s.user_id=p.user_id WHERE r.organization_id=push_jobs.organization_id AND r.id=push_jobs.reminder_id AND r.active=1 AND r.done=0 AND a.schedule_key=push_jobs.schedule_key AND s.id=push_jobs.subscription_id)))`,
    )
    .run();
  await db
    .prepare(
      `UPDATE push_jobs SET state='processing',attempted_at=?,claim_nonce=? WHERE state='pending' AND (organization_id,id) IN(SELECT organization_id,id FROM push_jobs WHERE state='pending'${only ? ' AND organization_id=? AND id=?' : ''} ORDER BY created_at,id LIMIT 5)`,
    )
    .bind(now, nonce, ...(only ? [only.org, only.id] : []))
    .run();
  const jobs = (
    await db
      .prepare(
        `SELECT j.id,j.organization_id,j.subscription_id,j.reminder_id,j.schedule_key,s.subscription,r.title,r.due_at FROM push_jobs j JOIN push_subscriptions s ON s.organization_id=j.organization_id AND s.id=j.subscription_id LEFT JOIN reminders r ON r.organization_id=j.organization_id AND r.id=j.reminder_id WHERE j.claim_nonce=? AND j.state='processing'`,
      )
      .bind(nonce)
      .all<Job>()
  ).results;
  const results = await Promise.all(
    jobs.map(async (job) => {
      let state: string,
        code = 0;
      try {
        // Reconfere revogação/conclusão depois do claim, antes de tentar o envio.
        const valid = await db
          .prepare(
            `SELECT 1 FROM push_jobs j JOIN push_subscriptions s ON s.organization_id=j.organization_id AND s.id=j.subscription_id JOIN sessions session ON session.organization_id=s.organization_id AND session.token_hash=s.session_hash WHERE j.organization_id=? AND j.id=? AND j.claim_nonce=? AND s.active=1 AND session.expires_at>unixepoch() AND (j.reminder_id IS NULL OR EXISTS(SELECT 1 FROM reminders r JOIN reminder_alerts a ON a.organization_id=r.organization_id AND a.reminder_id=r.id WHERE r.organization_id=j.organization_id AND r.id=j.reminder_id AND r.active=1 AND r.done=0 AND a.schedule_key=j.schedule_key AND EXISTS(SELECT 1 FROM reminder_recipients p WHERE p.organization_id=j.organization_id AND p.reminder_id=j.reminder_id AND p.user_id=s.user_id)))`,
          )
          .bind(job.organization_id, job.id, nonce)
          .first();
        if (!valid) state = 'cancelled';
        else {
          const subscription = JSON.parse(job.subscription) as PushSubscription;
          pushEndpoint(subscription.endpoint);
          const payload = await buildPushPayload(
            {
              data: {
                title: 'Amor Zeloso · Lembrete',
                body: job.reminder_id
                  ? `${job.title} · ${relativeDateTime(job.due_at!)}`
                  : 'Aviso de teste deste aparelho.',
                tag: 'az-' + job.id,
                url: job.due_at
                  ? '/gestao?day=' + fortalezaDay(new Date(job.due_at))
                  : '/gestao',
              },
              options: { ttl: 3600, urgency: 'normal' },
            },
            subscription,
            {
              subject: env.VAPID_SUBJECT,
              publicKey: env.VAPID_PUBLIC_KEY,
              privateKey: env.VAPID_PRIVATE_KEY,
            },
          );
          const response = await fetch(subscription.endpoint, {
            ...payload,
            redirect: 'manual',
            signal: AbortSignal.timeout(10000),
          });
          code = response.status;
          state = response.ok
            ? 'sent'
            : response.status >= 500
              ? 'unknown'
              : 'failed';
          // Nunca registrar endpoint, conteúdo ou erro do provedor.
        }
      } catch {
        state = 'unknown';
      }
      return { job, state, code };
    }),
  );
  if (results.length)
    await db.batch(
      results.map(({ job, state, code }) =>
        db
          .prepare(
            "UPDATE push_jobs SET state=?,status_code=? WHERE organization_id=? AND id=? AND claim_nonce=? AND state='processing'",
          )
          .bind(state, code || null, job.organization_id, job.id, nonce),
      ),
    );
  const gone = results.filter((r) => [404, 410].includes(r.code));
  if (gone.length)
    await db
      .prepare(
        "UPDATE push_subscriptions SET active=0,subscription='{}',version=version+1 WHERE (organization_id,id) IN(SELECT json_extract(value,'$.org'),json_extract(value,'$.id') FROM json_each(?))",
      )
      .bind(
        JSON.stringify(
          gone.map((r) => ({
            org: r.job.organization_id,
            id: r.job.subscription_id,
          })),
        ),
      )
      .run();
  return {
    configured: true,
    claimed: jobs.length,
    sent: results.filter((r) => r.state === 'sent').length,
    failed: results.filter((r) => r.state !== 'sent').length,
  };
}
