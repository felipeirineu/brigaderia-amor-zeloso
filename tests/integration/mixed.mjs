// Fixtures fictícias em D1 efêmero; não ativa montagem ou altera banco remoto.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({
  mixedEnabled: true,
  mobileEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
});
try {
  const { call, customer, owner, operator, outside } = await demoProject(t);
  const products = [];
  for (let i = 0; i < 3; i++) {
    const p = await call('products', {
      name: `Sabor ${i} DEMONSTRAÇÃO mista`,
      variants: [
        {
          label: 'Caixa DEMONSTRAÇÃO',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: 1000 + i * 1000,
        },
      ],
    });
    products.push(await call('products/' + p.id, undefined, 'GET'));
  }
  for (const p of products)
    p.variants = p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      weight_grams: v.weight_grams,
      units_per_box: v.units_per_box,
      price_cents: v.price_cents,
      active: !!v.active,
    }));
  const variants = products.map((p) => p.variants[0].id);
  const components = variants.map((variant_id, i) => ({
    variant_id,
    units: [8, 3, 1][i],
  }));
  const input = {
    customer_id: customer,
    due_at: new Date().toISOString(),
    composition_version: 1,
    items: [{ variant_id: variants[0], quantity: 2, components }],
  };
  const mobile = {
    ...input,
    delivery: { delivery_type: 'pickup', courier: 'partner' },
    terms: null,
  };
  const key = crypto.randomUUID();
  const id = (await call('mobile/orders', mobile, 'POST', operator, key)).id;
  assert.equal(
    (await call('mobile/orders', mobile, 'POST', operator, key)).id,
    id,
  );
  const saved = await call('orders/' + id, undefined, 'GET');
  assert.equal(
    saved.total_cents,
    2000,
    'preço por caixa vem da embalagem, não dos componentes',
  );
  assert.equal(
    saved.items[0].components.reduce((n, c) => n + c.units, 0),
    12,
  );
  assert.equal(saved.items[0].components.length, 3);
  assert.equal(
    (await t.db.prepare('SELECT count(*) n FROM order_item_components').first())
      .n,
    3,
  );
  // Produção do Hoje conta unidades por sabor: 2 caixas × (8+3+1).
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
  }).format(new Date(input.due_at));
  const today = await call('today?date=' + day, undefined, 'GET');
  const units = Object.fromEntries(
    today.production.map((l) => [l.name, l.units]),
  );
  assert.equal(units['Sabor 0 DEMONSTRAÇÃO mista'], 16);
  assert.equal(units['Sabor 1 DEMONSTRAÇÃO mista'], 6);
  assert.equal(units['Sabor 2 DEMONSTRAÇÃO mista'], 2);
  assert.equal(
    today.production.reduce((n, l) => n + l.units, 0),
    24,
    'caixa mista não conta 24 unidades extras do sabor base',
  );
  assert.equal((await call('orders', undefined, 'GET', outside)).length, 0);
  assert.equal(
    (await t.request('orders/' + id, { cookie: outside })).status,
    404,
  );
  const reject = async (data, status = 400, path = 'mobile/orders') => {
    const response = await t.request(path, {
      cookie: owner,
      method: 'POST',
      key: crypto.randomUUID(),
      data,
    });
    assert.equal(response.status, status, await response.text());
  };
  for (const units of [7, 9, -1, 0, 1.5])
    await reject({
      ...mobile,
      items: [
        {
          variant_id: variants[0],
          quantity: 1,
          components: [{ ...components[0], units }, ...components.slice(1)],
        },
      ],
    });
  await reject({
    ...mobile,
    items: [
      {
        ...input.items[0],
        components: [
          { variant_id: variants[0], units: 6 },
          { variant_id: variants[0], units: 6 },
        ],
      },
    ],
  });
  await reject({
    ...mobile,
    items: [
      input.items[0],
      { ...input.items[0], components: [...components].reverse() },
    ],
  });
  await reject({
    ...mobile,
    items: [{ ...input.items[0], unit_price_cents: 1 }],
  });
  await reject({
    ...mobile,
    items: [
      {
        ...input.items[0],
        components: [
          { ...components[0], product_name: 'Falso DEMONSTRAÇÃO' },
          ...components.slice(1),
        ],
      },
    ],
  });
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM orders').first()).n,
    1,
    'rejeições não criam pedidos parciais',
  );
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM order_item_components').first())
      .n,
    3,
  );
  // Duas composições distintas e um item simples podem usar a mesma embalagem.
  const multi = await call('orders', {
    ...input,
    items: [
      { variant_id: variants[0], quantity: 1 },
      input.items[0],
      {
        ...input.items[0],
        components: [
          { variant_id: variants[0], units: 6 },
          { variant_id: variants[1], units: 6 },
        ],
      },
    ],
  });
  assert.equal(
    (await call('orders/' + multi.id, undefined, 'GET')).items.length,
    3,
  );
  // Renomear ou mudar preço no catálogo não modifica os snapshots já salvos.
  await call(
    'products/' + products[0].id,
    {
      name: 'Nome atualizado DEMONSTRAÇÃO',
      variants: [{ ...products[0].variants[0], price_cents: 9900 }],
      version: products[0].version,
    },
    'PUT',
  );
  assert.equal(
    (await call('orders/' + id, undefined, 'GET')).items[0].components.find(
      (c) => c.variant_id === variants[0],
    ).product_name,
    products[0].name,
  );
  assert.equal(
    (await call('orders/' + id, undefined, 'GET')).total_cents,
    2000,
  );
  const draft = (
    await call('orders', {
      ...input,
      items: [{ ...input.items[0], quantity: 1 }],
    })
  ).id;
  const old = await call('orders/' + draft, undefined, 'GET');
  await call(
    'products/' + products[0].id,
    {
      name: 'Segundo nome DEMONSTRAÇÃO',
      variants: [{ ...products[0].variants[0], price_cents: 100 }],
      version: 2,
    },
    'PUT',
  );
  const changed = {
    ...input,
    version: 1,
    items: [
      {
        ...input.items[0],
        item_id: old.items[0].id,
        quantity: 1,
        components: [
          { variant_id: variants[0], units: 7 },
          { variant_id: variants[1], units: 4 },
          { variant_id: variants[2], units: 1 },
        ],
      },
    ],
  };
  const unsupported = await t.request('orders/' + draft, {
    cookie: owner,
    method: 'PUT',
    key: crypto.randomUUID(),
    data: { ...changed, composition_version: undefined },
  });
  assert.equal(unsupported.status, 409, 'editor antigo não apaga composição');
  await call('orders/' + draft, changed, 'PUT');
  const edited = await call('orders/' + draft, undefined, 'GET');
  assert.equal(edited.total_cents, 9900);
  assert.equal(
    edited.items[0].components.find((c) => c.variant_id === variants[0])
      .product_name,
    'Nome atualizado DEMONSTRAÇÃO',
  );
  assert.equal(
    (
      await t.request('orders/' + draft, {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: changed,
      })
    ).status,
    409,
  );
  // Dois ajustes concorrentes: só o vencedor confirma e mantém a composição inteira.
  const editMobile = {
    ...mobile,
    version: 2,
    items: [{ ...changed.items[0] }],
  };
  const results = await Promise.all([
    t.request('mobile/orders/' + draft, {
      cookie: owner,
      method: 'PUT',
      key: crypto.randomUUID(),
      data: editMobile,
    }),
    t.request('mobile/orders/' + draft, {
      cookie: operator,
      method: 'PUT',
      key: crypto.randomUUID(),
      data: editMobile,
    }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (await call('orders/' + draft, undefined, 'GET')).items[0].components
      .length,
    3,
  );
  const waiting = (await call('orders', input)).id;
  await call(
    'orders/' + waiting + '/delivery',
    { version: 1, delivery_type: 'pickup', courier: 'owner' },
    'PUT',
  );
  // Componentes devem pertencer à organização e estar ativos e no mesmo peso.
  const other = await call(
    'products',
    {
      name: 'Outro sabor DEMONSTRAÇÃO',
      variants: [
        {
          label: 'Caixa DEMONSTRAÇÃO',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: 1000,
        },
      ],
    },
    'POST',
    outside,
  );
  const foreign = (
    await call('products/' + other.id, undefined, 'GET', outside)
  ).variants[0].id;
  await reject({
    ...mobile,
    items: [
      {
        variant_id: variants[0],
        quantity: 1,
        components: [{ variant_id: foreign, units: 12 }],
      },
    ],
  });
  await call(
    'products/' + products[2].id,
    {
      name: products[2].name,
      variants: [{ ...products[2].variants[0], weight_grams: 20 }],
      version: 1,
    },
    'PUT',
  );
  await reject(mobile);
  await call(
    'products/' + products[2].id,
    {
      name: products[2].name,
      active: false,
      variants: [{ ...products[2].variants[0] }],
      version: 2,
    },
    'PUT',
  );
  await reject(mobile);
  const confirm = await t.request('orders/' + waiting + '/status', {
    cookie: owner,
    method: 'POST',
    key: crypto.randomUUID(),
    data: { version: 2, to: 'confirmed' },
  });
  assert.equal(confirm.status, 400);
  const batch = await call('confirm-reviewed', {
    orders: [{ id: waiting, version: 2, key: crypto.randomUUID() }],
  });
  assert.equal(batch.results[0].ok, false);
  assert.equal(
    (await call('orders/' + waiting, undefined, 'GET')).status,
    'draft',
  );
  assert.equal(
    (
      await t.db
        .prepare('SELECT COUNT(*) n FROM pragma_foreign_key_check')
        .first()
    ).n,
    0,
  );
  assert.equal((await t.request('catalogo')).status, 404);
  console.log(
    'OK R11-1 composição, preço/snapshot, 11/12 e 13/12, duplicatas, isolamento, edição protegida, CAS concorrente e FKs.',
  );
} finally {
  await t.dispose();
}
// Antes da migração e com flag ausente, itens simples continuam funcionando.
for (const migrationLimit of [14, Infinity]) {
  const old = await runtime({
    migrationLimit,
    mobileEnabled: true,
    mixedEnabled: migrationLimit === 14,
  });
  try {
    const { call, customer, variant, owner } = await demoProject(old);
    await call('orders', {
      customer_id: customer,
      due_at: new Date().toISOString(),
      items: [{ variant_id: variant, quantity: 1 }],
    });
    const data = {
      customer_id: customer,
      due_at: new Date().toISOString(),
      composition_version: 1,
      items: [
        {
          variant_id: variant,
          quantity: 1,
          components: [{ variant_id: variant, units: 2 }],
        },
      ],
      delivery: { delivery_type: 'pickup', courier: 'unassigned' },
    };
    assert.equal(
      (
        await old.request('mobile/orders', {
          cookie: owner,
          method: 'POST',
          key: crypto.randomUUID(),
          data,
        })
      ).status,
      503,
    );
    if (migrationLimit === 14) {
      const before = JSON.stringify(
        (await old.db.prepare('SELECT * FROM order_items').all()).results,
      );
      const sql = await readFile(
        'database/migrations/0015_mixed_boxes.sql',
        'utf8',
      );
      await old.db.exec(sql.replace(/--[^\n]*/g, '').replace(/\n/g, ' '));
      assert.equal(
        JSON.stringify(
          (await old.db.prepare('SELECT * FROM order_items').all()).results,
        ),
        before,
      );
      await call('mobile/orders', data);
    }
  } finally {
    await old.dispose();
  }
}
