import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

// "Voltar" na primeira etapa do Novo pedido volta para onde a pessoa estava;
// aberto direto pelo endereço, vai para a lista de pedidos. Logo maior só no
// Hoje.
test('Novo pedido pelo + do Hoje volta ao Hoje; logo maior só no Hoje', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    await demoProject(t);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao');
    await expect(p.locator('.today-greeting')).toBeVisible();
    const logo = p.locator('.compact-header > a img');
    expect((await logo.boundingBox()).width).toBe(56);

    await p.getByRole('button', { name: 'Novo cadastro', exact: true }).click();
    await p
      .getByRole('dialog', { name: 'Novo cadastro' })
      .getByRole('link', { name: 'Novo pedido', exact: true })
      .click();
    await expect(p).toHaveURL(/\/gestao\/pedidos\?novo=1/);
    expect((await logo.boundingBox()).width).toBe(44);
    await p
      .getByRole('button', { name: 'Voltar uma etapa', exact: true })
      .click();
    await expect(p).toHaveURL(/\/gestao$/);

    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Voltar uma etapa', exact: true })
      .click();
    await expect(p).toHaveURL(/\/gestao\/pedidos$/);
  } finally {
    await c.close();
    await t.dispose();
  }
});
