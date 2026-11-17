import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

test('kits em pedido padrão: montar, gerar rascunho e reutilizar no celular e PC', async ({
  browser,
}, info) => {
  test.setTimeout(120000);
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
  const recordCsp = () => {
    window.__kitCsp = [];
    window.addEventListener('securitypolicyviolation', (e) =>
      window.__kitCsp.push(e.violatedDirective),
    );
  };
  let mobile;
  try {
    const { call, customer } = await demoProject(t);
    const products = await call('products', undefined, 'GET');
    const flavor = products[0].name;
    await call('p1/kits', {
      weight_grams: 15,
      dough_weight_grams: 13,
      units_per_kit: 25,
      price_cents: 12345,
      max_flavors: 5,
    });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/recorrentes');
    await p
      .getByLabel('Nome do modelo', { exact: true })
      .fill('Kit recorrente DEMONSTRAÇÃO');
    await p
      .getByRole('combobox', { name: 'Cliente', exact: true })
      .selectOption(customer);
    await p
      .getByRole('group', { name: 'Tipo de entrega', exact: true })
      .getByRole('button', { name: 'Retirada', exact: true })
      .click();
    await p.getByRole('button', { name: 'Montar kit', exact: true }).click();
    await p
      .getByRole('button', {
        name: 'Escolher ' + flavor + ' para completar',
        exact: true,
      })
      .click();
    await p
      .getByRole('button', { name: 'Completar com ' + flavor, exact: true })
      .click();
    await p
      .getByRole('button', { name: 'Adicionar kit ao pedido', exact: true })
      .click();
    await p
      .getByRole('button', { name: 'Salvar pedido padrão', exact: true })
      .click();
    await expect(
      p.getByRole('status').filter({ hasText: 'Pedido padrão salvo' }),
    ).toBeVisible();
    const model = (await call('recurring', undefined, 'GET'))[0];
    expect(model.items).toEqual([]);
    expect(model.kit_items[0].components[0].units).toBe(25);
    await p
      .getByLabel('Segunda-feira da semana', { exact: true })
      .fill('2030-01-07');
    await p
      .getByRole('button', { name: 'Gerar pedidos da semana', exact: true })
      .click();
    await expect(p.getByText(/1 rascunho\(s\) criado\(s\)/)).toBeVisible();
    let orders = await call('orders', undefined, 'GET');
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe('draft');
    expect(orders[0].total_cents).toBe(12345);
    // O editor completo também recebe a composição do modelo, sem exigir variante artificial.
    await p.goto(t.url + '/gestao/pedidos');
    // Escolha explícita e aguardada: o padrão agora é simples também para owner.
    await p
      .getByRole('button', { name: 'Lista completa', exact: true })
      .click();
    await p
      .getByRole('combobox', { name: 'Cliente', exact: true })
      .selectOption(customer);
    await expect(
      p.getByLabel('Quantos kits iguais de Kit 25 · 15 g', { exact: true }),
    ).toHaveValue('1');
    // Aparelho separado: preferências do editor PC não interferem no modo simples.
    mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
    await mobile.addInitScript(recordCsp);
    const phone = await mobile.newPage();
    await phone.goto(t.url + '/api/access/start');
    await phone.goto(t.url + '/gestao/pedidos?novo=1');
    await phone
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await expect(
      phone.getByLabel('Quantos kits iguais de Kit 25 · 15 g', { exact: true }),
    ).toHaveValue('1');
    await expect(
      phone.getByRole('button', { name: /^Continuar/ }),
    ).toContainText('R$ 123,45');
    orders = await call('orders', undefined, 'GET');
    expect(orders).toHaveLength(1);
    expect(await phone.evaluate(() => window.__kitCsp)).toEqual([]);
    if (
      process.env.R15_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    ) {
      // Somente captura: screenshot do WebKit injeta CSS; o contexto funcional acima usa CSP real.
      const capture = await browser.newContext({
        viewport: { width: 390, height: 844 },
        bypassCSP: true,
        extraHTTPHeaders: {
          'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
        },
      });
      try {
        const photo = await capture.newPage();
        await photo.goto(t.url + '/api/access/start');
        await photo.goto(t.url + '/gestao/pedidos?novo=1');
        await photo
          .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
          .click();
        await expect(
          photo.getByLabel('Quantos kits iguais de Kit 25 · 15 g', {
            exact: true,
          }),
        ).toHaveValue('1');
        await photo.screenshot({
          path: 'docs/colaboracao/capturas/r15-depois-modelo-kit.png',
          fullPage: true,
        });
      } finally {
        await capture.close();
      }
    }
    await call(
      'recurring/' + model.id,
      {
        customer_id: customer,
        name: model.name,
        weekday: model.weekday,
        time: model.time,
        delivery_type: 'pickup',
        version: model.version,
        active: false,
        items: [],
        kit_items: model.kit_items.map((i) => ({
          item_id: i.id,
          kit_id: i.kit_id,
          quantity: i.quantity,
          components: i.components.map((c) => ({
            product_id: c.product_id,
            units: c.units,
          })),
        })),
      },
      'PUT',
    );
    await phone.goto(t.url + '/gestao/pedidos?novo=1');
    await phone
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await phone
      .getByRole('button', { name: 'Repetir último pedido', exact: true })
      .click();
    await expect(
      phone.getByLabel('Quantos kits iguais de Kit 25 · 15 g', { exact: true }),
    ).toHaveValue('1');
    expect(await phone.evaluate(() => window.__kitCsp)).toEqual([]);
  } finally {
    await mobile?.close();
    await c.close();
    await t.dispose();
  }
});
