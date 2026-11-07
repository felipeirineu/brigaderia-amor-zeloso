import { orderNumber } from './order-number';
import { financeR2 } from './finance-r2';
import { canReverse } from './reversal-policy';
import { z } from 'zod';
import { body, hash, HttpError, json, type Actor, type Env } from './security';
import { financeReady } from './finance-ready';
import { businessDay } from './operations-domain';
import {
  emptyProfile,
  emptyTerms,
  closingPeriod,
  type Terms,
} from '../shared/finance';
import {
  paymentSchema,
  pixSchema,
  pixCode,
  profileSchema,
  readTerms,
  termsSchema,
} from './finance-domain';
type Row = Record<string, string | number | null>;
export async function accountView(
  db: D1Database,
  org: string,
  customer: string,
) {
  const profile = await db
    .prepare(
      'SELECT data,version FROM customer_profiles WHERE organization_id=? AND customer_id=?',
    )
    .bind(org, customer)
    .first<{ data: string; version: number }>();
  const account = await db
    .prepare(
      'SELECT version FROM finance_accounts WHERE organization_id=? AND customer_id=?',
    )
    .bind(org, customer)
    .first<{ version: number }>();
  const orders = (
    await db
      .prepare(
        'SELECT o.id,' +
          orderNumber('o') +
          ",o.customer_name,o.status,o.version,o.total_cents,o.due_at,o.active,(SELECT MAX(e.created_at) FROM order_status_events e WHERE e.organization_id=o.organization_id AND e.order_id=o.id AND e.to_status IN ('delivered','picked_up')) AS completed_at,t.data AS terms,co.closing_id,c.due_on AS closing_due_on,COALESCE((SELECT SUM(CASE WHEN e.kind='reversal' THEN -a.amount_cents ELSE a.amount_cents END) FROM payment_allocations a JOIN payment_events e ON e.organization_id=a.organization_id AND e.id=a.event_id WHERE a.organization_id=o.organization_id AND a.order_id=o.id),0) AS paid_cents FROM orders o LEFT JOIN order_terms t ON t.organization_id=o.organization_id AND t.order_id=o.id LEFT JOIN closing_orders co ON co.organization_id=o.organization_id AND co.order_id=o.id LEFT JOIN closings c ON c.organization_id=co.organization_id AND c.id=co.closing_id WHERE o.organization_id=? AND o.customer_id=? ORDER BY o.due_at,o.id LIMIT 1001",
      )
      .bind(org, customer)
      .all<Row>()
  ).results;
  if (orders.length > 1000)
    throw new HttpError(
      409,
      'Mais de 1000 pedidos nesta conta. É necessária paginação antes de continuar.',
    );
  const today = businessDay();
  const enriched = orders.map((o) => {
    const terms = readTerms(o.terms as string | null),
      day = String(o.due_at).slice(0, 10),
      businessDate = new Date(
        (o.completed_at
          ? Number(o.completed_at) * 1000
          : Date.parse(String(o.due_at))) - 10800000,
      )
        .toISOString()
        .slice(0, 10);
    const delivered =
      ['delivered', 'picked_up'].includes(String(o.status)) && !!o.active;
    const due =
      terms.mode === 'unset'
        ? null
        : terms.mode === 'credit'
          ? (o.closing_due_on as string | null) ||
            closingPeriod(businessDate, terms).due_on
          : businessDate;
    const balance = Number(o.total_cents) - Number(o.paid_cents);
    return {
      ...o,
      id: String(o.id),
      status: String(o.status),
      active: Number(o.active),
      version: Number(o.version),
      total_cents: Number(o.total_cents),
      paid_cents: Number(o.paid_cents),
      due_at: String(o.due_at),
      customer_name: String(o.customer_name),
      closing_id: o.closing_id as string | null,
      terms,
      due_on: due,
      business_date: businessDate,
      day,
      balance_cents: Math.max(0, balance),
      receivable_cents: delivered ? Math.max(0, balance) : 0,
      credit_cents:
        o.status === 'cancelled' || !o.active ? Number(o.paid_cents) : 0,
      overdue_days:
        delivered && due && due < today && balance > 0
          ? Math.floor(
              (Date.parse(today + 'T12:00Z') - Date.parse(due + 'T12:00Z')) /
                86400000,
            )
          : 0,
    };
  });
  const events = (
    await db
      .prepare(
        'SELECT id,kind,amount_cents,method,paid_on,reason,reversal_of,user_id,created_at FROM payment_events WHERE organization_id=? AND customer_id=? ORDER BY created_at,id LIMIT 1001',
      )
      .bind(org, customer)
      .all<Row>()
  ).results;
  if (events.length > 1000)
    throw new HttpError(
      409,
      'Mais de 1000 eventos nesta conta. É necessária paginação.',
    );
  const closings = (
    await db
      .prepare(
        'SELECT * FROM closings WHERE organization_id=? AND customer_id=? ORDER BY period_start',
      )
      .bind(org, customer)
      .all<Row>()
  ).results;
  const credits = (
    await db
      .prepare(
        'SELECT c.event_id,e.amount_cents,e.method,e.created_at,COALESCE((SELECT SUM(p.amount_cents) FROM payment_allocations p WHERE p.organization_id=c.organization_id AND p.event_id=c.event_id),0) AS allocated_cents,COALESCE((SELECT SUM(e2.amount_cents) FROM credit_refunds r JOIN payment_events e2 ON e2.organization_id=r.organization_id AND e2.id=r.refund_event_id WHERE r.organization_id=c.organization_id AND r.credit_event_id=c.event_id),0) AS refunded_cents FROM customer_credits c JOIN payment_events e ON e.organization_id=c.organization_id AND e.id=c.event_id WHERE c.organization_id=? AND c.customer_id=?',
      )
      .bind(org, customer)
      .all<{
        event_id: string;
        amount_cents: number;
        method: string;
        created_at: string;
        allocated_cents: number;
        refunded_cents: number;
      }>()
  ).results.map((c) => ({
    ...c,
    available_cents: c.amount_cents - c.allocated_cents - c.refunded_cents,
  }));
  if (credits.some((c) => c.available_cents < 0))
    throw new HttpError(
      500,
      'Inconsistência no crédito. Solicite conferência.',
    );
  const creditAllocations = (
    await db
      .prepare(
        'SELECT p.event_id,p.order_id,p.amount_cents FROM payment_allocations p JOIN customer_credits c ON c.organization_id=p.organization_id AND c.event_id=p.event_id WHERE c.organization_id=? AND c.customer_id=?',
      )
      .bind(org, customer)
      .all()
  ).results;
  const annulments = (
    await db
      .prepare(
        'SELECT x.closing_id,x.reason,x.created_at,x.user_id FROM closing_annulments x JOIN closings c ON c.organization_id=x.organization_id AND c.id=x.closing_id WHERE c.organization_id=? AND c.customer_id=?',
      )
      .bind(org, customer)
      .all()
  ).results;
  const closingHistory = (
    await db
      .prepare(
        'SELECT h.closing_id,h.order_id,h.total_cents FROM closing_order_history h JOIN closings c ON c.organization_id=h.organization_id AND c.id=h.closing_id WHERE h.organization_id=? AND c.customer_id=? LIMIT 1001',
      )
      .bind(org, customer)
      .all()
  ).results;
  if (closingHistory.length > 1000)
    throw new HttpError(
      409,
      'Histórico de fechamento excede 1000 vínculos; paginação necessária.',
    );
  return {
    credits,
    credit_allocations: creditAllocations,
    annulments,
    closing_history: closingHistory,
    available_credit_cents: credits.reduce((n, c) => n + c.available_cents, 0),
    profile: profile ? JSON.parse(profile.data) : emptyProfile(),
    profile_version: profile?.version ?? 0,
    version: account?.version ?? 1,
    orders: enriched,
    events,
    closings: closings.map((c) => ({
      ...c,
      id: String(c.id),
      status: String(c.status),
      period_start: String(c.period_start),
      period_end: String(c.period_end),
      due_on: String(c.due_on),
      total_cents: Number(c.total_cents),
      balance_cents: enriched
        .filter((o) => o.closing_id === c.id)
        .reduce((n, o) => n + o.receivable_cents, 0),
    })),
    receivable_cents: enriched.reduce((n, o) => n + o.receivable_cents, 0),
    received_cents: events.reduce(
      (n, e) => n + (e.kind === 'reversal' ? -1 : 1) * Number(e.amount_cents),
      0,
    ),
    credit_cents: enriched.reduce((n, o) => n + o.credit_cents, 0),
    overdue_days: Math.max(0, ...enriched.map((o) => o.overdue_days)),
  };
}
export async function finance(
  req: Request,
  env: Env,
  a: Actor,
): Promise<Response> {
  if (!(await financeReady(env)))
    throw new HttpError(503, 'Financeiro ainda não ativado nesta conta.');
  const db = env.DB!,
    org = a.organization_id,
    url = new URL(req.url),
    parts = url.pathname.split('/'),
    resource = parts[3],
    id = parts[4],
    action = parts[5];
  if (resource === 'settings') {
    if (a.role !== 'owner')
      throw new HttpError(403, 'Somente o administrador configura Pix.');
    const previous = await db
      .prepare(
        'SELECT data,version FROM payment_settings WHERE organization_id=?',
      )
      .bind(org)
      .first<{ data: string; version: number }>();
    if (req.method === 'GET')
      return json({
        data: previous
          ? JSON.parse(previous.data)
          : { type: 'none', key: '', receiver: '', city: '' },
        version: previous?.version ?? 0,
      });
    if (req.method === 'PUT') {
      const d = await body(
        req,
        z
          .object({ version: z.number().int().min(0), data: pixSchema })
          .strict(),
      );
      if (d.version !== (previous?.version ?? 0))
        throw new HttpError(409, 'Configuração alterada. Atualize.');
      if (d.data.type !== 'none')
        try {
          pixCode(d.data, 1);
        } catch {
          throw new HttpError(
            400,
            'Chave, recebedor ou cidade Pix inválidos ou extensos.',
          );
        }
      const r = await db.batch([
        previous
          ? db
              .prepare(
                'UPDATE payment_settings SET data=?,version=version+1 WHERE organization_id=? AND version=?',
              )
              .bind(JSON.stringify(d.data), org, d.version)
          : db
              .prepare(
                'INSERT OR IGNORE INTO payment_settings(organization_id,data) VALUES(?,?)',
              )
              .bind(org, JSON.stringify(d.data)),
        db
          .prepare(
            "INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,'finance.pix_settings',? WHERE changes()=1",
          )
          .bind(crypto.randomUUID(), org, a.user_id, org),
      ]);
      if (!r[0].meta.changes)
        throw new HttpError(409, 'Configuração alterada. Atualize.');
      return json({ ok: true });
    }
  }
  if (resource === 'summary' && req.method === 'GET') {
    // Uma consulta agregada por pedido; nenhum SELECT por cliente.
    const rows = (
      await db
        .prepare(
          "SELECT c.id,c.name,COALESCE(t.data,'') AS terms,o.id AS order_id,o.status,o.active,o.total_cents,o.due_at,(SELECT MAX(e.created_at) FROM order_status_events e WHERE e.organization_id=o.organization_id AND e.order_id=o.id AND e.to_status IN ('delivered','picked_up')) AS completed_at,cl.due_on,COALESCE(p.paid,0) AS paid FROM customers c JOIN orders o ON o.organization_id=c.organization_id AND o.customer_id=c.id LEFT JOIN order_terms t ON t.organization_id=o.organization_id AND t.order_id=o.id LEFT JOIN closing_orders co ON co.organization_id=o.organization_id AND co.order_id=o.id LEFT JOIN closings cl ON cl.organization_id=co.organization_id AND cl.id=co.closing_id LEFT JOIN (SELECT x.organization_id,x.order_id,SUM(CASE WHEN e.kind='reversal' THEN -x.amount_cents ELSE x.amount_cents END) AS paid FROM payment_allocations x JOIN payment_events e ON e.organization_id=x.organization_id AND e.id=x.event_id GROUP BY x.organization_id,x.order_id) p ON p.organization_id=o.organization_id AND p.order_id=o.id WHERE c.organization_id=? AND o.active=1 AND o.status IN ('delivered','picked_up') LIMIT 5001",
        )
        .bind(org)
        .all<Row>()
    ).results;
    if (rows.length > 5000)
      throw new HttpError(
        409,
        'Resumo excede 5000 pedidos; implementar paginação.',
      );
    const clients = new Map<
        string,
        {
          id: string;
          name: string;
          balance_cents: number;
          overdue_days: number;
          unconfigured: number;
          overdue_cents: number;
          week_cents: number;
          received_cents: number;
        }
      >(),
      today = businessDay();
    for (const o of rows) {
      const t = readTerms(String(o.terms) || null),
        day = new Date(
          (o.completed_at
            ? Number(o.completed_at) * 1000
            : Date.parse(String(o.due_at))) - 10800000,
        )
          .toISOString()
          .slice(0, 10),
        due =
          t.mode === 'unset'
            ? null
            : t.mode === 'credit'
              ? String(o.due_on || closingPeriod(day, t).due_on)
              : day,
        balance = Math.max(0, Number(o.total_cents) - Number(o.paid));
      const row = clients.get(String(o.id)) ?? {
        id: String(o.id),
        name: String(o.name),
        balance_cents: 0,
        overdue_days: 0,
        unconfigured: 0,
        overdue_cents: 0,
        week_cents: 0,
        received_cents: 0,
      };
      row.balance_cents += balance;
      const sunday = new Date(today + 'T12:00:00Z');
      sunday.setUTCDate(sunday.getUTCDate() + 7 - (sunday.getUTCDay() || 7));
      const weekEnd = sunday.toISOString().slice(0, 10);
      if (due && due < today) row.overdue_cents += balance;
      if (due && due >= today && due <= weekEnd) row.week_cents += balance;
      if (balance && due && due < today)
        row.overdue_days = Math.max(
          row.overdue_days,
          Math.floor(
            (Date.parse(today + 'T12:00Z') - Date.parse(due + 'T12:00Z')) /
              86400000,
          ),
        );
      if (balance && !due) row.unconfigured++;
      clients.set(row.id, row);
    }
    const received = await db
      .prepare(
        "SELECT COALESCE(SUM(CASE WHEN kind='reversal' THEN -amount_cents ELSE amount_cents END),0) AS cents FROM payment_events WHERE organization_id=? AND paid_on=?",
      )
      .bind(org, today)
      .first<{ cents: number }>();
    const receivedClients = (
      await db
        .prepare(
          "SELECT c.id,c.name,SUM(CASE WHEN e.kind='reversal' THEN -e.amount_cents ELSE e.amount_cents END) AS received_cents FROM payment_events e JOIN customers c ON c.organization_id=e.organization_id AND c.id=e.customer_id WHERE e.organization_id=? AND e.paid_on=? GROUP BY c.id,c.name",
        )
        .bind(org, today)
        .all<{ id: string; name: string; received_cents: number }>()
    ).results;
    for (const r of receivedClients) {
      const item = clients.get(r.id) ?? {
        id: r.id,
        name: r.name,
        balance_cents: 0,
        overdue_days: 0,
        unconfigured: 0,
        overdue_cents: 0,
        week_cents: 0,
        received_cents: 0,
      };
      item.received_cents = r.received_cents;
      clients.set(r.id, item);
    }
    const filter = url.searchParams.get('filter');
    return json({
      overdue_cents: [...clients.values()].reduce(
        (n, c) => n + c.overdue_cents,
        0,
      ),
      week_cents: [...clients.values()].reduce((n, c) => n + c.week_cents, 0),
      day: today,
      received_cents: received?.cents ?? 0,
      receivable_cents: [...clients.values()].reduce(
        (n, c) => n + c.balance_cents,
        0,
      ),
      customers: [...clients.values()].filter((c) =>
        filter === 'overdue'
          ? c.overdue_cents > 0
          : filter === 'week'
            ? c.week_cents > 0
            : filter === 'received'
              ? c.received_cents !== 0
              : true,
      ),
    });
  }
  if (resource === 'orders' && id && z.uuid().safeParse(id).success) {
    const o = await db
      .prepare(
        'SELECT * FROM orders WHERE organization_id=? AND id=? AND active=1',
      )
      .bind(org, id)
      .first<Row>();
    if (!o) throw new HttpError(404, 'Pedido não encontrado.');
    if (action === 'terms' && req.method === 'PUT') {
      const d = await body(
        req,
        z
          .object({ version: z.number().int().positive(), terms: termsSchema })
          .strict(),
      );
      if (!['draft', 'awaiting_confirmation'].includes(String(o.status)))
        throw new HttpError(409, 'Reabra antes de alterar a condição.');
      if (d.version !== o.version)
        throw new HttpError(409, 'Pedido alterado. Atualize.');
      const nonce = crypto.randomUUID();
      const guard =
        'EXISTS(SELECT 1 FROM orders WHERE organization_id=? AND id=? AND mutation_id=?)';
      const result = await db.batch([
        db
          .prepare(
            'UPDATE orders SET version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND version=?',
          )
          .bind(nonce, org, id, d.version),
        db
          .prepare(
            `INSERT INTO order_terms(organization_id,order_id,data) SELECT ?,?,? WHERE ${guard} ON CONFLICT(organization_id,order_id) DO UPDATE SET data=excluded.data,version=order_terms.version+1`,
          )
          .bind(org, id, JSON.stringify(d.terms), org, id, nonce),
        db
          .prepare(
            `INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,'finance.order_terms',? WHERE ${guard}`,
          )
          .bind(crypto.randomUUID(), org, a.user_id, id, org, id, nonce),
      ]);
      if (!result[0].meta.changes)
        throw new HttpError(409, 'Pedido alterado. Atualize.');
      return json({ ok: true });
    }
  }
  if (resource !== 'customers' || !id || !z.uuid().safeParse(id).success)
    throw new HttpError(404, 'Não encontrado.');
  const customer = await db
    .prepare(
      'SELECT id,name,phone,active FROM customers WHERE organization_id=? AND id=?',
    )
    .bind(org, id)
    .first<Row>();
  if (!customer) throw new HttpError(404, 'Cliente não encontrado.');
  if (action === 'profile') {
    if (req.method === 'GET') {
      const r = await db
        .prepare(
          'SELECT data,version FROM customer_profiles WHERE organization_id=? AND customer_id=?',
        )
        .bind(org, id)
        .first<{ data: string; version: number }>();
      return json({
        data: r ? JSON.parse(r.data) : emptyProfile(),
        version: r?.version ?? 0,
      });
    }
    if (req.method === 'PUT') {
      const d = await body(
        req,
        z
          .object({ version: z.number().int().min(0), data: profileSchema })
          .strict(),
      );
      const r = await db.batch([
        d.version
          ? db
              .prepare(
                'UPDATE customer_profiles SET data=?,version=version+1 WHERE organization_id=? AND customer_id=? AND version=?',
              )
              .bind(JSON.stringify(d.data), org, id, d.version)
          : db
              .prepare(
                'INSERT OR IGNORE INTO customer_profiles(organization_id,customer_id,data) VALUES(?,?,?)',
              )
              .bind(org, id, JSON.stringify(d.data)),
        db
          .prepare(
            "INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,'customer.b2b_profile',? WHERE changes()=1",
          )
          .bind(crypto.randomUUID(), org, a.user_id, id),
      ]);
      if (!r[0].meta.changes)
        throw new HttpError(409, 'Cadastro B2B alterado. Atualize.');
      return json({ ok: true });
    }
  }
  if (action === 'defaults' && req.method === 'GET') {
    const p = await db
      .prepare(
        'SELECT data FROM customer_profiles WHERE organization_id=? AND customer_id=?',
      )
      .bind(org, id)
      .first<{ data: string }>();
    const plans = (
      await db
        .prepare(
          'SELECT id,name,weekday,time,notes,delivery_type,delivery_address,courier,courier_name,courier_fee_cents,(SELECT COUNT(*) FROM recurring_items i WHERE i.organization_id=recurring_templates.organization_id AND i.template_id=recurring_templates.id) AS item_count FROM recurring_templates WHERE organization_id=? AND customer_id=? AND active=1 ORDER BY weekday,name LIMIT 100',
        )
        .bind(org, id)
        .all<Row>()
    ).results;
    const items = (
      await db
        .prepare(
          'SELECT i.template_id,i.variant_id,i.quantity FROM recurring_items i JOIN recurring_templates t ON t.organization_id=i.organization_id AND t.id=i.template_id JOIN product_variants v ON v.organization_id=i.organization_id AND v.id=i.variant_id JOIN products p ON p.organization_id=v.organization_id AND p.id=v.product_id WHERE i.organization_id=? AND t.customer_id=? AND t.active=1 AND v.active=1 AND p.active=1',
        )
        .bind(org, id)
        .all<Row>()
    ).results;
    return json({
      profile: p ? JSON.parse(p.data) : emptyProfile(),
      plans: plans.map((p) => ({
        ...p,
        valid:
          items.filter((i) => i.template_id === p.id).length === p.item_count &&
          Number(p.item_count) > 0,
        items: items.filter((i) => i.template_id === p.id),
      })),
    });
  }
  const view = await accountView(db, org, id);
  if (!action && req.method === 'GET')
    return json({
      customer,
      ...view,
      credits: view.credits.map((c) => ({
        ...c,
        can_refund: canReverse(a, {
          user_id: view.events.find((e) => e.id === c.event_id)?.user_id,
          created_at: c.created_at,
        }),
      })),
      actor: { user_id: a.user_id, role: a.role },
      events: view.events.map((e) => ({
        ...e,
        can_reverse:
          canReverse(a, { user_id: e.user_id, created_at: e.created_at }) &&
          !view.credits.some((c) => c.event_id === e.id),
      })),
    });
  const extension = await financeR2(req, env, a, id, view, action);
  if (extension) return extension;
  if (action === 'charge' && req.method === 'POST') {
    const d = await body(
      req,
      z.object({ closing_id: z.uuid().optional() }).strict(),
    );
    const closing = d.closing_id
      ? view.closings.find((c) => c.id === d.closing_id)
      : null;
    if (closing && closing.status !== 'active')
      throw new HttpError(409, 'Fechamento anulado não pode ser cobrado.');
    if (d.closing_id && !closing)
      throw new HttpError(404, 'Fechamento não encontrado.');
    const balance = closing
      ? Number(closing.balance_cents)
      : view.receivable_cents;
    if (balance <= 0) throw new HttpError(400, 'Não há saldo para cobrar.');
    const settings = await db
      .prepare('SELECT data FROM payment_settings WHERE organization_id=?')
      .bind(org)
      .first<{ data: string }>();
    const pix = settings
      ? pixCode(pixSchema.parse(JSON.parse(settings.data)), balance)
      : null;
    const brl = (c: number) =>
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(c / 100);
    const lines = view.orders.filter(
      (o) =>
        o.receivable_cents > 0 && (!closing || o.closing_id === closing.id),
    );
    const message = `Olá, ${customer.name}! Segue o resumo ${closing ? `do fechamento ${closing.period_start} a ${closing.period_end}` : 'da sua conta'}: ${lines.map((o) => `pedido ${String(o.id).slice(0, 8)} (${o.business_date}): ${brl(o.receivable_cents)}`).join('; ')}. Saldo: ${brl(balance)}.${closing ? ` Vencimento: ${closing.due_on}.` : ''}${pix ? ` Pix copia e cola: ${pix}` : ''}`;
    if (!/^\+[1-9]\d{7,14}$/.test(String(customer.phone)))
      throw new HttpError(400, 'Telefone inválido.');
    if (message.length > 7500)
      throw new HttpError(
        400,
        'Extrato extenso. Selecione um fechamento menor.',
      );
    return json({
      message,
      phone: customer.phone,
      pix_code: pix,
      balance_cents: balance,
    });
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
  const key = req.headers.get('Idempotency-Key');
  if (!z.uuid().safeParse(key).success)
    throw new HttpError(400, 'Chave de repetição inválida.');
  const raw = await body(req, z.unknown()),
    fingerprint = await hash(
      JSON.stringify({ path: url.pathname, actor: a.user_id, data: raw }),
    );
  const repeated = await db
    .prepare(
      'SELECT request_hash,response FROM finance_requests WHERE organization_id=? AND request_key=?',
    )
    .bind(org, key)
    .first<{ request_hash: string; response: string }>();
  if (repeated) {
    if (repeated.request_hash !== fingerprint)
      throw new HttpError(409, 'Chave financeira já utilizada.');
    return json(JSON.parse(repeated.response));
  }
  const versionSchema = z.number().int().positive();
  let version: number,
    response: Record<string, unknown>,
    protectedOrders: { id: string; version: number; status: string }[] = [];
  const statements: D1PreparedStatement[] = [];
  const nonce = crypto.randomUUID(),
    guard =
      'EXISTS(SELECT 1 FROM finance_accounts WHERE organization_id=? AND customer_id=? AND mutation_id=?)',
    guardArgs = [org, id, nonce];
  if (action === 'payments') {
    const d = paymentSchema.parse(raw);
    version = d.version;
    if (d.paid_on > businessDay())
      throw new HttpError(400, 'Recebimento não pode ter data futura.');
    let eligible = view.orders.filter((o) =>
      d.order_id ? o.id === d.order_id : o.closing_id === d.closing_id,
    );
    if (!eligible.length)
      throw new HttpError(
        404,
        'Pedido ou fechamento não encontrado nesta conta.',
      );
    if (
      eligible.some(
        (o) =>
          !o.active ||
          ['draft', 'awaiting_confirmation', 'cancelled'].includes(
            String(o.status),
          ),
      )
    )
      throw new HttpError(
        409,
        'Confirme o pedido antes de registrar recebimento.',
      );
    const balance = eligible.reduce((n, o) => n + o.balance_cents, 0);
    if (d.amount_cents > balance)
      throw new HttpError(409, 'Valor excede o saldo.');
    if (d.kind === 'deposit' && d.closing_id)
      throw new HttpError(400, 'Sinal deve ser vinculado a um pedido.');
    eligible = eligible.sort(
      (a, b) =>
        String(a.due_at).localeCompare(String(b.due_at)) ||
        String(a.id).localeCompare(String(b.id)),
    );
    protectedOrders = eligible;
    let remaining = d.amount_cents;
    const allocations = [];
    for (const o of eligible) {
      const amount = Math.min(remaining, o.balance_cents);
      if (amount > 0) allocations.push({ order_id: o.id, amount });
      remaining -= amount;
    }
    const event = crypto.randomUUID();
    response = { event_id: event };
    statements.push(
      db
        .prepare(
          `INSERT INTO payment_events(id,organization_id,customer_id,user_id,kind,amount_cents,method,paid_on) SELECT ?,?,?,?,?,?,?,? WHERE ${guard}`,
        )
        .bind(
          event,
          org,
          id,
          a.user_id,
          d.kind,
          d.amount_cents,
          d.method,
          d.paid_on,
          ...guardArgs,
        ),
    );
    statements.push(
      db
        .prepare(
          `INSERT INTO payment_allocations(organization_id,event_id,order_id,amount_cents) SELECT ?,?,json_extract(value,'$.order_id'),json_extract(value,'$.amount') FROM json_each(?) WHERE ${guard}`,
        )
        .bind(org, event, JSON.stringify(allocations), ...guardArgs),
    );
  } else if (action === 'reverse') {
    const d = z
      .object({
        version: versionSchema,
        event_id: z.uuid(),
        reason: z.string().trim().min(1).max(500),
      })
      .strict()
      .parse(raw);
    version = d.version;
    const original = view.events.find((e) => e.id === d.event_id);
    if (view.credits.some((c) => c.event_id === d.event_id))
      throw new HttpError(409, 'Use o estorno de crédito não alocado.');
    if (!original || original.kind === 'reversal')
      throw new HttpError(404, 'Recebimento não encontrado.');
    if (
      !canReverse(a, {
        user_id: original.user_id,
        created_at: original.created_at,
      })
    )
      throw new HttpError(
        403,
        'Operador só estorna recebimento próprio registrado hoje. Solicite ao administrador.',
      );
    if (view.events.some((e) => e.reversal_of === d.event_id))
      throw new HttpError(409, 'Recebimento já estornado.');
    const event = crypto.randomUUID();
    response = { event_id: event };
    statements.push(
      db
        .prepare(
          `INSERT INTO payment_events(id,organization_id,customer_id,user_id,kind,amount_cents,method,paid_on,reason,reversal_of) SELECT ?,?,?,?,'reversal',?,?,?,?,? WHERE ${guard}`,
        )
        .bind(
          event,
          org,
          id,
          a.user_id,
          original.amount_cents,
          original.method,
          businessDay(),
          d.reason,
          d.event_id,
          ...guardArgs,
        ),
    );
    statements.push(
      db
        .prepare(
          `INSERT INTO payment_allocations(organization_id,event_id,order_id,amount_cents) SELECT ?,?,order_id,amount_cents FROM payment_allocations WHERE organization_id=? AND event_id=? AND ${guard}`,
        )
        .bind(org, event, org, d.event_id, ...guardArgs),
    );
  } else if (action === 'close') {
    const d = z
      .object({ version: versionSchema, order_id: z.uuid() })
      .strict()
      .parse(raw);
    version = d.version;
    const anchor = view.orders.find((o) => o.id === d.order_id);
    if (!anchor || anchor.terms.mode !== 'credit')
      throw new HttpError(
        400,
        'Selecione entrega a prazo com condição definida.',
      );
    const period = closingPeriod(anchor.business_date, anchor.terms as Terms);
    if (period.end >= businessDay())
      throw new HttpError(
        400,
        'Aguarde o encerramento do período para fechar.',
      );
    const eligible = view.orders.filter(
      (o) =>
        o.active &&
        !o.closing_id &&
        ['delivered', 'picked_up'].includes(String(o.status)) &&
        o.terms.mode === 'credit' &&
        JSON.stringify(o.terms) === JSON.stringify(anchor.terms) &&
        o.business_date >= period.start &&
        o.business_date <= period.end,
    );
    if (!eligible.length)
      throw new HttpError(409, 'Nenhuma entrega sem fechamento neste período.');
    if (eligible.length > 200)
      throw new HttpError(400, 'Fechamento excede 200 pedidos.');
    protectedOrders = eligible;
    const closing = crypto.randomUUID(),
      total = eligible.reduce((n, o) => n + Number(o.total_cents), 0);
    response = { closing_id: closing };
    statements.push(
      db
        .prepare(
          `INSERT INTO closings(id,organization_id,customer_id,period_start,period_end,due_on,terms,total_cents,user_id,active_key) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ${guard}`,
        )
        .bind(
          closing,
          org,
          id,
          period.start,
          period.end,
          period.due_on,
          JSON.stringify(anchor.terms),
          total,
          a.user_id,
          period.start + ':' + period.end + ':' + JSON.stringify(anchor.terms),
          ...guardArgs,
        ),
    );
    statements.push(
      db
        .prepare(
          `INSERT INTO closing_orders(organization_id,closing_id,order_id,total_cents) SELECT ?,?,json_extract(value,'$.id'),json_extract(value,'$.total_cents') FROM json_each(?) WHERE ${guard}`,
        )
        .bind(
          org,
          closing,
          JSON.stringify(
            eligible.map((o) => ({ id: o.id, total_cents: o.total_cents })),
          ),
          ...guardArgs,
        ),
    );
  } else throw new HttpError(404, 'Ação não encontrada.');
  if (version !== view.version)
    throw new HttpError(409, 'Conta alterada em outra sessão. Atualize.');
  const result = await db.batch([
    db
      .prepare(
        'INSERT OR IGNORE INTO finance_accounts(organization_id,customer_id) VALUES(?,?)',
      )
      .bind(org, id),
    db
      .prepare(
        "UPDATE finance_accounts SET version=version+1,mutation_id=? WHERE organization_id=? AND customer_id=? AND version=? AND NOT EXISTS (SELECT 1 FROM json_each(?) j LEFT JOIN orders o ON o.organization_id=? AND o.id=json_extract(j.value,'$.id') WHERE o.id IS NULL OR o.version<>json_extract(j.value,'$.version') OR o.status<>json_extract(j.value,'$.status'))",
      )
      .bind(
        nonce,
        org,
        id,
        version,
        JSON.stringify(
          protectedOrders.map((o) => ({
            id: o.id,
            version: o.version,
            status: o.status,
          })),
        ),
        org,
      ),
    db
      .prepare(
        `UPDATE orders SET version=version+1 WHERE organization_id=? AND id IN (SELECT json_extract(value,'$.id') FROM json_each(?)) AND ${guard}`,
      )
      .bind(
        org,
        JSON.stringify(protectedOrders.map((o) => ({ id: o.id }))),
        ...guardArgs,
      ),
    ...statements,
    ...(action === 'close'
      ? [
          db
            .prepare(
              `INSERT INTO closing_order_history(organization_id,closing_id,order_id,total_cents) SELECT organization_id,closing_id,order_id,total_cents FROM closing_orders WHERE organization_id=? AND closing_id=? AND ${guard}`,
            )
            .bind(org, response.closing_id, ...guardArgs),
        ]
      : []),
    db
      .prepare(
        `INSERT INTO finance_requests(organization_id,request_key,request_hash,response) SELECT ?,?,?,? WHERE ${guard}`,
      )
      .bind(org, key, fingerprint, JSON.stringify(response), ...guardArgs),
    db
      .prepare(
        `INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,?,? WHERE ${guard}`,
      )
      .bind(
        crypto.randomUUID(),
        org,
        a.user_id,
        `finance.${action}`,
        String(response.event_id || response.closing_id),
        ...guardArgs,
      ),
  ]);
  if (!result[1].meta.changes)
    throw new HttpError(
      409,
      'Conta ou pedido alterado. Atualize antes de repetir.',
    );
  return json(response, 201);
}
/** Statements usados na mesma transação da criação do pedido. Não modifica pedidos existentes. */
export function orderDefaults(
  db: D1Database,
  org: string,
  order: string,
  customer: string,
  mutation: string,
) {
  const guard =
    'EXISTS(SELECT 1 FROM orders WHERE organization_id=? AND id=? AND mutation_id=?)';
  return [
    db
      .prepare(
        `INSERT OR IGNORE INTO order_terms(organization_id,order_id,data) SELECT ?,?,COALESCE((SELECT json_extract(data,'$.terms') FROM customer_profiles WHERE organization_id=? AND customer_id=?),?) WHERE ${guard}`,
      )
      .bind(
        org,
        order,
        org,
        customer,
        JSON.stringify(emptyTerms()),
        org,
        order,
        mutation,
      ),
    db
      .prepare(
        `UPDATE orders SET delivery_address=COALESCE((SELECT trim(json_extract(data,'$.address')||' '||json_extract(data,'$.neighborhood')||' '||json_extract(data,'$.reference')) FROM customer_profiles WHERE organization_id=? AND customer_id=?),''),courier=COALESCE((SELECT json_extract(data,'$.courier') FROM customer_profiles WHERE organization_id=? AND customer_id=?),'unassigned'),courier_name=COALESCE((SELECT json_extract(data,'$.courier_name') FROM customer_profiles WHERE organization_id=? AND customer_id=?),''),courier_fee_cents=COALESCE((SELECT json_extract(data,'$.courier_fee_cents') FROM customer_profiles WHERE organization_id=? AND customer_id=?),0) WHERE organization_id=? AND id=? AND mutation_id=?`,
      )
      .bind(
        org,
        customer,
        org,
        customer,
        org,
        customer,
        org,
        customer,
        org,
        order,
        mutation,
      ),
  ];
}
