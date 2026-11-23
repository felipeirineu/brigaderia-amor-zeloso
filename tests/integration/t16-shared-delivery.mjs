import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { demoProject } from '../helpers/demo-project.mjs';
import { runtime } from '../helpers/runtime.mjs';

const migration = await readFile(
  'database/migrations/0029_shared_delivery.sql',
  'utf8',
);
const day = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Fortaleza',
}).format(new Date());
const due = day + 'T13:00:00.000Z';
const t = await runtime({
  // Aplica a 0029 no meio do teste: sem cache de estrutura.
  schemaCacheSeconds: 0,
  migrationLimit: 28,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  toolsEnabled: true,
  fieldEnabled: true,
});
try {
  const { call, customer, makeOrder, variant, owner, operator } =
    await demoProject(t);
  const id = await makeOrder(due);
  const model = {
    name: 'Modelo DEMONSTRAÇÃO T16',
    customer_id: customer,
    weekday: 1,
    time: '10:00',
    delivery_address: 'Rua DEMONSTRAÇÃO T16',
    courier: 'partner',
    items: [{ variant_id: variant, quantity: 2 }],
  };
  const template = await call('recurring', model);
  const readOrder = () => call('orders/' + id, undefined, 'GET');
  const both = {
    delivery_type: 'delivery',
    delivery_address: model.delivery_address,
    courier: 'both',
    courier_fee_cents: 525,
  };
  const mobileOrder = {
    customer_id: customer,
    due_at: due,
    items: model.items,
    delivery: both,
  };
  const session = () => call('session', undefined, 'GET');
  assert.equal((await session()).shared_delivery, false);
  for (const [path, method, data] of [
    ['orders/' + id + '/delivery', 'PUT', { ...both, version: 3 }],
    [
      'recurring/' + template.id,
      'PUT',
      { ...model, courier: 'both', version: 1 },
    ],
    ['mobile/orders', 'POST', mobileOrder],
  ]) {
    const response = await t.request(path, {
      cookie: owner,
      method,
      data,
      key: crypto.randomUUID(),
    });
    assert.equal(response.status, 409);
    assert.match(
      await response.text(),
      /entrega pelos dois ainda não está disponível/,
    );
  }
  const snapshot = async () => {
    const rows = {};
    for (const table of [
      'orders',
      'order_items',
      'order_status_events',
      'order_terms',
      'order_places',
      'recurring_templates',
      'recurring_items',
    ])
      rows[table] = (
        await t.db.prepare('SELECT rowid,* FROM ' + table).all()
      ).results;
    return rows;
  };
  const before = await snapshot();
  assert.equal(before.orders.length, 1);
  assert.equal(before.recurring_items.length, 1);
  assert(before.order_status_events.length > 0);
  // Wrangler também aplica o arquivo como um lote transacional no D1.
  await t.db.batch(
    migration
      .replace(/--[^\n]*/g, '')
      .split(';')
      .filter((statement) => statement.trim())
      .map((statement) => t.db.prepare(statement)),
  );
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results,
    [],
  );
  assert.deepEqual(
    (
      await t.db
        .prepare(
          "SELECT name FROM sqlite_schema WHERE tbl_name='orders' AND sql IS NOT NULL AND type='index' ORDER BY name",
        )
        .all()
    ).results.map((row) => row.name),
    ['orders_due', 'orders_status'],
  );
  await assert.rejects(
    t.db.prepare("UPDATE orders SET courier='invalid'").run(),
    /CHECK constraint failed/,
  );
  assert.equal((await session()).shared_delivery, true);
  await call(
    'orders/' + id + '/delivery',
    { ...both, version: (await readOrder()).version },
    'PUT',
    operator,
  );
  assert.equal((await readOrder()).courier, 'both');
  assert.equal((await readOrder()).courier_fee_cents, 525);
  const mobile = await call('mobile/orders', mobileOrder, 'POST', operator);
  await call(
    'orders/' + mobile.id + '/status',
    {
      version: mobile.version,
      to: 'awaiting_confirmation',
      reason: 'Revisão DEMONSTRAÇÃO',
    },
    'POST',
    operator,
  );
  const reopened = await call('orders/' + mobile.id, undefined, 'GET');
  const editedMobile = await call(
    'mobile/orders/' + mobile.id,
    {
      ...mobileOrder,
      version: reopened.version,
      delivery: { ...both, courier: 'owner' },
    },
    'PUT',
    operator,
  );
  assert.equal(
    (await call('orders/' + mobile.id, undefined, 'GET')).courier,
    'owner',
  );
  await call(
    'orders/' + mobile.id + '/delivery',
    { ...both, version: editedMobile.version },
    'PUT',
    operator,
  );

  await call(
    'recurring/' + template.id,
    { ...model, courier: 'both', courier_fee_cents: 525, version: 1 },
    'PUT',
  );
  const week = { week: '2030-01-07' };
  const generated = await call('generate-week', week);
  assert.equal(generated.created, 1);
  assert.equal((await call('generate-week', week)).created, 0);
  const recurrence = await t.db
    .prepare(
      'SELECT COUNT(*) AS count, SUM(courier_fee_cents) AS fee, MIN(courier) AS courier FROM orders WHERE order_type = ?',
    )
    .bind('recurring')
    .first();
  assert.deepEqual(recurrence, { count: 1, fee: 525, courier: 'both' });

  for (const to of [
    'in_production',
    'ready',
    'out_for_delivery',
    'delivered',
  ]) {
    await call(
      'orders/' + id + '/status',
      { version: (await readOrder()).version, to },
      'POST',
      operator,
    );
  }
  await call('field/trips', {
    order_ids: [id],
    mode: 'car',
    leg: 'roundtrip',
    occurred_at: new Date().toISOString(),
    amount_cents: 525,
    method: 'cash',
  });
  const today = await call('today?date=' + day, undefined, 'GET');
  assert.equal(today.orders.filter((o) => o.id === id).length, 1);
  assert.equal(today.totals.delivered_cents, 2000);
  assert.equal(today.travel_week_cents, 525);
  const report = await call(
    `p1/reports?from=${day}&to=${day}`,
    undefined,
    'GET',
  );
  assert.equal(report.sales_cents, 2000);
  assert.deepEqual(
    report.orders.map((o) => o.id),
    [id],
  );

  const backup = await t.request('p1/backup', {
    cookie: await t.login('owner@example.test'),
  });
  assert.equal(backup.status, 200);
  const restored = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        [
          'import json, sqlite3, sys',
          "db = sqlite3.connect(':memory:')",
          'db.executescript(sys.stdin.read())',
          "print(json.dumps([list(db.execute(sql)) for sql in ['PRAGMA foreign_key_check', 'SELECT courier FROM orders', 'SELECT courier FROM recurring_templates']]))",
        ].join('\n'),
      ],
      { input: await backup.text(), encoding: 'utf8' },
    ),
  );
  assert.deepEqual(restored, [[], [['both'], ['both'], ['both']], [['both']]]);
  console.log(
    'OK T16 migração, pré-ativação, edição, recorrência, totais e backup restaurável.',
  );
} finally {
  await t.dispose();
}
