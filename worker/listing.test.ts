import { expect, it, vi } from 'vitest';
import { childrenByParent } from './listing';
it('200 pais usam 3 consultas de filhos, no máximo 91 bindings e filtro da organização', async () => {
  const ids = Array.from({ length: 200 }, () => crypto.randomUUID());
  const calls: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare: vi.fn((sql: string) => ({
      bind: (...args: unknown[]) => ({
        all: async () => {
          calls.push({ sql, args });
          return {
            results: args
              .slice(1)
              .map((id) => ({
                id: crypto.randomUUID(),
                product_id: id,
                organization_id: args[0],
              })),
          };
        },
      }),
    })),
  } as unknown as D1Database;
  const result = await childrenByParent(db, 'demo-org', 'products', ids);
  expect(result.size).toBe(200);
  expect(calls).toHaveLength(3);
  for (const call of calls) {
    expect(call.sql).toContain('organization_id=?');
    expect(call.args[0]).toBe('demo-org');
    expect(call.args.length).toBeLessThanOrEqual(91);
  }
});
it('nenhum pai não consulta tabela de filhos', async () => {
  const prepare = vi.fn();
  await childrenByParent(
    { prepare } as unknown as D1Database,
    'demo-org',
    'orders',
    [],
  );
  expect(prepare).not.toHaveBeenCalled();
});
