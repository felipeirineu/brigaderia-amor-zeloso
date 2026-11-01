import { z } from 'zod';
import { HttpError, json, type Actor } from './security';
import { p1Mutation, ownerOnly, requestRange } from './p1-common';
import { businessDay } from './operations-domain';
const schema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('minimum'),
      version: z.number().int().min(0),
      minimum_milli: z.number().int().min(0).max(1000000000000).nullable(),
    })
    .strict(),
  z
    .object({
      action: z.literal('move'),
      version: z.number().int().min(0),
      kind: z.enum(['entry', 'consumption', 'loss', 'adjustment']),
      delta_milli: z
        .number()
        .int()
        .min(-1000000000000)
        .max(1000000000000)
        .refine((v) => v !== 0),
      reason: z.string().trim().min(3).max(500),
      lot: z.string().trim().max(100).default(''),
      expires_on: z.iso.date().nullable().default(null),
      order_id: z.uuid().nullable().default(null),
    })
    .strict()
    .refine(
      (d) =>
        d.kind === 'adjustment' ||
        (d.kind === 'entry' ? d.delta_milli > 0 : d.delta_milli < 0),
      'Sinal incompatível.',
    ),
  z
    .object({
      action: z.literal('reverse'),
      version: z.number().int().min(0),
      event_id: z.uuid(),
      reason: z.string().trim().min(3).max(500),
    })
    .strict(),
]);
export async function inventory(
  req: Request,
  db: D1Database,
  a: Actor,
  id?: string,
) {
  const org = a.organization_id;
  if (req.method === 'GET') {
    if (!id) {
      const rows = (
        await db
          .prepare(
            'SELECT s.id,s.name,s.unit,s.active,COALESCE(b.balance_milli,0) balance_milli,b.minimum_milli,COALESCE(b.version,0) version FROM supplies s LEFT JOIN inventory_balances b ON b.organization_id=s.organization_id AND b.id=s.id WHERE s.organization_id=? ORDER BY s.active DESC,s.name LIMIT 501',
          )
          .bind(org)
          .all()
      ).results;
      if (rows.length > 500) throw new HttpError(409, 'Limite de 500 insumos.');
      return json(rows);
    }
    const { from, to } = requestRange(req);
    const rows = (
      await db
        .prepare(
          "SELECT e.*,EXISTS(SELECT 1 FROM inventory_events r WHERE r.organization_id=e.organization_id AND r.reversal_of=e.id) reversed FROM inventory_events e WHERE e.organization_id=? AND e.supply_id=? AND date(e.created_at,'-3 hours')>=? AND date(e.created_at,'-3 hours')<=? ORDER BY e.created_at DESC LIMIT 1001",
        )
        .bind(org, id, from, to)
        .all<{
          user_id: string;
          created_at: string;
          reversed: number;
          reversal_of: string | null;
        }>()
    ).results;
    if (rows.length > 1000) throw new HttpError(409, 'Reduza o período.');
    return json(
      rows.map((e) => ({
        ...e,
        can_reverse:
          !e.reversed &&
          !e.reversal_of &&
          (a.role === 'owner' ||
            (e.user_id === a.user_id && day(e.created_at) === businessDay())),
      })),
    );
  }
  if (req.method !== 'POST' || !id || !z.uuid().safeParse(id).success)
    throw new HttpError(404, 'Não encontrado.');
  return p1Mutation(req, db, a, async (raw, nonce) => {
    const d = schema.parse(raw),
      supply = await db
        .prepare(
          'SELECT unit FROM supplies WHERE organization_id=? AND id=? AND active=1',
        )
        .bind(org, id)
        .first<{ unit: string }>();
    if (!supply) throw new HttpError(404, 'Insumo ativo não encontrado.');
    const prior = await db
      .prepare(
        'SELECT balance_milli,minimum_milli,version FROM inventory_balances WHERE organization_id=? AND id=?',
      )
      .bind(org, id)
      .first<{
        balance_milli: number;
        minimum_milli: number | null;
        version: number;
      }>();
    if ((prior?.version ?? 0) !== d.version)
      throw new HttpError(409, 'Estoque alterado. Atualize.');
    let delta = 0,
      kind = '',
      reason = '',
      lot = '',
      expires: string | null = null,
      order: string | null = null,
      reverse: string | null = null;
    if (d.action === 'minimum') ownerOnly(a);
    else if (d.action === 'reverse') {
      const e = await db
        .prepare(
          'SELECT e.*,EXISTS(SELECT 1 FROM inventory_events r WHERE r.organization_id=e.organization_id AND r.reversal_of=e.id) reversed FROM inventory_events e WHERE e.organization_id=? AND e.supply_id=? AND e.id=?',
        )
        .bind(org, id, d.event_id)
        .first<{
          delta_milli: number;
          user_id: string;
          created_at: string;
          reversed: number;
          reversal_of: string | null;
        }>();
      if (!e) throw new HttpError(404, 'Movimento não encontrado.');
      if (e.reversed || e.reversal_of)
        throw new HttpError(409, 'Já estornado.');
      if (
        a.role !== 'owner' &&
        (e.user_id !== a.user_id || day(e.created_at) !== businessDay())
      )
        throw new HttpError(
          403,
          'Operador estorna só os próprios movimentos de hoje.',
        );
      delta = -e.delta_milli;
      kind = 'reversal';
      reason = d.reason;
      reverse = d.event_id;
    } else {
      delta = d.delta_milli;
      kind = d.kind;
      reason = d.reason;
      lot = d.lot;
      expires = d.expires_on;
      order = d.order_id;
      if (
        order &&
        !(await db
          .prepare('SELECT 1 FROM orders WHERE organization_id=? AND id=?')
          .bind(org, order)
          .first())
      )
        throw new HttpError(400, 'Pedido fora da organização.');
    }
    const balance = (prior?.balance_milli ?? 0) + delta,
      minimum =
        d.action === 'minimum'
          ? d.minimum_milli
          : (prior?.minimum_milli ?? null);
    if (
      !Number.isSafeInteger(balance) ||
      balance < 0 ||
      balance > 1000000000000
    )
      throw new HttpError(
        409,
        'Saldo insuficiente ou acima do limite. Nenhum movimento salvo.',
      );
    if (
      supply.unit === 'unit' &&
      (delta % 1000 !== 0 || (minimum !== null && minimum % 1000 !== 0))
    )
      throw new HttpError(400, 'Embalagens/unidades exigem números inteiros.');
    const event = crypto.randomUUID();
    return {
      id,
      table: 'inventory_balances',
      action: 'inventory.' + d.action,
      response: {
        id,
        event_id: d.action === 'minimum' ? null : event,
        version: d.version + 1,
        balance_milli: balance,
      },
      first: db
        .prepare(
          'INSERT INTO inventory_balances(organization_id,id,balance_milli,minimum_milli,version,mutation_id) SELECT ?,?,?,?,1,? WHERE (?=0 OR EXISTS(SELECT 1 FROM inventory_balances WHERE organization_id=? AND id=? AND version=?)) AND EXISTS(SELECT 1 FROM supplies WHERE organization_id=? AND id=? AND unit=? AND active=1) ON CONFLICT(organization_id,id) DO UPDATE SET balance_milli=excluded.balance_milli,minimum_milli=excluded.minimum_milli,version=inventory_balances.version+1,mutation_id=excluded.mutation_id WHERE inventory_balances.version=?',
        )
        .bind(
          org,
          id,
          balance,
          minimum,
          nonce,
          d.version,
          org,
          id,
          d.version,
          org,
          id,
          supply.unit,
          d.version,
        ),
      rest: (g, args) =>
        d.action === 'minimum'
          ? []
          : [
              db
                .prepare(
                  `INSERT INTO inventory_events(id,organization_id,supply_id,user_id,kind,delta_milli,reason,lot,expires_on,order_id,reversal_of) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE ${g}`,
                )
                .bind(
                  event,
                  org,
                  id,
                  a.user_id,
                  kind,
                  delta,
                  reason,
                  lot,
                  expires,
                  order,
                  reverse,
                  ...args,
                ),
            ],
    };
  });
}
function day(s: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(s));
}
