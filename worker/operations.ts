import { shiftMonth } from '../shared/workday';
import { mobileReady } from './mobile-ready';
import { fieldReady } from './field-ready';
import { snapshotPlaces } from './order-places';
import { financeReady } from './finance-ready';
import { emptyTerms } from '../shared/finance';
import { UNDO_SECONDS } from '../shared/order-state';
import { operationalReady } from './operational-ready';
import { z } from 'zod';
import { body, hash, HttpError, json, type Actor, type Env } from './security';
import { childrenByParent } from './listing';
import {
  addDays,
  businessDay,
  daySchema,
  deliverySchema,
  interpolate,
  nextStatuses,
  recurringSchema,
  templates,
  transitionSchema,
  utcStart,
  type MessageKind,
  type Status,
} from './operations-domain';
type Row = Record<string, string | number | null>;
const keyFrom = (req: Request) => {
  const key = req.headers.get('Idempotency-Key');
  if (!z.uuid().safeParse(key).success)
    throw new HttpError(400, 'Chave de repetição inválida.');
  return key!;
};
export async function operations(
  req: Request,
  env: Env,
  a: Actor,
): Promise<Response> {
  if (!(await operationalReady(env)))
    throw new HttpError(
      503,
      'As novas funções ainda não estão disponíveis nesta conta.',
    );
  const db = env.DB!,
    org = a.organization_id,
    url = new URL(req.url);
  const parts = url.pathname.split('/');
  const resource = parts[2],
    id = parts[3],
    action = parts[4];
  const audit = (name: string, entity: string) =>
    db
      .prepare(
        'INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) VALUES(?,?,?,?,?)',
      )
      .bind(crypto.randomUUID(), org, a.user_id, name, entity);
  if (resource === 'today' && id === 'calendar' && req.method === 'GET') {
    const month = url.searchParams.get('month') ?? '';
    if (!/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month))
      throw new HttpError(400, 'Mês inválido.');
    const counts = (
      await db
        .prepare(
          "SELECT date(due_at,'-3 hours') AS day,COUNT(*) AS count FROM orders WHERE organization_id=? AND active=1 AND delivery_type='delivery' AND status IN('confirmed','in_production','ready','out_for_delivery','delivered') AND due_at>=? AND due_at<? GROUP BY day ORDER BY day",
        )
        .bind(
          org,
          utcStart(month + '-01'),
          utcStart(shiftMonth(month, 1) + '-01'),
        )
        .all()
    ).results;
    return json({ month, counts });
  }
  if (resource === 'today' && req.method === 'GET') {
    const parsedDay = daySchema.safeParse(
      url.searchParams.get('date') || businessDay(),
    );
    if (!parsedDay.success) throw new HttpError(400, 'Data inválida.');
    const day = parsedDay.data;
    const financial = await financeReady(env);
    const rows = (
      await db
        .prepare(
          `SELECT o.*${financial ? ",COALESCE(json_extract(t.data,'$.mode'),'unset') AS payment_mode" : ''} FROM orders o ${financial ? 'LEFT JOIN order_terms t ON t.organization_id=o.organization_id AND t.order_id=o.id' : ''} WHERE o.organization_id=? AND o.active=1 AND o.status<>'cancelled' AND o.due_at>=? AND o.due_at<? ORDER BY o.due_at,o.id LIMIT 201`,
        )
        .bind(org, utcStart(day), utcStart(addDays(day, 2)))
        .all<Row>()
    ).results;
    const truncated = rows.length > 200;
    const selected = rows.slice(0, 200);
    const children = await childrenByParent(
      db,
      org,
      'orders',
      selected.map((o) => String(o.id)),
    );
    const photoRows =
      (await mobileReady(env)) && selected.length
        ? (
            await db
              .prepare(
                'SELECT v.id,COALESCE(v.photo_key,p.photo_key) AS photo_key FROM product_variants v JOIN products p ON p.organization_id=v.organization_id AND p.id=v.product_id WHERE v.organization_id=? AND v.id IN(SELECT DISTINCT i.variant_id FROM order_items i WHERE i.organization_id=? AND i.order_id IN(SELECT value FROM json_each(?)))',
              )
              .bind(org, org, JSON.stringify(selected.map((o) => o.id)))
              .all<{ id: string; photo_key: string | null }>()
          ).results
        : [];
    const photos = new Map(photoRows.map((r) => [r.id, r.photo_key]));
    const orders = selected.map((o) => ({
      ...o,
      status: String(o.status),
      due_at: String(o.due_at),
      request_key: undefined,
      request_hash: undefined,
      create_key: undefined,
      create_hash: undefined,
      mutation_id: undefined,
      items: (children.get(String(o.id)) ?? []).map((i) => ({
        ...i,
        photo_key: photos.get(String(i.variant_id)) ?? null,
      })),
    }));
    // A lista de cartões é limitada; a produção agrega TODOS os pedidos do período.
    const production = (
      await db
        .prepare(
          "SELECT date(o.due_at,'-3 hours') AS day,i.product_name AS name,i.variant_label AS label,i.weight_grams,i.units_per_box,SUM(i.quantity) AS boxes,SUM(i.quantity*i.units_per_box) AS units FROM order_items i JOIN orders o ON o.organization_id=i.organization_id AND o.id=i.order_id WHERE o.organization_id=? AND o.active=1 AND o.status IN ('confirmed','in_production') AND o.due_at>=? AND o.due_at<? GROUP BY day,i.product_name,i.variant_label,i.weight_grams,i.units_per_box ORDER BY day,i.product_name,i.variant_label,i.weight_grams",
        )
        .bind(org, utcStart(day), utcStart(addDays(day, 2)))
        .all()
    ).results;
    const totals = await db
      .prepare(
        "SELECT COALESCE(SUM(CASE WHEN status IN ('confirmed','in_production','ready','out_for_delivery') THEN total_cents ELSE 0 END),0) AS expected_cents, COALESCE(SUM(CASE WHEN status IN ('delivered','picked_up') THEN total_cents ELSE 0 END),0) AS delivered_cents FROM orders WHERE organization_id=? AND active=1 AND due_at>=? AND due_at<?",
      )
      .bind(org, utcStart(day), utcStart(addDays(day, 1)))
      .first();
    return json({
      day,
      role: a.role,
      orders,
      production,
      totals,
      received_available: financial,
      truncated,
    });
  }
  // Três pedidos por invocação: mesmas validações individuais sem exceder D1 Free.
  if (resource === 'confirm-reviewed' && req.method === 'POST') {
    const data = await body(
      req,
      z
        .object({
          orders: z
            .array(
              z
                .object({
                  id: z.uuid(),
                  version: z.number().int().positive(),
                  key: z.uuid(),
                })
                .strict(),
            )
            .min(1)
            .max(3),
        })
        .strict(),
    );
    if (new Set(data.orders.map((o) => o.id)).size !== data.orders.length)
      throw new HttpError(400, 'Pedido repetido no lote.');
    const results = [];
    for (const item of data.orders) {
      const headers = new Headers(req.headers);
      headers.set('Idempotency-Key', item.key);
      try {
        const result = await operations(
          new Request(new URL(`/api/orders/${item.id}/status`, req.url), {
            method: 'POST',
            headers,
            body: JSON.stringify({ version: item.version, to: 'confirmed' }),
          }),
          env,
          a,
        );
        results.push({
          id: item.id,
          ok: result.ok,
          ...((await result.json()) as object),
        });
      } catch (e) {
        if (!(e instanceof HttpError)) throw e;
        results.push({
          id: item.id,
          ok: false,
          status: e.status,
          error: e.message,
        });
      }
    }
    return json({ results });
  }
  if (resource === 'recurring') {
    if (id && !z.uuid().safeParse(id).success)
      throw new HttpError(404, 'Não encontrado.');
    if (req.method === 'GET') {
      const rows = (
        await db
          .prepare(
            `SELECT t.*,c.name AS customer_name FROM recurring_templates t JOIN customers c ON c.organization_id=t.organization_id AND c.id=t.customer_id WHERE t.organization_id=?${id ? ' AND t.id=?' : ''} ORDER BY t.weekday,t.name LIMIT 100`,
          )
          .bind(org, ...(id ? [id] : []))
          .all<Row>()
      ).results;
      const children = await childrenByParent(
        db,
        org,
        'recurring',
        rows.map((t) => String(t.id)),
      );
      const output = rows.map((t) => ({
        ...t,
        mutation_id: undefined,
        items: children.get(String(t.id)) ?? [],
      }));
      if (id && !output.length)
        throw new HttpError(404, 'Modelo não encontrado.');
      return json(id ? output[0] : output);
    }
    if (req.method !== 'POST' && req.method !== 'PUT')
      throw new HttpError(405, 'Método não permitido.');
    if ((req.method === 'PUT') !== !!id)
      throw new HttpError(405, 'Método não permitido.');
    const data = await body(req, recurringSchema);
    const mutation = crypto.randomUUID();
    const customer = await db
      .prepare(
        'SELECT id FROM customers WHERE organization_id=? AND id=? AND active=1',
      )
      .bind(org, data.customer_id)
      .first();
    if (!customer) throw new HttpError(400, 'Cliente ativo não encontrado.');
    const variants = (
      await db
        .prepare(
          `SELECT v.id FROM product_variants v JOIN products p ON p.organization_id=v.organization_id AND p.id=v.product_id WHERE v.organization_id=? AND v.id IN (${data.items.map(() => '?').join(',')}) ${data.active ? 'AND v.active=1 AND p.active=1' : ''}`,
        )
        .bind(org, ...data.items.map((i) => i.variant_id))
        .all<{ id: string }>()
    ).results;
    if (variants.length !== data.items.length)
      throw new HttpError(400, 'Variante ativa não encontrada.');
    const previous = id
      ? await db
          .prepare(
            'SELECT version FROM recurring_templates WHERE organization_id=? AND id=?',
          )
          .bind(org, id)
          .first<{ version: number }>()
      : null;
    if (id && !previous) throw new HttpError(404, 'Modelo não encontrado.');
    if (id && data.version !== previous?.version)
      throw new HttpError(409, 'Modelo alterado. Atualize.');
    // UUID enviado pelo cliente torna a criação de modelo repetível sem duplicar.
    const createKey = id || keyFrom(req);
    const templateId = id || createKey;
    const first = id
      ? db
          .prepare(
            'UPDATE recurring_templates SET name=?,customer_id=?,weekday=?,time=?,notes=?,delivery_type=?,delivery_address=?,courier=?,courier_name=?,courier_fee_cents=?,active=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
          )
          .bind(
            data.name,
            data.customer_id,
            data.weekday,
            data.time,
            data.notes,
            data.delivery_type,
            data.delivery_address,
            data.courier,
            data.courier_name,
            data.courier_fee_cents,
            +data.active,
            mutation,
            org,
            templateId,
            data.version,
          )
      : db
          .prepare(
            'INSERT OR IGNORE INTO recurring_templates(id,organization_id,name,customer_id,weekday,time,notes,delivery_type,delivery_address,courier,courier_name,courier_fee_cents,active,mutation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          )
          .bind(
            templateId,
            org,
            data.name,
            data.customer_id,
            data.weekday,
            data.time,
            data.notes,
            data.delivery_type,
            data.delivery_address,
            data.courier,
            data.courier_name,
            data.courier_fee_cents,
            +data.active,
            mutation,
          );
    const guard =
      'EXISTS(SELECT 1 FROM recurring_templates WHERE organization_id=? AND id=? AND mutation_id=?)';
    const results = await db.batch([
      first,
      db
        .prepare(
          `DELETE FROM recurring_items WHERE organization_id=? AND template_id=? AND ${guard}`,
        )
        .bind(org, templateId, org, templateId, mutation),
      db
        .prepare(
          `INSERT INTO recurring_items(id,organization_id,template_id,variant_id,quantity) SELECT json_extract(value,'$.id'),?,?,json_extract(value,'$.variant_id'),json_extract(value,'$.quantity') FROM json_each(?) WHERE ${guard}`,
        )
        .bind(
          org,
          templateId,
          JSON.stringify(
            data.items.map((i) => ({ ...i, id: crypto.randomUUID() })),
          ),
          org,
          templateId,
          mutation,
        ),
      db
        .prepare(
          `INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,?,? WHERE ${guard}`,
        )
        .bind(
          crypto.randomUUID(),
          org,
          a.user_id,
          'recurring.saved',
          templateId,
          org,
          templateId,
          mutation,
        ),
    ]);
    if (!results[0].meta.changes)
      throw new HttpError(
        409,
        'Modelo já existe ou foi alterado. Atualize a lista.',
      );
    return json({ id: templateId }, id ? 200 : 201);
  }
  if (resource === 'generate-week' && req.method === 'POST') {
    const data = await body(req, z.object({ week: daySchema }).strict());
    if (new Date(data.week + 'T12:00:00Z').getUTCDay() !== 1)
      throw new HttpError(400, 'Escolha a segunda-feira da semana.');
    const plans = (
      await db
        .prepare(
          'SELECT t.*,c.name AS customer_name,c.active AS customer_active FROM recurring_templates t JOIN customers c ON c.organization_id=t.organization_id AND c.id=t.customer_id WHERE t.organization_id=? AND t.active=1 ORDER BY t.id LIMIT 101',
        )
        .bind(org)
        .all<Row>()
    ).results;
    if (plans.length > 100)
      throw new HttpError(400, 'Limite de 100 modelos por geração.');
    const rows = (
      await db
        .prepare(
          'SELECT i.*,v.label,v.weight_grams,v.units_per_box,v.price_cents,p.name,v.active AS variant_active,p.active AS product_active FROM recurring_items i JOIN recurring_templates t ON t.organization_id=i.organization_id AND t.id=i.template_id JOIN product_variants v ON v.organization_id=i.organization_id AND v.id=i.variant_id JOIN products p ON p.organization_id=v.organization_id AND p.id=v.product_id WHERE i.organization_id=? AND t.active=1',
        )
        .bind(org)
        .all<Row>()
    ).results;
    const itemCounts = (
      await db
        .prepare(
          'SELECT template_id,COUNT(*) AS count FROM recurring_items WHERE organization_id=? GROUP BY template_id',
        )
        .bind(org)
        .all<{ template_id: string; count: number }>()
    ).results;
    const skipped: { id: string; name: string; reason: string }[] = [];
    const nonce = crypto.randomUUID();
    const planned: Record<string, unknown>[] = [],
      items: Record<string, unknown>[] = [];
    for (const plan of plans) {
      const contents = rows.filter((i) => i.template_id === plan.id);
      const inactive = contents.find(
        (i) => !i.variant_active || !i.product_active,
      );
      const reason = !plan.customer_active
        ? 'Cliente inativo.'
        : inactive
          ? `Variante ${inactive.name} — ${inactive.label} inativa.`
          : !contents.length ||
              contents.length !==
                itemCounts.find((c) => c.template_id === plan.id)?.count
            ? 'Itens ausentes; revise o modelo.'
            : '';
      if (reason) {
        skipped.push({ id: String(plan.id), name: String(plan.name), reason });
        continue;
      }
      const due = new Date(
        `${addDays(data.week, Number(plan.weekday) - 1)}T${plan.time}:00-03:00`,
      ).toISOString();
      const id = crypto.randomUUID();
      const total = contents.reduce(
        (n, i) => n + Number(i.quantity) * Number(i.price_cents),
        0,
      );
      if (!Number.isSafeInteger(total) || total > 1000000000) {
        skipped.push({
          id: String(plan.id),
          name: String(plan.name),
          reason: 'Total excede o limite.',
        });
        continue;
      }
      planned.push({
        id,
        customer_id: plan.customer_id,
        customer_name: plan.customer_name,
        due_at: due,
        notes: plan.notes,
        total_cents: total,
        delivery_type: plan.delivery_type,
        delivery_address: plan.delivery_address,
        courier: plan.courier,
        courier_name: plan.courier_name,
        courier_fee_cents: plan.courier_fee_cents,
        recurrence_key: `${plan.id}:${data.week}`,
        request_key: crypto.randomUUID(),
      });
      for (const item of contents)
        items.push({
          id: crypto.randomUUID(),
          order_id: id,
          variant_id: item.variant_id,
          product_name: item.name,
          variant_label: item.label,
          weight_grams: item.weight_grams,
          units_per_box: item.units_per_box,
          unit_price_cents: item.price_cents,
          quantity: item.quantity,
        });
    }
    const ordersJSON = JSON.stringify(planned),
      itemsJSON = JSON.stringify(items);
    if (ordersJSON.length + itemsJSON.length > 900000)
      throw new HttpError(400, 'Reduza os modelos desta geração.');
    const financial = await financeReady(env);
    const result = await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO orders(id,organization_id,customer_id,customer_name,due_at,notes,total_cents,request_key,request_hash,mutation_id,order_type,delivery_type,delivery_address,courier,courier_name,courier_fee_cents,recurrence_key) SELECT json_extract(value,'$.id'),?,json_extract(value,'$.customer_id'),json_extract(value,'$.customer_name'),json_extract(value,'$.due_at'),json_extract(value,'$.notes'),json_extract(value,'$.total_cents'),json_extract(value,'$.request_key'),'recurring',?,'recurring',json_extract(value,'$.delivery_type'),json_extract(value,'$.delivery_address'),json_extract(value,'$.courier'),json_extract(value,'$.courier_name'),json_extract(value,'$.courier_fee_cents'),json_extract(value,'$.recurrence_key') FROM json_each(?)",
        )
        .bind(org, nonce, ordersJSON),
      db
        .prepare(
          "INSERT INTO order_items(id,organization_id,order_id,variant_id,product_name,variant_label,weight_grams,units_per_box,unit_price_cents,quantity) SELECT json_extract(j.value,'$.id'),?,json_extract(j.value,'$.order_id'),json_extract(j.value,'$.variant_id'),json_extract(j.value,'$.product_name'),json_extract(j.value,'$.variant_label'),json_extract(j.value,'$.weight_grams'),json_extract(j.value,'$.units_per_box'),json_extract(j.value,'$.unit_price_cents'),json_extract(j.value,'$.quantity') FROM json_each(?) j JOIN orders o ON o.organization_id=? AND o.id=json_extract(j.value,'$.order_id') AND o.mutation_id=?",
        )
        .bind(org, itemsJSON, org, nonce),
      ...((await fieldReady(env)) ? snapshotPlaces(db, org, nonce) : []),
      ...(financial
        ? [
            db
              .prepare(
                "INSERT OR IGNORE INTO order_terms(organization_id,order_id,data) SELECT o.organization_id,o.id,COALESCE(json_extract(p.data,'$.terms'),?) FROM orders o LEFT JOIN customer_profiles p ON p.organization_id=o.organization_id AND p.customer_id=o.customer_id WHERE o.organization_id=? AND o.mutation_id=?",
              )
              .bind(JSON.stringify(emptyTerms()), org, nonce),
          ]
        : []),
      db
        .prepare(
          "INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT lower(hex(randomblob(16))),organization_id,?,'recurring.generated',id FROM orders WHERE organization_id=? AND mutation_id=?",
        )
        .bind(a.user_id, org, nonce),
    ]);
    const generated = (
      await db
        .prepare(
          "SELECT id,customer_name,version,status,total_cents,due_at,delivery_type,delivery_address FROM orders WHERE organization_id=? AND recurrence_key IN (SELECT json_extract(value,'$.recurrence_key') FROM json_each(?)) ORDER BY due_at,id",
        )
        .bind(org, ordersJSON)
        .all<Row>()
    ).results;
    const generatedItems = await childrenByParent(
      db,
      org,
      'orders',
      generated.map((o) => String(o.id)),
    );
    return json({
      created: result[0].meta.changes,
      already_present: planned.length - result[0].meta.changes,
      week: data.week,
      skipped,
      orders: generated.map((o) => ({
        ...o,
        items: generatedItems.get(String(o.id)) ?? [],
      })),
    });
  }
  if (resource === 'message-templates') {
    if (req.method === 'GET') {
      const overrides = (
        await db
          .prepare(
            'SELECT kind,content FROM message_templates WHERE organization_id=?',
          )
          .bind(org)
          .all<{ kind: MessageKind; content: string }>()
      ).results;
      return json(
        Object.entries(templates).map(([kind, content]) => ({
          kind,
          content: overrides.find((v) => v.kind === kind)?.content ?? content,
        })),
      );
    }
    if (req.method === 'PUT') {
      const data = await body(
        req,
        z
          .object({
            kind: z.enum(
              Object.keys(templates) as [MessageKind, ...MessageKind[]],
            ),
            content: z.string().trim().min(1).max(2000),
          })
          .strict(),
      );
      const known = [
        'cliente',
        'numero_pedido',
        'itens',
        'total',
        'data',
        'hora',
        'endereco',
      ];
      for (const match of data.content.matchAll(/\{([^{}]+)\}/g))
        if (!known.includes(match[1]))
          throw new HttpError(
            400,
            'Campo de modelo não disponível nesta etapa.',
          );
      if (/[{}]/.test(data.content.replace(/\{[^{}]+\}/g, '')))
        throw new HttpError(400, 'Modelo inválido.');
      await db.batch([
        db
          .prepare(
            'INSERT INTO message_templates(organization_id,kind,content) VALUES(?,?,?) ON CONFLICT(organization_id,kind) DO UPDATE SET content=excluded.content',
          )
          .bind(org, data.kind, data.content),
        audit('message_template.updated', data.kind),
      ]);
      return json({ ok: true });
    }
  }
  if (resource !== 'orders' || !id || !z.uuid().safeParse(id).success)
    throw new HttpError(404, 'Não encontrado.');
  const order = await db
    .prepare(
      'SELECT * FROM orders WHERE organization_id=? AND id=? AND active=1',
    )
    .bind(org, id)
    .first<Row>();
  if (!order) throw new HttpError(404, 'Pedido não encontrado.');
  if (action === 'history' && req.method === 'GET')
    return json(
      (
        await db
          .prepare(
            'SELECT id,from_status,to_status,reason,user_id,created_at,undo_of FROM order_status_events WHERE organization_id=? AND order_id=? ORDER BY order_version',
          )
          .bind(org, id)
          .all()
      ).results,
    );
  if (action === 'delivery' && req.method === 'PUT') {
    const data = await body(req, deliverySchema);
    if (data.version !== order.version)
      throw new HttpError(409, 'Pedido alterado. Atualize.');
    if (['delivered', 'picked_up', 'cancelled'].includes(String(order.status)))
      throw new HttpError(409, 'Pedido encerrado não pode ser editado.');
    const nonce = crypto.randomUUID();
    const result = await db.batch([
      db
        .prepare(
          'UPDATE orders SET delivery_type=?,delivery_address=?,courier=?,courier_name=?,courier_fee_cents=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
        )
        .bind(
          data.delivery_type,
          data.delivery_address,
          data.courier,
          data.courier_name,
          data.courier_fee_cents,
          nonce,
          org,
          id,
          data.version,
        ),
      ...((await fieldReady(env)) ? snapshotPlaces(db, org, nonce) : []),
      db
        .prepare(
          "INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,'order.delivery',? WHERE EXISTS(SELECT 1 FROM orders WHERE organization_id=? AND id=? AND mutation_id=?)",
        )
        .bind(crypto.randomUUID(), org, a.user_id, id, org, id, nonce),
    ]);
    if (!result[0].meta.changes)
      throw new HttpError(409, 'Pedido alterado. Atualize.');
    return json({ ok: true });
  }
  if ((action === 'status' || action === 'undo') && req.method === 'POST') {
    const key = keyFrom(req);
    const data =
      action === 'status'
        ? await body(req, transitionSchema)
        : await body(
            req,
            z
              .object({
                version: z.number().int().positive(),
                event_id: z.uuid(),
              })
              .strict(),
          );
    const fingerprint = await hash(
      JSON.stringify({ id, action, user: a.user_id, data }),
    );
    const repeated = await db
      .prepare(
        'SELECT id,request_hash FROM order_status_events WHERE organization_id=? AND request_key=?',
      )
      .bind(org, key)
      .first<{ id: string; request_hash: string }>();
    if (repeated) {
      if (repeated.request_hash !== fingerprint)
        throw new HttpError(409, 'Chave já utilizada.');
      return json({ event_id: repeated.id });
    }
    let target: Status,
      reason: string,
      undoOf: string | null = null;
    if (action === 'undo') {
      const undo = data as { version: number; event_id: string };
      const event = await db
        .prepare(
          'SELECT * FROM order_status_events WHERE organization_id=? AND order_id=? AND id=?',
        )
        .bind(org, id, undo.event_id)
        .first<Row>();
      if (
        !event ||
        event.user_id !== a.user_id ||
        event.to_status !== order.status ||
        event.order_version !== order.version ||
        !['delivered', 'picked_up'].includes(String(event.to_status)) ||
        Number(event.created_at) < Math.floor(Date.now() / 1000) - UNDO_SECONDS
      )
        throw new HttpError(
          409,
          'A janela para desfazer terminou ou o pedido foi alterado.',
        );
      target = event.from_status as Status;
      reason = `Entrega desfeita pelo operador dentro de ${UNDO_SECONDS} segundos.`;
      undoOf = String(event.id);
    } else {
      const change = data as z.infer<typeof transitionSchema>;
      target = change.to;
      reason = change.reason;
    }
    if (data.version !== order.version)
      throw new HttpError(409, 'Pedido alterado em outra sessão. Atualize.');
    if (
      action === 'status' &&
      !nextStatuses(
        order.status as Status,
        String(order.delivery_type),
      ).includes(target)
    )
      throw new HttpError(409, 'Transição de status não permitida.');
    if (await financeReady(env)) {
      if (
        action === 'undo' &&
        (await db
          .prepare(
            'SELECT 1 FROM combined_receipts WHERE organization_id=? AND status_event_id=? AND undo_id IS NULL',
          )
          .bind(org, (data as { event_id: string }).event_id)
          .first())
      )
        throw new HttpError(409, 'Use Desfazer entrega e recebimento no Hoje.');
      if (target === 'cancelled') {
        const paid = await db
          .prepare(
            "SELECT COALESCE(SUM(CASE WHEN e.kind='reversal' THEN -p.amount_cents ELSE p.amount_cents END),0) AS cents FROM payment_allocations p JOIN payment_events e ON e.organization_id=p.organization_id AND e.id=p.event_id WHERE p.organization_id=? AND p.order_id=?",
          )
          .bind(org, id)
          .first<{ cents: number }>();
        if ((paid?.cents ?? 0) > 0)
          throw new HttpError(
            409,
            'Estorne os recebimentos antes de cancelar.',
          );
      }
      if (
        action === 'undo' &&
        (await db
          .prepare(
            'SELECT 1 FROM closing_orders WHERE organization_id=? AND order_id=?',
          )
          .bind(org, id)
          .first())
      )
        throw new HttpError(409, 'Entrega já incluída em fechamento.');
    }
    if (target === 'out_for_delivery' && order.courier === 'unassigned')
      throw new HttpError(400, 'Selecione quem fará a entrega antes da saída.');
    if (
      target === 'awaiting_confirmation' &&
      order.status === 'confirmed' &&
      !reason.trim()
    )
      throw new HttpError(400, 'Informe o motivo da reabertura.');
    if (target === 'cancelled' && !reason.trim())
      throw new HttpError(400, 'Informe o motivo do cancelamento.');
    if (
      target === 'confirmed' &&
      order.delivery_type === 'delivery' &&
      !String(order.delivery_address).trim()
    )
      throw new HttpError(
        400,
        'Informe o endereço de entrega ou selecione retirada antes de confirmar.',
      );
    const eventId = crypto.randomUUID();
    const result = await db.batch([
      db
        .prepare(
          'UPDATE orders SET status=?,version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
        )
        .bind(target, eventId, org, id, data.version),
      db
        .prepare(
          'INSERT INTO order_status_events(id,organization_id,order_id,user_id,from_status,to_status,reason,order_version,request_key,request_hash,undo_of) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE organization_id=? AND id=? AND mutation_id=?)',
        )
        .bind(
          eventId,
          org,
          id,
          a.user_id,
          order.status,
          target,
          reason,
          Number(data.version) + 1,
          key,
          fingerprint,
          undoOf,
          org,
          id,
          eventId,
        ),
      db
        .prepare(
          "INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,'order.status',? WHERE EXISTS(SELECT 1 FROM orders WHERE organization_id=? AND id=? AND mutation_id=?)",
        )
        .bind(crypto.randomUUID(), org, a.user_id, id, org, id, eventId),
    ]);
    if (!result[0].meta.changes)
      throw new HttpError(409, 'Pedido alterado. Atualize.');
    return json({
      event_id: eventId,
      undo_seconds: ['delivered', 'picked_up'].includes(target)
        ? UNDO_SECONDS
        : 0,
    });
  }
  if (action === 'message' && req.method === 'POST') {
    const data = await body(
      req,
      z
        .object({
          kind: z.enum(
            Object.keys(templates) as [MessageKind, ...MessageKind[]],
          ),
        })
        .strict(),
    );
    const customer = await db
      .prepare('SELECT phone FROM customers WHERE organization_id=? AND id=?')
      .bind(org, order.customer_id)
      .first<{ phone: string }>();
    if (!customer || !/^\+[1-9]\d{7,14}$/.test(customer.phone))
      throw new HttpError(400, 'Telefone do cliente inválido.');
    const items = (
      await db
        .prepare(
          'SELECT * FROM order_items WHERE organization_id=? AND order_id=?',
        )
        .bind(org, id)
        .all<Row>()
    ).results;
    const custom = await db
      .prepare(
        'SELECT content FROM message_templates WHERE organization_id=? AND kind=?',
      )
      .bind(org, data.kind)
      .first<{ content: string }>();
    const date = new Date(String(order.due_at));
    const content = custom?.content ?? templates[data.kind];
    let message: string;
    try {
      message = interpolate(content, {
        cliente: String(order.customer_name),
        numero_pedido: String(order.id).slice(0, 8),
        itens: items
          .map(
            (i) =>
              `${i.quantity} embalagem(ns) de ${i.product_name} — ${i.variant_label}`,
          )
          .join('; '),
        total: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(Number(order.total_cents) / 100),
        data: new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Fortaleza',
        }).format(date),
        hora: new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Fortaleza',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date),
        endereco:
          order.delivery_type === 'pickup'
            ? 'retirada combinada'
            : String(order.delivery_address),
      });
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    return json({ message, phone: customer.phone });
  }
  if (action === 'contact' && req.method === 'POST') {
    const data = await body(
      req,
      z
        .object({
          kind: z.enum(
            Object.keys(templates) as [MessageKind, ...MessageKind[]],
          ),
        })
        .strict(),
    );
    const key = keyFrom(req);
    const existing = await db
      .prepare(
        'SELECT order_id,template_kind FROM contact_events WHERE organization_id=? AND request_key=?',
      )
      .bind(org, key)
      .first<{ order_id: string; template_kind: string }>();
    if (
      existing &&
      (existing.order_id !== id || existing.template_kind !== data.kind)
    )
      throw new HttpError(409, 'Chave de contato já utilizada.');
    if (!existing)
      await db.batch([
        db
          .prepare(
            'INSERT OR IGNORE INTO contact_events(id,organization_id,order_id,user_id,template_kind,request_key) VALUES(?,?,?,?,?,?)',
          )
          .bind(crypto.randomUUID(), org, id, a.user_id, data.kind, key),
        db
          .prepare(
            "INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,'order.contact_recorded',? WHERE changes()=1",
          )
          .bind(crypto.randomUUID(), org, a.user_id, id),
      ]);
    return json({
      ok: true,
      notice:
        'Contato registrado manualmente. O aplicativo não comprova envio ou entrega de mensagem.',
    });
  }
  throw new HttpError(405, 'Ação não disponível.');
}
