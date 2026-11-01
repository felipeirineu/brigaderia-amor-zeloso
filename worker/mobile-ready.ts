import type { Env } from './security';
import { operationalReady } from './operational-ready';
export async function mobileReady(env: Env) {
  if (env.MOBILE_ENABLED !== 'true' || !(await operationalReady(env)))
    return false;
  const r = await env
    .DB!.prepare(
      "SELECT COUNT(*) AS n FROM pragma_table_info('products') WHERE name='photo_key' AND EXISTS(SELECT 1 FROM sqlite_schema WHERE name='p1_requests')",
    )
    .first<{ n: number }>();
  return r?.n === 1;
}
