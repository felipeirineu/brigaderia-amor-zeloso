import { expect, test } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

test('T22 registra troca no novo pedido, detalhe e relatório', async ({
  browser,
}, info) => {
  test.setTimeout(65000);
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
    const { call, operator, customer, variant } = await demoProject(t);
    const supply = await call('p1/supplies', {
      name: 'Insumo DEMONSTRAÇÃO T22',
      unit: 'unit',
      pack_quantity_milli: 1000,
      pack_cost_cents: 86,
    });
    await call('p1/recipes', {
      name: 'Ficha DEMONSTRAÇÃO T22',
      variant_id: variant,
      yield_units: 1,
      packaging_cents: 0,
      labor_cents: 0,
      overhead_cents: 0,
      margin_bps: 0,
      unmeasured_bps: 0,
      components: [{ supply_id: supply.id, quantity_milli: 1000 }],
    });
    const page = await context.newPage();
    await page.goto(t.url + '/api/access/start');
    await page.goto(t.url + '/gestao/pedidos?novo=1');
    await page
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await page
      .getByRole('button', {
        name: 'Produto DEMONSTRAÇÃO P1, adicionar',
        exact: true,
      })
      .click();
    const plus = page.getByRole('button', {
      name: 'Aumentar quantidade de Produto DEMONSTRAÇÃO P1',
    });
    await plus.click();
    await plus.click();
    await page.getByRole('switch', { name: 'Teve troca de doces?' }).check();
    await page
      .getByRole('button', { name: 'Aumentar doces recolhidos' })
      .click();
    const summary = page.locator('.exchange-summary');
    await expect(summary).toContainText('6 doces');
    await expect(summary).toContainText('4 doces');
    await expect(summary).toContainText('20,00');
    const capture = async (name, target) => {
      if (
        process.env.T22_CAPTURE === '1' &&
        info.project.name === 'chromium-mobile'
      ) {
        await target.evaluate((node) =>
          node.scrollIntoView({ block: 'center' }),
        );
        await target.screenshot({
          path: 'docs/colaboracao/capturas/t22-' + name + '.png',
          animations: 'disabled',
        });
      }
    };
    await capture(
      'editar',
      page.getByRole('region', { name: 'Troca de doces' }),
    );
    await capture('resumo', summary);
    const next = () => page.getByRole('button', { name: /^Continuar/ }).click();
    await next();
    await page.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await page.getByRole('button', { name: '14:00', exact: true }).click();
    await next();
    await page
      .getByLabel('Endereço desta entrega')
      .fill('Endereço DEMONSTRAÇÃO T22');
    await page
      .getByRole('group', { name: 'Quem leva' })
      .getByRole('button')
      .nth(1)
      .click();
    await next();
    await page
      .getByRole('button', { name: 'Na próxima entrega', exact: true })
      .click();
    await next();
    await expect(summary).toContainText('20,00');
    await page
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Pedido confirmado' }),
    ).toBeVisible();
    const [order] = await call('orders', undefined, 'GET', operator);
    await page.goto(t.url + '/gestao/pedidos/' + order.id);
    await expect(page.locator('.exchange-badge')).toContainText(
      'Troca: 2 doces · 6 entregues · cobrados 4',
    );
    await capture('detalhe', page.locator('.exchange-badge'));
    await page.getByRole('button', { name: 'Editar troca de doces' }).click();
    await page
      .getByRole('button', { name: 'Diminuir doces recolhidos' })
      .click();
    await page.getByRole('button', { name: 'Salvar troca' }).click();
    await expect(page.locator('.exchange-badge')).toContainText(
      'Troca: 1 doce',
    );
    const current = await call(
      'orders/' + order.id,
      undefined,
      'GET',
      operator,
    );
    await call(
      'orders-batch',
      {
        action: 'complete',
        orders: [
          {
            id: current.id,
            version: current.version,
            key: crypto.randomUUID(),
          },
        ],
      },
      'POST',
      operator,
    );
    await page.goto(t.url + '/gestao/relatorios');
    const losses = page.getByText('Perdas por troca · 1 doce', {
      exact: false,
    });
    await expect(losses).toContainText('custo estimado R$ 0,86');
    await expect(page.getByText('Doces vendidos: 5')).toBeVisible();
    await capture('relatorio', losses);
    await page.goto(t.url + '/gestao/financeiro/' + customer);
    await expect(page.locator('.exchange-badge')).toContainText('cobrados 5');
    await page.goto(t.url + '/gestao/pedidos?novo=1');
    await page
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await page.getByRole('button', { name: 'Repetir último pedido' }).click();
    await expect(
      page.getByRole('switch', { name: 'Teve troca de doces?' }),
    ).not.toBeChecked();
  } finally {
    await context.close();
    await t.dispose();
  }
});

test('T22 salva e edita a troca também no formulário de computador', async ({
  browser,
}, info) => {
  test.skip(
    info.project.name !== 'chromium-desktop',
    'Formulário de computador',
  );
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 860 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, customer, variant } = await demoProject(t);
    const page = await context.newPage();
    await page.goto(t.url + '/api/access/start');
    await page.goto(t.url + '/gestao/pedidos');
    await page
      .getByRole('button', { name: 'Lista completa', exact: true })
      .click();
    const form = page.locator('form.desktop-order-editor');
    await form
      .getByRole('combobox', { name: 'Cliente', exact: true })
      .selectOption(customer);
    await form
      .getByLabel('Data e hora combinadas (João Pessoa)')
      .fill('2031-01-07T14:00');
    await form
      .getByRole('combobox', { name: 'Sabor', exact: true })
      .selectOption(variant);
    await form.getByRole('switch', { name: 'Teve troca de doces?' }).check();
    await expect(form.locator('.exchange-summary')).toContainText('5,00');
    await form.getByRole('button', { name: 'Salvar pedido' }).click();
    await expect(
      page.locator('.desktop-order-list .exchange-badge'),
    ).toContainText('Troca: 1 doce');
    await page
      .getByRole('button', { name: 'Editar pedido de Cliente DEMONSTRAÇÃO P1' })
      .click();
    await expect(
      form.getByRole('switch', { name: 'Teve troca de doces?' }),
    ).toBeChecked();
    await form.getByRole('switch', { name: 'Teve troca de doces?' }).uncheck();
    await form.getByRole('button', { name: 'Salvar pedido' }).click();
    await expect(
      page.locator('.desktop-order-list .exchange-badge'),
    ).toHaveCount(0);
    const [order] = await call('orders', undefined, 'GET');
    expect(order).toMatchObject({ exchange_units: 0, total_cents: 1000 });
  } finally {
    await context.close();
    await t.dispose();
  }
});
