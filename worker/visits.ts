import { z } from 'zod';
import { HttpError, json, type Env, type Actor } from './security';
import { prospectsReady } from './prospects';
import { p1Mutation, requestRange } from './p1-common';
import { utcStart, addDays } from './operations-domain';
import { visiblePhone } from '../shared/phone';
import type { ProspectVisit, VisitSample } from '../shared/visits';
import { emptyProspect, type ProspectData } from '../shared/prospects';
export async function visitsSchema(db: D1Database) {
  const r = await db
    .prepare(
      "SELECT COUNT(*) n FROM sqlite_schema WHERE type='table' AND name IN('prospect_visits','prospect_visit_records','prospect_visit_trips')",
    )
    .first<{ n: number }>();
  return r?.n === 3;
}
export const visitsReady = async (env: Env) =>
  (await prospectsReady(env)) && (await visitsSchema(env.DB!));
const timestamp = z.iso
  .datetime({ offset: true })
  .transform((v) => new Date(v).toISOString());
const samples = z
  .array(
    z
      .object({
        product_id: z.uuid(),
        units: z.number().int().min(1).max(10000),
        weight_grams: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .nullable()
          .default(null),
      })
      .strict(),
  )
  .max(24)
  .refine(
    (s) => new Set(s.map((l) => l.product_id)).size === s.length,
    'Sabor/peso repetido.',
  );
const notes = z.string().trim().max(1000).default('');
const planSchema = z
  .object({
    customer_id: z.uuid(),
    scheduled_at: timestamp,
    notes,
    samples,
    version: z.number().int().positive().optional(),
  })
  .strict();
const recordSchema = z
  .object({
    version: z.number().int().positive(),
    occurred_at: timestamp,
    performer_id: z.uuid().optional(),
    next_step_at: z.union([timestamp, z.literal('')]).default(''),
    notes,
    samples,
  })
  .strict();
async function snapshot(
  db: D1Database,
  org: string,
  lines: z.infer<typeof samples>,
  planned: VisitSample[] = [],
): Promise<VisitSample[]> {
  if (!lines.length) return [];
  const rows = (
    await db
      .prepare(
        'SELECT id,name,photo_key FROM products WHERE organization_id=? AND active=1 AND id IN(SELECT value FROM json_each(?))',
      )
      .bind(org, JSON.stringify(lines.map((s) => s.product_id)))
      .all<{ id: string; name: string; photo_key: string | null }>()
  ).results;
  return lines.map((s) => {
    const p = rows.find((p) => p.id === s.product_id);
    const historical = planned.find((old) => old.product_id === s.product_id);
    if (!p && !historical)
      throw new HttpError(
        400,
        'Sabor inativo ou fora da organização. Revise as amostras.',
      );
    return {
      ...s,
      product_name: p?.name ?? historical!.product_name,
      photo_key: p?.photo_key ?? historical?.photo_key ?? null,
    };
  });
}
const select =
  'SELECT v.id,v.customer_id,v.scheduled_at,v.status,v.version,v.data,c.name AS customer_name,c.phone,r.data AS record_data,r.user_id AS recorded_by FROM prospect_visits v JOIN customers c ON c.organization_id=v.organization_id AND c.id=v.customer_id LEFT JOIN prospect_visit_records r ON r.organization_id=v.organization_id AND r.visit_id=v.id WHERE v.organization_id=?';
function read(row: Record<string, unknown>): ProspectVisit {
  return {
    ...row,
    phone: visiblePhone(row.phone),
    data: JSON.parse(String(row.data)),
    record: row.record_data ? JSON.parse(String(row.record_data)) : null,
    record_data: undefined,
  } as unknown as ProspectVisit;
}
export async function visitList(
  db: D1Database,
  org: string,
  from?: string,
  to?: string,
  customer?: string,
) {
  const rows = (
    await db
      .prepare(
        select +
          (customer ? ' AND v.customer_id=?' : '') +
          (from && to ? ' AND v.scheduled_at>=? AND v.scheduled_at<?' : '') +
          ' ORDER BY v.scheduled_at,v.id LIMIT 201',
      )
      .bind(
        org,
        ...(customer ? [customer] : []),
        ...(from && to ? [utcStart(from), utcStart(addDays(to, 1))] : []),
      )
      .all<Record<string, unknown>>()
  ).results;
  if (rows.length > 200)
    throw new HttpError(409, 'Mais de 200 visitas. Reduza o período.');
  return rows.map(read);
}
export async function sampleProduction(
  db: D1Database,
  org: string,
  day: string,
) {
  return (
    await db
      .prepare(
        "SELECT date(v.scheduled_at,'-3 hours') AS day,json_extract(s.value,'$.product_id') AS product_id,json_extract(s.value,'$.product_name') AS name,json_extract(s.value,'$.photo_key') AS photo_key,json_extract(s.value,'$.weight_grams') AS weight_grams,SUM(json_extract(s.value,'$.units')) AS units FROM prospect_visits v JOIN customers c ON c.organization_id=v.organization_id AND c.id=v.customer_id JOIN json_each(v.data,'$.samples') s WHERE v.organization_id=? AND c.active=1 AND v.status='scheduled' AND v.scheduled_at>=? AND v.scheduled_at<? GROUP BY day,product_id,name,weight_grams ORDER BY day,name,weight_grams",
      )
      .bind(org, utcStart(day), utcStart(addDays(day, 2)))
      .all()
  ).results;
}
export async function visits(req: Request, env: Env, a: Actor) {
  if (!(await visitsReady(env))) throw new HttpError(404, 'Não encontrado.');
  const db = env.DB!,
    org = a.organization_id,
    u = new URL(req.url),
    [, , , id, action, extra] = u.pathname.split('/');
  if (
    extra ||
    (id && !z.uuid().safeParse(id).success) ||
    (action && !['record', 'cancel'].includes(action))
  )
    throw new HttpError(404, 'Não encontrado.');
  const row = id
    ? await db
        .prepare(select + ' AND v.id=?')
        .bind(org, id)
        .first<Record<string, unknown>>()
    : null;
  if (id && !row) throw new HttpError(404, 'Não encontrado.');
  if (req.method === 'GET' && !action) {
    if (row) return json(read(row));
    const customer = u.searchParams.get('customer_id') || undefined;
    if (
      customer &&
      (!z.uuid().safeParse(customer).success ||
        !(await db
          .prepare('SELECT 1 FROM customers WHERE organization_id=? AND id=?')
          .bind(org, customer)
          .first()))
    )
      throw new HttpError(404, 'Não encontrado.');
    const range =
      customer && !u.searchParams.has('from') ? null : requestRange(req, 44);
    return json(await visitList(db, org, range?.from, range?.to, customer));
  }
  if (!(
    (req.method === 'POST' && (!id || action)) ||
    (req.method === 'PUT' && id && !action)
  ))
    throw new HttpError(405, 'Método não permitido.');
  return p1Mutation(req, db, a, async (raw, nonce) => {
    const current = id
      ? await db
          .prepare(select + ' AND v.id=?')
          .bind(org, id)
          .first<Record<string, unknown>>()
      : null;
    if (id && !current) throw new HttpError(404, 'Não encontrado.');
    if (current && current.status !== 'scheduled')
      throw new HttpError(409, 'Visita já registrada ou cancelada. Atualize.');
    const entity = id ?? crypto.randomUUID();
    if (action === 'cancel') {
      const d = z
        .object({
          version: z.number().int().positive(),
          reason: z.string().trim().min(3).max(500),
        })
        .strict()
        .parse(raw);
      return {
        table: 'prospect_visits' as const,
        id: entity,
        action: 'visit.cancel',
        response: { id: entity, version: d.version + 1 },
        first: db
          .prepare(
            "UPDATE prospect_visits SET status='cancelled',data=json_set(data,'$.cancel_reason',?),version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=? AND status='scheduled'",
          )
          .bind(d.reason, nonce, org, entity, d.version),
        rest: () => [],
      };
    }
    if (action === 'record') {
      const d = recordSchema.parse(raw);
      if (Date.parse(d.occurred_at) > Date.now() + 60000)
        throw new HttpError(400, 'A visita ainda não aconteceu.');
      const c = await db
        .prepare(
          'SELECT c.version,c.kind,p.data FROM customers c LEFT JOIN prospect_details p ON p.organization_id=c.organization_id AND p.customer_id=c.id WHERE c.organization_id=? AND c.id=? AND c.active=1',
        )
        .bind(org, current!.customer_id)
        .first<{ version: number; kind: string; data: string }>();
      if (!c) throw new HttpError(409, 'Contato arquivado ou indisponível.');
      const performer = d.performer_id ?? a.user_id;
      if (
        !(await db
          .prepare(
            'SELECT 1 FROM memberships WHERE organization_id=? AND user_id=?',
          )
          .bind(org, performer)
          .first())
      )
        throw new HttpError(400, 'Pessoa fora da organização.');
      const actual = await snapshot(
          db,
          org,
          d.samples,
          JSON.parse(String(current!.data)).samples,
        ),
        prior = (c.data ? JSON.parse(c.data) : emptyProspect()) as ProspectData;
      const plan = JSON.parse(String(current!.data)),
        isProspect = c.kind === 'prospect' && plan.audience !== 'customer';
      const next = {
        ...prior,
        ...(isProspect
          ? {
              stage:
                prior.stage === 'not_interested'
                  ? prior.stage
                  : actual.length
                    ? 'sample_delivered'
                    : 'follow_up',
              next_step_at: d.next_step_at,
            }
          : {}),
      };
      const record = {
        ...d,
        performer_id: performer,
        samples: actual,
        audience: plan.audience ?? 'prospect',
        purpose: plan.purpose ?? 'presentation',
        version: undefined,
      };
      return {
        table: 'prospect_visits' as const,
        id: entity,
        action: 'visit.record',
        response: { id: entity, version: d.version + 1 },
        first: db
          .prepare(
            "UPDATE prospect_visits SET status='completed',version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=? AND status='scheduled' AND EXISTS(SELECT 1 FROM customers WHERE organization_id=? AND id=? AND version=? AND active=1)",
          )
          .bind(
            nonce,
            org,
            entity,
            d.version,
            org,
            current!.customer_id,
            c.version,
          ),
        rest: (g, args) => [
          db
            .prepare(
              `INSERT INTO prospect_visit_records(organization_id,visit_id,user_id,data) SELECT ?,?,?,? WHERE ${g}`,
            )
            .bind(org, entity, a.user_id, JSON.stringify(record), ...args),
          ...(isProspect
            ? [
                db
                  .prepare(
                    `UPDATE customers SET version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND ${g}`,
                  )
                  .bind(nonce, org, current!.customer_id, ...args),
                db
                  .prepare(
                    `UPDATE prospect_details SET data=? WHERE organization_id=? AND customer_id=? AND ${g}`,
                  )
                  .bind(
                    JSON.stringify(next),
                    org,
                    current!.customer_id,
                    ...args,
                  ),
                db
                  .prepare(
                    `INSERT INTO prospect_events(organization_id,id,customer_id,user_id,from_stage,to_stage,next_step_at,reason) SELECT ?,?,?,?,?,?,?,? WHERE ${g}`,
                  )
                  .bind(
                    org,
                    crypto.randomUUID(),
                    current!.customer_id,
                    a.user_id,
                    prior.stage,
                    next.stage,
                    next.next_step_at,
                    'Visita registrada' + (d.notes ? ' · ' + d.notes : ''),
                    ...args,
                  ),
              ]
            : []),
        ],
      };
    }
    const d = planSchema.parse(raw);
    if (!current && d.version)
      throw new HttpError(400, 'Novo agendamento não recebe versão.');
    if (current && (!d.version || d.customer_id !== current.customer_id))
      throw new HttpError(400, 'Confira a versão e o contato da visita.');
    const target = await db
      .prepare(
        'SELECT kind FROM customers WHERE organization_id=? AND id=? AND active=1',
      )
      .bind(org, d.customer_id)
      .first<{ kind: string }>();
    if (!target) throw new HttpError(404, 'Contato ou cliente não encontrado.');
    // Snapshot: converter um contato depois não transforma suas visitas de aquisição em relacionamento.
    const audience = current
      ? (JSON.parse(String(current.data)).audience ?? 'prospect')
      : target.kind;
    const data = {
      audience,
      purpose: audience === 'customer' ? 'new_options' : 'presentation',
      notes: d.notes,
      samples: await snapshot(db, org, d.samples),
    };
    return {
      table: 'prospect_visits' as const,
      id: entity,
      action: current ? 'visit.edit' : 'visit.schedule',
      response: { id: entity, version: (d.version ?? 0) + 1 },
      first: current
        ? db
            .prepare(
              "UPDATE prospect_visits SET scheduled_at=?,data=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=? AND status='scheduled' AND EXISTS(SELECT 1 FROM customers WHERE organization_id=? AND id=? AND active=1)",
            )
            .bind(
              d.scheduled_at,
              JSON.stringify(data),
              nonce,
              org,
              entity,
              d.version,
              org,
              d.customer_id,
            )
        : db
            .prepare(
              'INSERT INTO prospect_visits(organization_id,id,customer_id,scheduled_at,data,mutation_id) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM customers WHERE organization_id=? AND id=? AND active=1 AND kind=?)',
            )
            .bind(
              org,
              entity,
              d.customer_id,
              d.scheduled_at,
              JSON.stringify(data),
              nonce,
              org,
              d.customer_id,
              target.kind,
            ),
      rest: () => [],
    };
  });
}
