import type { Env } from './security';
import { mobileReady } from './mobile-ready';
import { p1Ready } from './p1-ready';
export async function fieldReady(env: Env) {
  if (
    env.FIELD_ENABLED !== 'true' ||
    !(await mobileReady(env)) ||
    !(await p1Ready(env))
  )
    return false;
  return !!(await env
    .DB!.prepare(
      "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='order_places'",
    )
    .first());
}
