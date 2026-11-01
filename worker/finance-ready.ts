import type { Env } from './security';
import { operationalReady } from './operational-ready';
export async function financeReady(env: Env) {
  if (env.FINANCE_ENABLED !== 'true' || !(await operationalReady(env)))
    return false;
  try {
    const row = await env
      .DB!.prepare(
        "SELECT COUNT(*) AS n FROM sqlite_schema WHERE type='table' AND name IN ('customer_profiles','order_terms','finance_accounts','finance_requests','payment_events','payment_allocations','closings','closing_orders','payment_settings','customer_credits','credit_refunds','credit_allocation_events','combined_receipts','closing_order_history','closing_annulments')",
      )
      .first<{ n: number }>();
    return row?.n === 15;
  } catch {
    return false;
  }
}
