import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
// Fixtures fictícias; D1 efêmero.
test('Caixa mista: montar 6+6, revisar e gravar a composição', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
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
    const { call } = await demoProject(t);
    for (const name of ['Sabor A DEMONSTRAÇÃO', 'Sabor B DEMONSTRAÇÃO'])
      await call('products', {
        name,
        variants: [
          {
            label: 'Caixa DEMONSTRAÇÃO',
            weight_grams: 30,
            units_per_box: 12,
            price_cents: 4200,
          },
        ],
      });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await p.getByRole('button', { name: /Montar caixa mista/ }).click();
    const sheet = p.getByRole('dialog', { name: 'Montar caixa mista' });
    await expect(sheet.getByRole('status')).toHaveText('Faltam 12 de 12');
    const add = sheet.getByRole('button', {
      name: 'Adicionar caixa mista',
    });
    await expect(add).toBeDisabled();
    for (let i = 0; i < 6; i++)
      await sheet
        .getByRole('button', { name: 'Mais Sabor A DEMONSTRAÇÃO' })
        .click();
    await expect(sheet.getByRole('status')).toHaveText('Faltam 6 de 12');
    await sheet
      .getByRole('button', { name: 'Completar com Sabor A DEMONSTRAÇÃO' })
      .click();
    await expect(sheet.getByRole('status')).toHaveText(/Caixa completa/);
    for (let i = 0; i < 6; i++)
      await sheet
        .getByRole('button', { name: 'Menos Sabor A DEMONSTRAÇÃO' })
        .click();
    for (let i = 0; i < 6; i++)
      await sheet
        .getByRole('button', { name: 'Mais Sabor B DEMONSTRAÇÃO' })
        .click();
    await expect(
      sheet.getByRole('button', { name: 'Mais Sabor B DEMONSTRAÇÃO' }),
    ).toBeDisabled();
    await add.click();
    await expect(sheet).toBeHidden();
    const line = p.locator('.mix-line');
    await expect(line).toContainText('6 Sabor A DEMONSTRAÇÃO');
    await expect(line).toContainText('6 Sabor B DEMONSTRAÇÃO');
    await line
      .getByRole('button', { name: 'Mais caixas mistas iguais' })
      .click();
    await expect(line).toContainText('2 cx');
    await expect(p.getByRole('button', { name: /^Continuar/ })).toContainText(
      'R$ 84,00',
    );
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await p.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await p.getByRole('button', { name: '14:00', exact: true }).click();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await p.getByRole('button', { name: /^Retirada/ }).click();
    const review = p.getByRole('heading', { name: 'Revise e confirme' });
    while (!(await review.isVisible()))
      await p.getByRole('button', { name: /^Continuar/ }).click();
    await expect(p.locator('.review-line').first()).toContainText(
      'Caixa mista',
    );
    await p
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await expect(
      p.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    ).toBeVisible();
    const rows = (
      await t.db
        .prepare(
          'SELECT c.product_name,c.units,i.quantity FROM order_item_components c JOIN order_items i ON i.id=c.item_id ORDER BY c.product_name',
        )
        .all()
    ).results;
    expect(rows).toEqual([
      { product_name: 'Sabor A DEMONSTRAÇÃO', units: 6, quantity: 2 },
      { product_name: 'Sabor B DEMONSTRAÇÃO', units: 6, quantity: 2 },
    ]);
  } finally {
    await c.close();
    await t.dispose();
  }
});
