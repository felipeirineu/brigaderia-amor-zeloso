import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fortalezaDay } from '../../shared/workday.ts';
import { runtime } from '../helpers/runtime.mjs';
import { weightCostingProject } from '../helpers/weight-costing-project.mjs';

const t = await runtime({
  migrationLimit: 29,
  schemaCacheSeconds: 0,
  toolsEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
});
try {
  const {
    owner,
    outside,
    operator,
    call,
    variant,
    makeOrder,
    ids,
    recipe: weight,
    product,
  } = await weightCostingProject(t);
  const order = await makeOrder();
  const source = {
    name: 'Ficha DEMONSTRAÇÃO T19',
    variant_id: variant,
    yield_units: 16,
    packaging_cents: 0,
    labor_cents: 0,
    overhead_cents: 0,
    margin_bps: 0,
    components: [{ supply_id: ids.dough, quantity_milli: 1000 }],
  };
  const created = await call('p1/recipes', source);
  const path = 'p1/recipes/' + created.id;
  const refetch = () => call('p1/recipes', undefined, 'GET');
  let list = await refetch();
  assert.equal(list.unmeasured_supported, false);
  assert.equal(list.items[0].estimate.total_cents, 2000);
  const update = (cookie, data) =>
    t.request(path, { method: 'PUT', data, cookie, key: crypto.randomUUID() });
  assert.equal(
    (await update(owner, { ...source, version: 1, unmeasured_bps: 0 })).status,
    409,
  );

  const migration = await readFile(
    'database/migrations/0030_recipe_unmeasured_costs.sql',
    'utf8',
  );
  await t.db.exec(migration.replace(/--[^\n]*/g, '').replace(/\n/g, ' '));
  list = await refetch();
  assert.equal(list.unmeasured_supported, true);
  assert.equal(list.items[0].unmeasured_bps, 2000);
  assert.equal(list.items[0].version, 1);
  assert.equal(list.items[0].estimate.unit_cost_cents, 150);
  assert.equal(list.items[0].estimate.unmeasured_cents, 400);
  await assert.rejects(
    t.db.prepare('UPDATE recipes SET unmeasured_bps=10001').run(),
    /CHECK/,
  );

  const variantWeight = product.variants[0].weight_grams;
  const costingPath = 'p1/weight-recipes/' + weight + '/calculate';
  const setWeight = (id, grams) =>
    t.db
      .prepare(
        'UPDATE product_variants SET weight_grams=? WHERE organization_id=? AND id=?',
      )
      .bind(grams, t.org, id)
      .run();
  await setWeight(variant, 30);
  const calculate = async () =>
    (await call(costingPath, undefined, 'GET')).rows.find(
      (r) => r.kit.weight_grams === 30,
    );
  assert.equal((await calculate()).adjusted_cents, 2040);

  assert.equal(
    (await update(operator, { ...source, version: 1, unmeasured_bps: 0 }))
      .status,
    403,
  );
  assert.equal(
    (await update(outside, { ...source, version: 1, unmeasured_bps: 0 }))
      .status,
    404,
  );
  assert.equal(
    (await update(owner, { ...source, version: 1, unmeasured_bps: 10001 }))
      .status,
    400,
  );
  const changes = await Promise.all(
    [0, 2500].map((rate) =>
      update(owner, { ...source, version: 1, unmeasured_bps: rate }),
    ),
  );
  assert.deepEqual(changes.map((r) => r.status).sort(), [200, 409]);
  const saved = (await refetch()).items[0];
  await call(
    path,
    { ...source, version: saved.version, unmeasured_bps: 0 },
    'PUT',
  );
  assert.equal((await calculate()).adjusted_cents, 1700);
  const legacyEdit = (await refetch()).items[0];
  await call(path, { ...source, version: legacyEdit.version }, 'PUT');
  assert.equal((await refetch()).items[0].unmeasured_bps, 0);
  await setWeight(variant, variantWeight);

  for (const to of ['in_production', 'ready', 'picked_up']) {
    const current = await call('orders/' + order, undefined, 'GET');
    await call('orders/' + order + '/status', { version: current.version, to });
  }
  const details = await call('p1/order-costs/' + order, undefined, 'GET');
  assert.equal(details.estimated_cost_cents, 500);
  const day = fortalezaDay();
  const query = `?from=${day}&to=${day}`;
  const report = await call('p1/reports' + query, undefined, 'GET');
  assert.equal(report.estimated_cost_cents, 500);
  assert.equal(report.orders[0].estimated_cost_cents, 500);
  const csv = await t.request('p1/reports.csv' + query, { cookie: owner });
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /Custo estimado atual/);
  const exported = await call(
    'p1/reports.csv' + query + '&format=json',
    undefined,
    'GET',
  );
  assert.equal(exported.rows[0].at(-1), 500);

  const backup = await t.request('p1/backup', { cookie: owner });
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
          "print(json.dumps([list(db.execute(sql)) for sql in ['PRAGMA foreign_key_check', 'SELECT unmeasured_bps FROM recipes', 'SELECT price_cents FROM product_variants']]))",
        ].join('\n'),
      ],
      { input: await backup.text(), encoding: 'utf8' },
    ),
  );
  assert.deepEqual(restored, [[], [[0]], [[1000]]]);
  // Fichas alheias ao pedido não devem consumir o limite da estimativa.
  await t.db
    .prepare(
      `WITH RECURSIVE demo(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM demo WHERE n<205)
     INSERT INTO recipes(id,organization_id,name,yield_units,packaging_cents,labor_cents,overhead_cents,margin_bps,active)
     SELECT 'demo-t19-'||n,?,'Ficha DEMONSTRAÇÃO '||n,1,0,0,0,0,0 FROM demo`,
    )
    .bind(t.org)
    .run();
  assert.equal((await t.request('p1/recipes', { cookie: owner })).status, 409);
  assert.equal(
    (await call('p1/reports' + query, undefined, 'GET')).estimated_cost_cents,
    500,
  );
  assert.equal(
    (
      await call('p1/reports.csv' + query + '&format=json', undefined, 'GET')
    ).rows[0].at(-1),
    500,
  );
  const customerExport = await call(
    'p1/reports.csv' + query + '&kind=customers&format=json',
    undefined,
    'GET',
  );
  assert.equal(customerExport.rows.length, 1);
  console.log(
    'OK T19 schema 0029/0030, padrão e zero, CAS/papéis, kit por peso, custos/relatório, exportações e backup restaurável.',
  );
} finally {
  await t.dispose();
}
