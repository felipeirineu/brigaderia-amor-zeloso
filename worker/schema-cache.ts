/**
 * Cache das consultas que só leem a estrutura do banco (sqlite_schema e
 * pragma_*). O app pergunta "este recurso existe?" em toda tela e a cada
 * rodada do agendador; cada pergunta lê o catálogo inteiro e, em 22/11, isso
 * estourou o limite diário gratuito de 5 milhões de linhas lidas do D1.
 * A estrutura só muda com migração: guardar a resposta por alguns minutos
 * (por isolate) corta essas leituras sem tocar em dados. Depois de aplicar
 * uma migração, o recurso novo aparece em até SCHEMA_CACHE_SECONDS.
 */
const SCHEMA_SOURCE = /^(sqlite_schema|sqlite_master|pragma_\w+)$/i;

export function isSchemaQuery(sql: string) {
  const sources = [...sql.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z_]\w*)/gi)].map(
    (m) => m[1],
  );
  return sources.length > 0 && sources.every((s) => SCHEMA_SOURCE.test(s));
}

type Entry = { at: number; value: unknown };
const cache = new Map<string, Entry>();

/** SCHEMA_CACHE_SECONDS (padrão 900 = 15 min; 0 desliga). */
export function schemaCacheSeconds(env: { SCHEMA_CACHE_SECONDS?: string }) {
  const n = Number(env.SCHEMA_CACHE_SECONDS ?? '900');
  return Number.isFinite(n) && n >= 0 ? n : 900;
}

export function clearSchemaCache() {
  cache.clear();
}

export function withSchemaCache(
  db: D1Database | undefined,
  seconds = 900,
  now: () => number = Date.now,
): D1Database | undefined {
  if (!db || seconds <= 0) return db;
  const ttl = seconds * 1000;
  const remember = async <T>(key: string, load: () => Promise<T>) => {
    const hit = cache.get(key);
    if (hit && now() - hit.at < ttl) return hit.value as T;
    const value = await load();
    cache.set(key, { at: now(), value });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return value;
  };
  const wrap = (
    stmt: D1PreparedStatement,
    sql: string,
    binds: unknown[],
  ): D1PreparedStatement => {
    const key = (kind: string) =>
      kind + '|' + sql + '|' + JSON.stringify(binds);
    return new Proxy(stmt, {
      get(target, prop) {
        if (prop === '__inner') return target;
        if (prop === 'bind')
          return (...values: unknown[]) =>
            wrap(target.bind(...values), sql, values);
        if (prop === 'first')
          return (column?: string) =>
            remember(key('first:' + (column ?? '')), () =>
              column === undefined ? target.first() : target.first(column),
            );
        if (prop === 'all')
          return () => remember(key('all'), () => target.all());
        if (prop === 'raw')
          return (options?: { columnNames?: boolean }) =>
            remember(key('raw:' + JSON.stringify(options ?? {})), () =>
              target.raw(options as never),
            );
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
  return new Proxy(db, {
    get(target, prop) {
      if (prop === 'prepare')
        return (sql: string) => {
          const stmt = target.prepare(sql);
          return isSchemaQuery(sql) ? wrap(stmt, sql, []) : stmt;
        };
      if (prop === 'batch')
        return (stmts: D1PreparedStatement[]) =>
          target.batch(
            stmts.map(
              (s) =>
                (s as unknown as { __inner?: D1PreparedStatement }).__inner ??
                s,
            ),
          );
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
