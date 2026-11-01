import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { reviewProject } from '../helpers/review-r5-project.mjs';
test('R5 telas móveis com ações compartilhadas', async ({
  browser,
}, testInfo) => {
  const t = await runtime({
      browserHTTP: true,
      financeEnabled: true,
      p1Enabled: true,
      mobileEnabled: true,
      fieldEnabled: true,
      toolsEnabled: true,
    }),
    c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
  try {
    await reviewProject(t);
    const p = await c.newPage();
    const capture = async (name) => {
      if (
        process.env.R5_CAPTURE === '1' &&
        testInfo.project.name === 'webkit-mobile'
      )
        await p.screenshot({
          path: `docs/colaboracao/capturas/r5-depois-${name}.png`,
        });
    };
    await p.goto(t.url + '/api/access/start');
    await expect(p.locator('.order-card')).toBeVisible();
    await capture('hoje');
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO R5', exact: true })
      .click();
    await expect(p.locator('.flavor-card')).toHaveCount(5);
    await capture('sabores');
    await p.locator('.flavor-add').first().click();
    await p.getByRole('button', { name: /Revisar pedido/ }).click();
    await expect(
      p.getByRole('heading', { name: 'Revise seu pedido' }),
    ).toBeVisible();
    await capture('revisar');
    for (const [path, name] of [
      ['clientes', 'clientes'],
      ['mais', 'mais'],
      ['financeiro', 'financeiro'],
    ]) {
      await p.goto(t.url + '/gestao/' + path);
      await expect(
        p.getByRole('heading', {
          name:
            path === 'mais'
              ? 'Mais'
              : path === 'clientes'
                ? 'Clientes'
                : 'Financeiro',
          exact: true,
        }),
      ).toBeVisible();
      await capture(name);
    }
  } finally {
    await c.close();
    await t.dispose();
  }
});
