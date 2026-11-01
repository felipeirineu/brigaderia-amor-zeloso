import type { Env } from './security';
/** Ativação é explícita e só fica disponível após o schema inteiro existir. */
export async function operationalReady(env: Env) {
  if (env.OPERATIONS_ENABLED !== 'true' || !env.DB) return false;
  try {
    const result = await env.DB.prepare(
      "SELECT (SELECT COUNT(*) FROM sqlite_schema WHERE type='table' AND name IN ('order_status_events','recurring_templates','recurring_items','message_templates','contact_events')) AS tables_count,(SELECT COUNT(*) FROM pragma_table_info('orders') WHERE name='order_type') AS type_count",
    ).first<{ tables_count: number; type_count: number }>();
    return result?.tables_count === 5 && result.type_count === 1;
  } catch {
    return false;
  }
}
