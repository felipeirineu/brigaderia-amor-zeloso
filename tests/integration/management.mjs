import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
const t = await runtime();
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log('OK', name);
}
async function data(path, options) {
  const r = await t.request(path, options);
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
try {
  const owner = await t.login('owner@example.test'),
    operator = await t.login('operator@example.test'),
    other = await t.login('other@example.test');
  await check(
    'sessão emitida com hash no banco e cookies seguros',
    async () => {
      const r = await t.request('access/login', {
        method: 'POST',
        data: {},
        jwt: await t.token(),
      });
      assert.equal(r.status, 200);
      assert.match(
        r.headers.get('Set-Cookie'),
        /HttpOnly; Secure; SameSite=Lax/,
      );
      const sessions = await t.db
        .prepare('SELECT token_hash FROM sessions')
        .all();
      assert(sessions.results.every((s) => !owner.includes(s.token_hash)));
      assert(sessions.results.every((s) => s.token_hash.length === 64));
    },
  );
  await check(
    'retorno Access em navegação completa emite sessão e volta à gestão',
    async () => {
      const result = await t.request('access/start', { jwt: await t.token() });
      assert.equal(result.status, 303);
      assert.equal(new URL(result.headers.get('Location')).pathname, '/gestao');
      assert.match(
        result.headers.get('Set-Cookie'),
        /__Host-session=.*HttpOnly; Secure; SameSite=Lax/,
      );
      assert.equal(result.headers.get('Cache-Control'), 'no-store');
    },
  );
  await check(
    'retorno de login não autentica sem identidade assinada',
    async () => {
      const result = await t.request('access/start');
      assert.equal(result.status, 401);
      assert.equal(result.headers.get('Set-Cookie'), null);
    },
  );
  await check('anônimo e cookie forjado negados', async () => {
    assert.equal((await t.request('customers')).status, 401);
    assert.equal(
      (await t.request('customers', { cookie: '__Host-session=forged' }))
        .status,
      401,
    );
  });
  for (const opts of [
    { audience: 'wrong' },
    { issuer: 'https://wrong.test' },
    { expired: true },
  ])
    await check('JWT rejeitado: ' + JSON.stringify(opts), async () =>
      assert.equal(
        (
          await t.request('access/login', {
            method: 'POST',
            data: {},
            jwt: await t.token('owner@example.test', opts),
          })
        ).status,
        401,
      ),
    );
  await check('identidade não autorizada não cria sessão', async () =>
    assert.equal(
      (
        await t.request('access/login', {
          method: 'POST',
          data: {},
          jwt: await t.token('not-invited@example.test'),
        })
      ).status,
      403,
    ),
  );
  await check('operador não gerencia usuários', async () =>
    assert.equal(
      (await t.request('members', { cookie: operator })).status,
      403,
    ),
  );
  await check('CSRF bloqueia escrita cross-origin', async () =>
    assert.equal(
      (
        await t.request('customers', {
          method: 'POST',
          data: {},
          cookie: owner,
          origin: 'https://evil.example',
        })
      ).status,
      403,
    ),
  );
  const customer = await data('customers', {
    method: 'POST',
    cookie: owner,
    data: { name: 'Cliente DEMONSTRAÇÃO', phone: '(11) 90000-0000' },
  });
  await check(
    'telefone normalizado e pedido visível em outra sessão',
    async () => {
      const list = await data('customers', { cookie: operator });
      assert.equal(list[0].phone, '+5511900000000');
      assert.equal(list[0].id, customer.id);
    },
  );
  await check('telefone duplicado impedido', async () =>
    assert.equal(
      (
        await t.request('customers', {
          method: 'POST',
          cookie: owner,
          data: { name: 'Duplicado DEMO', phone: '+5511900000000' },
        })
      ).status,
      409,
    ),
  );
  await check('dados e IDs de outra organização invisíveis', async () => {
    assert.deepEqual(await data('customers', { cookie: other }), []);
    assert.equal(
      (await t.request('customers/' + customer.id, { cookie: other })).status,
      404,
    );
    assert.equal(
      (
        await t.request('customers/' + customer.id, {
          method: 'PUT',
          cookie: other,
          data: { name: 'Inválido', phone: '+5511900000000', version: 1 },
        })
      ).status,
      404,
    );
  });
  await check('repetição de cliente retorna mesmo ID', async () => {
    const key = crypto.randomUUID();
    const options = {
      method: 'POST',
      cookie: owner,
      key,
      data: { name: 'Outro Cliente DEMONSTRAÇÃO', phone: '+5511900000001' },
    };
    const first = await data('customers', options);
    const second = await data('customers', options);
    assert.equal(first.id, second.id);
  });
  const product = await data('products', {
    method: 'POST',
    cookie: owner,
    data: {
      name: 'Produto DEMONSTRAÇÃO',
      variants: [
        {
          label: 'Caixa DEMO A',
          weight_grams: 10,
          units_per_box: 2,
          price_cents: 1234,
        },
        {
          label: 'Caixa DEMO B',
          weight_grams: 20,
          units_per_box: 4,
          price_cents: 567,
        },
      ],
    },
  });
  let p = await data('products/' + product.id, { cookie: owner });
  const orderBody = {
    customer_id: customer.id,
    due_at: '2030-01-01T12:00:00Z',
    notes: 'DEMONSTRAÇÃO',
    items: [
      { variant_id: p.variants[0].id, quantity: 2 },
      { variant_id: p.variants[1].id, quantity: 3 },
    ],
  };
  const key = crypto.randomUUID();
  const order = await data('orders', {
    method: 'POST',
    cookie: operator,
    key,
    data: orderBody,
  });
  await check(
    'itens mistos calculados em centavos e sincronizados',
    async () => {
      const list = await data('orders', { cookie: owner });
      assert.equal(list.length, 1);
      assert.equal(list[0].total_cents, 4169);
      assert.equal(list[0].items.length, 2);
    },
  );
  await check('repetição de requisição não duplica pedido', async () => {
    assert.equal(
      (
        await data('orders', {
          method: 'POST',
          cookie: operator,
          key,
          data: orderBody,
        })
      ).id,
      order.id,
    );
    assert.equal((await data('orders', { cookie: owner })).length, 1);
    assert.equal(
      (
        await t.request('orders', {
          method: 'POST',
          cookie: operator,
          key,
          data: { ...orderBody, notes: 'outra requisição' },
        })
      ).status,
      409,
    );
  });
  await check('IDs externos não podem entrar em pedidos', async () =>
    assert.equal(
      (
        await t.request('orders', {
          method: 'POST',
          cookie: other,
          key: crypto.randomUUID(),
          data: orderBody,
        })
      ).status,
      400,
    ),
  );
  await data('products/' + product.id, {
    method: 'PUT',
    cookie: owner,
    data: {
      name: 'Produto RENOMEADO DEMONSTRAÇÃO',
      version: p.version,
      variants: p.variants.map((v) => ({
        id: v.id,
        label: v.label,
        weight_grams: v.weight_grams,
        units_per_box: v.units_per_box,
        price_cents: 9999,
        active: true,
      })),
    },
  });
  await check('variantes de outro produto não podem ser editadas', async () => {
    const otherProduct = await data('products', {
      method: 'POST',
      cookie: owner,
      data: {
        name: 'Outro Produto DEMO',
        variants: [
          { label: 'DEMO', weight_grams: 1, units_per_box: 1, price_cents: 1 },
        ],
      },
    });
    assert.equal(
      (
        await t.request('products/' + otherProduct.id, {
          method: 'PUT',
          cookie: owner,
          data: {
            name: 'Inválido',
            version: 1,
            variants: [
              {
                id: p.variants[0].id,
                label: 'DEMO',
                weight_grams: 1,
                units_per_box: 1,
                price_cents: 1,
              },
            ],
          },
        })
      ).status,
      400,
    );
  });
  await check('edições simultâneas têm um único vencedor', async () => {
    const current = await data('products/' + product.id, { cookie: owner });
    const payload = {
      name: 'Produto CONCORRÊNCIA DEMO',
      version: current.version,
      variants: current.variants.map((v) => ({
        id: v.id,
        label: v.label,
        weight_grams: v.weight_grams,
        units_per_box: v.units_per_box,
        price_cents: 9999,
        active: true,
      })),
    };
    const results = await Promise.all(
      [owner, operator].map((cookie) =>
        t.request('products/' + product.id, {
          method: 'PUT',
          cookie,
          data: payload,
        }),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  });
  await check('snapshot do pedido preserva nomes e preços', async () => {
    const o = await data('orders/' + order.id, { cookie: operator });
    assert.equal(o.total_cents, 4169);
    assert(o.items.every((i) => i.product_name === 'Produto DEMONSTRAÇÃO'));
  });
  await check('edição concorrente rejeita versão antiga', async () =>
    assert.equal(
      (
        await t.request('products/' + product.id, {
          method: 'PUT',
          cookie: operator,
          data: {
            name: 'Antigo',
            version: 1,
            variants: [
              {
                id: p.variants[0].id,
                label: 'A',
                weight_grams: 10,
                units_per_box: 2,
                price_cents: 1,
              },
            ],
          },
        })
      ).status,
      409,
    ),
  );
  await check('edição de quantidades mantém preço histórico', async () => {
    await data('orders/' + order.id, {
      method: 'PUT',
      cookie: operator,
      data: {
        ...orderBody,
        version: 1,
        items: [{ variant_id: p.variants[0].id, quantity: 1 }],
      },
    });
    const o = await data('orders/' + order.id, { cookie: owner });
    assert.equal(o.total_cents, 1234);
  });
  await check('auditoria sem dados pessoais', async () => {
    const rows = (await t.db.prepare('SELECT * FROM audit_events').all())
      .results;
    assert(rows.length >= 5);
    assert(
      rows.every((r) => !JSON.stringify(r).includes('Cliente DEMONSTRAÇÃO')),
    );
  });
  await check(
    'arquivamento preserva histórico e oculta listas ativas',
    async () => {
      await data('customers/' + customer.id, {
        method: 'DELETE',
        cookie: owner,
        data: { version: 1 },
      });
      assert(
        !(await data('customers', { cookie: owner })).some(
          (c) => c.id === customer.id,
        ),
      );
      assert.equal((await data('orders', { cookie: owner })).length, 1);
    },
  );
  await check('catálogo bloqueado mesmo autenticado', async () =>
    assert.equal((await t.request('catalogo', { cookie: owner })).status, 404),
  );
  await check('revogação de sessão no logout', async () => {
    await data('auth/logout', { method: 'POST', cookie: operator, data: {} });
    assert.equal(
      (await t.request('customers', { cookie: operator })).status,
      401,
    );
  });
  await check('expiração bloqueia sessão', async () => {
    await t.db.prepare('UPDATE sessions SET expires_at=1').run();
    assert.equal((await t.request('customers', { cookie: owner })).status, 401);
  });
  await check('limite persistente de tentativas de login', async () => {
    let status = 0;
    for (let i = 0; i < 12; i++)
      status = (await t.request('access/login', { method: 'POST', data: {} }))
        .status;
    assert.equal(status, 429);
  });
  console.log(`${passed} verificações de integração passaram.`);
} finally {
  await t.mf.dispose();
}
