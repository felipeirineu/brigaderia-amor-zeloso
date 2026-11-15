import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

// Pedido repetido por engano: mesmo cliente e mesmo dia avisam e pedem um
// toque a mais; nada é bloqueado de vez.
test('aviso de pedido repetido no mesmo dia para o mesmo cliente', async ({
  browser,
}) => {
  test.setTimeout(90000);
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
    const { call } = await demoProject(t);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    const order = async (day) => {
      await p.goto(t.url + '/gestao/pedidos?novo=1');
      await p
        .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
        .click();
      await p.locator('.flavor-add').click();
      const next = () => p.getByRole('button', { name: /^Continuar/ }).click();
      await next();
      await p.getByRole('button', { name: day, exact: true }).click();
      await p.getByRole('button', { name: '14:00', exact: true }).click();
      await next();
      await p.getByRole('button', { name: /^Retirada/ }).click();
      const review = p.getByRole('heading', { name: 'Revise e confirme' });
      while (!(await review.isVisible())) {
        const pay = p.getByRole('button', { name: 'Na entrega', exact: true });
        if (await pay.isVisible()) await pay.click();
        await next();
      }
    };
    const confirm = p.getByRole('button', {
      name: 'Confirmar pedido',
      exact: true,
    });
    const warning = p.getByRole('alert').filter({ hasText: 'Já existe' });

    await order('Amanhã');
    await expect(confirm).toBeEnabled();
    await expect(warning).toHaveCount(0);
    await confirm.click();
    await expect(
      p.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    ).toBeVisible();

    // Mesmo cliente, mesmo dia: avisa e segura o botão até o toque extra.
    await order('Amanhã');
    await expect(warning).toContainText(
      'Já existe um pedido para Cliente DEMONSTRAÇÃO P1 neste dia',
    );
    await expect(
      warning.getByRole('link', { name: 'Ver esse pedido' }),
    ).toBeVisible();
    await expect(confirm).toBeDisabled();
    await warning
      .getByRole('button', { name: 'É outro pedido, confirmar mesmo assim' })
      .click();
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(
      p.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    ).toBeVisible();
    expect(
      (await call('orders', undefined, 'GET')).filter(
        (o) => o.status !== 'cancelled',
      ),
    ).toHaveLength(2);
  } finally {
    await c.close();
    await t.dispose();
  }
});
