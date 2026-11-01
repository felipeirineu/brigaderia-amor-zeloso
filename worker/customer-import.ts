import { z } from 'zod';
import { body, hash, HttpError, json, type Actor } from './security';
import { ownerOnly } from './p1-common';
import { customerSchema } from './schemas';
const input = z
  .object({
    rows: z.array(z.unknown()).min(1).max(50),
    selected: z.array(z.number().int().min(0).max(49)).max(50).optional(),
  })
  .strict();
type Contact = { name: string; phone: string; email: string; notes: string };
async function preview(db: D1Database, org: string, raw: unknown[]) {
  const checked = raw.map((v) =>
      customerSchema
        .pick({ name: true, phone: true, email: true, notes: true })
        .strict()
        .safeParse(v),
    ),
    phones = checked.filter((v) => v.success).map((v) => v.data!.phone),
    existing = (
      await db
        .prepare(
          'SELECT id,phone FROM customers WHERE organization_id=? AND phone IN(SELECT value FROM json_each(?))',
        )
        .bind(org, JSON.stringify(phones))
        .all<{ id: string; phone: string }>()
    ).results;
  const seen = new Set<string>();
  return checked.map((v, index) => {
    if (!v.success)
      return {
        index,
        status: 'invalid',
        message: 'Confira nome, telefone com DDD e e-mail.',
        data: null as Contact | null,
      };
    const duplicate = seen.has(v.data.phone);
    seen.add(v.data.phone);
    const prior = existing.find((e) => e.phone === v.data.phone);
    return {
      index,
      status: prior ? 'existing' : duplicate ? 'duplicate' : 'ready',
      message: prior
        ? 'Telefone já cadastrado; nenhum dado será atualizado.'
        : duplicate
          ? 'Telefone repetido no arquivo.'
          : 'Pronto para importar.',
      data: v.data,
    };
  });
}
export async function customerImport(
  req: Request,
  db: D1Database,
  a: Actor,
  action?: string,
) {
  ownerOnly(a);
  if (req.method !== 'POST' || !['preview', 'confirm'].includes(action ?? ''))
    throw new HttpError(405, 'Use a prévia e confirme a seleção.');
  const org = a.organization_id,
    d = await body(req, input, 65536);
  if (action === 'preview')
    return json({ rows: await preview(db, org, d.rows) });
  const key = req.headers.get('Idempotency-Key');
  if (!z.uuid().safeParse(key).success)
    throw new HttpError(400, 'Chave de repetição inválida.');
  if (
    !d.selected?.length ||
    new Set(d.selected).size !== d.selected.length ||
    d.selected.some((i) => i >= d.rows.length)
  )
    throw new HttpError(400, 'Selecione linhas válidas.');
  const fingerprint = await hash(JSON.stringify({ actor: a.user_id, data: d }));
  const prior = await db
    .prepare(
      'SELECT request_hash,response FROM p1_requests WHERE organization_id=? AND request_key=?',
    )
    .bind(org, key)
    .first<{ request_hash: string; response: string }>();
  if (prior) {
    if (prior.request_hash !== fingerprint)
      throw new HttpError(409, 'Chave já usada.');
    return json(JSON.parse(prior.response));
  }
  const checked = await preview(db, org, d.rows);
  if (
    d.selected.some((i) => ['invalid', 'duplicate'].includes(checked[i].status))
  )
    throw new HttpError(
      400,
      'A seleção contém linhas inválidas ou repetidas. Refaça a prévia.',
    );
  const rows = d.selected.map((i) => ({
      index: i,
      id: crypto.randomUUID(),
      ...checked[i].data!,
      create_key: 'import:' + key + ':' + i,
    })),
    job = crypto.randomUUID(),
    nonce = crypto.randomUUID(),
    data = JSON.stringify(rows),
    guard =
      'EXISTS(SELECT 1 FROM customer_imports WHERE organization_id=? AND id=? AND mutation_id=?)',
    args = [org, job, nonce];
  await db.batch([
    db
      .prepare(
        'INSERT OR IGNORE INTO customer_imports(organization_id,id,user_id,request_key,request_hash,mutation_id) VALUES(?,?,?,?,?,?)',
      )
      .bind(org, job, a.user_id, key, fingerprint, nonce),
    db
      .prepare(
        `INSERT OR IGNORE INTO customers(id,organization_id,name,phone,email,notes,mutation_id,create_key,create_hash) SELECT json_extract(value,'$.id'),?,json_extract(value,'$.name'),json_extract(value,'$.phone'),json_extract(value,'$.email'),json_extract(value,'$.notes'),?,json_extract(value,'$.create_key'),? FROM json_each(?) WHERE ${guard}`,
      )
      .bind(org, nonce, fingerprint, data, ...args),
    db
      .prepare(
        `INSERT INTO p1_requests(organization_id,request_key,request_hash,response) SELECT ?,?,?,json_object('import_id',?,'rows',json((SELECT json_group_array(json_object('index',json_extract(j.value,'$.index'),'status',CASE WHEN c.create_key=json_extract(j.value,'$.create_key') THEN 'created' ELSE 'existing' END,'id',c.id)) FROM json_each(?) j JOIN customers c ON c.organization_id=? AND c.phone=json_extract(j.value,'$.phone')))) WHERE ${guard}`,
      )
      .bind(org, key, fingerprint, job, data, org, ...args),
    db
      .prepare(
        `INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,'customers.imported',? WHERE ${guard}`,
      )
      .bind(crypto.randomUUID(), org, a.user_id, job, ...args),
  ]);
  const saved = await db
    .prepare(
      'SELECT request_hash,response FROM p1_requests WHERE organization_id=? AND request_key=?',
    )
    .bind(org, key)
    .first<{ request_hash: string; response: string }>();
  if (!saved || saved.request_hash !== fingerprint)
    throw new HttpError(409, 'Importação concorrente. Atualize a prévia.');
  return json(JSON.parse(saved.response), 201);
}
