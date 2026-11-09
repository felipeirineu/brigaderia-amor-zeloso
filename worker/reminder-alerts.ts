import { hash, HttpError } from './security';
export interface ReminderAlert {
  alert_at: string | null;
  recipient_ids: string[];
  schedule_key: string;
}
export async function alertDetails(db: D1Database, org: string, ids: string[]) {
  const map = new Map<string, ReminderAlert>();
  if (!ids.length) return map;
  const [alerts, recipients] = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        'SELECT reminder_id,alert_at,schedule_key FROM reminder_alerts WHERE organization_id=? AND reminder_id IN(SELECT value FROM json_each(?))',
      )
      .bind(org, JSON.stringify(ids)),
    db
      .prepare(
        'SELECT reminder_id,user_id FROM reminder_recipients WHERE organization_id=? AND reminder_id IN(SELECT value FROM json_each(?)) ORDER BY user_id',
      )
      .bind(org, JSON.stringify(ids)),
  ]);
  for (const a of alerts.results)
    map.set(String(a.reminder_id), {
      alert_at: a.alert_at as string | null,
      schedule_key: String(a.schedule_key),
      recipient_ids: [],
    });
  for (const p of recipients.results)
    map.get(String(p.reminder_id))?.recipient_ids.push(String(p.user_id));
  return map;
}
export async function prepareAlert(
  db: D1Database,
  org: string,
  entity: string,
  previousUser: string | undefined,
  user: string,
  title: string,
  due: string,
  alertAt: string | null | undefined,
  recipients: string[] | undefined,
) {
  const old = (await alertDetails(db, org, [entity])).get(entity);
  const alert_at = alertAt === undefined ? (old?.alert_at ?? null) : alertAt;
  let recipient_ids = recipients ??
    old?.recipient_ids ?? [previousUser ?? user];
  const members = (
    await db
      .prepare(
        'SELECT user_id FROM memberships WHERE organization_id=? AND user_id IN(SELECT value FROM json_each(?))',
      )
      .bind(org, JSON.stringify(recipient_ids))
      .all<{ user_id: string }>()
  ).results.map((r) => r.user_id);
  if (recipients && members.length !== recipients.length)
    throw new HttpError(404, 'Responsável não encontrado.');
  recipient_ids = recipient_ids.filter((id) => members.includes(id)).sort();
  if (alert_at && !recipient_ids.length)
    throw new HttpError(400, 'Escolha quem recebe o aviso.');
  const schedule_key = await hash(
    JSON.stringify({ title, due_at: due, alert_at, recipient_ids }),
  );
  return { alert_at, recipient_ids, schedule_key };
}
export function writeAlert(
  db: D1Database,
  org: string,
  id: string,
  config: ReminderAlert,
  done: boolean,
  active: boolean,
  guard: string,
  args: string[],
) {
  return [
    db
      .prepare(
        `INSERT INTO reminder_alerts(organization_id,reminder_id,alert_at,schedule_key,updated_at) SELECT ?,?,?,?,? WHERE ${guard} ON CONFLICT(organization_id,reminder_id) DO UPDATE SET alert_at=excluded.alert_at,updated_at=CASE WHEN reminder_alerts.schedule_key=excluded.schedule_key THEN reminder_alerts.updated_at ELSE excluded.updated_at END,schedule_key=excluded.schedule_key`,
      )
      .bind(
        org,
        id,
        config.alert_at,
        config.schedule_key,
        new Date().toISOString(),
        ...args,
      ),
    db
      .prepare(
        `DELETE FROM reminder_recipients WHERE organization_id=? AND reminder_id=? AND ${guard}`,
      )
      .bind(org, id, ...args),
    db
      .prepare(
        `INSERT INTO reminder_recipients(organization_id,reminder_id,user_id) SELECT ?,?,value FROM json_each(?) WHERE ${guard}`,
      )
      .bind(org, id, JSON.stringify(config.recipient_ids), ...args),
    db
      .prepare(
        `UPDATE push_jobs SET state='cancelled' WHERE organization_id=? AND reminder_id=? AND state='pending' AND (?=1 OR ?=0 OR schedule_key<>?) AND ${guard}`,
      )
      .bind(org, id, +done, +active, config.schedule_key, ...args),
  ];
}
