import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('R15-A administrador cadastra/edita kit sob CSP real e operadora só consulta', async ({
  browser,
}, info) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    fieldEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  const other = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call } = await demoProject(t);
    await call('p1/supplies', {
      name: 'Caixa DEMONSTRAÇÃO',
      unit: 'unit',
      pack_quantity_milli: 10000,
      pack_cost_cents: null,
    });
    await c.addInitScript(() => {
      window.__kitCsp = [];
      window.addEventListener('securitypolicyviolation', (e) =>
        window.__kitCsp.push({
          directive: e.violatedDirective,
          blocked: e.blockedURI,
        }),
      );
    });
    const p = await c.newPage(),
      violations = [];
    p.on('console', (m) => {
      if (/Content Security Policy|Permissions policy/i.test(m.text()))
        violations.push(m.text());
    });
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/kits');
    await expect(
      p.getByText('Nenhum kit cadastrado.', { exact: true }),
    ).toBeVisible();
    await p
      .getByRole('group', { name: 'Tamanho do doce', exact: true })
      .getByRole('button', { name: '15 g', exact: true })
      .click();
    await p
      .getByRole('group', { name: 'Doces por kit', exact: true })
      .getByRole('button', { name: '25 doces', exact: true })
      .click();
    await p.getByLabel('Preço do kit', { exact: true }).fill('12345');
    await p
      .getByLabel('Peso da massa por doce (g, opcional)', { exact: true })
      .fill('13');
    await p
      .getByRole('group', { name: 'Embalagem por kit', exact: true })
      .getByRole('button', { name: 'Caixa DEMONSTRAÇÃO', exact: true })
      .click();
    await p.getByRole('button', { name: 'Salvar kit', exact: true }).click();
    const row = p.locator('article').filter({
      has: p.getByRole('heading', { name: 'Kit 25 · 15 g', exact: true }),
    });
    await expect(row).toContainText('R$ 123,45');
    await expect(row).toContainText('até 5 sabores');
    await expect(row).toContainText('Massa: 13 g');
    await expect(row).toContainText('Caixa DEMONSTRAÇÃO');
    await row
      .getByRole('button', { name: 'Editar Kit 25 · 15 g', exact: true })
      .click();
    await p.getByLabel('Preço do kit', { exact: true }).fill('11111');
    await p.getByRole('button', { name: 'Salvar kit', exact: true }).click();
    await expect(row).toContainText('R$ 111,11');
    await p
      .getByRole('checkbox', { name: 'Limitar sabores por kit', exact: true })
      .click();
    await expect(
      p.getByRole('checkbox', { name: 'Limitar sabores por kit', exact: true }),
    ).not.toBeChecked();
    expect(
      (await call('p1/kit-settings', undefined, 'GET')).limit_flavors,
    ).toBe(false);
    if (
      process.env.R15_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    ) {
      // Só a captura usa bypassCSP: o Playwright injeta body{} ao fotografar no WebKit.
      // O fluxo funcional acima e as asserções abaixo continuam sob a CSP real.
      const capture = await browser.newContext({
        viewport: { width: 390, height: 844 },
        bypassCSP: true,
        extraHTTPHeaders: {
          'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
        },
      });
      try {
        const photo = await capture.newPage();
        await photo.goto(t.url + '/api/access/start');
        await photo.goto(t.url + '/gestao/kits');
        await expect(
          photo.getByRole('heading', { name: 'Kit 25 · 15 g', exact: true }),
        ).toBeVisible();
        await photo.screenshot({
          path: 'docs/colaboracao/capturas/r15-depois-cadastro-kits.png',
          fullPage: true,
        });
      } finally {
        await capture.close();
      }
    }
    await expect(row).toContainText('até 25 sabores (limite desligado)');
    const op = await other.newPage();
    await op.goto(t.url + '/api/access/start');
    await op.goto(t.url + '/gestao/kits');
    await expect(
      op.getByRole('heading', { name: 'Kit 25 · 15 g', exact: true }),
    ).toBeVisible();
    await expect(
      op.getByRole('button', { name: 'Salvar kit', exact: true }),
    ).toHaveCount(0);
    await expect(
      op.getByRole('checkbox', {
        name: 'Limitar sabores por kit',
        exact: true,
      }),
    ).toBeDisabled();
    expect(await p.evaluate(() => window.__kitCsp)).toEqual([]);
    expect(violations).toEqual([]);
  } finally {
    await c.close();
    await other.close();
    await t.dispose();
  }
});
