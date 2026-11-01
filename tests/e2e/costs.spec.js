import { expect, test } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('relatórios CSV, despesa/estorno, ficha/preço e compras privadas', async ({
  browser,
}, info) => {
  const t = await runtime({
      browserHTTP: true,
      financeEnabled: true,
      p1Enabled: true,
    }),
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
      },
    });
  try {
    const { variant, makeOrder } = await demoProject(t);
    await makeOrder();
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('dialog', (d) => d.accept('Correção DEMONSTRAÇÃO'));
    await page.goto(t.url + '/login');
    await page.getByRole('link', { name: 'Entrar com acesso seguro' }).click();
    await page.goto(t.url + '/gestao/relatorios');
    await expect(
      page.getByRole('heading', { name: 'Relatórios', exact: true }),
    ).toBeVisible();
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar relatório CSV' }).click();
    expect((await event).suggestedFilename()).toBe('relatorio-orders.csv');
    await page.goto(t.url + '/gestao/despesas');
    await page.getByLabel('Valor da despesa (R$)').fill('2,00');
    await page
      .getByLabel('Descrição da despesa')
      .fill('Despesa DEMONSTRAÇÃO UI');
    await page
      .getByRole('button', { name: 'Registrar despesa', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: /^Despesa · R\$\s2,00$/ }),
    ).toBeVisible();
    await page.getByRole('button', { name: /^Estornar despesa / }).click();
    await expect(
      page.getByRole('heading', { name: /^Estorno de despesa · R\$\s2,00$/ }),
    ).toBeVisible();
    await page.goto(t.url + '/gestao/insumos');
    await page.getByLabel('Nome do insumo').fill('Insumo DEMONSTRAÇÃO UI');
    await page.getByLabel('Quantidade por embalagem').fill('1000');
    await page
      .getByLabel('Preço da embalagem (R$, vazio se desconhecido)')
      .fill('10,00');
    await page
      .getByRole('button', { name: 'Salvar insumo', exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Insumo DEMONSTRAÇÃO UI',
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(t.url + '/gestao/fichas');
    await page.getByLabel('Nome da ficha').fill('Ficha DEMONSTRAÇÃO UI');
    await page
      .getByRole('combobox', { name: 'Variante vendida (opcional)' })
      .selectOption(variant);
    await page.getByLabel('Rendimento do lote (unidades produzidas)').fill('3');
    await page
      .getByRole('combobox', { name: 'Insumo', exact: true })
      .selectOption({ label: 'Insumo DEMONSTRAÇÃO UI (g)' });
    await page.getByLabel('Quantidade no lote (g)').fill('500');
    for (const label of [
      'Embalagens por lote (R$)',
      'Mão de obra por lote (R$)',
      'Outros custos por lote (R$)',
    ])
      await page.getByLabel(label).fill('0,00');
    await page.getByLabel('Margem desejada (%)').fill('50,00');
    await page
      .getByRole('button', { name: 'Salvar ficha', exact: true })
      .click();
    await expect(
      page.getByText('Custo por embalagem vendida:', { exact: false }),
    ).toContainText('6,68');
    await page.goto(t.url + '/gestao/compras');
    await page.getByLabel('Produção de', { exact: true }).fill('2030-01-07');
    await page.getByLabel('Produção até', { exact: true }).fill('2030-01-07');
    await expect(
      page.getByText('Necessidade: 1000 g', { exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/costs-${info.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await context.close();
    await t.dispose();
  }
});
