// Limpeza dos dados de teste: D1 efêmero com fixtures DEMONSTRAÇÃO de todos os
// módulos. Nada remoto. Confere o que some, o que fica e os vínculos.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import {
  BASE_ROOTS,
  KEEP,
  cleanupSql,
  countRows,
  planCleanup,
  readSchema,
} from '../../scripts/clean-test-data.mjs';

// Regras puras: dependentes antes das referenciadas; protegidas bloqueiam.
const toy = { a: [], b: ['a'], c: ['b'], keep_me: [], d: ['keep_me'] };
assert.deepEqual(planCleanup(toy, {}), []);
assert.throws(() =>
  planCleanup({ orders: [], users: ['orders'] }, { customers: false }),
);
assert.deepEqual(
  planCleanup({ orders: [], order_items: ['orders'], x: ['order_items'] }, {}),
  ['x', 'order_items', 'orders'],
);
assert.ok(BASE_ROOTS.every((t) => !KEEP.has(t)));
assert.ok(
  KEEP.has('backup_reminders'),
  'T11 configuração precisa sobreviver à limpeza',
);

const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
  toolsEnabled: true,
  mixedEnabled: true,
  prospectsEnabled: true,
});
const query = async (sql) => (await t.db.prepare(sql).all()).results;
const run = async (options) => {
  const order = planCleanup(await readSchema(query), options);
  await t.db.exec(cleanupSql(order).replaceAll('\n', ' '));
  return order;
};
const count = async (table) => (await countRows(query, [table]))[table];
try {
  const { call, customer, owner, makeOrder, variant } = await demoProject(t);
  const packaging = await call('p1/supplies', {
    name: 'Caixa DEMONSTRAÇÃO limpeza',
    unit: 'unit',
    pack_quantity_milli: 1000,
    pack_cost_cents: 175,
  });
  await call('p1/kits', {
    weight_grams: 30,
    units_per_kit: 12,
    price_cents: 4200,
    max_flavors: 3,
    packaging_supply_id: packaging.id,
  });
  const contact = await call('prospects', {
    name: 'Contato DEMONSTRAÇÃO limpeza',
    prospect: {},
  });
  await call('prospects/' + contact.id + '/stage', {
    version: 1,
    stage: 'follow_up',
  });
  const sampleProduct = (await call('products', undefined, 'GET'))[0];
  const samples = [
    { product_id: sampleProduct.id, weight_grams: 30, units: 1 },
  ];
  const visit = await call('visits', {
    customer_id: contact.id,
    scheduled_at: new Date().toISOString(),
    samples,
  });
  await call('visits/' + visit.id + '/record', {
    version: 1,
    occurred_at: new Date().toISOString(),
    samples,
  });
  const sampleCost = await call(
    'visits/' + visit.id + '/costs',
    undefined,
    'GET',
  );
  await call('visits/' + visit.id + '/sample-expense', {
    version: sampleCost.visit_version,
    estimate_hash: sampleCost.estimate_hash,
    amount_cents: 123,
    method: 'cash',
    spent_on: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
  });
  await call('field/trips', {
    visit_id: visit.id,
    order_ids: [],
    mode: 'walk',
    leg: 'roundtrip',
    occurred_at: new Date().toISOString(),
    amount_cents: 0,
    method: 'other',
  });
  const order = await makeOrder();
  await makeOrder('2030-01-08T13:00:00.000Z');
  const me = (await call('session', undefined, 'GET')).user_id;
  await call('p1/reminders', {
    title: 'Lembrete DEMONSTRAÇÃO limpeza',
    due_at: '2030-01-07T13:00:00Z',
    alert_at: '2030-01-07T12:45:00Z',
    recipient_ids: [me],
  });
  await call('recurring', {
    name: 'Modelo DEMONSTRAÇÃO limpeza',
    customer_id: customer,
    weekday: 1,
    time: '10:00',
    composition_version: 1,
    items: [
      {
        variant_id: variant,
        quantity: 1,
        components: [{ variant_id: variant, units: 2 }],
      },
    ],
  });
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
  }).format(new Date());
  const account = await call('finance/customers/' + customer, undefined, 'GET');
  await call('finance/customers/' + customer + '/payments', {
    version: account.version,
    order_id: order,
    kind: 'payment',
    amount_cents: 500,
    method: 'cash',
    paid_on: day,
  });
  const supply = await call('p1/supplies', {
    name: 'Insumo DEMONSTRAÇÃO limpeza',
    unit: 'g',
    pack_quantity_milli: 1000000,
    pack_cost_cents: 1000,
  });
  await call('p1/recipes', {
    name: 'Ficha DEMONSTRAÇÃO limpeza',
    variant_id: variant,
    yield_units: 10,
    packaging_cents: 0,
    labor_cents: 0,
    overhead_cents: 0,
    margin_bps: 5000,
    components: [{ supply_id: supply.id, quantity_milli: 500000 }],
  });
  await call('p1/inventory/' + supply.id, {
    action: 'move',
    version: 0,
    kind: 'entry',
    delta_milli: 1000000,
    reason: 'Entrada DEMONSTRAÇÃO',
  });
  const trip = await call('field/trips', {
    mode: 'uber',
    leg: 'roundtrip',
    occurred_at: new Date().toISOString(),
    amount_cents: 1001,
    order_ids: [order],
  });
  assert.ok(trip.id);
  for (const table of [
    'orders',
    'payment_events',
    'reminders',
    'recurring_templates',
    'inventory_events',
    'displacements',
  ])
    assert.ok((await count(table)) > 0, 'fixture sem ' + table);
  const accessBefore = await count('authorized_emails');

  // 1) Padrão: só pedidos e movimentos; clientes, produtos e fichas ficam.
  const first = await run({});
  assert.ok(first.includes('orders') && first.includes('order_items'));
  assert.ok(!first.includes('customers') && !first.includes('products'));
  for (const table of first) assert.equal(await count(table), 0, table);
  assert.equal(await count('customers'), 2);
  assert.equal(await count('prospect_details'), 1);
  assert.equal(await count('prospect_events'), 3);
  assert.equal(await count('prospect_visits'), 1);
  assert.equal(await count('prospect_visit_records'), 1);
  assert.equal(await count('prospect_visit_trips'), 0);
  assert.equal(await count('prospect_sample_expenses'), 0);
  assert.equal(await count('products'), 1);
  assert.equal(await count('recipes'), 1);
  assert.equal(await count('supplies'), 2);
  assert.equal(await count('kits'), 1);
  assert.equal(await count('authorized_emails'), accessBefore);
  assert.equal(
    (await query('SELECT COUNT(*) n FROM pragma_foreign_key_check'))[0].n,
    0,
  );
  // O app continua funcionando com a mesma sessão.
  assert.equal((await call('orders', undefined, 'GET')).length, 0);
  assert.equal((await call('customers', undefined, 'GET')).length, 1);

  // 2) Cadastro por peso é protegido mesmo vazio: apagar produtos não pode
  // atravessar suas FKs. Contatos/histórico também são cadastros protegidos.
  const schema = await readSchema(query);
  assert.throws(
    () => planCleanup(schema, { customers: true, products: true }),
    /tabelas protegidas.*weight_recipes/,
  );
  assert.throws(
    () => planCleanup(schema, { customers: true }),
    /tabelas protegidas.*prospect_/,
  );
  assert.equal(await count('customers'), 2, 'cadastros não foram apagados');
  assert.equal(await count('prospect_details'), 1);
  assert.equal(await count('prospect_events'), 3);
  assert.equal(await count('products'), 1);
  assert.equal(await count('recipes'), 1);
  assert.equal(await count('supplies'), 2, 'insumos ficam');
  assert.equal(await count('kits'), 1, 'kits ficam');
  assert.equal(await count('authorized_emails'), accessBefore);
  assert.equal(
    (await query('SELECT COUNT(*) n FROM pragma_foreign_key_check'))[0].n,
    0,
  );
  assert.equal((await t.request('session', { cookie: owner })).status, 200);
  console.log(
    'OK limpeza de testes: ordem por vínculos, protegidas mantidas, sessão ativa e zero violações.',
  );
} finally {
  await t.dispose();
}
