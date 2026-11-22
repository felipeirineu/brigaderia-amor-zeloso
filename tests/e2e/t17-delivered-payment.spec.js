import { expect, test } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

test('T17 registra entrega anterior e recebimento e oferece as novas condições no celular', async ({
  browser,
}, info) => {
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { customer, call } = await demoProject(t);
    const page = await context.newPage();
    await page.goto(t.url + '/api/access/start');
    await page.goto(t.url + '/gestao/pedidos?novo=1');
    await page
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await page.locator('.flavor-add').click();
    const next = () => page.getByRole('button', { name: /^Continuar/ }).click();
    await next();
    await page.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await page.getByRole('button', { name: '14:00', exact: true }).click();
    await next();
    await page
      .getByLabel('Endereço desta entrega')
      .fill('Endereço DEMONSTRAÇÃO T17');
    await page
      .getByRole('group', { name: 'Quem leva' })
      .getByRole('button')
      .nth(1)
      .click();
    await next();
    await page.getByRole('button', { name: 'A prazo', exact: true }).click();
    await page.getByRole('button', { name: 'Dia do mês', exact: true }).click();
    await page
      .getByRole('spinbutton', { name: 'Dia de vencimento (31 = último dia)' })
      .fill('10');
    await next();
    await expect(page.getByLabel('Resumo do pedido')).toContainText(
      'vence no dia 10 do mês',
    );
    await page
      .getByLabel('Resumo do pedido')
      .getByRole('button', { name: 'Alterar', exact: true })
      .last()
      .click();
    await page
      .getByRole('button', { name: 'Na próxima entrega', exact: true })
      .click();
    await next();
    await page
      .getByRole('checkbox', { name: 'Já foi entregue', exact: true })
      .check();
    const delivered = page.getByLabel('Data e hora da entrega');
    await expect(delivered).toHaveValue(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    const yesterday = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Fortaleza',
    }).format(new Date(Date.now() - 86400000));
    await delivered.fill(yesterday + 'T14:00');
    await page.getByLabel('Registrar recebimento').selectOption('pix');
    await expect(page.getByLabel('Valor recebido (R$)')).toHaveValue('10,00');
    if (
      process.env.T17_CAPTURE === '1' &&
      info.project.name === 'chromium-mobile'
    ) {
      const fieldset = page.getByRole('group', {
        name: 'Entrega realizada',
        exact: true,
      });
      await fieldset.evaluate((node) =>
        node.scrollIntoView({ block: 'center' }),
      );
      await fieldset.screenshot({
        path: 'docs/colaboracao/capturas/t17-entrega-realizada.png',
      });
    }
    await page
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Pedido registrado como entregue' }),
    ).toBeVisible();
    const account = await call(
      'finance/customers/' + customer,
      undefined,
      'GET',
    );
    assertOrder(account.orders[0], yesterday);
    await page.goto(t.url + '/gestao/financeiro/' + customer);
    await expect(page.getByText(/Vencimento na próxima entrega/)).toBeVisible();
  } finally {
    await context.close();
    await t.dispose();
  }
});

function assertOrder(order, day) {
  expect(order).toMatchObject({
    status: 'delivered',
    business_date: day,
    paid_cents: 1000,
    receivable_cents: 0,
    terms: { mode: 'next_delivery' },
  });
}
