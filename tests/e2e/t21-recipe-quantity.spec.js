import { expect, test } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

test('T21 salva e reabre a quantidade por doce com conferência pelo rendimento', async ({
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
    const makeSupply = (name, unit, pack_quantity_milli, pack_cost_cents) =>
      call('p1/supplies', { name, unit, pack_quantity_milli, pack_cost_cents });
    const units = await makeSupply(
      'Insumo unitário DEMONSTRAÇÃO',
      'unit',
      50000,
      1400,
    );
    const grams = await makeSupply(
      'Insumo em gramas DEMONSTRAÇÃO',
      'g',
      500000,
      700,
    );
    const unknown = await makeSupply(
      'Insumo sem preço DEMONSTRAÇÃO',
      'unit',
      50000,
      null,
    );
    await call('p1/recipes', {
      name: 'Ficha DEMONSTRAÇÃO T21',
      variant_id: variant,
      yield_units: 16,
      packaging_cents: 0,
      labor_cents: 0,
      overhead_cents: 0,
      margin_bps: 0,
      unmeasured_bps: 0,
      components: [
        { supply_id: units.id, quantity_milli: 1000 },
        { supply_id: grams.id, quantity_milli: 30000 },
      ],
    });
    const page = await context.newPage();
    await page.goto(t.url + '/api/access/start');
    await page.goto(t.url + '/gestao/fichas');
    const edit = page.getByRole('button', {
      name: 'Editar ficha Ficha DEMONSTRAÇÃO T21',
    });
    await edit.click();
    const first = page.getByRole('group', {
      name: 'Componente 1',
      exact: true,
    });
    // Os insumos podem ser lidos em ordem distinta. Confira o produto selecionado.
    const component =
      (await first.getByLabel('Insumo').inputValue()) === units.id
        ? first
        : page.getByRole('group', { name: 'Componente 2', exact: true });
    await expect(
      component.getByRole('button', { name: 'No lote inteiro' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await component
      .getByRole('button', { name: 'Por doce', exact: true })
      .click();
    await expect(component.getByLabel('Quantidade por doce (un.)')).toHaveValue(
      '1',
    );
    await expect(component.locator('.recipe-quantity-preview')).toContainText(
      '16 un. no lote (1 × 16 doces) · R$ 4,48 no lote',
    );
    await component.getByLabel('Insumo').selectOption(unknown.id);
    await expect(
      component.locator('.recipe-quantity-preview'),
    ).not.toContainText('R$');
    await component.getByLabel('Insumo').selectOption(units.id);

    const recipeWrites = [];
    page.on('request', (request) => {
      if (
        request.method() === 'PUT' &&
        new URL(request.url()).pathname.startsWith('/api/p1/recipes/')
      )
        recipeWrites.push(request.url());
    });
    await component
      .getByRole('button', { name: 'Ajuda: Quantidade da ficha' })
      .click();
    await expect(page.getByRole('dialog')).toContainText(
      'o app multiplica pelo rendimento',
    );
    await page.getByRole('button', { name: 'Fechar ajuda' }).click();
    await expect(component.locator('.recipe-quantity-preview')).toContainText(
      '16 un. no lote',
    );
    expect(recipeWrites).toHaveLength(0);
    const capture = async (name, target) => {
      if (
        process.env.T21_CAPTURE === '1' &&
        info.project.name === 'chromium-mobile'
      ) {
        await page.evaluate(() => document.fonts.ready);
        await target.screenshot({
          path: 'docs/colaboracao/capturas/t21-' + name + '.png',
          animations: 'disabled',
        });
      }
    };
    await capture('editar', component);
    await page.getByRole('button', { name: 'Salvar ficha' }).click();
    const table = page.getByRole('table', { name: 'Custos por ingrediente' });
    await expect(
      table.getByText('1 un. por doce · 16 un. no lote', { exact: true }),
    ).toBeVisible();
    await expect(
      table.getByText('30 g no lote', { exact: true }),
    ).toBeVisible();
    await capture('consulta', page.locator('.recipe-cost-card'));

    await edit.click();
    await expect(
      component.getByRole('button', { name: 'Por doce', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByLabel('Rendimento do lote (unidades produzidas)')
      .fill('20');
    await expect(component.locator('.recipe-quantity-preview')).toContainText(
      '20 un. no lote (1 × 20 doces) · R$ 5,60 no lote',
    );
    await page.getByRole('button', { name: 'Salvar ficha' }).click();
    await expect(
      table.getByText('1 un. por doce · 20 un. no lote', { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
    await t.dispose();
  }
});
