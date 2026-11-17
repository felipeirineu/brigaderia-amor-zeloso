import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { fortalezaDay } from '../../shared/workday.ts';

async function pageCleanup(ctx) {
  for (const page of ctx.pages()) await page.unrouteAll({ behavior: 'wait' });
  await ctx.close();
}

test('T3c carregamento inicial, liberação e atualização sem apagar conteúdo', async ({
  browser,
}, testInfo) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
  });
  // Interceptação determinística das APIs neste teste; os testes PWA mantêm o SW ativo.
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  const releases = [];
  try {
    const { makeOrder } = await demoProject(t);
    await makeOrder(fortalezaDay() + 'T14:00:00-03:00');
    const login = await ctx.newPage();
    await login.goto(t.url + '/api/access/start');
    await login.close();
    for (const [name, path, endpoint, content] of [
      ['hoje', '/gestao', '**/api/today?**', '.order-card'],
      [
        'clientes',
        '/gestao/clientes',
        '**/api/customers?**',
        '.customer-records article',
      ],
      [
        'pedidos',
        '/gestao/pedidos',
        '**/api/orders?**',
        '.record-list article',
      ],
    ]) {
      const page = await ctx.newPage();
      let release;
      let reached = false;
      const gate = new Promise((resolve) => {
        release = resolve;
        releases.push(resolve);
      });
      await page.route(endpoint, async (route) => {
        reached = true;
        await gate;
        await route.continue();
      });
      await page.goto(t.url + path, { waitUntil: 'domcontentloaded' });
      await expect.poll(() => reached).toBe(true);
      if (process.env.T3C_STAGE === 'antes') {
        await page.screenshot({
          scale: 'css',
          path: `docs/colaboracao/capturas/t3c-antes-${name}.png`,
        });
      } else {
        const skeleton = page.locator('.skeleton-region').first();
        await expect(skeleton).toBeVisible();
        await expect(skeleton).toHaveAttribute('aria-busy', 'true');
        await expect(skeleton).toContainText('Carregando');
        await expect(skeleton.locator('[role="status"]')).toHaveCount(0);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        expect(
          await skeleton
            .locator('.skeleton-block')
            .first()
            .evaluate((el) => getComputedStyle(el).animationName),
        ).toBe('none');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        if (
          process.env.T3C_STAGE === 'depois' &&
          testInfo.project.name === 'chromium-mobile'
        ) {
          if (name === 'pedidos') await skeleton.scrollIntoViewIfNeeded();
          await page.screenshot({
            scale: 'css',
            path: `docs/colaboracao/capturas/t3c-depois-${name}.png`,
          });
        }
      }
      release();
      await expect(page.locator(content).first()).toBeVisible();
      await page.unroute(endpoint);
      if (process.env.T3C_STAGE === 'antes') continue;
      let releaseRefresh;
      let reachedRefresh = false;
      const refreshGate = new Promise((resolve) => {
        releaseRefresh = resolve;
        releases.push(resolve);
      });
      await page.route(endpoint, async (route) => {
        reachedRefresh = true;
        await refreshGate;
        await route.continue();
      });
      if (name === 'hoje') {
        // O botão Atualizar Hoje está no layout de computador. Mesma consulta/hook.
        await page.setViewportSize({ width: 1024, height: 844 });
        await page
          .getByRole('button', { name: 'Atualizar Hoje', exact: true })
          .click();
        await page.setViewportSize({ width: 390, height: 844 });
      }
      if (name === 'clientes') {
        await page.getByText('Opções da lista', { exact: true }).click();
        await page
          .getByRole('button', { name: 'Atualizar lista', exact: true })
          .click();
      }
      if (name === 'pedidos')
        await page
          .getByRole('button', { name: 'Atualizar pedidos', exact: true })
          .click();
      await expect.poll(() => reachedRefresh).toBe(true);
      await expect(page.locator(content).first()).toBeVisible();
      await expect(page.locator('.skeleton-region')).toHaveCount(0);
      releaseRefresh();
      await page.unrouteAll({ behavior: 'wait' });
      await page.close();
    }
  } finally {
    releases.forEach((release) => release());
    await pageCleanup(ctx);
    await t.dispose();
  }
});

test('T3c listas auxiliares, detalhes, sabores e erros mantêm sua semântica', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  const releases = [];
  try {
    const { customer, makeOrder } = await demoProject(t);
    const order = await makeOrder(fortalezaDay() + 'T14:00:00-03:00');
    // Exercita o modo simples explicitamente, antes de segurar a API de clientes.
    await ctx.addInitScript(() =>
      localStorage.setItem('az-order-mode-owner', 'simple'),
    );
    const page = await ctx.newPage();
    await page.goto(t.url + '/api/access/start');
    for (const [path, endpoint, label] of [
      ['/gestao/kits', '**/api/p1/kits', 'kits'],
      ['/gestao/insumos', '**/api/p1/supplies', 'insumos'],
      ['/gestao/fichas', '**/api/p1/recipes', 'fichas'],
      ['/gestao/lembretes', '**/api/p1/reminders', 'lembretes'],
      ['/gestao/relatorios', '**/api/p1/reports?**', 'relatórios'],
      ['/gestao/financeiro', '**/api/finance/summary', 'resumo financeiro'],
      [
        '/gestao/financeiro/' + customer,
        '**/api/finance/customers/' + customer,
        'conta',
      ],
      ['/gestao/pedidos/' + order, '**/api/orders/' + order, 'pedido'],
      ['/gestao/pedidos?novo=1', '**/api/mobile/customers?**', 'clientes'],
    ]) {
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
        releases.push(resolve);
      });
      await page.route(endpoint, async (route) => {
        await gate;
        await route.continue();
      });
      await page.goto(t.url + path, { waitUntil: 'domcontentloaded' });
      const skeleton = page.getByRole('region', {
        name: `Carregando ${label}…`,
        exact: true,
      });
      await expect(skeleton).toBeVisible();
      await expect(skeleton).toHaveAttribute('aria-busy', 'true');
      release();
      await expect(skeleton).toHaveCount(0);
      await page.unrouteAll({ behavior: 'wait' });
    }
    // O produto ainda não chegou quando o cliente já foi escolhido.
    let releaseProducts;
    const productsGate = new Promise((resolve) => {
      releaseProducts = resolve;
      releases.push(resolve);
    });
    await page.route('**/api/products', async (route) => {
      await productsGate;
      await route.continue();
    });
    await page.goto(t.url + '/gestao/pedidos?novo=1');
    await page
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    const flavors = page.getByRole('region', { name: 'Carregando sabores…' });
    await expect(flavors).toBeVisible();
    await expect(flavors.locator('.skeleton-card-flavor')).toHaveCount(4);
    releaseProducts();
    await expect(flavors).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Produto DEMONSTRAÇÃO P1, adicionar/ }),
    ).toBeVisible();
    await page.unrouteAll({ behavior: 'wait' });
    await page.route('**/api/customers?**', (route) =>
      route.fulfill({
        status: 503,
        json: { error: 'Falha simulada DEMONSTRAÇÃO' },
      }),
    );
    await page.goto(t.url + '/gestao/clientes');
    await expect(page.getByRole('alert')).toContainText(
      'Falha simulada DEMONSTRAÇÃO',
    );
    await expect(page.locator('.skeleton-region')).toHaveCount(0);
    await page.unrouteAll();
    // Uma lista vazia já carregada também não deve voltar ao skeleton ao atualizar.
    await page.route('**/api/customers?**', (route) =>
      route.fulfill({ json: [] }),
    );
    await page.goto(t.url + '/gestao/clientes');
    await expect(
      page.getByText('Nenhum cliente encontrado.', { exact: true }),
    ).toBeVisible();
    await page.unrouteAll();
    let releaseEmpty;
    let reachedEmpty = false;
    const emptyGate = new Promise((resolve) => {
      releaseEmpty = resolve;
      releases.push(resolve);
    });
    await page.route('**/api/customers?**', async (route) => {
      reachedEmpty = true;
      await emptyGate;
      await route.fulfill({ json: [] });
    });
    await page.getByText('Opções da lista', { exact: true }).click();
    await page
      .getByRole('button', { name: 'Atualizar lista', exact: true })
      .click();
    await expect.poll(() => reachedEmpty).toBe(true);
    await expect(
      page.getByText('Nenhum cliente encontrado.', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('.skeleton-region')).toHaveCount(0);
    releaseEmpty();
    await page.unrouteAll({ behavior: 'wait' });
  } finally {
    releases.forEach((release) => release());
    await pageCleanup(ctx);
    await t.dispose();
  }
});
