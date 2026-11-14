// Exclusivamente DEMONSTRAÇÃO em D1 local efêmero.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
});
try {
  const { call, customer, operator, outside } = await demoProject(t);
  const data = {
    name: 'Sabor sem embalagem DEMONSTRAÇÃO',
    description: 'Cadastro fictício para testar kits',
    variants: [],
  };
  const id = (await call('products', data)).id;
  assert.deepEqual(
    (await call('products/' + id, undefined, 'GET')).variants,
    [],
  );
  assert.equal(
    (
      await t.request('products', {
        method: 'POST',
        cookie: operator,
        key: crypto.randomUUID(),
        data,
      })
    ).status,
    201,
  );
  assert.equal(
    (await t.request('products/' + id, { cookie: outside })).status,
    404,
  );
  assert.equal((await t.request('products/' + id)).status, 401);
  await call(
    'products/' + id,
    { ...data, version: 1, description: 'Edição DEMONSTRAÇÃO' },
    'PUT',
  );
  const kit = (
    await call('p1/kits', {
      weight_grams: 30,
      units_per_kit: 12,
      price_cents: 1234,
      max_flavors: 3,
    })
  ).id;
  const order = (
    await call('mobile/orders', {
      customer_id: customer,
      due_at: '2030-01-07T13:00:00Z',
      items: [],
      kit_items: [
        {
          kit_id: kit,
          quantity: 1,
          components: [{ product_id: id, units: 12 }],
        },
      ],
      delivery: { delivery_type: 'pickup', courier: 'unassigned' },
      terms: null,
    })
  ).id;
  const saved = await call('orders/' + order, undefined, 'GET');
  assert.equal(saved.items[0].components[0].product_name, data.name);
  assert.equal(saved.total_cents, 1234);
  assert.equal(
    (await call('p1/order-costs/' + order, undefined, 'GET'))
      .estimated_cost_cents,
    null,
    'sem ficha não inventa custo',
  );
  assert.equal(
    (await call('products/' + id, undefined, 'GET')).variants.length,
    0,
    'pedido não cria SKU artificial',
  );
  assert.deepEqual(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results,
    [],
  );
  console.log(
    'OK R15 sabor sem variante: cadastro/edição owner, kit sem SKU/preço artificial, custo ausente explícito, papéis/tenant/401.',
  );
} finally {
  await t.dispose();
}
for (const options of [
  { migrationLimit: 18, financeEnabled: true, p1Enabled: true },
  { financeEnabled: true, p1Enabled: false },
]) {
  const old = await runtime(options);
  try {
    const { owner } = await demoProject(old);
    assert.equal(
      (
        await old.request('products', {
          method: 'POST',
          cookie: owner,
          key: crypto.randomUUID(),
          data: { name: 'Sabor DEMONSTRAÇÃO', variants: [] },
        })
      ).status,
      503,
    );
  } finally {
    await old.dispose();
  }
}
console.log(
  'OK sabor sem embalagem indisponível sem catálogo/P1; legado com embalagem permanece.',
);
