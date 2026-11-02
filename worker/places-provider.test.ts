import { afterEach, it, expect, vi } from 'vitest';
import { searchPlaces } from './places-provider';
afterEach(() => vi.unstubAllGlobals());
for (const [label, configured, expected] of [
  ['neutro', undefined, 'BrigaderiaGestao/1.0'],
  [
    'configurado',
    'Empresa/1.0 (+https://empresa.example.test)',
    'Empresa/1.0 (+https://empresa.example.test)',
  ],
  ['inválido', 'Empresa\r\nOutra: coisa', 'BrigaderiaGestao/1.0'],
]) {
  it('Photon envia User-Agent ' + label, async () => {
    const query = {
      bind: () => query,
      first: async () => null,
      run: async () => ({ meta: { changes: 1 } }),
    };
    const db = {
      prepare: () => query,
      batch: async () => [],
    } as unknown as D1Database;
    const fetcher = vi.fn(async () => Response.json({ features: [] }));
    vi.stubGlobal('fetch', fetcher);
    await searchPlaces(
      db,
      'org-demo',
      'Estabelecimento DEMONSTRAÇÃO',
      configured,
    );
    const call = fetcher.mock.calls as unknown as [URL, RequestInit][];
    expect(call[0][0].hostname).toBe('photon.komoot.io');
    expect(new Headers(call[0][1].headers).get('User-Agent')).toBe(expected);
  });
}
