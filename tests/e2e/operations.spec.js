import { selectWorkday } from '../helpers/select-workday.mjs';
import { expect, test } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';

test('operação móvel: Hoje por papel, status/desfazer, recorrência, WhatsApp e ajuda', async ({
  browser,
}, testInfo) => {
  test.setTimeout(90000);
  const t = await runtime({ browserHTTP: true });
  const owner = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  const operator = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const cookie = await t.login('owner@example.test');
    async function write(path, data, method = 'POST') {
      const r = await t.request(path, {
        method,
        data,
        cookie,
        key: crypto.randomUUID(),
      });
      expect(r.ok).toBe(true);
      return r.json();
    }
    const customer = await write('customers', {
      name: 'Cliente DEMONSTRAÇÃO operacional',
      phone: '+5511900000000',
    });
    const product = await write('products', {
      name: 'Produto DEMONSTRAÇÃO operacional',
      variants: [
        {
          label: 'Embalagem fictícia',
          weight_grams: 10,
          units_per_box: 2,
          price_cents: 100,
        },
      ],
    });
    const products = await (
      await t.request('products/' + product.id, { cookie })
    ).json();
    const variant = products.variants[0].id;
    const order = await write('orders', {
      customer_id: customer.id,
      due_at: '2030-01-07T13:00:00.000Z',
      items: [{ variant_id: variant, quantity: 2 }],
    });
    await write(
      `orders/${order.id}/delivery`,
      {
        version: 1,
        delivery_type: 'delivery',
        delivery_address: 'Endereço de DEMONSTRAÇÃO',
        courier: 'partner',
      },
      'PUT',
    );
    await write(`orders/${order.id}/status`, { version: 2, to: 'confirmed' });
    const page = await owner.newPage();
    await page.goto(t.url + '/login');
    await page.getByRole('link', { name: 'Entrar com acesso seguro' }).click();
    await expect(
      page.getByRole('heading', { name: 'Hoje', exact: true }),
    ).toBeVisible();
    await selectWorkday(page, '2030-01-07');
    await expect(page.locator('.production-list')).toContainText('4 unidades');
    await page.screenshot({
      path: `test-results/today-owner-${testInfo.project.name}.png`,
      fullPage: true,
    });
    const help = page.getByRole('button', { name: 'Ajuda: Produzir hoje' });
    await help.click();
    await expect(
      page.getByRole('dialog', { name: 'Produzir hoje' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(help).toBeFocused();
    await page.getByText('Mais ações do pedido', { exact: true }).click();
    await page.getByRole('link', { name: 'Abrir pedido', exact: true }).click();
    for (const name of [
      'Iniciar produção',
      'Marcar pronto',
      'Saiu para entrega',
    ]) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(
        0,
      );
    }
    const second = await operator.newPage();
    await second.clock.setFixedTime(new Date('2030-01-07T12:00:00Z'));
    await second.goto(t.url + '/login');
    await second
      .getByRole('link', { name: 'Entrar com acesso seguro' })
      .click();
    await expect(
      second.getByRole('heading', { name: 'Hoje', exact: true }),
    ).toBeVisible();
    await selectWorkday(second, '2030-01-07');
    await expect(
      second.getByRole('button', { name: 'Ajuda: Produzir hoje' }),
    ).toHaveCount(0);
    await expect(
      second.getByRole('button', { name: 'Marcar entregue', exact: true }),
    ).toBeVisible();
    const actionButtons = second
      .locator('.order-card .actions')
      .locator('a,button');
    for (const action of await actionButtons.all()) {
      const box = await action.boundingBox();
      expect(box.height).toBeLessThan(110);
    }
    await second.screenshot({
      path: `test-results/today-operator-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await second
      .getByRole('button', { name: 'Marcar entregue', exact: true })
      .click();
    await second
      .getByRole('button', { name: 'Desfazer entrega', exact: true })
      .click();
    await expect(
      second.getByRole('button', { name: 'Marcar entregue', exact: true }),
    ).toBeVisible();
    await second.getByRole('link', { name: 'WhatsApp', exact: true }).click();
    await second
      .getByRole('button', { name: 'Preparar mensagem', exact: true })
      .click();
    await expect(
      second.getByRole('link', {
        name: 'Abrir WhatsApp para conferir e enviar',
      }),
    ).toHaveAttribute('href', /^https:\/\/wa\.me\/5511900000000\?text=/);
    await second
      .getByRole('button', { name: 'Marcar contato realizado' })
      .click();
    await expect(second.getByRole('status')).toContainText(
      'Contato anotado manualmente',
    );
    await page.goto(t.url + '/gestao/recorrentes');
    await page.getByLabel('Nome do modelo').fill('Modelo semanal DEMONSTRAÇÃO');
    await page
      .getByRole('combobox', { name: 'Cliente', exact: true })
      .selectOption(customer.id);
    await page
      .getByRole('combobox', { name: 'Variante', exact: true })
      .selectOption(variant);
    await page
      .getByRole('button', { name: 'Aumentar quantidade do item 1' })
      .click();
    await page
      .getByLabel('Endereço para copiar aos novos pedidos')
      .fill('Endereço de DEMONSTRAÇÃO');
    await page
      .getByRole('button', { name: 'Salvar pedido padrão', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Modelo semanal DEMONSTRAÇÃO' }),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: 'Editar Modelo semanal DEMONSTRAÇÃO',
        exact: true,
      })
      .click();
    // R3: zero inicial fica vazio; o valor anterior é restaurado ao sair vazio.
    await expect(page.getByLabel('Taxa padrão do entregador (R$)')).toHaveValue(
      '',
    );
    await expect(
      page.getByLabel('Taxa padrão do entregador (R$)'),
    ).toHaveAttribute('placeholder', 'Informe valor');
    await page.getByLabel('Taxa padrão do entregador (R$)').fill('2,50');
    await page
      .getByRole('combobox', { name: 'Entregador padrão', exact: true })
      .selectOption('partner');
    await page
      .getByRole('button', { name: 'Salvar pedido padrão', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Editar modelo', exact: true }),
    ).toHaveCount(0);
    await page.getByLabel('Segunda-feira da semana').fill('2030-01-07');
    await page
      .getByRole('button', { name: 'Gerar pedidos da semana', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText(
      '1 rascunho(s) criado(s)',
    );
    await page
      .getByRole('button', { name: 'Gerar pedidos da semana', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText(
      '0 rascunho(s) criado(s); 1 já existente(s)',
    );
    await page
      .getByRole('checkbox', {
        name: 'Revisado: Cliente DEMONSTRAÇÃO operacional',
      })
      .check();
    page.once('dialog', (d) => d.accept());
    await page
      .getByRole('button', {
        name: 'Confirmar todos os revisados (1)',
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'pedido(s) confirmado(s)' }),
    ).toContainText('1 pedido(s) confirmado(s)');
    await page.goto(t.url + '/gestao/ajuda');
    const writes = [];
    page.on('request', (r) => {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(r.method()))
        writes.push(r.url());
    });
    await page.getByRole('button', { name: 'Marcar exemplo entregue' }).click();
    await expect(page.getByRole('status')).toContainText(
      'Exemplo marcado como entregue',
    );
    expect(writes).toHaveLength(0);
    const menu = page.getByRole('button', { name: /Abrir menu de/ });
    if (await menu.isVisible()) await menu.click();
    await page
      .getByRole('button', { name: 'Conhecer o app', exact: true })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Passeio guiado' }),
    ).toBeVisible();
    for (let i = 0; i < 4; i++)
      await page.getByRole('button', { name: 'Próximo', exact: true }).click();
    await page.getByRole('button', { name: 'Concluir', exact: true }).click();
    expect(
      await page.evaluate(() => localStorage.getItem('az-tour-owner')),
    ).toBe('done');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/operations-${testInfo.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await owner.close();
    await operator.close();
    await t.dispose();
  }
});
