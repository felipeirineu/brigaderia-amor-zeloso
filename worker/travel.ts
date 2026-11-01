import { z } from 'zod';
import { HttpError, json, type Actor } from './security';
import { businessDay } from './operations-domain';
import { p1Mutation, requestRange } from './p1-common';
import { allocateCost } from '../shared/field';
import { toCSV } from './reports';
import { fileResponse } from './p1-common';
const schema = z
  .object({
    mode: z.enum(['uber', '99', 'courier', 'car', 'walk', 'other']),
    leg: z.enum(['outbound', 'return', 'roundtrip']),
    occurred_at: z.iso
      .datetime({ offset: true })
      .transform((v) => new Date(v).toISOString()),
    amount_cents: z.number().int().min(0).max(1000000000),
    performer_id: z.uuid().nullable().default(null),
    courier_name: z.string().trim().max(100).default(''),
    notes: z.string().trim().max(500).default(''),
    method: z
      .enum(['pix', 'cash', 'debit', 'credit', 'transfer', 'other'])
      .default('other'),
    order_ids: z.array(z.uuid()).min(1).max(30),
  })
  .strict()
  .refine(
    (d) => new Set(d.order_ids).size === d.order_ids.length,
    'Pedido repetido.',
  )
  .refine(
    (d) => d.mode !== 'courier' || !!d.courier_name,
    'Nome do motoboy obrigatório.',
  );
interface Trip {
  id: string;
  user_id: string;
  created_at: string;
  occurred_at: string;
  amount_cents: number;
  expense_id: string | null;
  mode: string;
  leg: string;
  performer_id: string | null;
  courier_name: string;
  notes: string;
  reversal_of: string | null;
  reversed: number;
  can_reverse?: boolean;
}
const ownDay = (t: Trip, a: Actor) =>
  a.role === 'owner' ||
  (t.user_id === a.user_id && businessDayAt(t.created_at) === businessDay());
function businessDayAt(s: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(s));
}
export async function travel(
  req: Request,
  db: D1Database,
  a: Actor,
  resource: string,
  id?: string,
  action?: string,
) {
  const org = a.organization_id;
  if (req.method === 'GET') {
    const { from, to } = requestRange(req);
    if (resource === 'travel-report') {
      const costs = (
        await db
          .prepare(
            "SELECT o.customer_id,SUM(d.allocated_cents) AS cost_cents FROM displacement_orders d JOIN displacements t ON t.organization_id=d.organization_id AND t.id=d.displacement_id JOIN orders o ON o.organization_id=d.organization_id AND o.id=d.order_id WHERE t.organization_id=? AND t.reversal_of IS NULL AND NOT EXISTS(SELECT 1 FROM displacements r WHERE r.organization_id=t.organization_id AND r.reversal_of=t.id) AND date(t.occurred_at,'-3 hours')>=? AND date(t.occurred_at,'-3 hours')<=? GROUP BY o.customer_id",
          )
          .bind(org, from, to)
          .all<{ customer_id: string; cost_cents: number }>()
      ).results;
      const revenue = (
        await db
          .prepare(
            "SELECT customer_id,SUM(total_cents) AS revenue_cents FROM orders WHERE organization_id=? AND active=1 AND status IN('delivered','picked_up') AND date(due_at,'-3 hours')>=? AND date(due_at,'-3 hours')<=? GROUP BY customer_id",
          )
          .bind(org, from, to)
          .all<{ customer_id: string; revenue_cents: number }>()
      ).results;
      const customers = (
        await db
          .prepare('SELECT id,name FROM customers WHERE organization_id=?')
          .bind(org)
          .all<{ id: string; name: string }>()
      ).results;
      const rows = customers
        .filter(
          (c) =>
            costs.some((x) => x.customer_id === c.id) ||
            revenue.some((x) => x.customer_id === c.id),
        )
        .map((c) => {
          const cost =
              costs.find((x) => x.customer_id === c.id)?.cost_cents ?? 0,
            rev =
              revenue.find((x) => x.customer_id === c.id)?.revenue_cents ?? 0;
          return {
            ...c,
            cost_cents: cost,
            revenue_cents: rev,
            percent: rev ? (100 * cost) / rev : null,
          };
        });
      if (new URL(req.url).searchParams.get('format') === 'csv')
        return fileResponse(
          toCSV(
            [
              'Cliente',
              'Entrega estimada (centavos)',
              'Pedidos entregues combinados no período (centavos)',
              'Percentual',
            ],
            rows.map((r) => [
              r.name,
              r.cost_cents,
              r.revenue_cents,
              r.percent ?? '',
            ]),
          ),
          'text/csv; charset=utf-8',
          'deslocamentos.csv',
        );
      return json({
        from,
        to,
        customers: rows,
        total_cents: rows.reduce((n, r) => n + r.cost_cents, 0),
      });
    }
    const rows = (
      await db
        .prepare(
          "SELECT t.*,EXISTS(SELECT 1 FROM displacements r WHERE r.organization_id=t.organization_id AND r.reversal_of=t.id) AS reversed FROM displacements t WHERE t.organization_id=? AND date(t.occurred_at,'-3 hours')>=? AND date(t.occurred_at,'-3 hours')<=? ORDER BY t.occurred_at DESC LIMIT 1001",
        )
        .bind(org, from, to)
        .all<Trip>()
    ).results;
    if (rows.length > 1000)
      throw new HttpError(409, 'Reduza o período para até 1000 deslocamentos.');
    const links = (
      await db
        .prepare(
          "SELECT d.displacement_id,d.order_id,d.allocated_cents FROM displacement_orders d JOIN displacements t ON t.organization_id=d.organization_id AND t.id=d.displacement_id WHERE t.organization_id=? AND date(t.occurred_at,'-3 hours')>=? AND date(t.occurred_at,'-3 hours')<=?",
        )
        .bind(org, from, to)
        .all<{
          displacement_id: string;
          order_id: string;
          allocated_cents: number;
        }>()
    ).results;
    return json(
      rows.map((r) => ({
        ...r,
        mutation_id: undefined,
        can_reverse: !r.reversal_of && !r.reversed && ownDay(r, a),
        orders: links.filter((l) => l.displacement_id === r.id),
      })),
    );
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Método inválido.');
  return p1Mutation(req, db, a, async (raw, nonce) => {
    const entity = crypto.randomUUID();
    if (action === 'reverse' && id) {
      const d = z
        .object({ reason: z.string().trim().min(3).max(500) })
        .strict()
        .parse(raw);
      const old = await db
        .prepare(
          'SELECT t.*,EXISTS(SELECT 1 FROM displacements r WHERE r.organization_id=t.organization_id AND r.reversal_of=t.id) AS reversed FROM displacements t WHERE t.organization_id=? AND t.id=?',
        )
        .bind(org, id)
        .first<Trip>();
      if (!old) throw new HttpError(404, 'Deslocamento não encontrado.');
      if (!ownDay(old, a))
        throw new HttpError(
          403,
          'Operador estorna somente seus registros de hoje.',
        );
      if (old.reversed || old.reversal_of)
        throw new HttpError(409, 'Deslocamento já estornado.');
      const expense = old.expense_id ? crypto.randomUUID() : null;
      return {
        id: entity,
        table: 'displacements',
        action: 'displacement.reversed',
        response: { id: entity },
        first: db
          .prepare(
            'INSERT INTO displacements(id,organization_id,user_id,mode,leg,occurred_at,amount_cents,performer_id,courier_name,notes,reason,reversal_of,mutation_id) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM displacements WHERE organization_id=? AND reversal_of=?)',
          )
          .bind(
            entity,
            org,
            a.user_id,
            old.mode,
            old.leg,
            old.occurred_at,
            old.amount_cents,
            old.performer_id,
            old.courier_name,
            old.notes,
            d.reason,
            id,
            nonce,
            org,
            id,
          ),
        rest: (g, args) =>
          expense
            ? [
                db
                  .prepare(
                    `INSERT INTO expense_events(id,organization_id,kind,amount_cents,category,description,method,spent_on,user_id,reason,reversal_of) SELECT ?,organization_id,'reversal',amount_cents,category,description,method,?,?,?,id FROM expense_events WHERE organization_id=? AND id=? AND ${g}`,
                  )
                  .bind(
                    expense,
                    businessDay(),
                    a.user_id,
                    d.reason,
                    org,
                    old.expense_id,
                    ...args,
                  ),
                db
                  .prepare(
                    `UPDATE displacements SET expense_id=? WHERE organization_id=? AND id=? AND ${g}`,
                  )
                  .bind(expense, org, entity, ...args),
              ]
            : [],
      };
    }
    if (id || action) throw new HttpError(404, 'Não encontrado.');
    const d = schema.parse(raw);
    if (Date.parse(d.occurred_at) > Date.now() + 60000)
      throw new HttpError(400, 'Data futura não permitida.');
    const performer =
      d.performer_id ?? (d.mode === 'courier' ? null : a.user_id);
    if (
      performer &&
      !(await db
        .prepare(
          'SELECT 1 FROM memberships WHERE organization_id=? AND user_id=?',
        )
        .bind(org, performer)
        .first())
    )
      throw new HttpError(400, 'Pessoa fora da organização.');
    const orders = (
      await db
        .prepare(
          "SELECT id,total_cents FROM orders WHERE organization_id=? AND active=1 AND status<>'cancelled' AND id IN(SELECT value FROM json_each(?))",
        )
        .bind(org, JSON.stringify(d.order_ids))
        .all<{ id: string; total_cents: number }>()
    ).results;
    if (orders.length !== d.order_ids.length)
      throw new HttpError(400, 'Pedidos inválidos.');
    const allocations = allocateCost(d.amount_cents, orders),
      expense = d.amount_cents > 0 ? crypto.randomUUID() : null;
    return {
      id: entity,
      table: 'displacements',
      action: 'displacement.created',
      response: { id: entity, expense_id: expense },
      first: db
        .prepare(
          'INSERT INTO displacements(id,organization_id,user_id,mode,leg,occurred_at,amount_cents,performer_id,courier_name,notes,mutation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          entity,
          org,
          a.user_id,
          d.mode,
          d.leg,
          d.occurred_at,
          d.amount_cents,
          performer,
          d.courier_name,
          d.notes,
          nonce,
        ),
      rest: (g, args) => [
        ...(expense
          ? [
              db
                .prepare(
                  `INSERT INTO expense_events(id,organization_id,kind,amount_cents,category,description,method,spent_on,user_id) SELECT ?,?,'expense',?,'delivery',?,?,?,? WHERE ${g}`,
                )
                .bind(
                  expense,
                  org,
                  d.amount_cents,
                  `Deslocamento ${d.mode} · ${d.notes}`,
                  d.method,
                  businessDayAt(d.occurred_at),
                  a.user_id,
                  ...args,
                ),
              db
                .prepare(
                  `UPDATE displacements SET expense_id=? WHERE organization_id=? AND id=? AND ${g}`,
                )
                .bind(expense, org, entity, ...args),
            ]
          : []),
        db
          .prepare(
            `INSERT INTO displacement_orders(organization_id,displacement_id,order_id,allocated_cents) SELECT ?,?,json_extract(value,'$.id'),json_extract(value,'$.cents') FROM json_each(?) WHERE ${g}`,
          )
          .bind(org, entity, JSON.stringify(allocations), ...args),
      ],
    };
  });
}
