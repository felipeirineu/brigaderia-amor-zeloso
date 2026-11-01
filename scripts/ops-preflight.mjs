// Somente SELECT; não lê dados pessoais nem executa migrations/seeds.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export const expectedMigrations = readdirSync(
  new URL('../database/migrations/', import.meta.url),
)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const tables = [
  'organizations',
  'customers',
  'products',
  'product_variants',
  'orders',
  'order_items',
  'order_status_events',
  'recurring_templates',
  'recurring_items',
  'message_templates',
  'contact_events',
  'customer_profiles',
  'order_terms',
  'finance_accounts',
  'finance_requests',
  'payment_events',
  'payment_allocations',
  'closings',
  'closing_orders',
  'payment_settings',
  'closing_order_history',
  'closing_annulments',
  'customer_credits',
  'credit_refunds',
  'credit_allocation_events',
  'combined_receipts',
  'p1_requests',
  'reminders',
  'expense_events',
  'supplies',
  'recipes',
  'recipe_components',
];
export function inspect(
  database,
  {
    remote = false,
    config = remote ? 'wrangler.jsonc' : 'worker/wrangler.jsonc',
    persist,
  } = {},
) {
  const query = (sql) => {
    const args = [
      './node_modules/wrangler/bin/wrangler.js',
      'd1',
      'execute',
      database,
      '--config',
      config,
      remote ? '--remote' : '--local',
      '--command',
      sql,
      '--json',
      ...(persist ? ['--persist-to', persist] : []),
    ];
    const raw = execFileSync(process.execPath, args, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const result = JSON.parse(raw);
    if (!Array.isArray(result) || result.some((x) => !x.success))
      throw Error('Consulta não concluída.');
    return result.flatMap((r) => r.results ?? []);
  };
  const schema = query("SELECT name FROM sqlite_schema WHERE type='table'");
  const names = new Set(schema.map((r) => r.name));
  const migrations = names.has('d1_migrations')
    ? query('SELECT name FROM d1_migrations ORDER BY id').map((r) => r.name)
    : [];
  const counts = Object.fromEntries(tables.map((t) => [t, null]));
  const present = tables.filter((t) => names.has(t));
  for (let i = 0; i < present.length; i += 5) {
    const chunk = present.slice(i, i + 5);
    for (const row of query(
      chunk
        .map((t) => `SELECT '${t}' AS table_name,COUNT(*) AS n FROM ${t}`)
        .join(' UNION ALL '),
    ))
      counts[row.table_name] = Number(row.n);
  }
  const violations = Number(
    query('SELECT COUNT(*) AS n FROM pragma_foreign_key_check')[0].n,
  );
  const orderColumns = names.has('orders')
    ? query("SELECT name FROM pragma_table_info('orders')").map((r) => r.name)
    : [];
  const courier = names.has('recurring_templates')
    ? query("SELECT name FROM pragma_table_info('recurring_templates')").some(
        (r) => r.name === 'courier_fee_cents',
      )
    : false;
  const operations =
    [
      'order_status_events',
      'recurring_templates',
      'recurring_items',
      'message_templates',
      'contact_events',
    ].every((x) => names.has(x)) &&
    orderColumns.includes('order_type') &&
    courier;
  const finance = operations && tables.slice(11, 26).every((x) => names.has(x));
  const p1 = finance && tables.slice(26).every((x) => names.has(x));
  const generated = names.has('order_terms')
    ? query("SELECT name FROM pragma_table_xinfo('order_terms')").map(
        (r) => r.name,
      )
    : [];
  return {
    database,
    mode: remote ? 'remoto' : 'local',
    migrations,
    pending: expectedMigrations.filter((x) => !migrations.includes(x)),
    counts,
    foreign_key_violations: violations,
    schema_operations_ready: operations,
    schema_finance_ready: finance,
    schema_p1_ready: p1,
    generated_condition_columns:
      generated.includes('payment_mode') && generated.includes('closing_cycle'),
  };
}
if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2),
    remote = args[0] === '--remote',
    database = args[1] ?? 'brigaderia-local';
  if (
    (remote && database !== 'brigaderia-amor-zeloso-homologacao') ||
    (!remote && args.length && args[0] !== '--local') ||
    args.length > 2
  ) {
    console.error(
      'Use: npm run ops:preflight -- --local brigaderia-local OU --remote brigaderia-amor-zeloso-homologacao',
    );
    process.exit(1);
  }
  try {
    const result = inspect(database, { remote });
    console.log(JSON.stringify(result, null, 2));
    if (result.foreign_key_violations) process.exitCode = 2;
  } catch {
    console.error(
      'Pré-checagem não concluída. Nenhuma alteração foi solicitada. Confira login Wrangler, conta, nome do banco e conexão; não ative as flags. Não cole logs contendo dados pessoais.',
    );
    process.exitCode = 1;
  }
}
