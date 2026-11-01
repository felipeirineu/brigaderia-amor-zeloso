import { hash, HttpError, json, type Actor } from './security';
import { z } from 'zod';
export type ProtectedOrder = { id: string; version: number; status: string };
/** Escritas atômicas e auditadas, com CAS da conta e dos pedidos, sem atualização parcial. */
export async function financeTransaction(
  req: Request,
  db: D1Database,
  a: Actor,
  customer: string,
  data: unknown,
  expected: number,
  current: number,
  orders: ProtectedOrder[],
  build: (
    guard: string,
    args: (string | number)[],
    nonce: string,
  ) => { statements: D1PreparedStatement[]; response: Record<string, unknown> },
  action: string,
) {
  const key = req.headers.get('Idempotency-Key');
  if (!z.uuid().safeParse(key).success)
    throw new HttpError(400, 'Chave de repetição inválida.');
  const org = a.organization_id,
    fingerprint = await hash(
      JSON.stringify({
        path: new URL(req.url).pathname,
        actor: a.user_id,
        data,
      }),
    );
  const repeated = await db
    .prepare(
      'SELECT request_hash,response FROM finance_requests WHERE organization_id=? AND request_key=?',
    )
    .bind(org, key)
    .first<{ request_hash: string; response: string }>();
  if (repeated) {
    if (repeated.request_hash !== fingerprint)
      throw new HttpError(409, 'Chave já utilizada.');
    return json(JSON.parse(repeated.response));
  }
  if (expected !== current)
    throw new HttpError(409, 'Conta alterada. Atualize.');
  const nonce = crypto.randomUUID(),
    guard =
      'EXISTS(SELECT 1 FROM finance_accounts WHERE organization_id=? AND customer_id=? AND mutation_id=?)',
    args = [org, customer, nonce],
    result = build(guard, args, nonce);
  const r = await db.batch([
    db
      .prepare(
        'INSERT OR IGNORE INTO finance_accounts(organization_id,customer_id) VALUES(?,?)',
      )
      .bind(org, customer),
    db
      .prepare(
        "UPDATE finance_accounts SET version=version+1,mutation_id=? WHERE organization_id=? AND customer_id=? AND version=? AND NOT EXISTS(SELECT 1 FROM json_each(?) j LEFT JOIN orders o ON o.organization_id=? AND o.customer_id=? AND o.id=json_extract(j.value,'$.id') WHERE o.id IS NULL OR o.version<>json_extract(j.value,'$.version') OR o.status<>json_extract(j.value,'$.status'))",
      )
      .bind(
        nonce,
        org,
        customer,
        expected,
        JSON.stringify(orders),
        org,
        customer,
      ),
    db
      .prepare(
        `UPDATE orders SET version=version+1 WHERE organization_id=? AND id IN(SELECT json_extract(value,'$.id') FROM json_each(?)) AND ${guard}`,
      )
      .bind(org, JSON.stringify(orders), ...args),
    ...result.statements,
    db
      .prepare(
        `INSERT INTO finance_requests(organization_id,request_key,request_hash,response) SELECT ?,?,?,? WHERE ${guard}`,
      )
      .bind(org, key, fingerprint, JSON.stringify(result.response), ...args),
    db
      .prepare(
        `INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,?,? WHERE ${guard}`,
      )
      .bind(crypto.randomUUID(), org, a.user_id, action, customer, ...args),
  ]);
  if (!r[1].meta.changes)
    throw new HttpError(409, 'Conta ou pedido alterado. Atualize.');
  return json(result.response, 201);
}
