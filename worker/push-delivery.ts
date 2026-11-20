import {
  enqueueFeedbackPush,
  feedbackPushReady,
  validFeedbackJob,
} from './feedback-push';
import { backupSchema } from './backup-reminders';
import { enqueueBackupPush } from './backup-push';
import { authorizedDevice, authorizedOwnerDevice } from './push-authorization';
import { backupLastLabel } from '../shared/backup-reminder';
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
  backup_key: string | null;
  feedback_id: string | null;
  last_backup_at: string | null;
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
  const [backup, feedbackReady] = await Promise.all([
    backupSchema(db),
    feedbackPushReady(db),
  ]);
  const backupEnabled =
    backup.ready &&
    env.P1_ENABLED === 'true' &&
    env.P1_TOOLS_ENABLED === 'true';
  const validBackup = backupEnabled
    ? `EXISTS(SELECT 1 FROM backup_reminders b WHERE b.organization_id=j.organization_id AND b.alert_key=j.backup_key AND b.period<>'off') AND ${authorizedOwnerDevice}`
    : '0';
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
 JOIN sessions session ON session.organization_id=s.organization_id AND session.token_hash=s.session_hash AND session.expires_at>unixepoch() AND session.user_id=s.user_id AND ${authorizedDevice}
 WHERE a.alert_at IS NOT NULL AND a.alert_at<=? AND (a.alert_at>=s.created_at OR a.updated_at>=s.created_at) AND r.active=1 AND r.done=0 AND NOT EXISTS(SELECT 1 FROM push_jobs j WHERE j.organization_id=a.organization_id AND j.reminder_id=a.reminder_id AND j.schedule_key=a.schedule_key AND j.subscription_id=s.id)
 LIMIT 501`,
      )
      .bind(now, now)
      .run();
  if (!only && backupEnabled) await enqueueBackupPush(db, clock);
  if (backup.column) {
    const valid = backupEnabled
      ? `EXISTS(SELECT 1 FROM backup_reminders b JOIN push_subscriptions s ON s.organization_id=b.organization_id AND s.id=j.subscription_id WHERE b.organization_id=j.organization_id AND b.alert_key=j.backup_key AND b.period<>'off' AND ${authorizedOwnerDevice})`
      : '0';
    await db
      .prepare(
        `UPDATE push_jobs AS j SET state='cancelled' WHERE state='pending' AND backup_key IS NOT NULL AND NOT (${valid})`,
      )
      .run();
  }
  if (feedbackReady) {
    if (!only) await enqueueFeedbackPush(db, clock);
    await db
      .prepare(
        `UPDATE push_jobs AS j SET state='cancelled' WHERE state='pending' AND feedback_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM push_subscriptions s WHERE s.organization_id=j.organization_id AND s.id=j.subscription_id AND ${validFeedbackJob}
    )`,
      )
      .run();
  }
  // Concluir, arquivar, mudar o horário ou revogar o aparelho cancela o pendente.
  await db
    .prepare(
      `UPDATE push_jobs SET state='cancelled' WHERE state='pending' AND (
 NOT EXISTS(SELECT 1 FROM push_subscriptions s JOIN sessions session ON session.organization_id=s.organization_id AND session.token_hash=s.session_hash WHERE s.organization_id=push_jobs.organization_id AND s.id=push_jobs.subscription_id AND s.active=1 AND session.expires_at>unixepoch() AND session.user_id=s.user_id AND ${authorizedDevice})
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
        `SELECT j.id,j.organization_id,j.subscription_id,j.reminder_id,j.schedule_key,s.subscription,r.title,r.due_at,${feedbackReady ? 'j.feedback_id' : 'NULL'} feedback_id,${backup.column ? 'j.backup_key' : 'NULL'} backup_key,${backupEnabled ? 'b.last_backup_at' : 'NULL'} last_backup_at FROM push_jobs j JOIN push_subscriptions s ON s.organization_id=j.organization_id AND s.id=j.subscription_id LEFT JOIN reminders r ON r.organization_id=j.organization_id AND r.id=j.reminder_id ${backupEnabled ? 'LEFT JOIN backup_reminders b ON b.organization_id=j.organization_id AND b.alert_key=j.backup_key' : ''} WHERE j.claim_nonce=? AND j.state='processing'`,
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
            `SELECT 1 FROM push_jobs j JOIN push_subscriptions s ON s.organization_id=j.organization_id AND s.id=j.subscription_id JOIN sessions session ON session.organization_id=s.organization_id AND session.token_hash=s.session_hash WHERE j.organization_id=? AND j.id=? AND j.claim_nonce=? AND s.active=1 AND session.expires_at>unixepoch() AND session.user_id=s.user_id AND ${authorizedDevice} ${feedbackReady ? `AND (j.feedback_id IS NULL OR (${validFeedbackJob}))` : ''} ${backup.column ? `AND (j.backup_key IS NULL OR (${validBackup}))` : ''} AND (j.reminder_id IS NULL OR EXISTS(SELECT 1 FROM reminders r JOIN reminder_alerts a ON a.organization_id=r.organization_id AND a.reminder_id=r.id WHERE r.organization_id=j.organization_id AND r.id=j.reminder_id AND r.active=1 AND r.done=0 AND a.schedule_key=j.schedule_key AND EXISTS(SELECT 1 FROM reminder_recipients p WHERE p.organization_id=j.organization_id AND p.reminder_id=j.reminder_id AND p.user_id=s.user_id)))`,
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
                title: job.backup_key
                  ? 'Está na hora de fazer o backup!'
                  : job.feedback_id
                    ? 'Nova sugestão no app'
                    : 'Amor Zeloso · Lembrete',
                body: job.backup_key
                  ? backupLastLabel(
                      { last_backup_at: job.last_backup_at },
                      clock,
                    )
                  : job.feedback_id
                    ? 'Veja em Recebidas.'
                    : job.reminder_id
                      ? `${job.title} · ${relativeDateTime(job.due_at!)}`
                      : 'Aviso de teste deste aparelho.',
                tag: job.backup_key
                  ? 'az-backup-' + job.organization_id
                  : 'az-' + job.id,
                ...(job.backup_key
                  ? {
                      kind: 'backup',
                      backup_id: job.organization_id,
                      backup_key: job.backup_key,
                    }
                  : {}),
                url: job.backup_key
                  ? '/gestao/backup'
                  : job.feedback_id
                    ? '/gestao/recebidas'
                    : job.due_at
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
