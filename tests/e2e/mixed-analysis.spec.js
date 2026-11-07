import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { runtime } from '../helpers/runtime.mjs';
import { mixedAnalysisProject } from '../helpers/mixed-analysis-project.mjs';
test('R11-4 relatório mostra sabores da composição e CSV privado', async ({
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
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { day, order, deliver } = await mixedAnalysisProject(t);
    await deliver(order);
    const p = await c.newPage(),
      errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/relatorios');
    await p.getByLabel('Vendas de', { exact: true }).fill(day);
    const ranking = p
      .getByRole('heading', {
        name: 'Ranking de produtos / sabores',
        exact: true,
      })
      .locator('..');
    await expect(ranking).toContainText('rateado pelos sabores');
    await expect(
      ranking.locator('p').filter({ hasText: 'Beta DEMONSTRAÇÃO —' }),
    ).toContainText('18 unidades');
    await expect(
      ranking.locator('p').filter({ hasText: 'Beta DEMONSTRAÇÃO —' }),
    ).toContainText('6 unidades em caixas mistas');
    await expect(
      ranking.locator('p').filter({ hasText: 'Alfa DEMONSTRAÇÃO —' }),
    ).toContainText('16 unidades');
    await ranking.scrollIntoViewIfNeeded();
    if (
      process.env.R11_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    )
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r12-depois-relatorios-mistos.png',
      });
    const event = p.waitForEvent('download');
    await p
      .getByRole('button', { name: 'Exportar relatório CSV', exact: true })
      .click();
    const csv = await readFile(await (await event).path(), 'utf8');
    expect(csv).toContain('2× Mista:');
    expect(csv).toContain('8 Alfa DEMONSTRAÇÃO');
    expect(errors).toEqual([]);
  } finally {
    await c.close();
    await t.dispose();
  }
});

test('R11-5 custo misto informa falta de ficha e compras usa unidades de cada sabor', async ({
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
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, order, variants, day } = await mixedAnalysisProject(t);
    const { seedAnalysisRecipe } =
      await import('../helpers/mixed-analysis-project.mjs');
    for (let i = 0; i < 2; i++) await seedAnalysisRecipe(call, variants[i], i);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/pedidos/' + order);
    await expect(p.locator('.order-detail-items')).toContainText(
      '2 caixas mistas',
    );
    await expect(p.locator('.order-detail-items')).toContainText(
      '8 Alfa DEMONSTRAÇÃO',
    );
    await p.getByText('Custo estimado do pedido', { exact: true }).click();
    const panel = p.locator('.order-cost');
    await expect(panel).toContainText('Custo indisponível');
    await expect(panel.getByRole('alert')).toContainText('Gama DEMONSTRAÇÃO');
    await seedAnalysisRecipe(call, variants[2], 2);
    await panel
      .getByRole('button', { name: 'Atualizar estimativa', exact: true })
      .click();
    await expect(
      panel.getByRole('heading', {
        name: 'Custo estimado: R$ 7,98',
        exact: true,
      }),
    ).toBeVisible();
    await expect(panel).toContainText('2 unidades · R$ 0,74');
    await panel.scrollIntoViewIfNeeded();
    if (
      process.env.R11_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    )
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r12-depois-custo-misto.png',
      });
    await p.goto(t.url + '/gestao/compras');
    await p.getByLabel('Produção de', { exact: true }).fill(day);
    await p.getByLabel('Produção até', { exact: true }).fill(day);
    await expect(
      p.getByText(/Ficha 1 DEMONSTRAÇÃO mista · pedido 18 unidades · 2 lote/),
    ).toBeVisible();
    await expect(
      p.getByText(/Ficha 2 DEMONSTRAÇÃO mista · pedido 2 unidades · 1 lote/),
    ).toBeVisible();
    if (
      process.env.R11_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    )
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r12-depois-compras-mistas.png',
      });
  } finally {
    await c.close();
    await t.dispose();
  }
});
