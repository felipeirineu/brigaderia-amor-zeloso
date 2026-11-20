import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

const migrationDir = new URL('../database/migrations/', import.meta.url);
export const migrations = readdirSync(migrationDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

export const omitted = new Set([
  'feedback_contact_profiles',
  'feedback_messages',
  'sessions',
  'login_attempts',
  'push_subscriptions',
  'push_jobs',
  'push_requests',
  'backup_exports',
  'place_cache',
  'route_cache',
  'route_jobs',
  'route_budget',
  'provider_limits',
  'finance_requests',
  'p1_requests',
  'payment_settings',
]);

export function identifier(name) {
  if (!/^[a-z_][a-z_0-9]*$/i.test(name)) throw Error('Identificador inválido.');
  return '"' + name + '"';
}

export const markerTable = 'test_environment';
export const marker = 'brigaderia-amor-zeloso-teste';
export const createMarker = `CREATE TABLE IF NOT EXISTS ${markerTable}(name TEXT PRIMARY KEY CHECK(name='${marker}'));`;
export const markReady = `INSERT OR IGNORE INTO ${markerTable}(name) VALUES('${marker}');`;

export function tables(db) {
  return db
    .prepare(
      "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY name",
    )
    .all()
    .map((row) => row.name);
}

export function setupSchema(db, files = migrations) {
  db.exec('PRAGMA foreign_keys=OFF;');
  for (const name of files) {
    if (!migrations.includes(name)) throw Error('Migração desconhecida.');
    db.exec(readFileSync(new URL(name, migrationDir), 'utf8'));
  }
  db.exec('PRAGMA foreign_keys=ON;');
}

export function tableOrder(db, names) {
  const left = new Set(names);
  const ordered = [];
  while (left.size) {
    const ready = [...left].filter((name) =>
      db
        .prepare(`PRAGMA foreign_key_list(${identifier(name)})`)
        .all()
        .every(({ table }) => table === name || !left.has(table)),
    );
    if (!ready.length) throw Error('Dependências de tabela incompatíveis.');
    for (const name of ready) {
      left.delete(name);
      ordered.push(name);
    }
  }
  return ordered;
}

const literal = (value) => {
  if (value === null) return 'NULL';
  if (typeof value === 'string')
    return `CAST(X'${Buffer.from(value).toString('hex')}' AS TEXT)`;
  if (value instanceof Uint8Array)
    return `X'${Buffer.from(value).toString('hex')}'`;
  if (typeof value === 'bigint' || Number.isFinite(value)) return String(value);
  throw Error('Tipo de dado inválido.');
};

function validate(db) {
  if (db.prepare('PRAGMA foreign_key_check').get())
    throw Error('Existem vínculos quebrados.');
}

export function prepareCopy(snapshot) {
  const db = new DatabaseSync(':memory:');
  const reference = new DatabaseSync(':memory:');
  try {
    setupSchema(reference);
    const names = tables(reference);
    db.exec('PRAGMA foreign_keys=OFF;');
    db.exec(snapshot);
    db.exec('PRAGMA foreign_keys=OFF;');
    const from = db
      .prepare('SELECT name FROM d1_migrations ORDER BY id')
      .all()
      .map(({ name }) => name);
    if (!from.length || from.some((name, i) => name !== migrations[i]))
      throw Error('Histórico de migrações de origem incompatível.');
    if (
      tables(db).some(
        (name) => name !== 'd1_migrations' && !names.includes(name),
      )
    )
      throw Error('Schema de origem desconhecido.');
    for (const name of omitted)
      if (tables(db).includes(name))
        db.exec(`DELETE FROM ${identifier(name)};`);
    for (const name of migrations.slice(from.length))
      db.exec(readFileSync(new URL(name, migrationDir), 'utf8'));

    // Cada telefone fictício tem DDD 00 (inválido) e numeração distinta para
    // respeitar UNIQUE(organization_id,phone). Marcadores sem telefone ficam.
    const contacts = db
      .prepare(
        "SELECT id,organization_id FROM customers WHERE phone LIKE '+%' ORDER BY id",
      )
      .all();
    if (contacts.length > 100_000_000)
      throw Error('Limite de telefones fictícios.');
    const phone = db.prepare(
      'UPDATE customers SET phone=? WHERE organization_id=? AND id=?',
    );
    // Fase intermediária evita colisões até se uma cópia anterior tiver DDD 00.
    for (const row of contacts)
      phone.run('t13:' + row.id, row.organization_id, row.id);
    for (const [i, row] of contacts.entries())
      phone.run(
        '+55009' + String(i).padStart(8, '0'),
        row.organization_id,
        row.id,
      );

    const ordered = tableOrder(reference, names);
    const triggers = reference
      .prepare(
        "SELECT name, sql FROM sqlite_schema WHERE type='trigger' ORDER BY name",
      )
      .all();
    const reset = [...ordered]
      .reverse()
      .map((name) => `DELETE FROM ${identifier(name)};`);
    const statements = [
      'PRAGMA defer_foreign_keys=ON;',
      ...triggers.map(({ name }) => `DROP TRIGGER ${identifier(name)};`),
      ...reset,
    ];
    const counts = {};
    for (const name of ordered) {
      const table = identifier(name);
      const columns = reference
        .prepare(`PRAGMA table_xinfo(${table})`)
        .all()
        .filter(({ hidden }) => hidden === 0)
        .map(({ name }) => identifier(name))
        .join(',');
      // Use somente os padrões técnicos das migrações para tabelas omitidas,
      // inclusive os limitadores vazios de geocodificação e rota.
      const source = omitted.has(name) ? reference : db;
      const select = source.prepare(`SELECT ${columns} FROM ${table}`);
      select.setReadBigInts(true);
      counts[name] = 0;
      for (const row of select.iterate()) {
        statements.push(
          `INSERT INTO ${table}(${columns}) VALUES(${Object.values(row).map(literal).join(',')});`,
        );
        counts[name]++;
      }
    }
    statements.push(...triggers.map(({ sql }) => sql + ';'));
    validate(db);
    // Ensaiar com o schema oficial antes de escrever no ambiente remoto.
    const sql = statements.join('\n');
    reference.exec('BEGIN;');
    reference.exec(sql);
    validate(reference);
    reference.exec('COMMIT;');
    return { sql, counts };
  } finally {
    db.close();
    reference.close();
  }
}

export function expectedSchema() {
  const db = new DatabaseSync(':memory:');
  try {
    setupSchema(db);
    return Object.fromEntries(
      tableOrder(db, tables(db)).map((name) => [
        name,
        db.prepare(`SELECT COUNT(*) AS count FROM ${identifier(name)}`).get()
          .count,
      ]),
    );
  } finally {
    db.close();
  }
}
