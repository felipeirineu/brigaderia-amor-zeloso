import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { mixedAnalysisProject } from '../helpers/mixed-analysis-project.mjs';
test('modelo misto gera composição e editor completo altera caixas e sabores', async ({
  browser,
}, info) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    mixedEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, variants, customer } = await mixedAnalysisProject(t);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await expect(
      p.getByRole('heading', { name: 'Entregas do dia', exact: true }),
    ).toBeVisible();
    await p.goto(t.url + '/gestao/recorrentes');
    await p
      .getByLabel('Nome do modelo', { exact: true })
      .fill('Modelo DEMONSTRAÇÃO E2E misto');
    await p
      .getByRole('combobox', { name: 'Cliente', exact: true })
      .selectOption(customer);
    const first = p.getByRole('group', { name: 'Item 1', exact: true });
    await first
      .getByRole('combobox', { name: 'Variante', exact: true })
      .selectOption(variants[0].id);
    await first.getByLabel('Caixa mista', { exact: true }).check();
    await first
      .getByLabel('Unidades de Alfa DEMONSTRAÇÃO — Caixa DEMONSTRAÇÃO', {
        exact: true,
      })
      .fill('8');
    await first
      .getByLabel('Unidades de Beta DEMONSTRAÇÃO — Caixa DEMONSTRAÇÃO', {
        exact: true,
      })
      .fill('4');
    await first.getByLabel('Embalagens', { exact: true }).fill('2');
    await expect(first).toContainText('Composição completa.');
    await p
      .getByRole('button', { name: 'Salvar pedido padrão', exact: true })
      .click();
    await expect(
      p.getByRole('status').filter({ hasText: 'Pedido padrão salvo' }),
    ).toBeVisible();
    const models = await call('recurring', undefined, 'GET');
    const model = models.find(
      (m) => m.name === 'Modelo DEMONSTRAÇÃO E2E misto',
    );
    expect(model.items[0].components.map((c) => c.units).sort()).toEqual([
      4, 8,
    ]);
    await p
      .getByLabel('Segunda-feira da semana', { exact: true })
      .fill('2030-01-07');
    await p
      .getByRole('button', { name: 'Gerar pedidos da semana', exact: true })
      .click();
    await expect(p.getByText(/1 rascunho\(s\) criado\(s\)/)).toBeVisible();
    const generated = (await call('orders', undefined, 'GET')).find(
      (o) => o.order_type === 'recurring',
    );
    expect(generated.items[0].quantity).toBe(2);
    expect(generated.items[0].components).toHaveLength(2);
    // Lista completa é o editor clássico mesmo quando aberta em dispositivo móvel.
    await p.goto(t.url + '/gestao/pedidos');
    if (
      await p
        .getByRole('button', { name: 'Lista completa', exact: true })
        .count()
    )
      await p
        .getByRole('button', { name: 'Lista completa', exact: true })
        .click();
    await p
      .getByRole('button', {
        name: 'Editar pedido de Cliente DEMONSTRAÇÃO P1',
        exact: true,
      })
      .click();
    const item = p.getByRole('group', { name: 'Item 1', exact: true });
    await expect(item.getByLabel('Caixa mista', { exact: true })).toBeChecked();
    await expect(
      item.getByLabel('Unidades de Alfa DEMONSTRAÇÃO — Caixa DEMONSTRAÇÃO', {
        exact: true,
      }),
    ).toHaveValue('8');
    await item
      .getByLabel('Quantidade de embalagens', { exact: true })
      .fill('3');
    let response = p.waitForResponse(
      (r) =>
        r.url().endsWith('/api/orders/' + generated.id) &&
        r.request().method() === 'PUT',
    );
    await p.getByRole('button', { name: 'Salvar pedido', exact: true }).click();
    const savedResponse = await response;
    expect(savedResponse.status(), await savedResponse.text()).toBe(200);
    let updated = await call('orders/' + generated.id, undefined, 'GET');
    expect(updated.items[0].id).toBe(generated.items[0].id);
    expect(updated.items[0].quantity).toBe(3);
    expect(updated.items[0].components).toHaveLength(2);
    await p
      .getByRole('button', {
        name: 'Editar pedido de Cliente DEMONSTRAÇÃO P1',
        exact: true,
      })
      .click();
    await item
      .getByLabel('Unidades de Alfa DEMONSTRAÇÃO — Caixa DEMONSTRAÇÃO', {
        exact: true,
      })
      .fill('5');
    await item
      .getByLabel('Unidades de Beta DEMONSTRAÇÃO — Caixa DEMONSTRAÇÃO', {
        exact: true,
      })
      .fill('7');
    if (
      process.env.R14_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    )
      await item.screenshot({
        path: 'docs/colaboracao/capturas/r14-depois-editor-misto.png',
      });
    response = p.waitForResponse(
      (r) =>
        r.url().endsWith('/api/orders/' + generated.id) &&
        r.request().method() === 'PUT',
    );
    await p.getByRole('button', { name: 'Salvar pedido', exact: true }).click();
    const changedResponse = await response;
    expect(changedResponse.status(), await changedResponse.text()).toBe(200);
    updated = await call('orders/' + generated.id, undefined, 'GET');
    expect(updated.items[0].variant_id).toBe(variants[1].id);
    expect(updated.items[0].components.map((c) => c.units).sort()).toEqual([
      5, 7,
    ]);
    expect(updated.total_cents).toBe(6009);
  } finally {
    await c.close();
    await t.dispose();
  }
});
