import { expect, it, vi } from 'vitest';
import pages from './pages';

it('Pages nega acesso privado sem servir o HTML como resposta da API', async () => {
  const assets = vi.fn();
  const result = await pages.fetch(
    new Request('https://example.test/api/customers'),
    { ASSETS: { fetch: assets } },
  );
  expect(result.status).toBe(401);
  expect(result.headers.get('Cache-Control')).toBe('no-store');
  expect(assets).not.toHaveBeenCalled();
});
it('Pages mantém catálogo da API indisponível', async () => {
  const result = await pages.fetch(
    new Request('https://example.test/api/catalogo'),
    {
      ASSETS: { fetch: vi.fn() },
      PUBLIC_CATALOG_ENABLED: 'true',
    },
  );
  expect(result.status).toBe(404);
});
it('Pages encaminha páginas e assets ao serviço estático', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('shell demo'));
  const result = await pages.fetch(
    new Request('https://example.test/app/clientes'),
    { ASSETS: { fetch } },
  );
  expect(await result.text()).toBe('shell demo');
  expect(fetch).toHaveBeenCalledOnce();
});

it('prévias falham fechadas mesmo se receberem variáveis ou binding de produção', async () => {
  const ASSETS = { fetch: vi.fn() };
  const prepare = vi
    .fn()
    .mockReturnValue({ first: vi.fn().mockResolvedValue(null) });
  const DB = { prepare } as unknown as D1Database;
  const preview = new Request(
    'https://codex-branch.brigaderia-amor-zeloso.pages.dev/api/access/start',
  );
  expect(
    (await pages.fetch(preview, { ASSETS, DB, APP_ENVIRONMENT: 'producao' }))
      .status,
  ).toBe(503);
  expect(prepare).not.toHaveBeenCalled();
  expect(
    (await pages.fetch(preview, { ASSETS, DB, APP_ENVIRONMENT: 'teste' }))
      .status,
  ).toBe(503);
  expect(prepare).toHaveBeenCalledOnce();
  expect(prepare.mock.calls[0][0]).toContain('FROM test_environment');
  expect(
    (await pages.fetch(preview, { ASSETS, APP_ENVIRONMENT: 'teste' })).status,
  ).toBe(503);
  expect(
    (
      await pages.fetch(
        new Request('https://brigaderia-amor-zeloso.pages.dev/api/health'),
        { ASSETS, DB, APP_ENVIRONMENT: 'teste' },
      )
    ).status,
  ).toBe(503);
});

it('prévia preparada passa pela autenticação e produção continua respondendo', async () => {
  const ASSETS = { fetch: vi.fn() };
  const prepare = vi
    .fn()
    .mockReturnValue({ first: vi.fn().mockResolvedValue({ ready: 1 }) });
  const DB = { prepare } as unknown as D1Database;
  expect(
    (
      await pages.fetch(
        new Request(
          'https://teste.brigaderia-amor-zeloso.pages.dev/api/customers',
        ),
        { ASSETS, DB, APP_ENVIRONMENT: 'teste' },
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await pages.fetch(
        new Request('https://brigaderia-amor-zeloso.pages.dev/api/health'),
        { ASSETS, DB, APP_ENVIRONMENT: 'producao' },
      )
    ).status,
  ).toBe(200);
  expect(prepare).toHaveBeenCalledOnce();
});
