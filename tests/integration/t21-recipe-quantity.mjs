import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fortalezaDay } from '../../shared/workday.ts';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

const t = await runtime({
  migrationLimit: 30,
  schemaCacheSeconds: 0,
  financeEnabled: true,
  p1Enabled: true,
  toolsEnabled: true,
});
try {
  const { call, owner, operator, outside, variant, makeOrder } =
    await demoProject(t);
  const order = await makeOrder();
  const { id: supply } = await call('p1/supplies', {
    name: 'Insumo DEMONSTRAÇÃO T21',
    unit: 'unit',
    pack_quantity_milli: 50000,
    pack_cost_cents: 1400,
  });
  const draft = {
    name: 'Ficha DEMONSTRAÇÃO T21',
    variant_id: variant,
    yield_units: 16,
    packaging_cents: 0,
    labor_cents: 0,
    overhead_cents: 0,
    margin_bps: 0,
    unmeasured_bps: 0,
    components: [{ supply_id: supply, quantity_milli: 1000 }],
  };
  const { id } = await call('p1/recipes', draft);
  const path = 'p1/recipes/' + id;
  const read = () => call('p1/recipes', undefined, 'GET');
  const update = (cookie, data) =>
    t.request(path, {
      cookie,
      method: 'PUT',
      data,
      key: crypto.randomUUID(),
    });
  const unit = {
    ...draft,
    components: [{ ...draft.components[0], quantity_basis: 'unit' }],
  };
  let recipes = await read();
  assert.equal(recipes.quantity_basis_supported, false);
  assert.equal(recipes.items[0].components[0].quantity_basis, 'batch');
  assert.equal(recipes.items[0].estimate.total_cents, 28);
  assert.equal((await update(owner, { ...unit, version: 1 })).status, 409);
  const sql = await readFile(
    'database/migrations/0031_recipe_quantity_basis.sql',
    'utf8',
  );
  await t.db.exec(sql.replace(/--[^\n]*/g, '').replace(/\n/g, ' '));
  recipes = await read();
  assert.equal(recipes.quantity_basis_supported, true);
  assert.equal(recipes.items[0].version, 1);
  assert.equal(recipes.items[0].components[0].quantity_basis, 'batch');
  assert.equal(recipes.items[0].estimate.total_cents, 28);
  assert.equal((await update(operator, { ...unit, version: 1 })).status, 403);
  assert.equal((await update(outside, { ...unit, version: 1 })).status, 404);

  await call(path, { ...unit, version: 1 }, 'PUT');
  const first = (await read()).items[0];
  assert.equal(first.components[0].quantity_milli, 1000);
  assert.equal(first.components[0].quantity_basis, 'unit');
  assert.equal(first.estimate.total_cents, 448);
  assert.equal(first.estimate.unit_cost_cents, 28);
  assert.equal((await update(owner, { ...unit, version: 1 })).status, 409);
  const shopping = () =>
    call('p1/shopping?from=2030-01-07&to=2030-01-07', undefined, 'GET');
  assert.equal((await shopping()).items[0].required_milli, 16000);

  // Um cliente anterior omite a base. A ficha conserva a forma de entrada.
  await call(path, { ...draft, version: 2, yield_units: 20 }, 'PUT');
  const changed = (await read()).items[0];
  assert.equal(changed.components[0].quantity_basis, 'unit');
  assert.equal(changed.estimate.total_cents, 560);
  assert.equal((await shopping()).items[0].required_milli, 20000);

  const costs = await call('p1/order-costs/' + order, undefined, 'GET');
  assert.equal(costs.estimated_cost_cents, 112);
  for (const to of ['in_production', 'ready', 'picked_up']) {
    const current = await call('orders/' + order, undefined, 'GET');
    await call('orders/' + order + '/status', { version: current.version, to });
  }
  const day = fortalezaDay();
  const report = await call(
    'p1/reports.csv?format=json&from=' + day + '&to=' + day,
    undefined,
    'GET',
  );
  assert.equal(report.rows[0].at(-1), 112);

  const backup = await t.request('p1/backup', { cookie: owner });
  assert.equal(backup.status, 200);
  const restored = execFileSync(
    'python3',
    [
      '-c',
      [
        'import sqlite3, sys',
        "db = sqlite3.connect(':memory:')",
        'db.executescript(sys.stdin.read())',
        "assert list(db.execute('PRAGMA foreign_key_check')) == []",
        "print(list(db.execute('SELECT quantity_milli,quantity_basis FROM recipe_components')))",
      ].join('\n'),
    ],
    { input: await backup.text(), encoding: 'utf8' },
  ).trim();
  assert.equal(restored, "[(1000, 'unit')]");
  console.log(
    'OK T21 compatibilidade, CAS/papéis, rendimento, custo do pedido, compras, exportação e restauração.',
  );
} finally {
  await t.dispose();
}
