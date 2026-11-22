import { expect, test } from '@playwright/test';
import { fortalezaDay } from '../../shared/workday.ts';
import { demoProject } from '../helpers/demo-project.mjs';
import { runtime } from '../helpers/runtime.mjs';

const options = {
  browserHTTP: true,
  mobileEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  fieldEnabled: true,
};

async function login(browser, t, email) {
  return browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: { 'Cf-Access-Jwt-Assertion': await t.token(email) },
  });
}

test('T16 seleciona os dois no Hoje e no novo pedido e exibe as iniciais', async ({
  browser,
}) => {
  const t = await runtime(options);
  const context = await login(browser, t, 'owner@example.test');
  try {
    const { call, makeOrder, operator } = await demoProject(t);
    for (const [display_name, cookie] of [
      ['Ana DEMONSTRAÇÃO', undefined],
      ['Bia DEMONSTRAÇÃO', operator],
    ])
      await call('field/profile', { display_name, version: 0 }, 'PUT', cookie);
    const id = await makeOrder(fortalezaDay() + 'T15:00:00Z');
    await call(
      'orders/' + id + '/delivery',
      {
        version: 3,
        delivery_type: 'delivery',
        delivery_address: 'Rua DEMONSTRAÇÃO T16',
        courier: 'owner',
      },
      'PUT',
    );
    const page = await context.newPage();
    await page.goto(t.url + '/api/access/start');
    const card = page.locator('.order-card');
    await expect(card).toHaveCount(1);
    await card.getByText('Mais ações do pedido', { exact: true }).click();
    await card.getByRole('button', { name: 'Atribuir aos dois' }).click();
    await expect(card.locator('.shared-courier')).toContainText('Os dois');
    await expect(card.locator('.shared-courier .staff-avatar')).toHaveText([
      'AD',
      'BD',
    ]);

    await page.goto(t.url + '/gestao/pedidos/' + id);
    // Detalhe compacto: ações iguais às do Hoje e deslocamento recolhido.
    for (const name of ['Mapa', 'Uber', '99'])
      await expect(
        page
          .locator('.delivery-icon-row')
          .getByRole('button', { name })
          .or(page.locator('.delivery-icon-row').getByRole('link', { name }))
          .first(),
      ).toBeVisible();
    await expect(page.locator('.order-travel')).not.toHaveAttribute('open');
    await expect(page.getByText(/Entregador: Os dois/)).toBeVisible();
    await page
      .getByRole('button', { name: 'Editar entrega', exact: true })
      .click();
    await expect(
      page
        .getByRole('group', { name: 'Entregador' })
        .getByRole('button', { name: 'Os dois', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.goto(t.url + '/gestao/recorrentes');
    const recurringCourier = page.getByLabel('Entregador padrão');
    await recurringCourier.selectOption('both');
    await expect(recurringCourier).toHaveValue('both');

    await page.goto(t.url + '/gestao/pedidos?novo=1');
    await page
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await page.locator('.flavor-add').first().click();
    const next = () => page.getByRole('button', { name: /^Continuar/ }).click();
    await next();
    await page.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await page.getByRole('button', { name: '14:00', exact: true }).click();
    await next();
    const both = page
      .getByRole('group', { name: 'Quem leva', exact: true })
      .getByRole('button', { name: 'Os dois', exact: true });
    await both.click();
    await expect(both).toHaveAttribute('aria-pressed', 'true');
    await expect(both.locator('.staff-avatar')).toHaveText(['AD', 'BD']);
    await page
      .getByLabel('Endereço desta entrega')
      .fill('Rua DEMONSTRAÇÃO T16');
    await next();
    await next();
    await expect(page.getByLabel('Resumo do pedido')).toContainText('Os dois');
  } finally {
    await context.close();
    await t.dispose();
  }
});

test('T16 banco sem 0029 conserva as escolhas anteriores', async ({
  browser,
}) => {
  const t = await runtime({ ...options, migrationLimit: 28 });
  const context = await login(browser, t, 'owner@example.test');
  try {
    const { makeOrder } = await demoProject(t);
    const id = await makeOrder();
    const page = await context.newPage();
    await page.goto(t.url + '/api/access/start');
    await page.goto(t.url + '/gestao/recorrentes');
    const options = page.getByLabel('Entregador padrão').getByRole('option');
    await expect(options).toHaveCount(4);
    await expect(options).toHaveText([
      'A definir',
      'Administrador',
      'Operador',
      'Motoboy',
    ]);
    await page.goto(t.url + '/gestao/pedidos/' + id);
    await page
      .getByRole('button', { name: 'Editar entrega', exact: true })
      .click();
    await expect(
      page
        .getByRole('group', { name: 'Entregador' })
        .getByRole('button', { name: 'Os dois', exact: true }),
    ).toHaveCount(0);
  } finally {
    await context.close();
    await t.dispose();
  }
});
