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
