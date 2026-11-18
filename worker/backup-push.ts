import { backupIsDue, type BackupReminder } from '../shared/backup-reminder';
import { authorizedOwnerDevice } from './push-authorization';
/** Um lote de organizações e uma inserção; sem consulta por aparelho/organização. */
export async function enqueueBackupPush(db: D1Database, clock: Date) {
  const settings = (
    await db
      .prepare(
        "SELECT * FROM backup_reminders WHERE period<>'off' ORDER BY organization_id LIMIT 500",
      )
      .all<BackupReminder & { organization_id: string }>()
  ).results;
  const due = settings
    .filter((s) => backupIsDue(s, clock))
    .map((s) => ({ org: s.organization_id, key: s.alert_key }));
  if (!due.length) return;
  await db
    .prepare(
      `INSERT OR IGNORE INTO push_jobs(organization_id,id,subscription_id,schedule_key,created_at,mutation_id,backup_key)
    SELECT s.organization_id,lower(hex(randomblob(16))),s.id,'backup-'||b.alert_key,?,'',b.alert_key
    FROM json_each(?) d JOIN backup_reminders b ON b.organization_id=json_extract(d.value,'$.org') AND b.alert_key=json_extract(d.value,'$.key') AND b.period<>'off'
    JOIN push_subscriptions s ON s.organization_id=b.organization_id AND s.active=1
    JOIN sessions session ON session.organization_id=s.organization_id AND session.token_hash=s.session_hash AND session.user_id=s.user_id AND session.expires_at>unixepoch()
    WHERE ${authorizedOwnerDevice}
    AND NOT EXISTS(SELECT 1 FROM push_jobs j WHERE j.organization_id=s.organization_id AND j.subscription_id=s.id AND j.backup_key=b.alert_key)
    LIMIT 501`,
    )
    .bind(clock.toISOString(), JSON.stringify(due))
    .run();
}
