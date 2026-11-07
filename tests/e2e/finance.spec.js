import { expect, test } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
test('B2B, pedido preenchido, sinal, fechamento, Pix assistido e tutorial sem gravação', async ({
  browser,
}, testInfo) => {
  test.setTimeout(120000);
  const t = await runtime({ browserHTTP: true, financeEnabled: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const cookie = await t.login('owner@example.test');
    async function api(path, data, method = 'POST') {
      const r = await t.request(path, {
        cookie,
        method,
        data,
        key: crypto.randomUUID(),
      });
      expect(r.ok, `${path}: ${r.status}`).toBe(true);
      return r.json();
    }
    const c = await api('customers', {
      name: 'Cliente DEMONSTRAÇÃO E2E financeiro',
      phone: '+5511900000000',
    });
    const noModel = await api('customers', {
      name: 'Cliente DEMONSTRAÇÃO sem padrão',
      phone: '+5511900000001',
    });
    const p = await api('products', {
      name: 'Produto DEMONSTRAÇÃO',
      variants: [
        {
          label: 'Caixa fictícia',
          weight_grams: 10,
          units_per_box: 2,
          price_cents: 1000,
        },
      ],
    });
    const product = await api('products/' + p.id, undefined, 'GET'),
      v = product.variants[0].id;
    await api('recurring', {
      name: 'Modelo DEMONSTRAÇÃO financeiro',
      customer_id: c.id,
      weekday: 1,
      time: '10:00',
      delivery_address: 'Endereço DEMONSTRAÇÃO',
      courier: 'partner',
      items: [{ variant_id: v, quantity: 2 }],
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('dialog', (d) => d.accept('Motivo de DEMONSTRAÇÃO'));
    await page.goto(t.url + '/login');
    await page.getByRole('link', { name: 'Entrar com acesso seguro' }).click();
    await expect(
      page.getByRole('heading', { name: 'Hoje', exact: true }),
    ).toBeVisible();
    await page.goto(t.url + `/gestao/clientes/${c.id}/b2b`);
    await page
      .getByLabel('Estabelecimento', { exact: true })
      .fill('Loja DEMONSTRAÇÃO');
    await page.getByLabel('Quando cobrar').selectOption('credit');
    await page.getByLabel('Prazo após fechamento (dias)').fill('3');
    await page
      .getByRole('button', { name: 'Salvar padrões do cliente' })
      .click();
    await expect(page.getByRole('status')).toContainText('Padrões salvos');
    await page.goto(t.url + '/gestao/pedidos');
    await page
      .getByRole('combobox', { name: 'Cliente', exact: true })
      .selectOption(c.id);
    await expect(page.getByLabel('Quantidade de embalagens')).toHaveValue('2');
    await expect(
      page.getByLabel('Data e hora combinadas (João Pessoa)'),
    ).not.toHaveValue('');
    await page
      .getByRole('combobox', { name: 'Cliente', exact: true })
      .selectOption(noModel.id);
    await expect(
      page.getByLabel('Data e hora combinadas (João Pessoa)'),
    ).toHaveValue('');
    await expect(
      page.getByRole('combobox', { name: 'Variante', exact: true }),
    ).toHaveValue('');
    await page
      .getByRole('combobox', { name: 'Cliente', exact: true })
      .selectOption(c.id);
    await expect(page.getByLabel('Quantidade de embalagens')).toHaveValue('2');
    await page
      .getByRole('button', { name: 'Salvar pedido', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText('Alteração salva');
    await page.getByRole('link', { name: 'Abrir pedido', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Iniciar produção', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('link', { name: 'Conta, condição e recebimentos' })
      .click();
    await page.getByLabel('Valor recebido (R$)').fill('5,00');
    await page
      .getByRole('combobox', { name: 'Tipo', exact: true })
      .selectOption('deposit');
    await page
      .getByRole('button', { name: 'Registrar recebimento', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText(
      'Recebimento registrado',
    );
    await expect(
      page.getByRole('heading', { name: 'Sinal · R$ 5,00' }),
    ).toBeVisible();
    // Entrega pretérita fictícia para exercitar fechamento de período já encerrado.
    const o = await api('orders', {
      customer_id: c.id,
      due_at: '2025-01-07T13:00:00.000Z',
      items: [{ variant_id: v, quantity: 1 }],
    });
    await api(
      `orders/${o.id}/delivery`,
      { version: 1, delivery_type: 'pickup', courier: 'unassigned' },
      'PUT',
    );
    for (const [i, to] of [
      'confirmed',
      'in_production',
      'ready',
      'picked_up',
    ].entries())
      await api(`orders/${o.id}/status`, { version: 2 + i, to });
    await t.db
      .prepare(
        "UPDATE order_status_events SET created_at=unixepoch('2025-01-07T13:00:00Z') WHERE organization_id=? AND order_id=?",
      )
      .bind(t.org, o.id)
      .run();
    await page.reload();
    await page
      .getByRole('button', {
        name: 'Fechar período desta entrega',
        exact: true,
      })
      .click();
    await expect(page.getByRole('status')).toContainText('Fechamento gerado');
    await page
      .getByRole('button', { name: 'Cobrar fechamento no WhatsApp' })
      .click();
    await expect(
      page.getByRole('link', { name: 'Abrir WhatsApp para conferir e enviar' }),
    ).toHaveAttribute('href', /^https:\/\/wa\.me\/5511900000000\?text=/);
    await expect(
      page.getByRole('textbox', { name: 'Pix copia e cola', exact: true }),
    ).toHaveCount(0);
    await page.goto(t.url + '/gestao/financeiro/pix');
    await page.getByLabel('Tipo de chave').selectOption('email');
    await page
      .getByLabel('Chave Pix', { exact: true })
      .fill('pix@example.test');
    await page.getByLabel('Nome do recebedor').fill('DEMONSTRACAO');
    await page.getByLabel('Cidade do recebedor').fill('CIDADE TESTE');
    await page.getByRole('button', { name: 'Salvar configuração Pix' }).click();
    await expect(page.getByRole('status')).toContainText('Dados Pix salvos');
    await page.goto(t.url + `/gestao/financeiro/${c.id}`);
    await page
      .getByRole('button', { name: 'Cobrar no WhatsApp', exact: true })
      .click();
    await expect(
      page.getByRole('textbox', { name: 'Pix copia e cola', exact: true }),
    ).toHaveValue(/^000201/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/finance-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.goto(t.url + '/gestao/ajuda');
    const writes = [];
    page.on('request', (r) => {
      if (['POST', 'PUT', 'DELETE'].includes(r.method())) writes.push(r.url());
    });
    await page
      .getByRole('button', { name: 'Exemplo: registrar sinal de R$ 3,00' })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Recebido no exemplo' }),
    ).toContainText('R$ 3,00');
    expect(writes).toHaveLength(0);
  } finally {
    await context.close();
    await t.dispose();
  }
});
