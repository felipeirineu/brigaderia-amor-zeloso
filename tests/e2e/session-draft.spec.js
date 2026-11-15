import { createServer } from 'node:http';
import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const prefix = 'az-order-draft:';
const snapshot = (p) =>
  p.evaluate(() =>
    Object.fromEntries(
      Object.entries(sessionStorage).filter(([k]) =>
        k.startsWith('az-order-draft:'),
      ),
    ),
  );
async function whenAndReview(p) {
  await p.getByRole('button', { name: /^Continuar/ }).click();
  await expect(
    p.getByRole('heading', { name: 'Quando entregar?', exact: true }),
  ).toBeVisible();
  await p.getByRole('button', { name: 'Amanhã', exact: true }).click();
  await p.getByRole('button', { name: '14:00', exact: true }).click();
  await p.getByRole('button', { name: /^Continuar/ }).click();
  await p.getByRole('button', { name: /^Retirada/ }).click();
  await p.getByRole('button', { name: /^Continuar/ }).click();
  await p.getByRole('button', { name: 'Na entrega', exact: true }).click();
  await p.getByRole('button', { name: /^Continuar/ }).click();
  await expect(
    p.getByRole('heading', { name: 'Revise e confirme', exact: true }),
  ).toBeVisible();
}
test('R17 expira sessão real, recupera só seleção e exige de novo a confirmação de repetido', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
    mixedEnabled: true,
  });
  // Origem distinta, controlada e sem login real: exercita o retorno da aba sob COOP/COEP.
  const provider = createServer((_, res) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<h1>Provedor local DEMONSTRAÇÃO</h1>');
  });
  await new Promise((r) => provider.listen(0, '127.0.0.1', r));
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, customer, variant, makeOrder } = await demoProject(t);
    const tomorrow = new Date(Date.now() + 86400000 - 10800000)
      .toISOString()
      .slice(0, 10);
    await makeOrder(tomorrow + 'T14:00:00-03:00', 1);
    const p = await c.newPage();
    await p.addInitScript(() => {
      window.__draftCsp = [];
      addEventListener('securitypolicyviolation', (e) =>
        window.__draftCsp.push({
          directive: e.violatedDirective,
          uri: e.blockedURI,
          file: e.sourceFile,
          line: e.lineNumber,
          sample: e.sample,
        }),
      );
    });
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await p.locator('.flavor-add').click();
    await p.locator('.flavor-add').click();
    await whenAndReview(p);
    await p
      .getByLabel('Observações', { exact: true })
      .fill('NOTA PRIVADA DEMONSTRAÇÃO');
    const warning = p.getByRole('alert').filter({ hasText: 'Já existe' });
    await expect(warning).toBeVisible();
    await warning
      .getByRole('button', { name: 'É outro pedido, confirmar mesmo assim' })
      .click();
    await expect(
      p.getByRole('button', { name: 'Confirmar pedido', exact: true }),
    ).toBeEnabled();
    await expect
      .poll(async () => Object.keys(await snapshot(p)).length)
      .toBe(1);
    const before = await snapshot(p),
      raw = Object.values(before)[0];
    expect(JSON.parse(raw)).toEqual({
      customer_id: customer,
      order_id: null,
      items: [{ variant_id: variant, quantity: 2 }],
      kit_items: [],
    });
    expect(raw).not.toMatch(/DEMONSTRAÇÃO|NOTA|address|price|cost|due|dupAck/);
    // D1 local: expira a sessão do navegador; focus usa api('session') e seu 401 real desmonta o Totem.
    await t.db
      .prepare(
        "UPDATE sessions SET expires_at=unixepoch()-1 WHERE organization_id=? AND user_id=(SELECT id FROM users WHERE email='operator@example.test')",
      )
      .bind(t.org)
      .run();
    await p.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(
      p.getByRole('heading', { name: 'Gestão restrita', exact: true }),
    ).toBeVisible();
    expect(await snapshot(p)).toEqual(before);
    await p.goto('http://127.0.0.1:' + provider.address().port);
    await expect(
      p.getByRole('heading', { name: 'Provedor local DEMONSTRAÇÃO' }),
    ).toBeVisible();
    await p.goto(t.url + '/api/access/start');
    expect(await snapshot(p)).toEqual(before);
    await p.getByRole('link', { name: 'Retomar seleção', exact: true }).click();
    await p
      .getByRole('button', { name: 'Recuperar seleção', exact: true })
      .click();
    await expect(
      p.getByRole('status').filter({ hasText: 'Seleção recuperada' }),
    ).toBeVisible();
    await whenAndReview(p);
    await expect(
      p.getByRole('textbox', { name: 'Observações', exact: true }),
    ).toHaveValue('');
    await expect(warning).toBeVisible();
    await expect(
      p.getByRole('button', { name: 'Confirmar pedido', exact: true }),
    ).toBeDisabled();
    await warning
      .getByRole('button', { name: 'É outro pedido, confirmar mesmo assim' })
      .click();
    await p
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await expect(
      p.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    ).toBeVisible();
    expect(await snapshot(p)).toEqual({});
    const orders = await call('orders', undefined, 'GET');
    expect(orders).toHaveLength(2);
    expect(
      orders.find((o) => o.items.some((i) => i.quantity === 2)),
    ).toBeTruthy();
    expect(await p.evaluate(() => window.__draftCsp)).toEqual([]);
    // Recarregar não oferece novamente uma seleção já enviada.
    await p.goto(t.url + '/gestao');
    await expect(
      p.getByRole('link', { name: 'Retomar seleção', exact: true }),
    ).toHaveCount(0);
  } finally {
    await c.close();
    await t.dispose();
    await new Promise((r) => provider.close(r));
  }
});

test('R17 recupera misto+kit, isola usuário e preserva seleção inválida até descarte', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
    mixedEnabled: true,
    fieldEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  const owner = await browser.newContext({
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, customer, variant, operator } = await demoProject(t);
    const product = await call('products', {
      name: 'Segundo sabor DEMONSTRAÇÃO',
      variants: [
        {
          label: 'Caixa fictícia',
          weight_grams: 10,
          units_per_box: 2,
          price_cents: 1000,
        },
      ],
    });
    const second = (await call('products/' + product.id, undefined, 'GET'))
      .variants[0].id;
    const kit = await call('p1/kits', {
      weight_grams: 30,
      units_per_kit: 12,
      price_cents: 5000,
      max_flavors: 3,
      packaging_supply_id: null,
    });
    const s = await call('session', undefined, 'GET', operator),
      key = prefix + s.organization_id + ':' + s.user_id;
    const draft = {
      customer_id: customer,
      order_id: null,
      items: [
        {
          variant_id: variant,
          quantity: 2,
          components: [
            { variant_id: variant, units: 1 },
            { variant_id: second, units: 1 },
          ],
        },
      ],
      kit_items: [
        {
          kit_id: kit.id,
          quantity: 1,
          components: [{ product_id: product.id, units: 12 }],
        },
      ],
    };
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.evaluate(
      ({ key, draft }) => sessionStorage.setItem(key, JSON.stringify(draft)),
      { key, draft },
    );
    const q = await owner.newPage();
    await q.goto(t.url + '/api/access/start');
    await q.evaluate(
      ({ key, draft }) => sessionStorage.setItem(key, JSON.stringify(draft)),
      { key, draft },
    );
    await q.reload();
    await expect(
      q.getByRole('link', { name: 'Retomar seleção', exact: true }),
    ).toHaveCount(0);
    // Catálogo inválido não é descartado silenciosamente nem enviado.
    const invalid = structuredClone(draft);
    invalid.items[0].components[1].variant_id = crypto.randomUUID();
    await p.evaluate(
      ({ key, draft }) => sessionStorage.setItem(key, JSON.stringify(draft)),
      { key, draft: invalid },
    );
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Recuperar seleção', exact: true })
      .click();
    await expect(p.getByRole('alert')).toContainText('indisponíveis');
    expect(JSON.parse((await snapshot(p))[key])).toEqual(invalid);
    await p
      .getByRole('button', { name: 'Descartar seleção', exact: true })
      .click();
    expect(await snapshot(p)).toEqual({});
    await p.evaluate(
      ({ key, draft }) => sessionStorage.setItem(key, JSON.stringify(draft)),
      { key, draft },
    );
    await p.reload();
    await p
      .getByRole('button', { name: 'Recuperar seleção', exact: true })
      .click();
    await expect(
      p.getByRole('status').filter({ hasText: 'Seleção recuperada' }),
    ).toBeVisible();
    expect(JSON.parse((await snapshot(p))[key])).toEqual(draft);
    await whenAndReview(p);
    await expect(p.locator('.totem')).toContainText(
      'Segundo sabor DEMONSTRAÇÃO',
    );
    await p
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await expect(
      p.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    ).toBeVisible();
    expect(await snapshot(p)).toEqual({});
    const orders = await call('orders', undefined, 'GET');
    expect(orders).toHaveLength(1);
    expect(orders[0].items.filter((i) => i.kit_id)).toHaveLength(1);
    expect(orders[0].items.find((i) => !i.kit_id).components).toHaveLength(2);
    // Logout explícito limpa a própria seleção.
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await expect
      .poll(async () => Object.keys(await snapshot(p)).length)
      .toBe(1);
    await p.goto(t.url + '/gestao');
    await p
      .getByRole('button', { name: 'Abrir menu de Meu perfil', exact: true })
      .click();
    await Promise.all([
      p.waitForURL(/\/cdn-cgi\/access\/logout/),
      p
        .getByRole('dialog')
        .getByRole('button', { name: 'Sair', exact: true })
        .click(),
    ]);
    expect(await snapshot(p)).toEqual({});
  } finally {
    await c.close();
    await owner.close();
    await t.dispose();
  }
});

test('R17 edição recupera quantidades mantendo observação já salva e sem aceite de repetição', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
    mixedEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, customer, variant } = await demoProject(t);
    const order = await call('orders', {
      customer_id: customer,
      due_at: '2030-01-07T13:00:00Z',
      notes: 'NOTA SALVA DEMONSTRAÇÃO',
      items: [{ variant_id: variant, quantity: 1 }],
    });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/pedidos/' + order.id + '/editar-simples');
    await p.locator('.flavor-add').click();
    await expect
      .poll(
        async () =>
          JSON.parse(Object.values(await snapshot(p))[0] ?? 'null')?.items[0]
            .quantity,
      )
      .toBe(2);
    expect(JSON.stringify(await snapshot(p))).not.toContain('NOTA SALVA');
    await p.reload();
    await p
      .getByRole('button', { name: 'Recuperar seleção', exact: true })
      .click();
    await expect(
      p.getByRole('status').filter({ hasText: 'Seleção recuperada' }),
    ).toBeVisible();
    await whenAndReview(p);
    await expect(
      p.getByRole('textbox', { name: 'Observações', exact: true }),
    ).toHaveValue('NOTA SALVA DEMONSTRAÇÃO');
    await expect(
      p.getByRole('alert').filter({ hasText: 'Já existe' }),
    ).toHaveCount(0);
    await p
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await expect(
      p.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    ).toBeVisible();
    const saved = await call('orders/' + order.id, undefined, 'GET');
    expect(saved.items[0].quantity).toBe(2);
    expect(saved.notes).toBe('NOTA SALVA DEMONSTRAÇÃO');
    expect(await snapshot(p)).toEqual({});
  } finally {
    await c.close();
    await t.dispose();
  }
});
