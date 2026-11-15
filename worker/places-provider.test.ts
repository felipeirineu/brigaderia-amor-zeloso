import { afterEach, it, expect, vi } from 'vitest';
import { reversePlace, searchPlaces } from './places-provider';
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
it('Photon prioriza resultados perto da base cadastrada (arredondada)', async () => {
  const base = JSON.stringify({ latitude: -3.731862, longitude: -38.526669 });
  let calls = 0;
  const db = {
    prepare: (sql: string) => ({
      bind: () => ({
        first: async () =>
          sql.includes('company_places') ? { data: base } : (calls++, null),
        run: async () => ({ meta: { changes: 1 } }),
      }),
    }),
    batch: async () => [],
  } as unknown as D1Database;
  const fetcher = vi.fn(async () => Response.json({ features: [] }));
  vi.stubGlobal('fetch', fetcher);
  await searchPlaces(db, 'org-demo', 'Shopping DEMONSTRAÇÃO');
  const url = (fetcher.mock.calls as unknown as [URL][])[0][0];
  expect(url.searchParams.get('lat')).toBe('-3.73');
  expect(url.searchParams.get('lon')).toBe('-38.53');
  expect(calls).toBe(1);
});
const quietDb = () =>
  ({
    prepare: () => ({
      bind: () => ({
        first: async () => null,
        run: async () => ({ meta: { changes: 1 } }),
      }),
    }),
    batch: async () => [],
  }) as unknown as D1Database;
const feature = (properties: Record<string, string>) => ({
  geometry: { coordinates: [-34.85, -7.12] },
  properties,
});
it('busca limita à Paraíba: envia a área e descarta outros estados', async () => {
  const fetcher = vi.fn(async () =>
    Response.json({
      features: [
        feature({ name: 'Shopping SP DEMONSTRAÇÃO', state: 'São Paulo' }),
        feature({ name: 'Shopping PB DEMONSTRAÇÃO', state: 'Paraíba' }),
        feature({ name: 'Sem estado DEMONSTRAÇÃO' }),
      ],
    }),
  );
  vi.stubGlobal('fetch', fetcher);
  const found = await searchPlaces(quietDb(), 'org-demo', 'Shopping');
  expect(found.map((p) => p.name)).toEqual([
    'Shopping PB DEMONSTRAÇÃO',
    'Sem estado DEMONSTRAÇÃO',
  ]);
  const url = (fetcher.mock.calls as unknown as [URL][])[0][0];
  expect(url.searchParams.get('bbox')).toBe('-38.9,-8.4,-34.7,-5.9');
});
it('localização: rua vem de "name" e prefere o resultado com rua', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        features: [
          feature({ name: 'Praça DEMONSTRAÇÃO', osm_key: 'leisure' }),
          feature({
            name: 'Rua DEMONSTRAÇÃO',
            osm_key: 'highway',
            type: 'street',
            city: 'Cidade DEMONSTRAÇÃO',
            state: 'Paraíba',
          }),
        ],
      }),
    ),
  );
  const found = await reversePlace(quietDb(), 'org-demo', -7.12, -34.85);
  expect(found?.street).toBe('Rua DEMONSTRAÇÃO');
  expect(found?.city).toBe('Cidade DEMONSTRAÇÃO');
});
