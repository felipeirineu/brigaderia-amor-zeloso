import { pushSchema } from './push-config';
import { alertDetails, prepareAlert, writeAlert } from './reminder-alerts';
import { reminderICS } from './calendar';
import { fileResponse } from './p1-common';
import { z } from 'zod';
import { HttpError, json, type Actor } from './security';
import { p1Mutation } from './p1-common';
import { addDays, utcStart } from './operations-domain';
export const reminderSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    notes: z.string().trim().max(1000).default(''),
    due_at: z.iso
      .datetime({ offset: true })
      .transform((v) => new Date(v).toISOString()),
    alert_at: z.iso
      .datetime({ offset: true })
      .transform((v) => new Date(v).toISOString())
      .nullable()
      .optional(),
    recipient_ids: z
      .array(z.uuid())
      .max(10)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        'Responsável repetido.',
      )
      .optional(),
    customer_id: z.uuid().nullable().default(null),
    done: z.boolean().default(false),
    active: z.boolean().default(true),
    version: z.number().int().positive().optional(),
  })
  .strict();
export async function reminders(
  req: Request,
  db: D1Database,
  a: Actor,
  id?: string,
) {
  const org = a.organization_id,
    u = new URL(req.url);
  if (id && !z.uuid().safeParse(id).success)
    throw new HttpError(404, 'Não encontrado.');
  const ready = await pushSchema(db);
  const tail = u.pathname.split('/')[5];
  if (
    tail &&
    (tail !== 'calendar.ics' ||
      req.method !== 'GET' ||
      u.pathname.split('/').length !== 6)
  )
    throw new HttpError(404, 'Não encontrado.');
  if (req.method === 'GET') {
    const through = u.searchParams.get('through');
    if (through && !z.iso.date().safeParse(through).success)
      throw new HttpError(400, 'Data inválida.');
    const rows = (
      await db
        .prepare(
          `SELECT id,title,notes,due_at,customer_id,done,active,version,user_id FROM reminders WHERE organization_id=? AND active=1${id ? ' AND id=?' : ''}${through ? ' AND done=0 AND due_at<?' : ''} ORDER BY done,due_at,id LIMIT 501`,
        )
        .bind(
          org,
          ...(id ? [id] : []),
          ...(through ? [utcStart(addDays(through, 1))] : []),
        )
        .all()
    ).results;
    if (rows.length > 500)
      throw new HttpError(409, 'Mais de 500 lembretes; reduza o período.');
    if (id && !rows.length)
      throw new HttpError(404, 'Lembrete não encontrado.');
    const details = ready
      ? await alertDetails(
          db,
          org,
          rows.map((r) => String(r.id)),
        )
      : new Map();
    const output = rows.map(({ user_id, ...row }) => ({
      ...row,
      ...(ready
        ? {
            alert_at: details.get(String(row.id))?.alert_at ?? null,
            recipient_ids: details.get(String(row.id))?.recipient_ids ?? [
              String(user_id),
            ],
          }
        : {}),
    }));
    if (tail === 'calendar.ics')
      return fileResponse(
        reminderICS(
          output[0] as {
            id: string;
            title: string;
            due_at: string;
            version: number;
            done: number;
          },
          details.get(id!)?.alert_at ?? null,
        ),
        'text/calendar; charset=utf-8',
        `lembrete-${id}.ics`,
      );
    return json(id ? output[0] : output);
  }
  if (!['POST', 'PUT'].includes(req.method) || (req.method === 'PUT') !== !!id)
    throw new HttpError(405, 'Método não permitido.');
  return p1Mutation(req, db, a, async (raw, nonce) => {
    const d = reminderSchema.parse(raw),
      entity = id || crypto.randomUUID();
    const previous = id
      ? await db
          .prepare(
            'SELECT version,done,user_id FROM reminders WHERE organization_id=? AND id=?',
          )
          .bind(org, id)
          .first<{ version: number; done: number; user_id: string }>()
      : null;
    if (id && !previous) throw new HttpError(404, 'Lembrete não encontrado.');
    if (id && d.version !== previous?.version)
      throw new HttpError(409, 'Lembrete alterado ou não encontrado.');
    if (
      d.customer_id &&
      !(await db
        .prepare('SELECT 1 FROM customers WHERE organization_id=? AND id=?')
        .bind(org, d.customer_id)
        .first())
    )
      throw new HttpError(400, 'Cliente não pertence à organização.');
    if (!ready && (d.alert_at || d.recipient_ids?.length))
      throw new HttpError(503, 'Avisos de lembretes ainda indisponíveis.');
    const config = ready
      ? await prepareAlert(
          db,
          org,
          entity,
          previous?.user_id,
          a.user_id,
          d.title,
          d.due_at,
          d.alert_at,
          d.recipient_ids,
        )
      : null;
    return {
      id: entity,
      table: 'reminders',
      action: !d.active
        ? 'reminder.archived'
        : d.done
          ? 'reminder.completed'
          : previous?.done
            ? 'reminder.reopened'
            : 'reminder.saved',
      response: { id: entity },
      first: id
        ? db
            .prepare(
              'UPDATE reminders SET title=?,notes=?,due_at=?,customer_id=?,done=?,active=?,version=version+1,mutation_id=?,user_id=? WHERE organization_id=? AND id=? AND version=?',
            )
            .bind(
              d.title,
              d.notes,
              d.due_at,
              d.customer_id,
              +d.done,
              +d.active,
              nonce,
              a.user_id,
              org,
              entity,
              d.version,
            )
        : db
            .prepare(
              'INSERT INTO reminders(id,organization_id,title,notes,due_at,customer_id,done,active,mutation_id,user_id) VALUES(?,?,?,?,?,?,?,?,?,?)',
            )
            .bind(
              entity,
              org,
              d.title,
              d.notes,
              d.due_at,
              d.customer_id,
              +d.done,
              +d.active,
              nonce,
              a.user_id,
            ),
      rest: (guard, args) =>
        config
          ? writeAlert(db, org, entity, config, d.done, d.active, guard, args)
          : [],
    };
  });
}
