import { z } from 'zod';
import { HttpError, json, type Actor } from './security';
import { businessDay } from './operations-domain';
import { fileResponse, ownerOnly, p1Mutation, requestRange } from './p1-common';
import { toCSV } from './reports';
export const expenseSchema = z
  .object({
    amount_cents: z.number().int().positive().max(1000000000),
    category: z.enum([
      'ingredients',
      'packaging',
      'delivery',
      'utilities',
      'labor',
      'other',
    ]),
    description: z.string().trim().max(500).default(''),
    method: z.enum(['pix', 'cash', 'debit', 'credit', 'transfer', 'other']),
    spent_on: z.iso.date(),
    order_id: z.uuid().nullable().default(null),
  })
  .strict();
export async function expenses(
  req: Request,
  db: D1Database,
  a: Actor,
  resource: string,
  id?: string,
) {
  const org = a.organization_id;
  if (req.method === 'GET') {
    const { from, to } = requestRange(req);
    const rows = (
      await db
        .prepare(
          'SELECT e.*,EXISTS(SELECT 1 FROM expense_events r WHERE r.organization_id=e.organization_id AND r.reversal_of=e.id) AS reversed FROM expense_events e WHERE e.organization_id=? AND e.spent_on>=? AND e.spent_on<=? ORDER BY e.spent_on,e.created_at,e.id LIMIT 1001',
        )
        .bind(org, from, to)
        .all<{
          id: string;
          kind: string;
          amount_cents: number;
          category: string;
          description: string;
          method: string;
          spent_on: string;
          reversal_of: string | null;
          reason: string;
          user_id: string;
          created_at: string;
          reversed: number;
        }>()
    ).results;
    if (rows.length > 1000)
      throw new HttpError(
        409,
        'Mais de 1000 despesas no período; reduza o período.',
      );
    const payment = await db
      .prepare(
        "SELECT COALESCE(SUM(CASE WHEN paid_on<? THEN CASE WHEN kind='reversal' THEN -amount_cents ELSE amount_cents END ELSE 0 END),0) AS opening,COALESCE(SUM(CASE WHEN paid_on>=? AND paid_on<=? THEN CASE WHEN kind='reversal' THEN -amount_cents ELSE amount_cents END ELSE 0 END),0) AS received FROM payment_events WHERE organization_id=?",
      )
      .bind(from, from, to, org)
      .first<{ opening: number; received: number }>();
    const spent = await db
      .prepare(
        "SELECT COALESCE(SUM(CASE WHEN spent_on<? THEN CASE WHEN kind='reversal' THEN -amount_cents ELSE amount_cents END ELSE 0 END),0) AS opening,COALESCE(SUM(CASE WHEN spent_on>=? AND spent_on<=? THEN CASE WHEN kind='reversal' THEN -amount_cents ELSE amount_cents END ELSE 0 END),0) AS spent FROM expense_events WHERE organization_id=?",
      )
      .bind(from, from, to, org)
      .first<{ opening: number; spent: number }>();
    const daily = (
      await db
        .prepare(
          "SELECT day,SUM(received) AS received_cents,SUM(spent) AS spent_cents FROM (SELECT paid_on AS day,SUM(CASE WHEN kind='reversal' THEN -amount_cents ELSE amount_cents END) AS received,0 AS spent FROM payment_events WHERE organization_id=? AND paid_on>=? AND paid_on<=? GROUP BY paid_on UNION ALL SELECT spent_on AS day,0 AS received,SUM(CASE WHEN kind='reversal' THEN -amount_cents ELSE amount_cents END) AS spent FROM expense_events WHERE organization_id=? AND spent_on>=? AND spent_on<=? GROUP BY spent_on) GROUP BY day ORDER BY day",
        )
        .bind(org, from, to, org, from, to)
        .all<{ day: string; received_cents: number; spent_cents: number }>()
    ).results;
    const opening = (payment?.opening ?? 0) - (spent?.opening ?? 0),
      received = payment?.received ?? 0,
      out = spent?.spent ?? 0;
    if (resource === 'cashflow.csv')
      return fileResponse(
        toCSV(
          [
            'Dia',
            'Recebido líquido (centavos)',
            'Despesas líquidas (centavos)',
            'Fluxo líquido (centavos)',
          ],
          daily.map((d) => [
            d.day,
            d.received_cents,
            d.spent_cents,
            d.received_cents - d.spent_cents,
          ]),
        ),
        'text/csv; charset=utf-8',
        'fluxo-registrado.csv',
      );
    return json({
      from,
      to,
      role: a.role,
      events: rows,
      daily,
      opening_cents: opening,
      received_cents: received,
      spent_cents: out,
      net_cents: received - out,
      closing_cents: opening + received - out,
    });
  }
  ownerOnly(a);
  if (req.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
  return p1Mutation(req, db, a, async (raw) => {
    const entity = crypto.randomUUID();
    let values: {
        amount_cents: number;
        category: string;
        description: string;
        method: string;
        spent_on: string;
        order_id: string | null;
      },
      reverse: string | null = null,
      reason = '';
    if (id) {
      if (!z.uuid().safeParse(id).success)
        throw new HttpError(404, 'Não encontrado.');
      const data = z
          .object({ reason: z.string().trim().min(1).max(500) })
          .strict()
          .parse(raw),
        original = await db
          .prepare(
            "SELECT * FROM expense_events WHERE organization_id=? AND id=? AND kind='expense'",
          )
          .bind(org, id)
          .first<typeof values>();
      if (!original) throw new HttpError(404, 'Despesa não encontrada.');
      if (
        await db
          .prepare(
            'SELECT 1 FROM expense_events WHERE organization_id=? AND reversal_of=?',
          )
          .bind(org, id)
          .first()
      )
        throw new HttpError(409, 'Despesa já estornada.');
      values = { ...original, spent_on: businessDay() };
      reverse = id;
      reason = data.reason;
    } else {
      values = expenseSchema.parse(raw);
      if (values.spent_on > businessDay())
        throw new HttpError(
          400,
          'Despesa futura não é saída de caixa registrada.',
        );
      if (
        values.order_id &&
        !(await db
          .prepare('SELECT 1 FROM orders WHERE organization_id=? AND id=?')
          .bind(org, values.order_id)
          .first())
      )
        throw new HttpError(400, 'Pedido não pertence à organização.');
    }
    return {
      id: entity,
      table: 'expense_events',
      response: { id: entity },
      action: reverse ? 'expense.reversed' : 'expense.recorded',
      first: db
        .prepare(
          'INSERT INTO expense_events(id,organization_id,kind,amount_cents,category,description,method,spent_on,order_id,user_id,reason,reversal_of) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          entity,
          org,
          reverse ? 'reversal' : 'expense',
          values.amount_cents,
          values.category,
          values.description,
          values.method,
          values.spent_on,
          values.order_id,
          a.user_id,
          reason,
          reverse,
        ),
      rest: () => [],
    };
  });
}
