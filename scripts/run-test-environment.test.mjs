import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { experimental_readRawConfig, unstable_readConfig } from 'wrangler';
import {
  runTestEnvironment,
  validateTargets,
} from './run-test-environment.mjs';
import { migrations, setupSchema, omitted } from './test-environment-data.mjs';

const { rawConfig } = experimental_readRawConfig({ config: 'wrangler.jsonc' });
const testId = '10000000-0000-0000-0000-000000000013';
const config = structuredClone(rawConfig);
config.env.preview.d1_databases[0].database_id = testId;
const sourceName = config.d1_databases[0].database_name;
const targetName = config.env.preview.d1_databases[0].database_name;

function initialize(db, files) {
  setupSchema(db, files);
  db.exec(
    'CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);',
  );
  const add = db.prepare('INSERT INTO d1_migrations(name) VALUES(?)');
  for (const name of files) add.run(name);
}

function snapshot() {
  const db = new DatabaseSync(':memory:');
  try {
    initialize(db, migrations.slice(0, -1));
    return (
      db
        .prepare(
          "SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*'",
        )
        .all()
        .map(({ sql }) => sql + ';')
        .join('\n') +
      `
      INSERT INTO d1_migrations(name) VALUES ${migrations
        .slice(0, -1)
        .map((name) => "('" + name + "')")
        .join(',')};
      INSERT INTO organizations(id,name) VALUES('demo', 'Organização DEMONSTRAÇÃO');
      INSERT INTO users(id,identity_subject,email) VALUES('owner','demo-identity','owner@example.test');
      INSERT INTO authorized_emails(email,organization_id,role) VALUES('owner@example.test','demo','owner');
      INSERT INTO memberships(organization_id,user_id,role) VALUES('demo','owner','owner');
      INSERT INTO sessions(token_hash,organization_id,user_id,expires_at) VALUES('SENTINELA-SESSAO','demo','owner',100);
      INSERT INTO place_cache(organization_id,query_hash,data,expires_at) VALUES('demo','demo','SENTINELA-CACHE',100);
      UPDATE provider_limits SET next_at=197 WHERE id='photon';
      INSERT INTO customers(id,organization_id,name,phone) VALUES
        ('a','demo','Cliente DEMONSTRAÇÃO A','+5511900000001'),
        ('b','demo','Contato DEMONSTRAÇÃO B','+5511900000002'),
        ('c','demo','Cliente DEMONSTRAÇÃO sem telefone','sem:c');
    `
    );
  } finally {
    db.close();
  }
}

const report = (results) => JSON.stringify([{ success: true, results }]);

function simulated(db, failFile = false) {
  const directories = new Set();
  const commands = [];
  const log = vi.fn();
  const identify = vi.fn(async (id) => ({
    uuid: id,
    name: id === testId ? targetName : sourceName,
  }));
  const wrangler = vi.fn((args, scratch) => {
    directories.add(scratch);
    commands.push(args);
    if (args[0] === 'export') {
      expect(args[1]).toBe('ORIGEM');
      writeFileSync(args[args.indexOf('--output') + 1], snapshot(), {
        mode: 0o600,
      });
      return 'Saída SECRET-DEMONSTRAÇÃO capturada';
    }
    if (args[0] === 'migrations') {
      expect(args[2]).toBe('DB');
      initialize(db, migrations);
      return 'Saída SECRET-DEMONSTRAÇÃO capturada';
    }
    expect(args[1]).toBe('DB');
    if (args.includes('--file')) {
      if (failFile) throw Error('SENTINELA-SAIDA-ERRO');
      const sql = readFileSync(args[args.indexOf('--file') + 1], 'utf8');
      db.exec('BEGIN;');
      try {
        db.exec(sql);
        db.exec('COMMIT;');
      } catch (error) {
        db.exec('ROLLBACK;');
        throw error;
      }
      return '';
    }
    return report(db.prepare(args[args.indexOf('--command') + 1]).all());
  });
  return {
    config,
    requiredId: testId,
    identify,
    wrangler,
    log,
    directories,
    commands,
  };
}

test('Wrangler lê o marcador de prévia sem montar o binding real e mantém as flags', () => {
  const preview = unstable_readConfig({
    config: 'wrangler.jsonc',
    env: 'preview',
  });
  expect(preview.d1_databases).toHaveLength(1);
  expect(preview.d1_databases[0].database_name).toBe(targetName);
  expect(preview.d1_databases[0].database_id).not.toBe(
    rawConfig.d1_databases[0].database_id,
  );
  expect(rawConfig.env.preview.vars).toEqual({
    ...rawConfig.vars,
    APP_ENVIRONMENT: 'teste',
  });
  expect(rawConfig.vars.PUBLIC_CATALOG_ENABLED).toBe('false');
  expect(Object.keys(preview.vars).some((key) => key.startsWith('VAPID'))).toBe(
    false,
  );
});

test('recusa marcador, mesmo ID, configuração divergente e modos sem confirmação', async () => {
  const invalid = structuredClone(config);
  invalid.env.preview.d1_databases[0].database_id =
    invalid.d1_databases[0].database_id;
  expect(() =>
    validateTargets(invalid, invalid.d1_databases[0].database_id),
  ).toThrow(/distintos/);
  if (
    rawConfig.env.preview.d1_databases[0].database_id === 'PREENCHER_ID_TESTE'
  )
    expect(() => validateTargets(rawConfig, testId)).toThrow(/Preencha/);
  expect(() => validateTargets(config, 'divergente')).toThrow(
    /TEST_D1_DATABASE_ID/,
  );
  const mock = {
    config,
    requiredId: testId,
    identify: vi.fn(),
    wrangler: vi.fn(),
    log: vi.fn(),
  };
  for (const mode of ['COPIAR_DO_REAL', 'APLICAR_MIGRACOES', 'LIMPAR'])
    await expect(runTestEnvironment({ ...mock, mode })).rejects.toThrow(
      /confirmação/,
    );
  expect(mock.identify).not.toHaveBeenCalled();
  expect(mock.wrangler).not.toHaveBeenCalled();
  mock.identify.mockResolvedValue({ uuid: testId, name: sourceName });
  await expect(runTestEnvironment(mock)).rejects.toThrow(/identidade do banco/);
  expect(mock.wrangler).not.toHaveBeenCalled();
});

test('cópia limpa conteúdo antigo, adapta migração da origem, omite tokens e troca telefones', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    initialize(db, migrations);
    db.exec(
      "INSERT INTO organizations(id,name) VALUES('old','Apagar DEMONSTRAÇÃO');",
    );
    const mock = simulated(db);
    await runTestEnvironment({
      ...mock,
      mode: 'COPIAR_DO_REAL',
      confirmed: true,
    });
    const phones = db
      .prepare('SELECT phone FROM customers ORDER BY id')
      .all()
      .map((r) => r.phone);
    expect(phones).toEqual(['+5500900000000', '+5500900000001', 'sem:c']);
    expect(db.prepare('SELECT name FROM organizations').get().name).toBe(
      'Organização DEMONSTRAÇÃO',
    );
    expect(db.prepare('SELECT name FROM test_environment').get().name).toBe(
      targetName,
    );
    expect(
      db.prepare('SELECT COUNT(*) AS n FROM backup_reminders').get().n,
    ).toBe(1);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    for (const name of omitted)
      expect(db.prepare('SELECT COUNT(*) AS n FROM ' + name).get().n).toBe(
        ['provider_limits', 'route_budget'].includes(name) ? 1 : 0,
      );
    expect(
      db.prepare("SELECT next_at FROM provider_limits WHERE id='photon'").get()
        .next_at,
    ).toBe(0);
    const printed = mock.log.mock.calls.flat().join('\n');
    expect(JSON.parse(printed).tables.customers).toBe(3);
    expect(printed).not.toMatch(
      /DEMONSTRAÇÃO|SENTINELA|example\.test|5500|10000000-/,
    );
    expect([...mock.directories].every((path) => !existsSync(path))).toBe(true);
  } finally {
    db.close();
  }
});

test('verificação é somente leitura; limpar reaplica migrações e mantém banco vazio', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    initialize(db, migrations);
    db.exec(
      "INSERT INTO organizations(id,name) VALUES('old','Apagar DEMONSTRAÇÃO');",
    );
    const mock = simulated(db);
    await runTestEnvironment(mock);
    expect(
      mock.commands.every(
        (cmd) =>
          cmd[0] === 'execute' &&
          cmd.includes('--command') &&
          !cmd.some((part) => part.startsWith('DELETE')),
      ),
    ).toBe(true);
    await runTestEnvironment({ ...mock, mode: 'LIMPAR', confirmed: true });
    expect(db.prepare('SELECT COUNT(*) AS n FROM organizations').get().n).toBe(
      0,
    );
    expect(db.prepare('SELECT COUNT(*) AS n FROM d1_migrations').get().n).toBe(
      migrations.length,
    );
    expect(
      db.prepare('SELECT COUNT(*) AS n FROM test_environment').get().n,
    ).toBe(1);
    expect([...mock.directories].every((path) => !existsSync(path))).toBe(true);
  } finally {
    db.close();
  }
});

test('erro de importação remove temporários e mantém prévia fechada, sem imprimir saída', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    initialize(db, migrations);
    db.exec(
      "CREATE TABLE test_environment(name TEXT); INSERT INTO test_environment VALUES('brigaderia-amor-zeloso-teste');",
    );
    const mock = simulated(db, true);
    await expect(
      runTestEnvironment({ ...mock, mode: 'COPIAR_DO_REAL', confirmed: true }),
    ).rejects.toThrow();
    expect(
      db.prepare('SELECT COUNT(*) AS n FROM test_environment').get().n,
    ).toBe(0);
    expect([...mock.directories].every((path) => !existsSync(path))).toBe(true);
    expect(mock.log).not.toHaveBeenCalled();
  } finally {
    db.close();
  }
});
