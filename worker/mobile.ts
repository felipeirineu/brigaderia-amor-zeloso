import { itemInputSchema, uniqueItems } from './mixed-domain';
import { attachComponents, prepareItems, writeComponents } from './mixed';
import type { ItemSnapshot } from '../shared/mixed';
import { fieldReady } from './field-ready';
import { snapshotPlaces } from './order-places';
import { z } from 'zod';
import { mobileReady } from './mobile-ready';
import { financeReady } from './finance-ready';
import { hash, HttpError, json, type Actor, type Env } from './security';
import { p1Mutation } from './p1-common';
import { termsSchema } from './finance-domain';
import { emptyTerms, emptyProfile } from '../shared/finance';
import { deliverySchema, nextStatuses } from './operations-domain';
const schema = z
  .object({
    customer_id: z.uuid(),
    version: z.number().int().positive().optional(),
    due_at: z.iso
      .datetime({ offset: true })
      .transform((v) => new Date(v).toISOString()),
    notes: z.string().trim().max(2000).default(''),
    items: z.array(itemInputSchema).min(1).max(50),
    composition_version: z.literal(1).optional(),
    delivery: z
      .object({ ...deliverySchema.shape, version: z.number().optional() })
      .strict()
      .refine(
        (v) => v.courier !== 'courier' || !!v.courier_name,
        'Informe o nome do motoboy.',
      ),
    terms: termsSchema.nullable().default(null),
  })
  .strict()
  .refine((v) => uniqueItems(v.items), 'Variante repetida.');
type Row = Record<string, string | number | null>;
export async function mobile(req: Request, env: Env, a: Actor) {
  if (!(await mobileReady(env)))
    throw new HttpError(503, 'Pedidos por fotos ainda não ativados.');
  const db = env.DB!,
    org = a.organization_id,
    [, , , resource, id] = new URL(req.url).pathname.split('/');
  if (resource === 'customers' && req.method === 'GET') {
    const q = (new URL(req.url).searchParams.get('q') || '').slice(0, 120);
    return json(
      (
        await db
          .prepare(
            "SELECT c.id,c.name,c.phone,COUNT(o.id) AS frequency FROM customers c LEFT JOIN orders o ON o.organization_id=c.organization_id AND o.customer_id=c.id AND o.active=1 AND o.status<>'cancelled' WHERE c.organization_id=? AND c.active=1 AND (c.name LIKE ? OR c.phone LIKE ?) GROUP BY c.id ORDER BY frequency DESC,c.name LIMIT 200",
          )
          .bind(org, '%' + q + '%', '%' + q + '%')
          .all()
      ).results,
    );
  }
  if (resource === 'defaults' && id && req.method === 'GET') {
    if (
      !z.uuid().safeParse(id).success ||
      !(await db
        .prepare(
          'SELECT 1 FROM customers WHERE organization_id=? AND id=? AND active=1',
        )
        .bind(org, id)
        .first())
    )
      throw new HttpError(404, 'Cliente não encontrado.');
    const plans = (
      await db
        .prepare(
          'SELECT * FROM recurring_templates WHERE organization_id=? AND customer_id=? AND active=1 ORDER BY weekday,name LIMIT 100',
        )
        .bind(org, id)
        .all<Row>()
    ).results;
    const items = (
      await db
        .prepare(
          'SELECT i.template_id,i.variant_id,i.quantity,v.active AS variant_active,p.active AS product_active FROM recurring_items i JOIN recurring_templates t ON t.organization_id=i.organization_id AND t.id=i.template_id JOIN product_variants v ON v.organization_id=i.organization_id AND v.id=i.variant_id JOIN products p ON p.organization_id=v.organization_id AND p.id=v.product_id WHERE i.organization_id=? AND t.customer_id=? AND t.active=1',
        )
        .bind(org, id)
        .all<Row>()
    ).results;
    const last = await db
      .prepare(
        "SELECT id,due_at,notes FROM orders WHERE organization_id=? AND customer_id=? AND active=1 AND status<>'cancelled' ORDER BY created_at DESC,id DESC LIMIT 1",
      )
      .bind(org, id)
      .first<Row>();
    const lastItems = last
      ? (
          await db
            .prepare(
              'SELECT i.variant_id,i.quantity,v.active AS variant_active,p.active AS product_active FROM order_items i JOIN product_variants v ON v.organization_id=i.organization_id AND v.id=i.variant_id JOIN products p ON p.organization_id=v.organization_id AND p.id=v.product_id WHERE i.organization_id=? AND i.order_id=?',
            )
            .bind(org, last.id)
            .all<Row>()
        ).results
      : [];
    const financial = await financeReady(env),
      profile = financial
        ? await db
            .prepare(
              'SELECT data FROM customer_profiles WHERE organization_id=? AND customer_id=?',
            )
            .bind(org, id)
            .first<{ data: string }>()
        : null;
    const popularity = (
      await db
        .prepare(
          "SELECT v.product_id,SUM(CASE WHEN o.customer_id=? THEN i.quantity ELSE 0 END) customer_count,SUM(i.quantity) total_count FROM order_items i JOIN orders o ON o.organization_id=i.organization_id AND o.id=i.order_id JOIN product_variants v ON v.organization_id=i.organization_id AND v.id=i.variant_id WHERE i.organization_id=? AND o.active=1 AND o.status NOT IN('draft','awaiting_confirmation','cancelled') GROUP BY v.product_id",
        )
        .bind(id, org)
        .all<{
          product_id: string;
          customer_count: number;
          total_count: number;
        }>()
    ).results;
    const base = (
      await db
        .prepare(
          "SELECT id FROM products WHERE organization_id=? AND active=1 ORDER BY CASE WHEN photo_key='tradicional' THEN 0 ELSE 1 END,rowid",
        )
        .bind(org)
        .all<{ id: string }>()
    ).results;
    return json({
      ranking: Object.fromEntries(
        popularity.map((p) => [
          p.product_id,
          { customer: p.customer_count, total: p.total_count },
        ]),
      ),
      product_order: base.map((p) => p.id),
      plans: plans.map((p) => ({
        ...p,
        mutation_id: undefined,
        items: items
          .filter((i) => i.template_id === p.id)
          .map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
        valid:
          items.some((i) => i.template_id === p.id) &&
          items
            .filter((i) => i.template_id === p.id)
            .every((i) => i.variant_active && i.product_active),
      })),
      last: last
        ? {
            ...last,
            items: lastItems.map((i) => ({
              variant_id: i.variant_id,
              quantity: i.quantity,
            })),
            valid:
              lastItems.length > 0 &&
              lastItems.every((i) => i.variant_active && i.product_active),
          }
        : null,
      profile: profile ? JSON.parse(profile.data) : emptyProfile(),
    });
  }
  if (
    resource !== 'orders' ||
    !['POST', 'PUT'].includes(req.method) ||
    (req.method === 'PUT') !== !!id
  )
    throw new HttpError(404, 'Não encontrado.');
  return p1Mutation(req, db, a, async (raw, nonce) => {
    const d = schema.parse(raw),
      order = id || crypto.randomUUID();
    if (id && !z.uuid().safeParse(id).success)
      throw new HttpError(404, 'Não encontrado.');
    const prior = id
      ? await db
          .prepare(
            'SELECT * FROM orders WHERE organization_id=? AND id=? AND active=1',
          )
          .bind(org, id)
          .first<Row>()
      : null;
    if (
      id &&
      (!prior ||
        !['draft', 'awaiting_confirmation'].includes(String(prior.status)) ||
        prior.version !== d.version)
    )
      throw new HttpError(
        409,
        'Reabra antes da produção e atualize o pedido para ajustar.',
      );
    if (prior && prior.customer_id !== d.customer_id)
      throw new HttpError(
        409,
        'O cliente de um ajuste não pode mudar neste fluxo.',
      );
    if (
      !nextStatuses(
        (prior?.status || 'draft') as 'draft',
        d.delivery.delivery_type,
      ).includes('confirmed')
    )
      throw new HttpError(409, 'Confirmação não permitida.');
    if (d.delivery.delivery_type === 'delivery' && !d.delivery.delivery_address)
      throw new HttpError(400, 'Informe o endereço ou escolha retirada.');
    const customer = await db
      .prepare(
        'SELECT name FROM customers WHERE organization_id=? AND id=? AND active=1',
      )
      .bind(org, d.customer_id)
      .first<{ name: string }>();
    if (!customer) throw new HttpError(400, 'Cliente ativo obrigatório.');
    const old = id
      ? (
          await db
            .prepare(
              'SELECT * FROM order_items WHERE organization_id=? AND order_id=?',
            )
            .bind(org, id)
            .all<Row>()
        ).results
      : [];
    await attachComponents(db, org, old);
    const items = await prepareItems(
      env,
      org,
      d.items,
      old as unknown as ItemSnapshot[],
      d.composition_version,
    );
    const total = items.reduce(
      (n, i) => n + i.quantity * Number(i.unit_price_cents),
      0,
    );
    if (!Number.isSafeInteger(total) || total > 1000000000)
      throw new HttpError(400, 'Total excede limite.');
    const financial = await financeReady(env);
    if (!financial && d.terms)
      throw new HttpError(503, 'Condições financeiras ainda não ativadas.');
    if (id && financial) {
      const paid = await db
        .prepare(
          "SELECT COALESCE(SUM(CASE WHEN e.kind='reversal' THEN -p.amount_cents ELSE p.amount_cents END),0) AS n FROM payment_allocations p JOIN payment_events e ON e.organization_id=p.organization_id AND e.id=p.event_id WHERE p.organization_id=? AND p.order_id=?",
        )
        .bind(org, id)
        .first<{ n: number }>();
      if ((paid?.n ?? 0) > total)
        throw new HttpError(
          409,
          'Total abaixo dos recebimentos; estorne antes.',
        );
    }
    const field = await fieldReady(env);
    const key = req.headers.get('Idempotency-Key')!,
      fingerprint = await hash(JSON.stringify(d)),
      version = Number(prior?.version ?? 0) + 1;
    return {
      id: order,
      table: 'orders',
      action: 'order.mobile_confirmed',
      response: { id: order, status: 'confirmed', version },
      first: id
        ? db
            .prepare(
              "UPDATE orders SET due_at=?,notes=?,total_cents=?,delivery_type=?,delivery_address=?,courier=?,courier_name=?,courier_fee_cents=?,status='confirmed',version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?",
            )
            .bind(
              d.due_at,
              d.notes,
              total,
              d.delivery.delivery_type,
              d.delivery.delivery_address,
              d.delivery.courier,
              d.delivery.courier_name,
              d.delivery.courier_fee_cents,
              nonce,
              org,
              order,
              d.version,
            )
        : db
            .prepare(
              "INSERT INTO orders(id,organization_id,customer_id,customer_name,due_at,notes,total_cents,request_key,request_hash,mutation_id,status,delivery_type,delivery_address,courier,courier_name,courier_fee_cents) VALUES(?,?,?,?,?,?,?,?,?,?,'confirmed',?,?,?,?,?)",
            )
            .bind(
              order,
              org,
              d.customer_id,
              customer.name,
              d.due_at,
              d.notes,
              total,
              key,
              fingerprint,
              nonce,
              d.delivery.delivery_type,
              d.delivery.delivery_address,
              d.delivery.courier,
              d.delivery.courier_name,
              d.delivery.courier_fee_cents,
            ),
      rest: (g, args) => [
        ...(field ? snapshotPlaces(db, org, nonce) : []),
        db
          .prepare(
            `DELETE FROM order_items WHERE organization_id=? AND order_id=? AND ${g}`,
          )
          .bind(org, order, ...args),
        db
          .prepare(
            `INSERT INTO order_items(id,organization_id,order_id,variant_id,product_name,variant_label,weight_grams,units_per_box,unit_price_cents,quantity) SELECT json_extract(value,'$.id'),?,?,json_extract(value,'$.variant_id'),json_extract(value,'$.product_name'),json_extract(value,'$.variant_label'),json_extract(value,'$.weight_grams'),json_extract(value,'$.units_per_box'),json_extract(value,'$.unit_price_cents'),json_extract(value,'$.quantity') FROM json_each(?) WHERE ${g}`,
          )
          .bind(org, order, JSON.stringify(items), ...args),
        ...writeComponents(db, org, items, g, args),
        ...(financial
          ? [
              db
                .prepare(
                  `INSERT INTO order_terms(organization_id,order_id,data) SELECT ?,?,? WHERE ${g} ON CONFLICT(organization_id,order_id) ${id && d.terms === null ? 'DO NOTHING' : 'DO UPDATE SET data=excluded.data,version=order_terms.version+1'}`,
                )
                .bind(
                  org,
                  order,
                  JSON.stringify(d.terms ?? emptyTerms()),
                  ...args,
                ),
            ]
          : []),
        db
          .prepare(
            `INSERT INTO order_status_events(id,organization_id,order_id,user_id,from_status,to_status,reason,order_version,request_key,request_hash) SELECT ?,?,?,?,?,'confirmed','Confirmação após revisão do pedido',?,?,? WHERE ${g}`,
          )
          .bind(
            crypto.randomUUID(),
            org,
            order,
            a.user_id,
            prior?.status ?? 'draft',
            version,
            key,
            fingerprint,
            ...args,
          ),
      ],
    };
  });
}
