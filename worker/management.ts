import { financeReady } from './finance-ready';
import { orderDefaults } from './finance';
import { operationalReady } from './operational-ready';
import { z } from 'zod';
import { childrenByParent } from './listing';
import { body, HttpError, json, hash, type Actor, type Env } from './security';
import {
  customerSchema,
  orderSchema,
  productSchema,
  memberSchema,
} from './schemas';

type Row = Record<string, string | number | null>;
type Snapshot = {
  variant_id: string;
  product_name: string;
  variant_label: string;
  weight_grams: number;
  units_per_box: number;
  unit_price_cents: number;
  quantity: number;
};
export async function management(req: Request, env: Env, a: Actor) {
  const original = req.clone();
  const db = env.DB!;
  const url = new URL(req.url);
  const [, , resource, id] = url.pathname.split('/');
  const org = a.organization_id;
  const audit = (action: string, entity: string) =>
    db
      .prepare(
        'INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) VALUES(?,?,?,?,?)',
      )
      .bind(crypto.randomUUID(), org, a.user_id, action, entity);
  if (resource === 'session' && req.method === 'GET')
    return json({
      role: a.role,
      operations: await operationalReady(env),
      finance: await financeReady(env),
      user_id: a.user_id,
      organization_id: a.organization_id,
    });
  if (resource === 'members') {
    if (a.role !== 'owner')
      throw new HttpError(403, 'Somente o administrador gerencia acessos.');
    if (req.method === 'GET')
      return json(
        (
          await db
            .prepare(
              'SELECT email,role FROM authorized_emails WHERE organization_id=? ORDER BY email',
            )
            .bind(org)
            .all()
        ).results,
      );
    if (req.method === 'POST') {
      const data = await body(req, memberSchema);
      // Alterações em acessos existentes exigem procedimento administrativo separado.
      try {
        await db.batch([
          db
            .prepare(
              'INSERT INTO authorized_emails(email,organization_id,role) VALUES(?,?,?)',
            )
            .bind(data.email, org, data.role),
          audit('member.authorized', crypto.randomUUID()),
        ]);
      } catch {
        throw new HttpError(409, 'Endereço já autorizado.');
      }
      return json({ ok: true }, 201);
    }
  }
  if (resource === 'dashboard' && req.method === 'GET') {
    const summary = await db
      .prepare(
        "SELECT COUNT(CASE WHEN status='draft' THEN 1 END) AS orders_count, COALESCE(SUM(CASE WHEN status='draft' THEN total_cents ELSE 0 END),0) AS total_cents, COALESCE(SUM(CASE WHEN status IN ('confirmed','in_production','ready','out_for_delivery') THEN total_cents ELSE 0 END),0) AS expected_cents,COALESCE(SUM(CASE WHEN status IN ('delivered','picked_up') THEN total_cents ELSE 0 END),0) AS delivered_cents FROM orders WHERE organization_id=? AND active=1",
      )
      .bind(org)
      .first();
    const upcoming = (
      await db
        .prepare(
          "SELECT id,customer_name,due_at,total_cents FROM orders WHERE organization_id=? AND active=1 AND status<>'cancelled' AND due_at>=? ORDER BY due_at LIMIT 10",
        )
        .bind(org, new Date().toISOString())
        .all()
    ).results;
    return json({ summary, upcoming });
  }
  if (!['customers', 'products', 'orders'].includes(resource))
    throw new HttpError(404, 'Não encontrado.');
  if (id && !z.uuid().safeParse(id).success)
    throw new HttpError(404, 'Não encontrado.');
  if (req.method === 'GET') {
    const search = (url.searchParams.get('q') || '').slice(0, 120);
    // LIKE sempre parametrizado; % e _ são caracteres de busca, não SQL.
    const field = resource === 'orders' ? 'customer_name' : 'name';
    const status =
      url.searchParams.get('active') === 'all' ? '' : ' AND active=1';
    const rows = (
      await db
        .prepare(
          `SELECT * FROM ${resource} WHERE organization_id=?${id ? ' AND id=?' : ''}${status} AND ${resource === 'customers' ? '(name LIKE ? OR phone LIKE ?)' : `${field} LIKE ?`} ORDER BY ${resource === 'orders' ? 'due_at' : 'name'} LIMIT 200`,
        )
        .bind(
          org,
          ...(id ? [id] : []),
          `%${search}%`,
          ...(resource === 'customers' ? [`%${search}%`] : []),
        )
        .all<Row>()
    ).results;
    for (const row of rows) {
      delete row.mutation_id;
      delete row.request_hash;
      delete row.request_key;
      delete row.create_key;
      delete row.create_hash;
    }
    const children =
      resource === 'customers'
        ? null
        : await childrenByParent(
            db,
            org,
            resource as 'products' | 'orders',
            rows.map((row) => String(row.id)),
          );
    const extended = rows.map((row) => ({
      ...row,
      ...(children
        ? {
            [resource === 'products' ? 'variants' : 'items']:
              children.get(String(row.id)) ?? [],
          }
        : {}),
    }));
    if (id && !rows.length) throw new HttpError(404, 'Não encontrado.');
    return json(id ? extended[0] : extended);
  }
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE')
    throw new HttpError(405, 'Método não permitido.');
  if ((req.method === 'POST') === !!id)
    throw new HttpError(405, 'Método não permitido.');
  let createKey: string | null = null;
  let createHash: string | null = null;
  if (req.method === 'POST' && resource !== 'orders') {
    createKey = req.headers.get('Idempotency-Key');
    if (!z.uuid().safeParse(createKey).success)
      throw new HttpError(400, 'Chave de repetição inválida.');
    createHash = await hash(
      JSON.stringify(await body(req.clone(), z.unknown())),
    );
    const repeated = await db
      .prepare(
        `SELECT id,create_hash FROM ${resource} WHERE organization_id=? AND create_key=?`,
      )
      .bind(org, createKey)
      .first<{ id: string; create_hash: string }>();
    if (repeated) {
      if (repeated.create_hash !== createHash)
        throw new HttpError(409, 'Chave já utilizada para outro registro.');
      return json({ id: repeated.id });
    }
  }
  const previous = id
    ? await db
        .prepare(`SELECT * FROM ${resource} WHERE organization_id=? AND id=?`)
        .bind(org, id)
        .first<Row>()
    : null;
  if (id && !previous) throw new HttpError(404, 'Não encontrado.');
  if (
    resource === 'orders' &&
    previous &&
    !['draft', 'awaiting_confirmation'].includes(String(previous.status))
  )
    throw new HttpError(
      409,
      'Pedido confirmado ou encerrado: use as ações de status.',
    );
  const entityId = id || crypto.randomUUID();
  const mutation = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [];
  const guard = `EXISTS (SELECT 1 FROM ${resource} WHERE organization_id=? AND id=? AND mutation_id=?)`;
  const guardArgs = [org, entityId, mutation];
  if (
    resource === 'orders' &&
    req.method === 'DELETE' &&
    (await financeReady(env))
  ) {
    const paid = await db
      .prepare(
        "SELECT COALESCE(SUM(CASE WHEN e.kind='reversal' THEN -p.amount_cents ELSE p.amount_cents END),0) AS cents FROM payment_allocations p JOIN payment_events e ON e.organization_id=p.organization_id AND e.id=p.event_id WHERE p.organization_id=? AND p.order_id=?",
      )
      .bind(org, id)
      .first<{ cents: number }>();
    if ((paid?.cents ?? 0) > 0)
      throw new HttpError(409, 'Estorne os recebimentos antes de arquivar.');
  }
  if (req.method === 'DELETE') {
    const data = await body(
      req,
      z.object({ version: z.number().int().positive() }).strict(),
    );
    if (previous!.version !== data.version)
      throw new HttpError(
        409,
        'Registro alterado em outra sessão. Atualize a página.',
      );
    statements.push(
      db
        .prepare(
          `UPDATE ${resource} SET active=0,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?`,
        )
        .bind(mutation, org, entityId, data.version),
    );
  } else if (resource === 'customers') {
    const d = await body(req, customerSchema);
    if (id && d.version !== previous!.version)
      throw new HttpError(409, 'Cliente alterado em outra sessão. Atualize.');
    statements.push(
      id
        ? db
            .prepare(
              'UPDATE customers SET name=?,phone=?,email=?,notes=?,active=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
            )
            .bind(
              d.name,
              d.phone,
              d.email,
              d.notes,
              +d.active,
              mutation,
              org,
              entityId,
              d.version,
            )
        : db
            .prepare(
              'INSERT INTO customers(id,organization_id,name,phone,email,notes,active,mutation_id,create_key,create_hash) VALUES(?,?,?,?,?,?,?,?,?,?)',
            )
            .bind(
              entityId,
              org,
              d.name,
              d.phone,
              d.email,
              d.notes,
              +d.active,
              mutation,
              createKey,
              createHash,
            ),
    );
  } else if (resource === 'products') {
    const d = await body(req, productSchema);
    if (id && d.version !== previous!.version)
      throw new HttpError(409, 'Produto alterado em outra sessão. Atualize.');
    const existing = id
      ? (
          await db
            .prepare(
              'SELECT id FROM product_variants WHERE organization_id=? AND product_id=?',
            )
            .bind(org, id)
            .all<{ id: string }>()
        ).results
      : [];
    if (d.variants.some((v) => v.id && !existing.some((e) => e.id === v.id)))
      throw new HttpError(400, 'Variante não pertence a este produto.');
    statements.push(
      id
        ? db
            .prepare(
              'UPDATE products SET name=?,description=?,active=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
            )
            .bind(
              d.name,
              d.description,
              +d.active,
              mutation,
              org,
              entityId,
              d.version,
            )
        : db
            .prepare(
              'INSERT INTO products(id,organization_id,name,description,active,mutation_id,create_key,create_hash) VALUES(?,?,?,?,?,?,?,?)',
            )
            .bind(
              entityId,
              org,
              d.name,
              d.description,
              +d.active,
              mutation,
              createKey,
              createHash,
            ),
    );
    statements.push(
      db
        .prepare(
          `UPDATE product_variants SET active=0 WHERE organization_id=? AND product_id=? AND ${guard}`,
        )
        .bind(org, entityId, ...guardArgs),
    );
    for (const v of d.variants) {
      if (v.id)
        statements.push(
          db
            .prepare(
              `UPDATE product_variants SET label=?,weight_grams=?,units_per_box=?,price_cents=?,active=? WHERE organization_id=? AND product_id=? AND id=? AND ${guard}`,
            )
            .bind(
              v.label,
              v.weight_grams,
              v.units_per_box,
              v.price_cents,
              +v.active,
              org,
              entityId,
              v.id,
              ...guardArgs,
            ),
        );
      else
        statements.push(
          db
            .prepare(
              `INSERT INTO product_variants(id,organization_id,product_id,label,weight_grams,units_per_box,price_cents,active) SELECT ?,?,?,?,?,?,?,? WHERE ${guard}`,
            )
            .bind(
              crypto.randomUUID(),
              org,
              entityId,
              v.label,
              v.weight_grams,
              v.units_per_box,
              v.price_cents,
              +v.active,
              ...guardArgs,
            ),
        );
    }
  } else {
    const d = await body(req, orderSchema);
    if (id && d.version !== previous!.version)
      throw new HttpError(409, 'Pedido alterado em outra sessão. Atualize.');
    const requestKey = id
      ? String(previous!.request_key)
      : req.headers.get('Idempotency-Key');
    if (!requestKey || !z.uuid().safeParse(requestKey).success)
      throw new HttpError(400, 'Chave de repetição inválida.');
    const fingerprint = await hash(JSON.stringify(d));
    if (!id) {
      const repeated = await db
        .prepare(
          'SELECT id,request_hash FROM orders WHERE organization_id=? AND request_key=?',
        )
        .bind(org, requestKey)
        .first<{ id: string; request_hash: string }>();
      if (repeated) {
        if (repeated.request_hash !== fingerprint)
          throw new HttpError(409, 'Chave já utilizada para outro pedido.');
        return json({ id: repeated.id }, 200);
      }
    }
    const customer = await db
      .prepare(
        'SELECT name FROM customers WHERE organization_id=? AND id=? AND active=1',
      )
      .bind(org, d.customer_id)
      .first<{ name: string }>();
    if (!customer)
      throw new HttpError(
        400,
        'Selecione um cliente ativo da sua organização.',
      );
    const old = id
      ? (
          await db
            .prepare(
              'SELECT * FROM order_items WHERE organization_id=? AND order_id=?',
            )
            .bind(org, id)
            .all<Snapshot>()
        ).results
      : [];
    const items: Snapshot[] = [];
    for (const item of d.items) {
      const snapshot = old.find((o) => o.variant_id === item.variant_id);
      if (snapshot) {
        items.push({ ...snapshot, quantity: item.quantity });
        continue;
      }
      const v = await db
        .prepare(
          'SELECT v.*,p.name FROM product_variants v JOIN products p ON p.organization_id=v.organization_id AND p.id=v.product_id WHERE v.organization_id=? AND v.id=? AND v.active=1 AND p.active=1',
        )
        .bind(org, item.variant_id)
        .first<Row>();
      if (!v)
        throw new HttpError(
          400,
          'Selecione variantes ativas da sua organização.',
        );
      items.push({
        variant_id: item.variant_id,
        quantity: item.quantity,
        product_name: String(v.name),
        variant_label: String(v.label),
        weight_grams: Number(v.weight_grams),
        units_per_box: Number(v.units_per_box),
        unit_price_cents: Number(v.price_cents),
      });
    }
    const total = items.reduce(
      (sum, i) => sum + i.quantity * i.unit_price_cents,
      0,
    );
    if (!Number.isSafeInteger(total) || total > 1000000000)
      throw new HttpError(400, 'Total excede o limite permitido.');
    const financial = await financeReady(env);
    if (financial && id) {
      const paid = await db
        .prepare(
          "SELECT COALESCE(SUM(CASE WHEN e.kind='reversal' THEN -p.amount_cents ELSE p.amount_cents END),0) AS cents FROM payment_allocations p JOIN payment_events e ON e.organization_id=p.organization_id AND e.id=p.event_id WHERE p.organization_id=? AND p.order_id=?",
        )
        .bind(org, id)
        .first<{ cents: number }>();
      if (total < (paid?.cents ?? 0))
        throw new HttpError(
          409,
          'Total menor que os recebimentos. Estorne o recebimento antes de reduzir.',
        );
    }
    const name =
      id && d.customer_id === previous!.customer_id
        ? previous!.customer_name
        : customer.name;
    statements.push(
      id
        ? db
            .prepare(
              'UPDATE orders SET customer_id=?,customer_name=?,due_at=?,notes=?,total_cents=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
            )
            .bind(
              d.customer_id,
              name,
              d.due_at,
              d.notes,
              total,
              mutation,
              org,
              entityId,
              d.version,
            )
        : db
            .prepare(
              'INSERT INTO orders(id,organization_id,customer_id,customer_name,due_at,notes,total_cents,request_key,request_hash,mutation_id) VALUES(?,?,?,?,?,?,?,?,?,?)',
            )
            .bind(
              entityId,
              org,
              d.customer_id,
              name,
              d.due_at,
              d.notes,
              total,
              requestKey,
              fingerprint,
              mutation,
            ),
    );
    statements.push(
      db
        .prepare(
          `DELETE FROM order_items WHERE organization_id=? AND order_id=? AND ${guard}`,
        )
        .bind(org, entityId, ...guardArgs),
    );
    for (const i of items)
      statements.push(
        db
          .prepare(
            `INSERT INTO order_items(id,organization_id,order_id,variant_id,product_name,variant_label,weight_grams,units_per_box,unit_price_cents,quantity) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ${guard}`,
          )
          .bind(
            crypto.randomUUID(),
            org,
            entityId,
            i.variant_id,
            i.product_name,
            i.variant_label,
            i.weight_grams,
            i.units_per_box,
            i.unit_price_cents,
            i.quantity,
            ...guardArgs,
          ),
      );
  }
  if (
    resource === 'orders' &&
    req.method === 'POST' &&
    (await financeReady(env))
  ) {
    const d = await body(original, orderSchema);
    statements.push(
      ...orderDefaults(db, org, entityId, d.customer_id, mutation),
    );
    if (d.template_id) {
      const plan = await db
        .prepare(
          'SELECT id FROM recurring_templates WHERE organization_id=? AND id=? AND customer_id=? AND active=1',
        )
        .bind(org, d.template_id, d.customer_id)
        .first();
      if (!plan)
        throw new HttpError(
          400,
          'Modelo não pertence ao cliente ou está inativo.',
        );
      statements.push(
        db
          .prepare(
            `UPDATE orders SET delivery_type=t.delivery_type,delivery_address=t.delivery_address,courier=t.courier,courier_name=t.courier_name,courier_fee_cents=t.courier_fee_cents FROM recurring_templates t WHERE t.organization_id=? AND t.id=? AND orders.organization_id=? AND orders.id=? AND orders.mutation_id=?`,
          )
          .bind(org, d.template_id, org, entityId, mutation),
      );
    }
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,?,? WHERE ${guard}`,
      )
      .bind(
        crypto.randomUUID(),
        org,
        a.user_id,
        `${resource}.${req.method.toLowerCase()}`,
        entityId,
        ...guardArgs,
      ),
  );
  let results: D1Result[];
  try {
    results = await db.batch(statements);
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed'))
      throw new HttpError(
        409,
        'Registro duplicado. Atualize a lista antes de repetir.',
      );
    throw error;
  }
  if (results[0].meta.changes === 0)
    throw new HttpError(409, 'Registro alterado em outra sessão. Atualize.');
  return json({ id: entityId }, id ? 200 : 201);
}
