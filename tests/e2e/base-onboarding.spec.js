import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('R6-4 aviso da base exclusivo do administrador e cadastro pela interface', async ({
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
  try {
    await demoProject(t);
    const p = await c.newPage();
    const warning = p.getByRole('complementary', {
      name: 'Configurar base',
      exact: true,
    });
    await p.goto(t.url + '/api/access/start');
    await expect(warning).toContainText(
      'Cadastre o endereço da base para ver distâncias e rotas.',
    );
    await expect(p.locator('.finance-kpi')).toHaveCount(4);
    if (process.env.R9_CAPTURE === '1' && info.project.name === 'webkit-mobile')
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r9-depois-aviso-base.png',
      });
    await c.setExtraHTTPHeaders({
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    });
    await p.goto(t.url + '/api/access/start');
    await expect(p.locator('.today-greeting')).toBeVisible();
    await expect(warning).toHaveCount(0);
    await c.setExtraHTTPHeaders({
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    });
    await p.goto(t.url + '/api/access/start');
    await warning
      .getByRole('link', { name: 'Cadastrar a base', exact: true })
      .click();
    await expect(p).toHaveURL(/\/gestao\/empresa$/);
    await p
      .getByLabel('Endereço do estabelecimento', { exact: true })
      .fill('Endereço da base DEMONSTRAÇÃO');
    await p.getByLabel('Latitude', { exact: true }).fill('0');
    await p.getByLabel('Longitude', { exact: true }).fill('0');
    await p
      .getByRole('button', { name: 'Salvar localização', exact: true })
      .click();
    await expect(p.getByRole('status')).toContainText('Localização salva.');
    await p.goto(t.url + '/gestao');
    await expect(p.locator('.today-greeting')).toBeVisible();
    await expect(warning).toHaveCount(0);
  } finally {
    await c.close();
    await t.dispose();
  }
});
