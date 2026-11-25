import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fortalezaDay } from '../../shared/workday.ts';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

const t = await runtime({
  migrationLimit: 31,
  schemaCacheSeconds: 0,
  financeEnabled: true,
  p1Enabled: true,
  toolsEnabled: true,
  mobileEnabled: true,
});
try {
  const { call, owner, operator, outside, customer, variant } =
    await demoProject(t);
  const second = (
    await call('products', {
      name: 'Produto caro DEMONSTRAÇÃO',
      variants: [
        {
          label: 'Embalagem fictícia',
          weight_grams: 10,
          units_per_box: 2,
          price_cents: 1800,
        },
      ],
    })
  ).id;
  const { variants } = await call('products/' + second, undefined, 'GET');
  const day = fortalezaDay();
  const { profile } = await call(
    'mobile/defaults/' + customer,
    undefined,
    'GET',
  );
  const terms = {
    ...profile.terms,
    mode: 'credit',
    cycle: 'deliveries',
    every_deliveries: 2,
    due_days: null,
  };
  const draft = {
    customer_id: customer,
    due_at: day + 'T15:00:00Z',
    items: [
      { variant_id: variant, quantity: 2 },
      { variant_id: variants[0].id, quantity: 1 },
    ],
  };
  const orderPath = 'mobile/orders';
  const data = {
    ...draft,
    terms,
    delivery: { delivery_type: 'pickup', courier: 'unassigned' },
  };
  const write = (path, cookie, method, data) =>
    t.request(path, { cookie, method, data, key: crypto.randomUUID() });
  assert.equal(
    (await write(orderPath, operator, 'POST', { ...data, exchange_units: 2 }))
      .status,
    409,
  );
  assert.equal((await call('session', undefined, 'GET')).order_exchange, false);
  const sql = await readFile(
    'database/migrations/0032_order_exchanges.sql',
    'utf8',
  );
  await t.db.exec(sql.replace(/--[^\n]*/g, '').replace(/\n/g, ' '));
  assert.equal((await call('session', undefined, 'GET')).order_exchange, true);
  assert.equal(
    (await write(orderPath, operator, 'POST', { ...data, exchange_units: 7 }))
      .status,
    400,
  );

  const product = (await call('products', undefined, 'GET')).find((p) =>
    p.variants.some((v) => v.id === variant),
  );
  const kit = await call('p1/kits', {
    weight_grams: 15,
    units_per_kit: 12,
    price_cents: 5000,
    max_flavors: 1,
    packaging_supply_id: null,
  });
  const kitItems = [
    {
      kit_id: kit.id,
      quantity: 1,
      components: [{ product_id: product.id, units: 12 }],
    },
  ];
  assert.equal(
    (
      await write(orderPath, operator, 'POST', {
        ...data,
        exchange_units: 1,
        items: [],
        kit_items: kitItems,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await write(orderPath, operator, 'POST', {
        ...data,
        exchange_units: 7,
        kit_items: kitItems,
      })
    ).status,
    400,
  );

  const classic = await call(
    'orders',
    { ...draft, exchange_units: 2 },
    'POST',
    operator,
  );
  const read = (order) => call('orders/' + order, undefined, 'GET');
  assert.equal((await read(classic.id)).total_cents, 2800);
  await call(
    'orders/' + classic.id,
    { ...draft, exchange_units: 0, version: 1 },
    'PUT',
    operator,
  );
  assert.equal((await read(classic.id)).total_cents, 3800);

  const order = await call(
    orderPath,
    { ...data, exchange_units: 2 },
    'POST',
    operator,
  );
  const lookup = 'orders/' + order.id;
  const fetched = await read(order.id);
  assert.equal(fetched.exchange_discount_cents, 1000);
  const adjustment = lookup + '/exchange';
  assert.equal(
    (
      await write(adjustment, outside, 'PUT', {
        version: fetched.version,
        exchange_units: 1,
      })
    ).status,
    404,
  );
  const edits = await Promise.all(
    [1, 3].map((exchange_units) =>
      write(adjustment, operator, 'PUT', {
        version: fetched.version,
        exchange_units,
      }),
    ),
  );
  assert.deepEqual(edits.map((r) => r.status).sort(), [200, 409]);
  await call(
    adjustment,
    { version: (await read(order.id)).version, exchange_units: 2 },
    'PUT',
    operator,
  );
  const today = await call('today?date=' + day, undefined, 'GET');
  assert.equal(
    today.production.reduce((sum, row) => sum + row.units, 0),
    6,
  );

  const finance = 'finance/customers/' + customer;
  const before = await call(finance, undefined, 'GET');
  await call(
    finance + '/payments',
    {
      version: before.version,
      order_id: order.id,
      amount_cents: 2700,
      kind: 'deposit',
      method: 'cash',
      paid_on: day,
    },
    'POST',
    operator,
  );
  assert.equal(
    (
      await write(adjustment, operator, 'PUT', {
        version: (await read(order.id)).version,
        exchange_units: 6,
      })
    ).status,
    409,
  );
  const source = await call('p1/supplies', {
    name: 'Insumo DEMONSTRAÇÃO',
    unit: 'unit',
    pack_quantity_milli: 1000,
    pack_cost_cents: 86,
  });
  await call('p1/recipes', {
    name: 'Ficha DEMONSTRAÇÃO',
    variant_id: variant,
    yield_units: 1,
    packaging_cents: 0,
    labor_cents: 0,
    overhead_cents: 0,
    margin_bps: 0,
    unmeasured_bps: 0,
    components: [{ supply_id: source.id, quantity_milli: 1000 }],
  });
  const delivered = await call(
    orderPath,
    {
      ...data,
      items: [{ variant_id: variant, quantity: 1 }],
      delivered_at: new Date(Date.now() - 86400000).toISOString(),
    },
    'POST',
    operator,
  );
  const moved = await call(
    'orders-batch',
    {
      action: 'complete',
      orders: [
        {
          id: order.id,
          version: (await read(order.id)).version,
          key: crypto.randomUUID(),
        },
      ],
    },
    'POST',
    operator,
  );
  assert.equal(moved.results[0].ok, true);
  const account = await call('finance/customers/' + customer, undefined, 'GET');
  const mainOrder = account.orders.find((row) => row.id === order.id);
  assert.equal(mainOrder.total_cents, 2800);
  assert.equal(mainOrder.exchange_delivered_units, 6);
  assert.equal(
    account.orders.find((row) => row.id === delivered.id).due_on,
    day,
  );
  assert.equal(account.delivery_cycles[0].total_cents, 3800);
  const message = await call(
    'finance/customers/' + customer + '/charge',
    { delivery_cycle_id: order.id },
    'POST',
    operator,
  );
  assert.match(message.message, /Troca: 2 doces · 6 entregues · cobrados 4/);
  assert.match(message.message, /38,00/);
  const report = await call(
    'p1/reports?from=' + day + '&to=' + day,
    undefined,
    'GET',
  );
  assert.equal(report.sales_cents, 2800);
  assert.equal(report.sold_units, 4);
  assert.equal(
    report.products.reduce((n, row) => n + row.total_cents, 0),
    2800,
  );
  assert.deepEqual(report.exchange_losses, {
    units: 2,
    estimated_cost_cents: 172,
  });
  assert.equal(
    (
      await write(adjustment, operator, 'PUT', {
        version: (await read(order.id)).version,
        exchange_units: 0,
      })
    ).status,
    409,
  );

  const exported = await call(
    'p1/reports.csv?format=json&from=' + day + '&to=' + day,
    undefined,
    'GET',
  );
  assert(
    exported.rows[0].includes('Troca: 2 doces · 6 entregues · cobrados 4'),
  );
  assert(exported.rows[0].includes(172));

  const backup = await t.request('p1/backup', { cookie: owner });
  const restored = execFileSync(
    'python3',
    [
      '-c',
      [
        'import sqlite3, sys',
        "db = sqlite3.connect(':memory:')",
        'db.executescript(sys.stdin.read())',
        "assert list(db.execute('PRAGMA foreign_key_check')) == []",
        "print(list(db.execute('SELECT exchange_units,exchange_discount_cents,total_cents FROM orders WHERE exchange_units>0')))",
      ].join('\n'),
    ],
    { input: await backup.text(), encoding: 'utf8' },
  ).trim();
  assert.equal(restored, '[(2, 1000, 2800)]');
  console.log(
    'OK T22 schema, CAS, edição, produção física, lote, T18, relatório e restauração.',
  );
} finally {
  await t.dispose();
}
