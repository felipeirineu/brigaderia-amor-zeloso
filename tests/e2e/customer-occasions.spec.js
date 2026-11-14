import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
// Somente fixtures DEMONSTRAÇÃO; nenhum cliente real ou cadastro remoto.
test('pessoa sem telefone faz pedido com kit, retirada, pagamento e ocasião', async ({
  browser,
}, info) => {
  test.setTimeout(120000);
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    mixedEnabled: true,
    fieldEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  await c.addInitScript(() => {
    window.__personCsp = [];
    window.addEventListener('securitypolicyviolation', (e) =>
      window.__personCsp.push(e.violatedDirective),
    );
  });
  try {
    const { call } = await demoProject(t);
    const flavor = (await call('products', undefined, 'GET'))[0].name;
    await call('p1/kits', {
      weight_grams: 15,
      dough_weight_grams: 13,
      units_per_kit: 25,
      price_cents: 12345,
      max_flavors: 5,
    });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes?novo=1');
    const sheet = p.getByRole('dialog', { name: 'Novo cliente', exact: true });
    await sheet.getByRole('button', { name: 'Pessoa', exact: true }).click();
    await sheet
      .getByLabel('Nome', { exact: true })
      .fill('Pessoa DEMONSTRAÇÃO E2E');
    await sheet
      .getByRole('button', { name: 'Salvar cliente', exact: true })
      .click();
    await expect(sheet).toBeHidden();
    const person = (await call('customers', undefined, 'GET')).find(
      (c) => c.name === 'Pessoa DEMONSTRAÇÃO E2E',
    );
    expect(person.customer_type).toBe('person');
    expect(person.phone).toBe('');
    await p.goto(t.url + '/gestao/clientes/' + person.id + '/b2b');
    await expect(
      p.getByRole('heading', {
        name: 'Dados da pessoa e condições',
        exact: true,
      }),
    ).toBeVisible();
    await expect(p.getByLabel('Estabelecimento', { exact: true })).toHaveCount(
      0,
    );
    await expect(p.getByText('Dias habituais', { exact: true })).toHaveCount(0);
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Pessoa DEMONSTRAÇÃO E2E', exact: true })
      .click();
    await expect(
      p.getByText('Pedido padrão para preencher', { exact: true }),
    ).toHaveCount(0);
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
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await p.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await p.getByRole('button', { name: '14:00', exact: true }).click();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await p.getByRole('button', { name: /^Retirada/ }).click();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await expect(
      p.getByRole('heading', { name: 'Como vai pagar?', exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole('button', { name: 'A prazo', exact: true }),
    ).toHaveCount(0);
    await expect(p.getByRole('button', { name: /^Continuar/ })).toBeDisabled();
    await p.getByRole('button', { name: 'Na entrega', exact: true }).click();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await p.getByRole('button', { name: 'Aniversário', exact: true }).click();
    await expect(
      p.getByText('Ocasião: Aniversário', { exact: true }),
    ).toBeVisible();
    await p
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await expect(
      p.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    ).toBeVisible();
    const order = (await call('orders', undefined, 'GET'))[0];
    expect(order.occasion).toBe('birthday');
    expect(order.delivery_type).toBe('pickup');
    const day = order.due_at.slice(0, 10);
    await p.goto(t.url + '/gestao?day=' + day);
    await expect(
      p.getByText('Ocasião: Aniversário', { exact: true }),
    ).toBeVisible();
    expect(await p.evaluate(() => window.__personCsp)).toEqual([]);
    // Detalhe legado contém select nativo (artefato CSP conhecido no WebKit local); a montagem acima mantém observador sem exceção.
    await p.goto(t.url + '/gestao/pedidos/' + order.id);
    await expect(
      p.getByText('Ocasião: Aniversário', { exact: true }),
    ).toBeVisible();
    const message = await call('orders/' + order.id + '/message', {
      kind: 'confirmation',
    });
    expect(message.message).toContain('Ocasião: Aniversário');
    expect(message.phone).toBe('');
    if (
      process.env.R15_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    ) {
      // Somente captura: WebKit injeta CSS no screenshot. O contexto funcional usa CSP real.
      const photoContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        bypassCSP: true,
        extraHTTPHeaders: {
          'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
        },
      });
      try {
        const photo = await photoContext.newPage();
        await photo.goto(t.url + '/api/access/start');
        await photo.goto(t.url + '/gestao?day=' + day);
        await expect(
          photo.getByText('Ocasião: Aniversário', { exact: true }),
        ).toBeVisible();
        await photo.screenshot({
          path: 'docs/colaboracao/capturas/r15-depois-pessoa-ocasiao.png',
          fullPage: false,
        });
      } finally {
        await photoContext.close();
      }
    }
  } finally {
    await c.close();
    await t.dispose();
  }
});

test('schema anterior mantém o cadastro da interface sem enviar campos novos', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    migrationLimit: 21,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    await demoProject(t);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes?novo=1');
    const sheet = p.getByRole('dialog', { name: 'Novo cliente', exact: true });
    await expect(
      sheet.getByRole('button', { name: 'Pessoa', exact: true }),
    ).toHaveCount(0);
    await sheet
      .getByLabel('Nome', { exact: true })
      .fill('Cliente legado DEMONSTRAÇÃO');
    const request = p.waitForRequest(
      (r) => r.url().endsWith('/api/customers') && r.method() === 'POST',
    );
    await sheet
      .getByRole('button', { name: 'Salvar cliente', exact: true })
      .click();
    expect((await request).postDataJSON()).not.toHaveProperty('customer_type');
    await expect(sheet).toBeHidden();
    await expect(
      p.getByRole('button', {
        name: 'Editar Cliente legado DEMONSTRAÇÃO',
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await c.close();
    await t.dispose();
  }
});
