import { HttpError, type Actor } from './security';
import { ownerOnly, fileResponse } from './p1-common';
import { databaseTables } from './database-tables';
const quote = (name: string) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name))
    throw new HttpError(409, 'Schema não reconhecido.');
  return '"' + name + '"';
};
interface Column {
  table_name: string;
  name: string;
  type: string;
  hidden: number;
}
interface Foreign {
  table_name: string;
  parent: string;
  column_name: string;
  parent_column: string;
}
interface Schema {
  name: string;
  type: string;
  tbl_name: string;
  sql: string;
}
function hex(b: Uint8Array) {
  return Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('');
}
function literal(v: unknown): string {
  if (v === null) return 'NULL';
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v))
      throw new HttpError(409, 'Número fora do limite de exportação.');
    return String(v);
  }
  if (typeof v === 'string')
    return `CAST(X'${hex(new TextEncoder().encode(v))}' AS TEXT)`;
  if (
    v &&
    typeof v === 'object' &&
    '__blob_hex' in v &&
    typeof v.__blob_hex === 'string' &&
    /^[a-f0-9]*$/i.test(v.__blob_hex)
  )
    return `X'${v.__blob_hex}'`;
  throw new HttpError(409, 'Tipo fora do limite de exportação.');
}
function orderTables(names: string[], foreign: Foreign[]) {
  const sorted: string[] = [],
    left = new Set(names);
  while (left.size) {
    const ready = [...left].filter((n) =>
      foreign
        .filter(
          (f) =>
            f.table_name === n && f.parent !== n && names.includes(f.parent),
        )
        .every((f) => sorted.includes(f.parent)),
    );
    if (!ready.length)
      throw new HttpError(
        409,
        'Dependência circular: use o backup administrativo do D1.',
      );
    for (const n of ready) {
      sorted.push(n);
      left.delete(n);
    }
  }
  return sorted;
}
function orderRows(rows: Record<string, unknown>[], self: Foreign[]) {
  if (!self.length) return rows;
  const byId = new Map(rows.map((r, i) => [r.id, i])),
    dependencies = rows.map(
      (r) =>
        new Set(
          self
            .filter(
              (f) =>
                f.parent_column === 'id' &&
                r[f.column_name] !== null &&
                byId.has(r[f.column_name]),
            )
            .map((f) => byId.get(r[f.column_name])!),
        ),
    ),
    children = rows.map(() => [] as number[]);
  dependencies.forEach((d, i) => d.forEach((p) => children[p].push(i)));
  const ready = dependencies
      .map((d, i) => (d.size === 0 ? i : -1))
      .filter((i) => i >= 0),
    out: Record<string, unknown>[] = [];
  for (let k = 0; k < ready.length; k++) {
    const i = ready[k];
    out.push(rows[i]);
    for (const j of children[i]) {
      dependencies[j].delete(i);
      if (!dependencies[j].size) ready.push(j);
    }
  }
  if (out.length !== rows.length)
    throw new HttpError(
      409,
      'Ciclo de eventos: use backup administrativo do D1.',
    );
  return out;
}
/** D1 aceita no máximo cinco termos por SELECT composto; a árvore preserva um único snapshot. */
function unionTree(selects: string[], prefix: string, distinct = false) {
  const ctes: string[] = [];
  let nodes = selects.length ? selects : ['SELECT NULL AS user_id WHERE 0'];
  let serial = 0;
  while (nodes.length > 5) {
    const next: string[] = [];
    for (let i = 0; i < nodes.length; i += 5) {
      const name = prefix + '_' + serial++;
      ctes.push(
        name +
          ' AS MATERIALIZED (' +
          nodes.slice(i, i + 5).join(distinct ? ' UNION ' : ' UNION ALL ') +
          ' LIMIT 10001)',
      );
      next.push('SELECT * FROM ' + name);
    }
    nodes = next;
  }
  const name = prefix + '_root';
  ctes.push(
    name +
      ' AS MATERIALIZED (' +
      nodes.join(distinct ? ' UNION ' : ' UNION ALL ') +
      ' LIMIT 10001)',
  );
  return { ctes, source: 'SELECT * FROM ' + name };
}
/** Uma consulta UNION captura todas as linhas no mesmo snapshot, sem N+1. */
export async function backup(db: D1Database, a: Actor) {
  ownerOnly(a);
  const org = a.organization_id;
  const schema = (
    await db
      .prepare(
        "SELECT name,type,tbl_name,sql FROM sqlite_schema WHERE sql IS NOT NULL AND type IN('table','index','trigger') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
      )
      .all<Schema>()
  ).results;
  const names = schema.filter((s) => s.type === 'table').map((s) => s.name),
    known = new Set<string>([...databaseTables, 'd1_migrations']);
  if (names.some((n) => !known.has(n)))
    throw new HttpError(
      409,
      'Schema mudou. Atualize o exportador antes de baixar um backup completo.',
    );
  const columns = (
    await db
      .prepare(
        "SELECT s.name table_name,p.name,p.type,p.hidden FROM sqlite_schema s JOIN pragma_table_xinfo(s.name) p WHERE s.type='table' AND s.name IN(SELECT value FROM json_each(?))",
      )
      .bind(JSON.stringify(names))
      .all<Column>()
  ).results;
  const foreign = (
    await db
      .prepare(
        'SELECT s.name table_name,f."table" parent,f."from" column_name,f."to" parent_column FROM sqlite_schema s JOIN pragma_foreign_key_list(s.name) f WHERE s.type=\'table\' AND s.name IN(SELECT value FROM json_each(?))',
      )
      .bind(JSON.stringify(names))
      .all<Foreign>()
  ).results;
  const business = names.filter(
      (n) =>
        columns.some(
          (c) => c.table_name === n && c.name === 'organization_id',
        ) &&
        !['sessions', 'place_cache', 'route_cache', 'route_jobs'].includes(n),
    ),
    userRefs = foreign
      .filter((f) => business.includes(f.table_name) && f.parent === 'users')
      .map(
        (f) =>
          `SELECT ${quote(f.column_name)} AS user_id FROM ${quote(f.table_name)} WHERE organization_id=?1`,
      ),
    dataTables = [
      'organizations',
      'users',
      ...business,
      ...(names.includes('d1_migrations') ? ['d1_migrations'] : []),
    ];
  const users = unionTree(userRefs, 'user_ids', true);
  const selections = dataTables.map((n) => {
    const cols = columns.filter((c) => c.table_name === n && !c.hidden);
    const obj = cols
      .map(
        (c) =>
          `'${c.name}',${c.type.toUpperCase() === 'BLOB' ? `CASE WHEN ${quote(c.name)} IS NULL THEN NULL ELSE json_object('__blob_hex',hex(${quote(c.name)})) END` : quote(c.name)}`,
      )
      .join(',');
    const where =
      n === 'organizations'
        ? 'id=?1'
        : n === 'users'
          ? `id IN(${users.source})`
          : n === 'd1_migrations'
            ? '1'
            : 'organization_id=?1';
    return `SELECT '${n}' table_name,json_object(${obj}) row_data FROM ${quote(n)} WHERE ${where}`;
  });
  const tree = unionTree(selections, 'export_data');
  const exportSQL =
    'WITH ' + [...users.ctes, ...tree.ctes].join(',') + ' ' + tree.source;
  const result = await db.batch([
    db
      .prepare(
        "INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) VALUES(?,?,?,'backup.export_requested',?)",
      )
      .bind(crypto.randomUUID(), org, a.user_id, org),
    db.prepare(exportSQL).bind(org),
  ]);
  const exported = result[1].results as {
    table_name: string;
    row_data: string;
  }[];
  if (
    exported.length > 10000 ||
    exported.reduce((n, r) => n + r.row_data.length, 0) > 4 * 1024 * 1024
  )
    throw new HttpError(
      409,
      'Backup excede 10 mil linhas ou 4 MB. Use o exportador administrativo do D1.',
    );
  const sorted = orderTables(names, foreign),
    out = [
      '-- Backup privado de uma organização. Sem sessões, tokens de login ou caches.',
      '-- Contém dados pessoais, chaves Pix cadastradas, fotos e autorizações; guarde fora do Git/chat.',
      'PRAGMA defer_foreign_keys=ON;',
    ];
  for (const n of sorted) {
    out.push(schema.find((s) => s.type === 'table' && s.name === n)!.sql + ';');
    const rows = exported
      .filter((r) => r.table_name === n)
      .map((r) => JSON.parse(r.row_data) as Record<string, unknown>);
    for (const r of orderRows(
      rows,
      foreign.filter((f) => f.table_name === n && f.parent === n),
    )) {
      const cols = Object.keys(r),
        line = `INSERT INTO ${quote(n)}(${cols.map(quote).join(',')}) VALUES(${cols.map((c) => literal(r[c])).join(',')});`;
      if (line.length > 95000)
        throw new HttpError(
          409,
          'Registro excede limite do importador D1; use exportação administrativa.',
        );
      out.push(line);
    }
  }
  if (names.includes('provider_limits'))
    out.push("INSERT INTO provider_limits(id,next_at) VALUES('photon',0);");
  for (const s of schema.filter((s) => s.type !== 'table'))
    out.push(s.sql + ';');
  out.push('PRAGMA foreign_key_check;');
  return fileResponse(
    out.join('\n') + '\n',
    'application/sql; charset=utf-8',
    'backup-gestao-' + new Date().toISOString().slice(0, 10) + '.sql',
  );
}
