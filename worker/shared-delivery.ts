import type { Courier } from '../shared/courier';
import { HttpError } from './security';

export async function sharedDeliveryReady(db: D1Database) {
  const schema = await db
    .prepare(
      "SELECT count(*) AS n FROM sqlite_schema WHERE type='table' AND name IN ('orders','recurring_templates') AND instr(sql, ?) > 0",
    )
    .bind("'both'")
    .first<{ n: number }>();
  return schema?.n === 2;
}

export async function requireSharedDelivery(db: D1Database, courier: Courier) {
  if (courier === 'both' && !(await sharedDeliveryReady(db)))
    throw new HttpError(409, 'A entrega pelos dois ainda não está disponível.');
}
