import { z } from 'zod';
import { body, hash, HttpError, json, type Actor } from './security';
import { addDays, businessDay } from './operations-domain';
export const rangeSchema = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .strict()
  .refine(
    (r) => r.to >= r.from && r.to <= addDays(r.from, 365),
    'Escolha um período de até 366 dias.',
  );
export function requestRange(req: Request, maxDays = 365) {
  const u = new URL(req.url),
    from = u.searchParams.get('from') || businessDay(),
    to = u.searchParams.get('to') || from;
  const r = rangeSchema.parse({ from, to });
  if (to > addDays(from, maxDays))
    throw new HttpError(400, 'Período muito longo para esta tela.');
  return r;
}
export const ownerOnly = (a: Actor) => {
  if (a.role !== 'owner')
    throw new HttpError(403, 'Somente administrador altera este módulo.');
};
/** Comando idempotente com uma transação; o builder controla o CAS da entidade. */
export async function p1Mutation(
  req: Request,
  db: D1Database,
  a: Actor,
  build: (
    raw: unknown,
    nonce: string,
  ) => Promise<{
    first: D1PreparedStatement;
    rest: (guard: string, args: string[]) => D1PreparedStatement[];
    response: object;
    table:
      | 'reminders'
      | 'supplies'
      | 'recipes'
      | 'expense_events'
      | 'orders'
      | 'customer_sites'
      | 'company_places'
      | 'display_profiles'
      | 'displacements'
      | 'inventory_balances';
    id: string;
    action: string;
  }>,
) {
  const raw = await body(req, z.unknown()),
    key = req.headers.get('Idempotency-Key');
  if (!z.uuid().safeParse(key).success)
    throw new HttpError(400, 'Chave de repetição inválida.');
  const org = a.organization_id,
    fingerprint = await hash(
      JSON.stringify({
        path: new URL(req.url).pathname,
        method: req.method,
        actor: a.user_id,
        data: raw,
      }),
    ),
    repeated = await db
      .prepare(
        'SELECT request_hash,response FROM p1_requests WHERE organization_id=? AND request_key=?',
      )
      .bind(org, key)
      .first<{ request_hash: string; response: string }>();
  if (repeated) {
    if (repeated.request_hash !== fingerprint)
      throw new HttpError(409, 'Chave já usada.');
    return json(JSON.parse(repeated.response));
  }
  const nonce = crypto.randomUUID(),
    plan = await build(raw, nonce),
    guard = `EXISTS(SELECT 1 FROM ${plan.table} WHERE organization_id=? AND id=? ${plan.table === 'expense_events' ? '' : 'AND mutation_id=?'})`,
    args =
      plan.table === 'expense_events' ? [org, plan.id] : [org, plan.id, nonce];
  const result = await db.batch([
    plan.first,
    ...plan.rest(guard, args),
    db
      .prepare(
        `INSERT INTO p1_requests(organization_id,request_key,request_hash,response) SELECT ?,?,?,? WHERE ${guard}`,
      )
      .bind(org, key, fingerprint, JSON.stringify(plan.response), ...args),
    db
      .prepare(
        `INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,?,? WHERE ${guard}`,
      )
      .bind(crypto.randomUUID(), org, a.user_id, plan.action, plan.id, ...args),
  ]);
  if (!result[0].meta.changes)
    throw new HttpError(409, 'Registro alterado. Atualize.');
  return json(plan.response, req.method === 'POST' ? 201 : 200);
}
export function fileResponse(content: string, type: string, name: string) {
  return new Response(content, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}
