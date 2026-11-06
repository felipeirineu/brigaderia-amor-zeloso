import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('R3 fotos, padrão, revisão e confirmação no celular', async ({
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
    const { call, customer, variant } = await demoProject(t);
    await call('recurring', {
      name: 'Modelo DEMONSTRAÇÃO',
      customer_id: customer,
      weekday: 1,
      time: '10:00',
      delivery_type: 'pickup',
      items: [{ variant_id: variant, quantity: 2 }],
    });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    const tile = p.locator('.flavor-add');
    await expect(tile).toHaveAccessibleName(/2 embalagens/);
    await tile.click();
    await expect(tile).toHaveAccessibleName(/3 embalagens/);
    const next = () => p.getByRole('button', { name: /^Continuar/ }).click();
    await next();
    await expect(
      p.getByRole('heading', { name: 'Quando entregar?' }),
    ).toBeVisible();
    await next();
    await expect(
      p.getByRole('heading', { name: 'Como vai chegar?' }),
    ).toBeVisible();
    const amount = p.getByLabel('Taxa combinada (R$)');
    await amount.focus();
    await amount.pressSequentially('4200');
    await expect(amount).toHaveValue('42,00');
    await amount.press('Enter');
    await amount.focus();
    await amount.blur();
    await expect(amount).toHaveValue('42,00');
    await amount.fill('999999999999999');
    await expect(amount).toHaveAttribute('aria-invalid', 'true');
    await amount.blur();
    await amount.focus();
    await amount.blur();
    await expect(amount).toHaveValue('42,00');
    expect(await amount.evaluate((e) => e.checkValidity())).toBe(true);
    const review = p.getByRole('heading', { name: 'Revise e confirme' });
    while (!(await review.isVisible())) await next();
    const q = p.getByRole('textbox', {
      name: 'Revisar quantidade de Produto DEMONSTRAÇÃO P1',
      exact: true,
    });
    await q.focus();
    await expect(q).toHaveValue('');
    await q.blur();
    await expect(q).toHaveValue('3');
    await p
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await expect(
      p.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole('link', { name: 'Avisar no WhatsApp' }),
    ).toBeVisible();
  } finally {
    await c.close();
    await t.dispose();
  }
});
