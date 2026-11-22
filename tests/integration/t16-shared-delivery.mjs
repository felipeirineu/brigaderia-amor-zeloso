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
  migrationLimit: 28,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  toolsEnabled: true,
});
try {
  const { call, customer, makeOrder, variant } = await demoProject(t);
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
  const snapshot = async () => {
    const rows = {};
    for (const table of [
      'orders',
      'order_items',
      'order_status_events',
      'order_terms',
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
  for (const [table, rowId] of [
    ['orders', id],
    ['recurring_templates', template.id],
  ]) {
    await t.db
      .prepare(`UPDATE ${table} SET courier='both' WHERE id=?`)
      .bind(rowId)
      .run();
  }
  assert.equal((await readOrder()).courier, 'both');
  assert.equal(
    (await call('recurring', undefined, 'GET')).find(
      (row) => row.id === template.id,
    ).courier,
    'both',
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
  assert.deepEqual(restored, [[], [['both']], [['both']]]);
  console.log(
    'OK T16 migração D1 preserva linhas, índices, vínculos e backup restaurável.',
  );
} finally {
  await t.dispose();
}
