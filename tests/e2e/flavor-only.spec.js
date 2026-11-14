import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('administrador cadastra só o sabor e operadora o usa num kit sem embalagem artificial', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    mixedEnabled: true,
  });
  const admin = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  const op = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  await op.addInitScript(() => {
    window.__flavorCsp = [];
    window.addEventListener('securitypolicyviolation', (e) =>
      window.__flavorCsp.push(e.violatedDirective),
    );
  });
  try {
    const { call } = await demoProject(t);
    const name = 'Sabor sem embalagem DEMONSTRAÇÃO';
    const p = await admin.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/produtos');
    await p.getByLabel('Nome do produto', { exact: true }).fill(name);
    await p
      .getByRole('button', { name: 'Somente sabor (para kits)', exact: true })
      .click();
    await expect(p.getByLabel('Nome da variante', { exact: true })).toHaveCount(
      0,
    );
    await p
      .getByRole('button', { name: 'Salvar produto', exact: true })
      .click();
    await expect(
      p.getByRole('button', { name: 'Editar ' + name, exact: true }),
    ).toBeVisible();
    const product = (await call('products', undefined, 'GET')).find(
      (p) => p.name === name,
    );
    expect(product.variants).toEqual([]);
    await call('p1/kits', {
      weight_grams: 30,
      units_per_kit: 12,
      price_cents: 1234,
      max_flavors: 3,
    });
    const phone = await op.newPage();
    await phone.goto(t.url + '/api/access/start');
    await phone.goto(t.url + '/gestao/pedidos?novo=1');
    await phone
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await expect(
      phone.getByText('Toque no sabor para somar 1 kit.', { exact: true }),
    ).toBeVisible();
    await phone
      .getByRole('button', { name: 'Adicionar kit de ' + name, exact: true })
      .click();
    await expect(
      phone.getByRole('button', { name: /^Continuar/ }),
    ).toContainText('R$ 12,34');
    await phone.getByRole('button', { name: /^Continuar/ }).click();
    await phone.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await phone.getByRole('button', { name: '14:00', exact: true }).click();
    await phone.getByRole('button', { name: /^Continuar/ }).click();
    await phone.getByRole('button', { name: /^Retirada/ }).click();
    await phone.getByRole('button', { name: /^Continuar/ }).click();
    await phone
      .getByRole('button', { name: 'Na entrega', exact: true })
      .click();
    await phone.getByRole('button', { name: /^Continuar/ }).click();
    await phone
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await expect(
      phone.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    ).toBeVisible();
    const order = (await call('orders', undefined, 'GET'))[0];
    expect(order.items[0].components[0].product_name).toBe(name);
    expect(
      (await call('products/' + product.id, undefined, 'GET')).variants,
    ).toEqual([]);
    expect(await phone.evaluate(() => window.__flavorCsp)).toEqual([]);
  } finally {
    await admin.close();
    await op.close();
    await t.dispose();
  }
});

test('catálogo0019 sem itens de kit mantém pedido pelas embalagens anteriores', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    migrationLimit: 19,
    financeEnabled: true,
    p1Enabled: true,
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
    await call('p1/kits', {
      weight_grams: 30,
      units_per_kit: 12,
      price_cents: 1234,
      max_flavors: 3,
    });
    const session = await call('session', undefined, 'GET');
    expect(session.kit_orders).toBe(false);
    expect(session.kit_recurring).toBe(false);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await expect(
      p.getByRole('button', { name: 'Montar kit', exact: true }),
    ).toHaveCount(0);
    await p
      .getByRole('button', { name: 'Produto DEMONSTRAÇÃO P1, adicionar' })
      .click();
    await expect(p.getByRole('button', { name: /^Continuar/ })).toContainText(
      'R$ 10,00',
    );
    await p.goto(t.url + '/gestao/recorrentes');
    await expect(
      p.getByRole('button', { name: 'Montar kit', exact: true }),
    ).toHaveCount(0);
  } finally {
    await c.close();
    await t.dispose();
  }
});
