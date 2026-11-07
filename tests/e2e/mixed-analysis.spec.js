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
