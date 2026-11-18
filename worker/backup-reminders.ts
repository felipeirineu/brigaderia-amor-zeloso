import { z } from 'zod';
import { HttpError, json, type Actor } from './security';
import { ownerOnly, p1Mutation } from './p1-common';
import { backupIsDue, type BackupReminder } from '../shared/backup-reminder';
export async function backupSchema(db: D1Database) {
  const row = await db
    .prepare(
      "SELECT (SELECT COUNT(*) FROM sqlite_schema WHERE type='table' AND name IN('backup_reminders','backup_exports')) tables_count,(SELECT COUNT(*) FROM pragma_table_info('push_jobs') WHERE name='backup_key') job_column,(SELECT COUNT(*) FROM sqlite_schema WHERE type='index' AND name='push_backup_once') job_index",
    )
    .first<{ tables_count: number; job_column: number; job_index: number }>();
  return {
    ready:
      row?.tables_count === 2 && row.job_column === 1 && row.job_index === 1,
    column: row?.job_column === 1,
  };
}
export async function backupReminders(
  req: Request,
  db: D1Database,
  a: Actor,
  resource: string,
  id?: string,
) {
  const org = a.organization_id,
    action = new URL(req.url).pathname.split('/')[5];
  if (
    !z.uuid().safeParse(id).success ||
    (resource === 'backup-reminders' && id !== org)
  )
    throw new HttpError(404, 'Configuração não encontrada.');
  ownerOnly(a);
  const schema = await backupSchema(db);
  if (!schema.ready) {
    if (req.method === 'GET' && resource === 'backup-reminders' && !action)
      return json({ ready: false });
    throw new HttpError(503, 'Lembrete de backup ainda indisponível.');
  }
  const settings = await db
    .prepare(
      'SELECT id,period,weekday,time,last_backup_at,snoozed_until,created_at,alert_key,version FROM backup_reminders WHERE organization_id=? AND id=?',
    )
    .bind(org, org)
    .first<BackupReminder>();
  if (!settings) throw new HttpError(404, 'Configuração não encontrada.');
  if (resource === 'backup-reminders' && req.method === 'GET' && !action)
    return json({ ready: true, settings });
  if (resource === 'backup-exports') {
    const receipt = await db
      .prepare(
        'SELECT requested_at,expires_at,completed_at FROM backup_exports WHERE organization_id=? AND id=? AND user_id=?',
      )
      .bind(org, id!, a.user_id)
      .first<{
        requested_at: string;
        expires_at: string;
        completed_at: string | null;
      }>();
    if (!receipt) throw new HttpError(404, 'Exportação não encontrada.');
    if (req.method !== 'POST' || action !== 'complete')
      throw new HttpError(405, 'Método não permitido.');
    return p1Mutation(req, db, a, async (raw, nonce) => {
      z.object({}).strict().parse(raw);
      const now = new Date().toISOString();
      if (receipt.expires_at < now)
        throw new HttpError(
          409,
          'Confirmação expirada. Faça outro backup para atualizar o lembrete.',
        );
      return {
        id: id!,
        table: 'backup_exports',
        action: 'backup.export_completed',
        response: { id },
        first: db
          .prepare(
            'UPDATE backup_exports SET completed_at=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND user_id=? AND completed_at IS NULL AND expires_at>=?',
          )
          .bind(now, nonce, org, id!, a.user_id, now),
        rest: (guard, args) => [
          db
            .prepare(
              `UPDATE backup_reminders SET last_backup_at=?,snoozed_until=NULL,alert_key=?,version=version+1 WHERE organization_id=? AND id=? AND (last_backup_at IS NULL OR last_backup_at<?) AND ${guard}`,
            )
            .bind(
              receipt.requested_at,
              nonce,
              org,
              org,
              receipt.requested_at,
              ...args,
            ),
        ],
      };
    });
  }
  if (!(
    (req.method === 'PUT' && !action) ||
    (req.method === 'POST' && action === 'snooze')
  ))
    throw new HttpError(405, 'Método não permitido.');
  return p1Mutation(req, db, a, async (raw, nonce) => {
    const now = new Date(),
      until = new Date(now.getTime() + 3600000).toISOString();
    if (action === 'snooze') {
      const d = z
        .object({
          version: z.number().int().positive(),
          alert_key: z.string().min(1).max(100),
        })
        .strict()
        .parse(raw);
      if (!backupIsDue(settings, now) || d.alert_key !== settings.alert_key)
        throw new HttpError(409, 'Este lembrete já mudou. Atualize a tela.');
      return {
        id: org,
        table: 'backup_reminders',
        action: 'backup.reminder_snoozed',
        response: { id: org, snoozed_until: until },
        first: db
          .prepare(
            'UPDATE backup_reminders SET snoozed_until=?,alert_key=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=? AND alert_key=?',
          )
          .bind(until, nonce, nonce, org, org, d.version, d.alert_key),
        rest: () => [],
      };
    }
    const d = z
      .object({
        version: z.number().int().positive(),
        period: z.enum(['weekly', 'fortnightly', 'monthly', 'off']),
        weekday: z.number().int().min(1).max(7),
        time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
      })
      .strict()
      .parse(raw);
    const changed =
      d.period !== settings.period ||
      d.weekday !== settings.weekday ||
      d.time !== settings.time;
    return {
      id: org,
      table: 'backup_reminders',
      action: 'backup.reminder_updated',
      response: { id: org },
      first: db
        .prepare(
          'UPDATE backup_reminders SET period=?,weekday=?,time=?,snoozed_until=?,alert_key=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
        )
        .bind(
          d.period,
          d.weekday,
          d.time,
          changed ? null : settings.snoozed_until,
          changed ? nonce : settings.alert_key,
          nonce,
          org,
          org,
          d.version,
        ),
      rest: () => [],
    };
  });
}
