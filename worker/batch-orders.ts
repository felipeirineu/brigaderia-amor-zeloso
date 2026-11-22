import { z } from 'zod';
import {
  batchOrderClosed,
  batchOrderLimit,
  batchOrderPath,
  dateKeepingBusinessTime,
  type BatchOrderResult,
} from '../shared/batch-orders';
import { UNDO_SECONDS, type Status } from '../shared/order-state';
import { financeReady } from './finance-ready';
import { validateOrderStatus } from './order-status';
import { p1Mutation } from './p1-common';
import { body, HttpError, json, type Actor, type Env } from './security';

const entrySchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().positive(),
    key: z.uuid(),
    original_key: z.uuid().optional(),
  })
  .strict();
const batchSchema = z
  .object({
    action: z.enum(['date', 'advance', 'complete', 'undo']),
    day: z.iso.date().optional(),
    orders: z.array(entrySchema).min(1).max(batchOrderLimit),
  })
  .strict()
  .refine(
    ({ action, day, orders }) =>
      (action === 'date') === (day !== undefined) &&
      orders.every((item) => (action === 'undo') === !!item.original_key) &&
      new Set(orders.map((item) => item.id)).size === orders.length &&
      new Set(orders.map((item) => item.key)).size === orders.length,
  );

type Row = Record<string, string | number | null>;
interface Edge {
  id: string;
  audit: string;
  from: Status;
  to: Status;
  undo_of: string | null;
}
interface Receipt {
  operation: 'batch-orders';
  actor: string;
  id: string;
  version: number;
  prior_date: string | null;
  expires_at: number;
  edges: Edge[];
}

export async function batchOrders(req: Request, env: Env, a: Actor) {
  const data = await body(req, batchSchema);
  const db = env.DB!,
    org = a.organization_id;
  const ledger = await db
    .prepare(
      "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='p1_requests'",
    )
    .first();
  if (!ledger)
    throw new HttpError(503, 'Pedidos em lote ainda não disponíveis.');
  const financial = data.action === 'undo' && (await financeReady(env));
  const results: BatchOrderResult[] = [];
  for (const item of data.orders) {
    const headers = new Headers(req.headers);
    headers.set('Idempotency-Key', item.key);
    try {
      const result = await p1Mutation(
        new Request(req.url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: data.action, day: data.day, item }),
        }),
        db,
        a,
        async (_raw, nonce) => {
          const order = await db
            .prepare(
              'SELECT * FROM orders WHERE organization_id=? AND id=? AND active=1',
            )
            .bind(org, item.id)
            .first<Row>();
          if (!order) throw new HttpError(404, 'Pedido não encontrado.');
          if (item.version !== order.version)
            throw new HttpError(
              409,
              'Pedido alterado em outra sessão. Atualize.',
            );

          let due = String(order.due_at);
          const status = order.status as Status;
          let target = status;
          let edges: Edge[] = [];
          let priorDate: string | null = null;
          let original: Receipt | undefined;
          const now = Math.floor(Date.now() / 1000);
          const makeEdge = (
            from: Status,
            to: Status,
            undoOf: string | null = null,
          ): Edge => ({
            id: crypto.randomUUID(),
            audit: crypto.randomUUID(),
            from,
            to,
            undo_of: undoOf,
          });

          if (data.action === 'undo') {
            const stored = await db
              .prepare(
                'SELECT response FROM p1_requests WHERE organization_id=? AND request_key=?',
              )
              .bind(org, item.original_key)
              .first<{ response: string }>();
            original = stored ? JSON.parse(stored.response) : undefined;
            if (
              original?.operation !== 'batch-orders' ||
              original.id !== item.id ||
              original.actor !== a.user_id ||
              original.version !== order.version ||
              original.expires_at <= now
            )
              throw new HttpError(
                409,
                'A janela para desfazer terminou ou o pedido foi alterado.',
              );
            if (original.prior_date) due = original.prior_date;
            edges = [...original.edges]
              .reverse()
              .map((e) => makeEdge(e.to, e.from, e.id));
            if (edges.length) target = edges[edges.length - 1].to;
          } else {
            if (batchOrderClosed(status))
              throw new HttpError(
                409,
                'Pedido entregue, retirado ou cancelado.',
              );
            if (data.action === 'date') {
              priorDate = due;
              due = dateKeepingBusinessTime(due, data.day!);
              if (due === new Date(priorDate).toISOString())
                throw new HttpError(409, 'O pedido já está nesta data.');
            } else {
              const route = batchOrderPath(
                status,
                String(order.delivery_type),
                data.action,
              );
              if (!route.length)
                throw new HttpError(409, 'O pedido não tem uma próxima etapa.');
              for (const step of route) {
                await validateOrderStatus(env, a, order, step);
                edges.push(makeEdge(target, step));
                target = step;
              }
            }
          }

          const version = item.version + Math.max(edges.length, 1);
          const receipt: Receipt = {
            operation: 'batch-orders',
            actor: a.user_id,
            id: item.id,
            version,
            prior_date: priorDate,
            expires_at: original ? 0 : now + UNDO_SECONDS,
            edges: original ? [] : edges,
          };
          // CAS antes de inserir qualquer evento; a transação também grava o recibo idempotente.
          const first = db
            .prepare(
              `UPDATE orders SET due_at=?,status=?,version=?,mutation_id=?
             WHERE organization_id=? AND id=? AND active=1 AND version=?
             ${original ? 'AND unixepoch() < ?' : ''}
             ${financial && edges.length ? 'AND NOT EXISTS (SELECT 1 FROM closing_orders c WHERE c.organization_id=orders.organization_id AND c.order_id=orders.id)' : ''}`,
            )
            .bind(
              due,
              target,
              version,
              nonce,
              org,
              item.id,
              item.version,
              ...(original ? [original.expires_at] : []),
            );
          const edgeRows = JSON.stringify(edges);
          return {
            first,
            rest: (guard: string, args: string[]) =>
              edges.length
                ? [
                    db
                      .prepare(
                        `INSERT INTO order_status_events(id,organization_id,order_id,user_id,from_status,to_status,reason,order_version,request_key,request_hash,undo_of)
                 SELECT json_extract(j.value,'$.id'),?,?,?,json_extract(j.value,'$.from'),json_extract(j.value,'$.to'),?,?+j.key+1,
                        json_extract(j.value,'$.id'),?,json_extract(j.value,'$.undo_of')
                 FROM json_each(?) j WHERE ${guard} ORDER BY j.key`,
                      )
                      .bind(
                        org,
                        item.id,
                        a.user_id,
                        original
                          ? 'Alteração em lote desfeita.'
                          : 'Etapa atualizada em lote.',
                        item.version,
                        nonce,
                        edgeRows,
                        ...args,
                      ),
                    db
                      .prepare(
                        `INSERT INTO audit_events(id,organization_id,user_id,action,entity_id)
                 SELECT json_extract(value,'$.audit'),?,?,'order.status',? FROM json_each(?) WHERE ${guard}`,
                      )
                      .bind(org, a.user_id, item.id, edgeRows, ...args),
                  ]
                : [],
            response: receipt,
            table: 'orders',
            id: item.id,
            action: original
              ? 'order.batch_undo'
              : data.action === 'date'
                ? 'order.batch_date'
                : 'order.batch_status',
          };
        },
      );
      const receipt = (await result.json()) as Receipt;
      results.push({
        id: item.id,
        ok: true,
        version: receipt.version,
        expires_at: receipt.expires_at,
      });
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      results.push({
        id: item.id,
        ok: false,
        status: error.status,
        error: error.message,
      });
    }
  }
  return results.every((item) => item.status === 404)
    ? json({ error: 'Pedidos não encontrados.', results }, 404)
    : json({ results });
}
