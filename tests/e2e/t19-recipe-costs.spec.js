import { expect, test } from '@playwright/test';
import { demoProject } from '../helpers/demo-project.mjs';
import { runtime } from '../helpers/runtime.mjs';

test('T19 mostra lote, custo por doce e altera o percentual da ficha', async ({
  browser,
}, info) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, variant } = await demoProject(t);
    const components = [];
    for (const [name, price] of [
      ['Massa DEMONSTRAÇÃO', 2100],
      ['Acabamento DEMONSTRAÇÃO', 917],
    ]) {
      const supply = await call('p1/supplies', {
        name,
        unit: 'unit',
        pack_quantity_milli: 1000,
        pack_cost_cents: price,
      });
      components.push({ supply_id: supply.id, quantity_milli: 1000 });
    }
    await call('p1/recipes', {
      name: 'Ficha DEMONSTRAÇÃO T19',
      variant_id: variant,
      yield_units: 50,
      packaging_cents: 300,
      labor_cents: 1500,
      overhead_cents: 200,
      margin_bps: 4000,
      components,
    });
    const page = await context.newPage();
    await page.goto(t.url + '/api/access/start');
    await page.goto(t.url + '/gestao/fichas');
    const card = page
      .locator('.recipe-cost-card')
      .filter({ hasText: 'Ficha DEMONSTRAÇÃO T19' });
    const table = card.getByRole('table', { name: 'Custos por ingrediente' });
    await expect(
      table.getByRole('row', { name: /Massa DEMONSTRAÇÃO/ }),
    ).toContainText(/21,00.*0,42/);
    await expect(
      table.getByRole('row', { name: /Custos não calculados \(20%\)/ }),
    ).toContainText(/10,03.*0,20/);
    await expect(table.getByRole('row', { name: /Custo total/ })).toContainText(
      /60,20.*1,20/,
    );
    await expect(card.getByText('Preço sugerido por doce')).toBeVisible();
    await expect(card.getByText(/Na caixa de 2/)).toBeVisible();
    const capture = async (name, target) => {
      if (
        process.env.T19_CAPTURE === '1' &&
        info.project.name === 'chromium-mobile'
      ) {
        await page.evaluate(() => document.fonts.ready);
        await target.screenshot({
          path: 'docs/colaboracao/capturas/t19-' + name + '.png',
          animations: 'disabled',
        });
      }
    };
    await capture('ficha', card);
    await card
      .getByRole('button', { name: 'Editar ficha Ficha DEMONSTRAÇÃO T19' })
      .click();
    const percentage = page.getByRole('spinbutton', {
      name: 'Custos não calculados (%)',
    });
    await expect(percentage).toHaveValue('20');
    const form = percentage.locator('xpath=ancestor::form');
    await percentage.scrollIntoViewIfNeeded();
    await capture('editar-ficha', page);
    await percentage.fill('0');
    await form.getByRole('button', { name: 'Salvar ficha' }).click();
    await expect(
      table.getByRole('row', { name: /Custos não calculados \(0%\)/ }),
    ).toContainText(/0,00/);
    await expect(table.getByRole('row', { name: /Custo total/ })).toContainText(
      /50,17.*1,00/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
    await t.dispose();
  }
});
