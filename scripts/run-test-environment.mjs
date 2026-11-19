import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createMarker,
  expectedSchema,
  identifier,
  markReady,
  markerTable,
  migrations,
  prepareCopy,
} from './test-environment-data.mjs';

export const actions = [
  'VERIFICAR',
  'APLICAR_MIGRACOES',
  'COPIAR_DO_REAL',
  'LIMPAR',
];
const prodName = 'brigaderia-amor-zeloso-homologacao';
const testName = 'brigaderia-amor-zeloso-teste';
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
class GuardError extends Error {}

export function validateTargets(config, requiredId) {
  const source = config.d1_databases?.find((db) => db.binding === 'DB');
  const target = config.env?.preview?.d1_databases?.find(
    (db) => db.binding === 'DB',
  );
  if (
    !source ||
    !target ||
    source.database_name !== prodName ||
    target.database_name !== testName
  )
    throw new GuardError(
      'Confira os nomes e bindings dos dois bancos no wrangler.jsonc.',
    );
  if (!uuid.test(target.database_id) || !uuid.test(source.database_id))
    throw new GuardError('Preencha o ID do banco de teste antes de executar.');
  if (source.database_id.toLowerCase() === target.database_id.toLowerCase())
    throw new GuardError(
      'Banco de teste e banco real precisam ter IDs distintos.',
    );
  if (
    !requiredId ||
    requiredId.toLowerCase() !== target.database_id.toLowerCase()
  )
    throw new GuardError(
      'Confira a variável TEST_D1_DATABASE_ID do ambiente protegido.',
    );
  return { source, target };
}

function checkedResult(raw) {
  const response = JSON.parse(raw);
  if (
    !Array.isArray(response) ||
    response.some((part) => !part.success || !Array.isArray(part.results))
  )
    throw Error('Consulta não concluída.');
  return response.flatMap((part) => part.results);
}

export async function runTestEnvironment({
  mode = 'VERIFICAR',
  confirmed = false,
  config,
  requiredId,
  identify,
  wrangler,
  log,
}) {
  if (!actions.includes(mode)) throw new GuardError('Ação inválida.');
  if (mode !== 'VERIFICAR' && !confirmed)
    throw new GuardError('Marque a confirmação para alterar o banco de teste.');
  const { source, target } = validateTargets(config, requiredId);
  const check = async (db) => {
    const info = await identify(db.database_id);
    if (
      info.uuid?.toLowerCase() !== db.database_id.toLowerCase() ||
      info.name !== db.database_name
    )
      throw new GuardError('A identidade do banco na Cloudflare não confere.');
  };
  await check(target);
  if (mode === 'COPIAR_DO_REAL') await check(source);

  const scratch = mkdtempSync(join(tmpdir(), 'brigaderia-teste-'));
  try {
    chmodSync(scratch, 0o700);
    const configPath = join(scratch, 'wrangler.json');
    const bindings = [
      target,
      ...(mode === 'COPIAR_DO_REAL' ? [{ ...source, binding: 'ORIGEM' }] : []),
    ];
    writeFileSync(
      configPath,
      JSON.stringify({
        name: 'brigaderia-ambiente-teste',
        compatibility_date: config.compatibility_date,
        d1_databases: bindings.map((db) => ({
          ...db,
          migrations_dir: resolve('database/migrations'),
        })),
      }),
      { mode: 0o600 },
    );
    const invoke = (args) =>
      wrangler([...args, '--config', configPath, '--remote'], scratch);
    const query = (command) =>
      checkedResult(invoke(['execute', 'DB', '--command', command, '--json']));
    const cleanCounts = expectedSchema();
    const configuredSchema = Object.keys(cleanCounts);
    const schema = () => {
      const names = query(
        "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*'",
      ).map((row) => row.name);
      if (
        names.some(
          (name) =>
            ![...configuredSchema, markerTable, 'd1_migrations'].includes(name),
        )
      )
        throw new GuardError(
          'Schema do banco de teste desconhecido. Nenhuma limpeza será feita.',
        );
      return names;
    };
    const inspect = () => {
      const names = schema();
      const applied = names.includes('d1_migrations')
        ? query('SELECT name FROM d1_migrations ORDER BY id').map(
            ({ name }) => name,
          )
        : [];
      if (applied.some((name, i) => name !== migrations[i]))
        throw new GuardError('Histórico de migrações do teste incompatível.');
      const counts = {};
      for (let i = 0; i < names.length; i += 25) {
        const fields = names.slice(i, i + 25).map((name) => {
          const table = identifier(name);
          return `'${name}',(SELECT COUNT(*) FROM ${table})`;
        });
        const [{ counts: value }] = query(
          `SELECT json_object(${fields.join(',')}) AS counts`,
        );
        Object.assign(counts, JSON.parse(value));
      }
      const violations = query('PRAGMA foreign_key_check').length;
      return { names, counts, applied, violations };
    };
    const file = (sql) => {
      const path = join(scratch, 'import.sql');
      writeFileSync(path, sql, { mode: 0o600 });
      invoke(['execute', 'DB', '--file', path, '--yes']);
    };
    const apply = () => invoke(['migrations', 'apply', 'DB']);
    const pause = (names) => {
      if (names.includes(markerTable)) query(`DELETE FROM ${markerTable}`);
    };
    const assertReadySchema = (report) => {
      if (
        report.applied.length !== migrations.length ||
        report.violations ||
        configuredSchema.some((name) => !report.names.includes(name))
      )
        throw new GuardError(
          'As migrações ou os vínculos do banco de teste precisam ser conferidos.',
        );
    };

    let report = inspect();
    if (mode === 'APLICAR_MIGRACOES' || mode === 'LIMPAR') {
      pause(report.names);
      if (mode === 'LIMPAR') {
        const order = [...configuredSchema]
          .reverse()
          .filter((table) => report.names.includes(table));
        const drops = [...order, 'd1_migrations'].map(
          (table) => `DROP TABLE IF EXISTS ${identifier(table)};`,
        );
        file(['PRAGMA defer_foreign_keys=ON;', ...drops].join('\n'));
      }
      apply();
      report = inspect();
      assertReadySchema(report);
      if (
        mode === 'LIMPAR' &&
        configuredSchema.some(
          (name) => report.counts[name] !== cleanCounts[name],
        )
      )
        throw new GuardError('Ainda há linhas no banco de teste.');
      file(createMarker + '\n' + markReady);
    } else if (mode === 'COPIAR_DO_REAL') {
      assertReadySchema(report);
      const dump = join(scratch, 'origin.sql');
      invoke(['export', 'ORIGEM', '--output', dump, '--skip-confirmation']);
      if (statSync(dump).size > 128 * 1024 * 1024)
        throw new GuardError('A cópia excede o limite deste workflow.');
      const prepared = prepareCopy(readFileSync(dump, 'utf8'));
      rmSync(dump, { force: true });
      pause(report.names);
      file(prepared.sql);
      report = inspect();
      assertReadySchema(report);
      if (
        configuredSchema.some(
          (name) => report.counts[name] !== prepared.counts[name],
        )
      )
        throw new GuardError(
          'As contagens da cópia não conferem. A prévia permanece bloqueada.',
        );
      file(createMarker + '\n' + markReady);
    }
    if (mode !== 'VERIFICAR') report = inspect();
    log(
      JSON.stringify(
        {
          migrations_applied: report.applied.length,
          migrations_pending: migrations.length - report.applied.length,
          foreign_key_violations: report.violations,
          tables: report.counts,
        },
        null,
        2,
      ),
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

async function main() {
  try {
    const env = process.env;
    if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REF !== 'refs/heads/main')
      throw new GuardError('Execute somente pelo workflow manual na main.');
    const account = env.CLOUDFLARE_ACCOUNT_ID;
    const token = env.CLOUDFLARE_API_TOKEN;
    if (!/^[0-9a-f]{32}$/i.test(account ?? '') || !token)
      throw new GuardError(
        'Configure a conta e o segredo no ambiente protegido ambiente-teste.',
      );
    const { experimental_readRawConfig } = await import('wrangler');
    const { rawConfig: config } = experimental_readRawConfig({
      config: 'wrangler.jsonc',
    });
    await runTestEnvironment({
      config,
      requiredId: env.TEST_D1_DATABASE_ID,
      mode: env.TEST_ENV_MODE,
      confirmed: env.TEST_ENV_CONFIRMED === 'true',
      log: console.log,
      identify: async (id) => {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${id}`,
          {
            headers: { Authorization: 'Bearer ' + token },
            redirect: 'error',
            signal: AbortSignal.timeout(30_000),
          },
        );
        if (!response.ok) throw Error('Falha na prechecagem.');
        return (await response.json()).result;
      },
      wrangler: (args, scratch) => {
        const result = spawnSync(
          process.execPath,
          ['./node_modules/wrangler/bin/wrangler.js', 'd1', ...args],
          {
            env: {
              ...env,
              WRANGLER_SEND_METRICS: 'false',
              WRANGLER_LOG_PATH: join(scratch, 'wrangler.log'),
            },
            encoding: 'utf8',
            maxBuffer: 8 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        if (result.status !== 0) throw Error('Falha no comando D1.');
        return result.stdout;
      },
    });
  } catch (error) {
    console.error(
      error instanceof GuardError
        ? error.message
        : 'Etapa não concluída. Confira a configuração, execute VERIFICAR e solicite revisão antes de repetir.',
    );
    process.exitCode = 1;
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
