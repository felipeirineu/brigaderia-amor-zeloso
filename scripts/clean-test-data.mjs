// Limpeza única dos dados de TESTE do banco, autorizada pelo responsável em
// 14/11/2026 ("nenhum pedido existente é real"). Mantém acessos, equipe,
// endereço da base, configurações, insumos e kits. Só roda pelo workflow
// manual, com prévia, confirmação digitada e backup conferido fora do GitHub.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Nunca apagar: acessos, equipe, configuração, cadastros de custo e caches. */
export const KEEP = new Set([
  'test_environment',
  'backup_reminders',
  'prospect_visits',
  'prospect_visit_records',
  'prospect_details',
  'prospect_events',
  'organizations',
  'users',
  'memberships',
  'authorized_emails',
  'sessions',
  'login_attempts',
  'display_profiles',
  'profile_photos',
  'push_subscriptions',
  'push_requests',
  'company_places',
  'payment_settings',
  'message_templates',
  'supplies',
  'weight_recipes',
  'weight_recipe_supplies',
  'costing_settings',
  'costing_setting_supplies',
  'kits',
  'kit_settings',
  'audit_events',
  'p1_requests',
  'finance_requests',
  'place_cache',
  'provider_limits',
  'route_cache',
  'route_budget',
]);

/** Pedidos e tudo o que foi movimentado com eles. Sempre apagados. */
export const BASE_ROOTS = [
  'orders',
  'payment_events',
  'closings',
  'customer_credits',
  'recurring_templates',
  'reminders',
  'expense_events',
  'displacements',
  'inventory_events',
  'inventory_balances',
  'route_jobs',
];

export const CONFIRMATION = 'APAGAR TESTES';

/**
 * Recebe o schema ({tabela: [tabelas referenciadas]}) e devolve as tabelas a
 * esvaziar, das dependentes para as referenciadas. Toda tabela que aponta para
 * uma tabela apagada também é apagada (senão sobraria vínculo quebrado).
 */
export function planCleanup(schema, { customers = false, products = false }) {
  const roots = [
    ...BASE_ROOTS,
    ...(customers ? ['customers', 'customer_imports'] : []),
    ...(products ? ['products'] : []),
  ].filter((t) => t in schema);
  const clear = new Set(roots);
  for (let grew = true; grew;) {
    grew = false;
    for (const [table, parents] of Object.entries(schema))
      if (!clear.has(table) && parents.some((p) => clear.has(p))) {
        clear.add(table);
        grew = true;
      }
  }
  const blocked = [...clear].filter((t) => KEEP.has(t));
  if (blocked.length)
    throw Error(
      'O schema mudou: a limpeza alcançaria tabelas protegidas (' +
        blocked.join(', ') +
        '). Nada foi apagado; revise o script.',
    );
  // Ordem: quem referencia vem antes de quem é referenciado.
  const order = [],
    done = new Set();
  const visit = (t, path = new Set()) => {
    if (done.has(t)) return;
    if (path.has(t)) throw Error('Ciclo de vínculos em ' + t + '.');
    path.add(t);
    for (const [child, parents] of Object.entries(schema))
      if (child !== t && clear.has(child) && parents.includes(t))
        visit(child, path);
    path.delete(t);
    done.add(t);
    order.push(t);
  };
  for (const t of [...clear].sort()) visit(t);
  return order;
}

const quote = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw Error('Nome de tabela inválido.');
  return '"' + name + '"';
};
export const cleanupSql = (order) =>
  order.map((t) => `DELETE FROM ${quote(t)};`).join('\n');

/** Lê o schema e as contagens por meio de uma função de consulta SQL. */
export async function readSchema(query) {
  const names = (
    await query(
      "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'",
    )
  ).map((r) => r.name);
  const schema = {};
  for (const n of names)
    schema[n] = (
      await query(
        `SELECT DISTINCT "table" AS parent FROM pragma_foreign_key_list(${"'" + n.replaceAll("'", "''") + "'"})`,
      )
    )
      .map((r) => r.parent)
      .filter((p) => p !== n);
  return schema;
}
export async function countRows(query, tables) {
  const counts = {};
  for (let i = 0; i < tables.length; i += 5) {
    const chunk = tables.slice(i, i + 5);
    for (const r of await query(
      chunk
        .map((t) => `SELECT '${t}' AS t,COUNT(*) AS n FROM ${quote(t)}`)
        .join(' UNION ALL '),
    ))
      counts[r.t] = Number(r.n);
  }
  return counts;
}

function remote(database) {
  const run = (args) =>
    execFileSync(
      process.execPath,
      [
        './node_modules/wrangler/bin/wrangler.js',
        'd1',
        'execute',
        database,
        '--config',
        'wrangler.jsonc',
        '--remote',
        ...args,
      ],
      {
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  const query = async (sql) => {
    const result = JSON.parse(run(['--command', sql, '--json']));
    if (!Array.isArray(result) || result.some((x) => !x.success))
      throw Error('Consulta não concluída.');
    return result.flatMap((r) => r.results ?? []);
  };
  const executeFile = (sql) => {
    const dir = mkdtempSync(join(tmpdir(), 'limpeza-'));
    try {
      const file = join(dir, 'limpeza.sql');
      writeFileSync(file, sql, { mode: 0o600 });
      run(['--file', file, '--yes']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  return { query, executeFile };
}

async function main() {
  const mode = process.env.CLEANUP_MODE;
  const options = {
    customers: process.env.CLEAN_CUSTOMERS === 'true',
    products: process.env.CLEAN_PRODUCTS === 'true',
  };
  if (!['LIMPEZA_PREVIA', 'LIMPEZA_APLICAR'].includes(mode))
    throw Error('Ação inválida.');
  if (mode === 'LIMPEZA_APLICAR') {
    if (process.env.BACKUP_VERIFIED !== 'true')
      throw Error(
        'Baixe o backup no app (Ferramentas → Backup) e marque a confirmação antes de apagar.',
      );
    if ((process.env.CONFIRMATION || '').trim() !== CONFIRMATION)
      throw Error(`Digite exatamente "${CONFIRMATION}" para apagar.`);
  }
  if (
    !process.env.CLOUDFLARE_API_TOKEN ||
    !/^[a-f0-9]{32}$/i.test(process.env.CLOUDFLARE_ACCOUNT_ID || '')
  )
    throw Error('Credenciais do ambiente homologacao-d1 ausentes.');
  const db = remote('brigaderia-amor-zeloso-homologacao');
  const schema = await readSchema(db.query);
  const order = planCleanup(schema, options);
  const kept = ['organizations', 'authorized_emails', 'memberships', 'users']
    .concat(options.customers ? [] : ['customers'])
    .concat(options.products ? [] : ['products', 'product_variants'])
    .filter((t) => t in schema);
  const before = await countRows(db.query, order);
  console.log(
    JSON.stringify(
      {
        opcoes: options,
        apagar_linhas_por_tabela: before,
        mantidas: await countRows(db.query, kept),
      },
      null,
      2,
    ),
  );
  if (mode === 'LIMPEZA_PREVIA') {
    console.log('Somente prévia. Nada foi apagado.');
    return;
  }
  db.executeFile(cleanupSql(order));
  const after = await countRows(db.query, order);
  const left = Object.entries(after).filter(([, n]) => n > 0);
  const violations = Number(
    (await db.query('SELECT COUNT(*) AS n FROM pragma_foreign_key_check'))[0].n,
  );
  console.log(
    JSON.stringify(
      {
        restantes: Object.fromEntries(left),
        mantidas: await countRows(db.query, kept),
        violacoes_de_vinculo: violations,
      },
      null,
      2,
    ),
  );
  if (left.length || violations)
    throw Error('Limpeza incompleta. Preserve o backup e não repita às cegas.');
  console.log('Limpeza concluída. Acessos, equipe e configurações mantidos.');
}

if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
