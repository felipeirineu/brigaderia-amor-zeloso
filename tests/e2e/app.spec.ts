import { expect, test } from '@playwright/test';
const routes = [
  ['clientes', 'Clientes'],
  ['produtos', 'Produtos'],
  ['pedidos', 'Pedidos'],
  ['producao', 'Produção'],
  ['entregas', 'Entregas'],
  ['financeiro', 'Financeiro'],
  ['configuracoes', 'Configurações'],
];
test('navegação, demonstração explícita e foco acessível', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Um cuidado em cada detalhe.',
  );
  await expect(
    page.getByText('Ambiente de demonstração.', { exact: true }),
  ).toBeVisible();
  for (const [slug, title] of routes) {
    await page.goto('/app');
    const link =
      slug === 'configuracoes'
        ? page.getByRole('link', { name: /Ver próximos passos/ })
        : page.locator('main').getByRole('link', { name: new RegExp(title) });
    await link.click();
    await expect(page).toHaveURL(`/app/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('main')).toBeFocused();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  }
});
test('catálogo e login não simulam funcionalidades entregues', async ({
  page,
}) => {
  await page.goto('/catalogo/produto/teste');
  await expect(
    page.getByRole('heading', { name: 'Catálogo indisponível' }),
  ).toBeVisible();
  await page.goto('/login');
  await expect(
    page.getByRole('heading', { name: 'Login ainda não implementado' }),
  ).toBeVisible();
  await expect(page.locator('input')).toHaveCount(0);
});
test('layout cabe em 360px e navegação por teclado possui atalho', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/app');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Pular para o conteúdo' }),
  ).toBeFocused();
  await page.screenshot({
    path: `test-results/dashboard-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test('manifesto e ícones são servidos', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/app');
  expect(manifest.icons).toHaveLength(3);
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok()).toBe(true);
});
test('shell offline somente leitura, sem cache de API ou catálogo', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Validação automatizada de service worker em Chromium; instalação iOS requer dispositivo real.',
  );
  await page.goto('/app');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  await page.evaluate(async () => {
    await fetch('/api/customers');
    await fetch('/catalogo');
  });
  const cachedPaths = await page.evaluate(async () => {
    const keys = await caches.keys();
    const requests = await Promise.all(
      keys.map(async (k) => (await caches.open(k)).keys()),
    );
    return requests.flat().map((r) => new URL(r.url).pathname);
  });
  expect(
    cachedPaths.some((p) => p.startsWith('/api/') || p.startsWith('/catalogo')),
  ).toBe(false);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Um cuidado em cada detalhe.',
  );
  await expect(page.getByRole('status')).toContainText('Sem conexão');
  await page
    .locator('main')
    .getByRole('link', { name: /Clientes/ })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Clientes');
  await context.setOffline(false);
});
