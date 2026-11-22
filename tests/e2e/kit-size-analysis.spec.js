import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
// Produtos/valores DEMONSTRAÇÃO; nenhuma planilha ou conta real.
test('produção e relatórios distinguem o mesmo sabor em dois pesos e capacidades', async ({
  browser,
}, info) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    mixedEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  await c.addInitScript(() => {
    window.__sizeCsp = [];
    window.addEventListener('securitypolicyviolation', (e) =>
      window.__sizeCsp.push(e.violatedDirective),
    );
  });
  try {
    const { call, customer } = await demoProject(t);
    const a = (await call('products', undefined, 'GET'))[0];
    const b = (
      await call('products', {
        name: 'Sabor B DEMONSTRAÇÃO',
        variants: [
          {
            label: 'Legado DEMONSTRAÇÃO',
            weight_grams: 10,
            units_per_box: 2,
            price_cents: 1000,
          },
        ],
      })
    ).id;
    const k15 = (
      await call('p1/kits', {
        weight_grams: 15,
        units_per_kit: 25,
        price_cents: 1001,
        max_flavors: 5,
      })
    ).id;
    const k30 = (
      await call('p1/kits', {
        weight_grams: 30,
        units_per_kit: 12,
        price_cents: 2002,
        max_flavors: 3,
      })
    ).id;
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Fortaleza',
    }).format(new Date());
    const id = (
      await call('mobile/orders', {
        customer_id: customer,
        due_at: day + 'T13:00:00Z',
        items: [],
        kit_items: [
          {
            kit_id: k15,
            quantity: 1,
            components: [
              { product_id: a.id, units: 15 },
              { product_id: b, units: 10 },
            ],
          },
          {
            kit_id: k30,
            quantity: 1,
            components: [
              { product_id: a.id, units: 6 },
              { product_id: b, units: 6 },
            ],
          },
        ],
        delivery: { delivery_type: 'pickup', courier: 'unassigned' },
        terms: null,
      })
    ).id;
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao?day=' + day);
    await expect(p.locator('.production-list li')).toHaveCount(4);
    // Unidades inteiras por sabor, agrupadas por tamanho; caixas à parte.
    await expect(p.locator('.production-group-title')).toHaveCount(2);
    await expect(p.locator('.production-group-title').first()).toContainText(
      'doces de 30 g',
    );
    await expect(p.locator('.production-group-title').last()).toContainText(
      'doces de 15 g',
    );
    await expect(p.getByText(/cx eq\./)).toHaveCount(0);
    await expect(p.locator('.production-packaging').first()).toContainText(
      'Caixa de 12 (30 g)',
    );
    await expect(p.locator('.production-packaging').last()).toContainText(
      'Caixa de 25 (15 g)',
    );
    await expect(p.locator('.production-packaging').last()).toContainText(
      '1 caixa',
    );
    expect(await p.evaluate(() => window.__sizeCsp)).toEqual([]);
    await call('orders/' + id + '/status', { version: 1, to: 'in_production' });
    await call('orders/' + id + '/status', { version: 2, to: 'ready' });
    await call('orders/' + id + '/status', { version: 3, to: 'picked_up' });
    await p.goto(t.url + '/gestao/relatorios');
    const ranking = p.locator('section').filter({
      has: p.getByRole('heading', {
        name: 'Ranking de produtos / sabores',
        exact: true,
      }),
    });
    await expect(ranking.getByText(/15 g · capacidade 25:/)).toHaveCount(2);
    await expect(ranking.getByText(/30 g · capacidade 12:/)).toHaveCount(2);
    await expect(ranking.getByText(/0,6 caixas equivalentes/)).toBeVisible();
    if (
      process.env.R15_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    ) {
      // Somente fotografia: screenshot WebKit injeta CSS. Fluxo funcional usa CSP real.
      const photoContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        bypassCSP: true,
        extraHTTPHeaders: {
          'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
        },
      });
      try {
        const photo = await photoContext.newPage();
        await photo.goto(t.url + '/api/access/start');
        await photo.goto(t.url + '/gestao/relatorios');
        const title = photo.getByRole('heading', {
          name: 'Ranking de produtos / sabores',
          exact: true,
        });
        await expect(title).toBeVisible();
        const section = photo.locator('section').filter({ has: title });
        await section.screenshot({
          path: 'docs/colaboracao/capturas/r15-depois-relatorio-pesos.png',
        });
      } finally {
        await photoContext.close();
      }
    }
  } finally {
    await c.close();
    await t.dispose();
  }
});
