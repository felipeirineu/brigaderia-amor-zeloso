import { financeReady } from './finance-ready';
import type { Env } from './security';
export async function p1Ready(env: Env) {
  if (env.P1_ENABLED !== 'true' || !(await financeReady(env))) return false;
  const found = await env
    .DB!.prepare(
      "SELECT COUNT(*) AS n FROM sqlite_schema WHERE type='table' AND name IN ('p1_requests','reminders','expense_events','supplies','recipes','recipe_components')",
    )
    .first<{ n: number }>();
  return found?.n === 6;
}
