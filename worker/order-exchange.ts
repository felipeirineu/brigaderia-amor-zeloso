import { z } from 'zod';
import { calculateExchange } from '../shared/order-exchange';
import { body, HttpError, json, type Actor } from './security';

export const exchangeUnitsSchema = z
  .number()
  .int()
  .min(0)
  .max(500000000)
  .optional();

export async function orderExchangeReady(db: D1Database) {
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM pragma_table_info('orders') WHERE name IN ('exchange_units','exchange_discount_cents')",
    )
    .first<{ n: number }>();
  return row?.n === 2;
}

export function orderExchangeColumns(ready: boolean, alias = 'o') {
  if (!ready) return '';
  return `,${alias}.exchange_units,${alias}.exchange_discount_cents,
    CASE WHEN ${alias}.exchange_units>0 THEN
      COALESCE((SELECT SUM(i.quantity*i.units_per_box) FROM order_items i
        WHERE i.organization_id=${alias}.organization_id AND i.order_id=${alias}.id),0)+
      COALESCE((SELECT SUM(k.quantity*k.units_per_kit) FROM kit_order_items k
        WHERE k.organization_id=${alias}.organization_id AND k.order_id=${alias}.id),0)
    ELSE 0 END AS exchange_delivered_units`;
}

export async function prepareOrderExchange(
  db: D1Database,
  collected: number,
  items: {
    id: string;
    quantity: number;
    units_per_box: number;
    unit_price_cents: number;
  }[],
  write = true,
) {
  const ready = write && (await orderExchangeReady(db));
  if (!ready && collected)
    throw new HttpError(409, 'Troca de doces aguarda a migração 0032.');
  let discount: number;
  try {
    discount = calculateExchange(
      items.map((item) => ({
        id: item.id,
        units: item.quantity * item.units_per_box,
        cents: item.quantity * item.unit_price_cents,
      })),
      collected,
    ).discount;
  } catch (error) {
    throw new HttpError(400, (error as Error).message);
  }
  return {
    discount,
    values: ready ? [collected, discount] : [],
    update: ready ? ',exchange_units=?,exchange_discount_cents=?' : '',
    columns: ready ? ',exchange_units,exchange_discount_cents' : '',
    placeholders: ready ? ',?,?' : '',
  };
}

export async function adjustOrderExchange(
  req: Request,
  db: D1Database,
  actor: Actor,
  order: Record<string, string | number | null>,
) {
  const { version, exchange_units: units } = await body(
    req,
    z
      .object({
        version: z.number().int().positive(),
        exchange_units: exchangeUnitsSchema.unwrap(),
      })
      .strict(),
  );
  const org = actor.organization_id;
  const id = String(order.id);
  if (['delivered', 'picked_up', 'cancelled'].includes(String(order.status)))
    throw new HttpError(409, 'Pedido encerrado não pode ser editado.');
  if (version !== order.version)
    throw new HttpError(409, 'Pedido alterado em outra sessão. Atualize.');
  const items = (
    await db
      .prepare(
        'SELECT id,quantity,units_per_box,unit_price_cents FROM order_items WHERE organization_id=? AND order_id=?',
      )
      .bind(org, id)
      .all<{
        id: string;
        quantity: number;
        units_per_box: number;
        unit_price_cents: number;
      }>()
  ).results;
  const exchange = await prepareOrderExchange(db, units, items);
  if (!exchange.values.length)
    throw new HttpError(409, 'Troca de doces aguarda a migração 0032.');
  const total =
    Number(order.total_cents) +
    Number(order.exchange_discount_cents ?? 0) -
    exchange.discount;
  const nonce = crypto.randomUUID();
  const result = await db.batch([
    db
      .prepare(
        `UPDATE orders SET total_cents=?${exchange.update},version=version+1,mutation_id=?
       WHERE organization_id=? AND id=? AND version=? AND active=1
       AND ?>=COALESCE((SELECT SUM(CASE WHEN e.kind='reversal' THEN -p.amount_cents ELSE p.amount_cents END)
         FROM payment_allocations p JOIN payment_events e ON e.organization_id=p.organization_id AND e.id=p.event_id
         WHERE p.organization_id=orders.organization_id AND p.order_id=orders.id),0)`,
      )
      .bind(total, ...exchange.values, nonce, org, id, version, total),
    db
      .prepare(
        "INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,'order.exchange',? WHERE EXISTS(SELECT 1 FROM orders WHERE organization_id=? AND id=? AND mutation_id=?)",
      )
      .bind(crypto.randomUUID(), org, actor.user_id, id, org, id, nonce),
  ]);
  if (!result[0].meta.changes)
    throw new HttpError(
      409,
      'Pedido alterado ou total abaixo dos recebimentos. Confira antes de salvar.',
    );
  return json({ ok: true });
}
