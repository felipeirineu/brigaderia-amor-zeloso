import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { runtime } from '../helpers/runtime.mjs';
import { mixedAnalysisProject } from '../helpers/mixed-analysis-project.mjs';

test('T12 relatórios, fluxo e entregas baixam planilha, PDF e CSV conforme os filtros', async ({
  browser,
}, info) => {
  test.setTimeout(60_000);
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    fieldEnabled: true,
    mobileEnabled: true,
    mixedEnabled: true,
  });
  const capture =
    process.env.T12_CAPTURE === '1' && info.project.name === 'chromium-mobile';
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { order, deliver, day, call, customer } =
      await mixedAnalysisProject(t);
    await deliver(order);
    await call('p1/expenses', {
      spent_on: day,
      amount_cents: 450,
      category: 'other',
      method: 'cash',
      description: 'Despesa DEMONSTRAÇÃO exportação',
    });
    await c.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', {
        value: () => false,
        configurable: true,
      });
    });
    const page = await c.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        /violates the following Content Security Policy/i.test(msg.text())
      )
        errors.push(msg.text());
    });
    await page.goto(t.url + '/api/access/start');
    const month = day.slice(0, 7);
    for (const screen of [
      {
        route: 'relatorios',
        slug: 'vendas-por-cliente',
        csv: 'relatorio-customers.csv',
        data: /Cliente DEMONSTRAÇÃO P1/,
      },
      {
        route: 'despesas',
        slug: 'fluxo-de-caixa',
        csv: 'fluxo-registrado.csv',
        data: /"4,50";"-4,50"/,
      },
      {
        route: 'deslocamentos',
        slug: 'custo-das-entregas',
        csv: 'deslocamentos.csv',
        data: /Cliente DEMONSTRAÇÃO P1/,
      },
    ]) {
      await page.goto(t.url + '/gestao/' + screen.route);
      if (screen.route === 'relatorios') {
        await page.getByLabel('Vendas de', { exact: true }).fill(day);
        await page.getByLabel('Vendas até', { exact: true }).fill(day);
        await page.getByLabel('Cliente do relatório').selectOption(customer);
        await page
          .getByRole('combobox', { name: /^Relatório/ })
          .selectOption('customers');
      } else if (screen.route === 'despesas') {
        await page.getByLabel('Fluxo de', { exact: true }).fill(day);
        await page.getByLabel('Fluxo até', { exact: true }).fill(day);
        await expect(
          page.getByRole('button', { name: 'Registrar despesa', exact: true }),
        ).toHaveCount(0);
      } else {
        await page.getByLabel('De', { exact: true }).fill(day);
        await page.getByLabel('Até', { exact: true }).fill(day);
      }

      const group = page.getByRole('group', { name: 'Formatos de exportação' });
      await expect(group).toBeVisible();
      if (capture && screen.route === 'relatorios') {
        const panel = page.locator('.report-export-panel');
        await panel.evaluate((node) =>
          node.scrollIntoView({ block: 'center' }),
        );
        await panel.screenshot({
          path: 'docs/colaboracao/capturas/t12-exportar.png',
        });
      }
      for (const [label, filename, magic] of [
        ['Planilha', `relatorio-${screen.slug}-${month}.xlsx`, 'PK'],
        ['PDF', `relatorio-${screen.slug}-${month}.pdf`, '%PDF'],
        ['Outros formatos (CSV)', screen.csv, ''],
      ]) {
        const pending = page.waitForEvent('download', { timeout: 10_000 });
        await page.getByRole('button', { name: label, exact: true }).click();
        const download = await pending;
        expect(download.suggestedFilename()).toBe(filename);
        const bytes = await readFile(await download.path());
        if (magic)
          expect(bytes.subarray(0, magic.length).toString()).toBe(magic);
        else expect(bytes.toString()).toMatch(screen.data);
        if (capture && screen.route === 'relatorios' && magic)
          await download.saveAs('/tmp/t12-demo-' + filename);
      }
    }
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'canShare', {
        value: () => true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: false },
        configurable: true,
      });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async ({ files }) => {
          document.documentElement.dataset.sharedPdf = files[0].name;
        },
      });
    });
    await page.getByRole('button', { name: 'PDF', exact: true }).click();
    await page
      .getByRole('button', { name: 'Compartilhar PDF', exact: true })
      .click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-shared-pdf',
      `relatorio-custo-das-entregas-${month}.pdf`,
    );
    await page.goto(t.url + '/gestao/backup');
    await expect(
      page.getByRole('button', { name: 'Fazer backup agora' }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await c.close();
    await t.dispose();
  }
});
