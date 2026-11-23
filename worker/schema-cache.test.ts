import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSchemaCache,
  isSchemaQuery,
  withSchemaCache,
} from './schema-cache';

function fakeDb() {
  let calls = 0;
  const stmt = (sql: string, binds: unknown[] = []): D1PreparedStatement =>
    ({
      bind: (...v: unknown[]) => stmt(sql, v),
      first: async () => ({ n: ++calls, sql, binds }),
      all: async () => ({ results: [{ n: ++calls }], success: true, meta: {} }),
      run: async () => ({ results: [], success: true, meta: {} }),
      raw: async () => [[++calls]],
    }) as unknown as D1PreparedStatement;
  const db = {
    prepare: (sql: string) => stmt(sql),
    batch: async (s: unknown[]) => s,
  } as unknown as D1Database;
  return { db, calls: () => calls };
}

describe('schema-cache', () => {
  beforeEach(() => clearSchemaCache());

  it('reconhece só consultas de estrutura', () => {
    expect(
      isSchemaQuery("SELECT COUNT(*) n FROM sqlite_schema WHERE type='table'"),
    ).toBe(true);
    expect(
      isSchemaQuery(
        "SELECT (SELECT COUNT(*) FROM pragma_table_info('orders')) AS n",
      ),
    ).toBe(true);
    expect(
      isSchemaQuery(
        'SELECT s.name FROM sqlite_schema s JOIN pragma_table_xinfo(s.name) p',
      ),
    ).toBe(true);
    expect(isSchemaQuery('SELECT * FROM orders WHERE id=?')).toBe(false);
    expect(isSchemaQuery('SELECT 1 FROM sqlite_schema s JOIN orders o')).toBe(
      false,
    );
    expect(isSchemaQuery('UPDATE push_jobs SET state=1')).toBe(false);
  });

  it('guarda a resposta de estrutura por um tempo e depois pergunta de novo', async () => {
    let t = 0;
    const f = fakeDb();
    const db = withSchemaCache(f.db, 60, () => t)!;
    const sql = 'SELECT 1 FROM sqlite_schema WHERE name=?';
    await db.prepare(sql).bind('a').first();
    await db.prepare(sql).bind('a').first();
    expect(f.calls()).toBe(1);
    await db.prepare(sql).bind('b').first();
    expect(f.calls()).toBe(2);
    t = 61_000;
    await db.prepare(sql).bind('a').first();
    expect(f.calls()).toBe(3);
  });

  it('nunca guarda consultas de dados e desliga com 0 segundos', async () => {
    const f = fakeDb();
    const db = withSchemaCache(f.db, 900)!;
    await db.prepare('SELECT * FROM orders').first();
    await db.prepare('SELECT * FROM orders').first();
    expect(f.calls()).toBe(2);
    expect(withSchemaCache(f.db, 0)).toBe(f.db);
  });
});
