import { p1Ready } from './p1-ready';
import type { Env } from './security';
export async function toolsReady(env: Env) {
  if (env.P1_TOOLS_ENABLED !== 'true' || !(await p1Ready(env))) return false;
  const r = await env
    .DB!.prepare(
      "SELECT COUNT(*) n FROM sqlite_schema WHERE type='table' AND name IN('inventory_balances','inventory_events')",
    )
    .first<{ n: number }>();
  return r?.n === 2;
}
