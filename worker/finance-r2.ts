import { z } from 'zod';
import { body, HttpError, json, type Actor, type Env } from './security';
import { businessDay } from './operations-domain';
import { nextStatuses, UNDO_SECONDS, type Status } from '../shared/order-state';
import { financeTransaction, type ProtectedOrder } from './finance-transaction';
import { canReverse } from './reversal-policy';
import type { accountView } from './finance';
type View = Awaited<ReturnType<typeof accountView>>;
const version = z.number().int().positive(),
  money = z.number().int().positive().max(1000000000),
  method = z.enum(['pix', 'cash', 'debit', 'credit', 'transfer', 'other']),
  reason = z.string().trim().min(1).max(500);
export async function financeR2(
  req: Request,
  env: Env,
  a: Actor,
  customer: string,
  view: View,
  action: string | undefined,
) {
  const actions = [
    'receive-today',
    'undo-today',
    'credit',
    'use-credit',
    'release-credit',
    'refund-credit',
    'annul-closing',
  ];
  if (!action || !actions.includes(action)) return null;
  const db = env.DB!,
    org = a.organization_id;
  if (req.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
  const raw = await body(req, z.unknown());
  // Retentativa precisa retornar antes de verificar estado/versão que a primeira gravação já alterou.
  const key = req.headers.get('Idempotency-Key');
  if (!z.uuid().safeParse(key).success)
    throw new HttpError(400, 'Chave inválida.');
  const { hash } = await import('./security');
  const fingerprint = await hash(
    JSON.stringify({
      path: new URL(req.url).pathname,
      actor: a.user_id,
      data: raw,
    }),
  );
  const saved = await db
    .prepare(
      'SELECT request_hash,response FROM finance_requests WHERE organization_id=? AND request_key=?',
    )
    .bind(org, key)
    .first<{ request_hash: string; response: string }>();
  if (saved) {
    if (saved.request_hash !== fingerprint)
      throw new HttpError(409, 'Chave já utilizada.');
    return json(JSON.parse(saved.response));
  }
  const tx = (
    expected: number,
    orders: ProtectedOrder[],
    build: Parameters<typeof financeTransaction>[8],
  ) =>
    financeTransaction(
      req,
      db,
      a,
      customer,
      raw,
      expected,
      view.version,
      orders,
      build,
      `finance.${action}`,
    );
  if (action === 'credit') {
    const d = z
      .object({ version, amount_cents: money, method, paid_on: z.iso.date() })
      .strict()
      .parse(raw);
    if (d.paid_on > businessDay())
      throw new HttpError(400, 'Data futura não permitida.');
    const event = crypto.randomUUID();
    return tx(d.version, [], (g, args) => ({
      response: { event_id: event },
      statements: [
        db
          .prepare(
            `INSERT INTO payment_events(id,organization_id,customer_id,user_id,kind,amount_cents,method,paid_on) SELECT ?,?,?,?,'deposit',?,?,? WHERE ${g}`,
          )
          .bind(
            event,
            org,
            customer,
            a.user_id,
            d.amount_cents,
            d.method,
            d.paid_on,
            ...args,
          ),
        db
          .prepare(
            `INSERT INTO customer_credits(organization_id,event_id,customer_id) SELECT ?,?,? WHERE ${g}`,
          )
          .bind(org, event, customer, ...args),
      ],
    }));
  }
  if (
    action === 'use-credit' ||
    action === 'release-credit' ||
    action === 'refund-credit'
  ) {
    const d = z
      .object({
        version,
        credit_event_id: z.uuid(),
        order_id: z.uuid().optional(),
        order_version: version.optional(),
        amount_cents: money,
        reason: reason.optional(),
      })
      .strict()
      .parse(raw);
    const credit = view.credits.find((c) => c.event_id === d.credit_event_id);
    if (!credit) throw new HttpError(404, 'Crédito não encontrado.');
    const order = d.order_id
      ? view.orders.find((o) => o.id === d.order_id)
      : undefined;
    if (
      action !== 'refund-credit' &&
      (!order ||
        !order.active ||
        ['draft', 'awaiting_confirmation', 'cancelled'].includes(order.status))
    )
      throw new HttpError(400, 'Escolha um pedido confirmado desta conta.');
    if (order && d.order_version !== order.version)
      throw new HttpError(409, 'Pedido alterado.');
    if (
      action === 'use-credit' &&
      (d.amount_cents > credit.available_cents ||
        d.amount_cents > order!.balance_cents)
    )
      throw new HttpError(
        409,
        'Valor excede crédito disponível ou saldo do pedido.',
      );
    const event = crypto.randomUUID();
    if (action === 'refund-credit') {
      const original = view.events.find((e) => e.id === credit.event_id)!;
      if (
        !canReverse(a, {
          user_id: original.user_id,
          created_at: original.created_at,
        })
      )
        throw new HttpError(
          403,
          'Estorno reservado ao autor no mesmo dia ou ao administrador.',
        );
      if (!d.reason) throw new HttpError(400, 'Informe o motivo.');
      if (d.amount_cents > credit.available_cents)
        throw new HttpError(
          409,
          'Somente crédito não alocado pode ser estornado.',
        );
      return tx(d.version, [], (g, args) => ({
        response: { event_id: event },
        statements: [
          db
            .prepare(
              `INSERT INTO payment_events(id,organization_id,customer_id,user_id,kind,amount_cents,method,paid_on,reason) SELECT ?,?,?,?,'reversal',?,?,?,? WHERE ${g}`,
            )
            .bind(
              event,
              org,
              customer,
              a.user_id,
              d.amount_cents,
              original.method,
              businessDay(),
              d.reason,
              ...args,
            ),
          db
            .prepare(
              `INSERT INTO credit_refunds(organization_id,credit_event_id,refund_event_id) SELECT ?,?,? WHERE ${g}`,
            )
            .bind(org, credit.event_id, event, ...args),
        ],
      }));
    }
    let releaseAll = false;
    if (action === 'release-credit') {
      if (a.role !== 'owner')
        throw new HttpError(403, 'Somente administrador libera alocação.');
      if (!d.reason) throw new HttpError(400, 'Informe o motivo.');
      const allocated = await db
        .prepare(
          'SELECT amount_cents FROM payment_allocations WHERE organization_id=? AND event_id=? AND order_id=?',
        )
        .bind(org, credit.event_id, order!.id)
        .first<{ amount_cents: number }>();
      releaseAll = d.amount_cents === allocated?.amount_cents;
      if (d.amount_cents > (allocated?.amount_cents ?? 0))
        throw new HttpError(409, 'Valor excede a alocação.');
    }
    return tx(d.version, [order!], (g, args) => ({
      response: { allocation_event_id: event },
      statements: [
        action === 'use-credit'
          ? db
              .prepare(
                `INSERT INTO payment_allocations(organization_id,event_id,order_id,amount_cents) SELECT ?,?,?,? WHERE ${g} ON CONFLICT(organization_id,event_id,order_id) DO UPDATE SET amount_cents=payment_allocations.amount_cents+excluded.amount_cents`,
              )
              .bind(org, credit.event_id, order!.id, d.amount_cents, ...args)
          : releaseAll
            ? db
                .prepare(
                  `DELETE FROM payment_allocations WHERE organization_id=? AND event_id=? AND order_id=? AND ${g}`,
                )
                .bind(org, credit.event_id, order!.id, ...args)
            : db
                .prepare(
                  `UPDATE payment_allocations SET amount_cents=amount_cents-? WHERE organization_id=? AND event_id=? AND order_id=? AND ${g}`,
                )
                .bind(d.amount_cents, org, credit.event_id, order!.id, ...args),
        db
          .prepare(
            `INSERT INTO credit_allocation_events(id,organization_id,customer_id,credit_event_id,order_id,amount_cents,reason,user_id) SELECT ?,?,?,?,?,?,?,? WHERE ${g}`,
          )
          .bind(
            event,
            org,
            customer,
            credit.event_id,
            order!.id,
            action === 'use-credit' ? d.amount_cents : -d.amount_cents,
            d.reason ?? '',
            a.user_id,
            ...args,
          ),
      ],
    }));
  }
  if (action === 'annul-closing') {
    if (a.role !== 'owner')
      throw new HttpError(403, 'Somente administrador anula fechamento.');
    const d = z
        .object({ version, closing_id: z.uuid(), reason })
        .strict()
        .parse(raw),
      closing = view.closings.find((c) => c.id === d.closing_id);
    if (!closing || closing.status !== 'active')
      throw new HttpError(409, 'Fechamento não está ativo.');
    const members = view.orders.filter((o) => o.closing_id === closing.id);
    if (members.some((o) => o.paid_cents > 0))
      throw new HttpError(
        409,
        'Estorne recebimentos ou libere crédito alocado aos pedidos antes de anular.',
      );
    const event = crypto.randomUUID();
    return tx(d.version, members, (g, args) => ({
      response: { annulment_id: event },
      statements: [
        db
          .prepare(
            `INSERT INTO closing_annulments(id,organization_id,closing_id,user_id,reason) SELECT ?,?,?,?,? WHERE ${g}`,
          )
          .bind(event, org, closing.id, a.user_id, d.reason, ...args),
        db
          .prepare(
            `UPDATE closings SET status='annulled',active_key=NULL WHERE organization_id=? AND id=? AND ${g}`,
          )
          .bind(org, closing.id, ...args),
        db
          .prepare(
            `DELETE FROM closing_orders WHERE organization_id=? AND closing_id=? AND ${g}`,
          )
          .bind(org, closing.id, ...args),
      ],
    }));
  }
  if (action === 'receive-today') {
    const d = z
      .object({
        version,
        order_id: z.uuid(),
        order_version: version,
        amount_cents: money,
        method,
        paid_on: z.iso.date(),
        deliver: z.boolean().default(false),
      })
      .strict()
      .parse(raw);
    const o = view.orders.find((o) => o.id === d.order_id);
    if (!o || !o.active) throw new HttpError(404, 'Pedido não encontrado.');
    if (o.version !== d.order_version)
      throw new HttpError(409, 'Pedido alterado.');
    if (
      ['draft', 'awaiting_confirmation', 'cancelled'].includes(o.status) ||
      d.amount_cents > o.balance_cents
    )
      throw new HttpError(409, 'Confirme o pedido e confira seu saldo.');
    if (d.paid_on > businessDay())
      throw new HttpError(400, 'Data futura não permitida.');
    const delivery = await db
      .prepare(
        'SELECT delivery_type FROM orders WHERE organization_id=? AND id=?',
      )
      .bind(org, o.id)
      .first<{ delivery_type: string }>();
    const to = delivery?.delivery_type === 'pickup' ? 'picked_up' : 'delivered';
    if (
      d.deliver &&
      (o.terms.mode !== 'delivery' ||
        !nextStatuses(o.status as Status, delivery!.delivery_type).includes(to))
    )
      throw new HttpError(
        409,
        'Entrega combinada exige condição na entrega e próximo status válido.',
      );
    const event = crypto.randomUUID(),
      statusEvent = crypto.randomUUID(),
      combined = crypto.randomUUID();
    return tx(d.version, [o], (g, args) => ({
      response: {
        event_id: event,
        account_version: view.version + 1,
        order_version: o.version + 1,
        ...(d.deliver ? { undo_id: combined, undo_seconds: UNDO_SECONDS } : {}),
      },
      statements: [
        db
          .prepare(
            `INSERT INTO payment_events(id,organization_id,customer_id,user_id,kind,amount_cents,method,paid_on) SELECT ?,?,?,?,'payment',?,?,? WHERE ${g}`,
          )
          .bind(
            event,
            org,
            customer,
            a.user_id,
            d.amount_cents,
            d.method,
            d.paid_on,
            ...args,
          ),
        db
          .prepare(
            `INSERT INTO payment_allocations(organization_id,event_id,order_id,amount_cents) SELECT ?,?,?,? WHERE ${g}`,
          )
          .bind(org, event, o.id, d.amount_cents, ...args),
        ...(d.deliver
          ? [
              db
                .prepare(
                  `UPDATE orders SET status=? WHERE organization_id=? AND id=? AND ${g}`,
                )
                .bind(to, org, o.id, ...args),
              db
                .prepare(
                  `INSERT INTO order_status_events(id,organization_id,order_id,user_id,from_status,to_status,reason,order_version,request_key,request_hash) SELECT ?,?,?,?,?,?,'Entrega e recebimento combinados',?,?,? WHERE ${g}`,
                )
                .bind(
                  statusEvent,
                  org,
                  o.id,
                  a.user_id,
                  o.status,
                  to,
                  o.version + 1,
                  key,
                  fingerprint,
                  ...args,
                ),
              db
                .prepare(
                  `INSERT INTO combined_receipts(id,organization_id,customer_id,order_id,payment_event_id,status_event_id,user_id,order_version) SELECT ?,?,?,?,?,?,?,? WHERE ${g}`,
                )
                .bind(
                  combined,
                  org,
                  customer,
                  o.id,
                  event,
                  statusEvent,
                  a.user_id,
                  o.version + 1,
                  ...args,
                ),
            ]
          : []),
      ],
    }));
  }
  const d = z
    .object({ version, order_version: version, undo_id: z.uuid() })
    .strict()
    .parse(raw);
  const combined = await db
    .prepare(
      'SELECT * FROM combined_receipts WHERE organization_id=? AND customer_id=? AND id=?',
    )
    .bind(org, customer, d.undo_id)
    .first<{
      id: string;
      order_id: string;
      payment_event_id: string;
      status_event_id: string;
      user_id: string;
      order_version: number;
      created_at: number;
      undo_id: string | null;
    }>();
  if (
    !combined ||
    combined.undo_id ||
    combined.user_id !== a.user_id ||
    combined.created_at < Math.floor(Date.now() / 1000) - UNDO_SECONDS
  )
    throw new HttpError(
      409,
      'Janela de desfazer terminou ou ação já desfeita.',
    );
  const o = view.orders.find((o) => o.id === combined.order_id),
    payment = view.events.find((e) => e.id === combined.payment_event_id);
  if (
    !o ||
    o.version !== d.order_version ||
    o.version !== combined.order_version ||
    o.closing_id ||
    !payment ||
    !canReverse(a, {
      user_id: payment.user_id,
      created_at: payment.created_at,
    }) ||
    view.events.some((e) => e.reversal_of === payment.id)
  )
    throw new HttpError(
      409,
      'Conta/pedido alterado ou recebimento não permite desfazer.',
    );
  const prior = await db
    .prepare(
      'SELECT from_status FROM order_status_events WHERE organization_id=? AND id=?',
    )
    .bind(org, combined.status_event_id)
    .first<{ from_status: string }>();
  const reversal = crypto.randomUUID(),
    status = crypto.randomUUID();
  return tx(d.version, [o], (g, args) => ({
    response: { event_id: reversal },
    statements: [
      db
        .prepare(
          `INSERT INTO payment_events(id,organization_id,customer_id,user_id,kind,amount_cents,method,paid_on,reason,reversal_of) SELECT ?,?,?,?,'reversal',?,?,?,'Desfazer entrega e recebimento',? WHERE ${g}`,
        )
        .bind(
          reversal,
          org,
          customer,
          a.user_id,
          payment.amount_cents,
          payment.method,
          businessDay(),
          payment.id,
          ...args,
        ),
      db
        .prepare(
          `INSERT INTO payment_allocations(organization_id,event_id,order_id,amount_cents) SELECT ?,?,order_id,amount_cents FROM payment_allocations WHERE organization_id=? AND event_id=? AND ${g}`,
        )
        .bind(org, reversal, org, payment.id, ...args),
      db
        .prepare(
          `UPDATE orders SET status=? WHERE organization_id=? AND id=? AND ${g}`,
        )
        .bind(prior!.from_status, org, o.id, ...args),
      db
        .prepare(
          `INSERT INTO order_status_events(id,organization_id,order_id,user_id,from_status,to_status,reason,order_version,request_key,request_hash,undo_of) SELECT ?,?,?,?,?,?,'Desfazer entrega e recebimento',?,?,?,? WHERE ${g}`,
        )
        .bind(
          status,
          org,
          o.id,
          a.user_id,
          o.status,
          prior!.from_status,
          o.version + 1,
          key,
          fingerprint,
          combined.status_event_id,
          ...args,
        ),
      db
        .prepare(
          `UPDATE combined_receipts SET undo_id=? WHERE organization_id=? AND id=? AND ${g}`,
        )
        .bind(status, org, combined.id, ...args),
    ],
  }));
}
