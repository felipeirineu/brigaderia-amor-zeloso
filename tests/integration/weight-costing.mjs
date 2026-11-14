import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { runtime } from '../helpers/runtime.mjs';
import { weightCostingProject } from '../helpers/weight-costing-project.mjs';
import {
  readSchema,
  planCleanup,
  KEEP,
  cleanupSql,
} from '../../scripts/clean-test-data.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
  toolsEnabled: true,
});
try {
  const {
    call,
    owner,
    operator,
    outside,
    product,
    ids,
    recipe,
    payload,
    data,
    settings,
  } = await weightCostingProject(t);
  assert.equal((await call('session', undefined, 'GET')).weight_costing, true);
  const counts = async () =>
    JSON.stringify(
      (
        await t.db.batch(
          [
            'audit_events',
            'p1_requests',
            'orders',
            'expense_events',
            'inventory_events',
            'kits',
          ].map((table) => t.db.prepare(`SELECT COUNT(*) n FROM ${table}`)),
        )
      ).map((r) => r.results),
    );
  const before = await counts(),
    r = await call(
      'p1/weight-recipes/' + recipe + '/calculate',
      undefined,
      'GET',
      operator,
    ),
    row = r.rows.find((k) => k.kit.weight_grams === 30);
  assert.equal(row.unit_cost_cents, 125);
  assert.equal(row.calculated_cents, 1700);
  assert.equal(row.adjusted_cents, 2040);
  assert.equal(row.ifood.table.price_cents, 7028);
  assert.deepEqual(row.missing, []);
  const extra = await call(
    'p1/weight-recipes/' +
      recipe +
      '/calculate?optional=' +
      ids.extra +
      '&margin=4000',
    undefined,
    'GET',
    operator,
  );
  assert.equal(
    extra.rows.find((k) => k.kit.weight_grams === 30).adjusted_cents,
    2760,
  );
  assert.equal(
    await counts(),
    before,
    'consultar/simular não grava eventos, preços ou pedidos',
  );
  assert.equal(
    (
      await t.request('p1/weight-recipes/' + recipe + '/calculate', {
        cookie: outside,
      })
    ).status,
    404,
  );
  assert.equal((await t.request('p1/weight-recipes/' + recipe)).status, 401);
  assert.equal(
    (await t.request('p1/costing-settings/' + t.org, { cookie: outside }))
      .status,
    404,
  );
  assert.equal(
    (
      await t.request('p1/weight-recipes', {
        cookie: operator,
        method: 'POST',
        data: payload,
        key: crypto.randomUUID(),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await t.request('p1/costing-settings', {
        cookie: operator,
        method: 'PUT',
        data: { version: 1, data: settings },
        key: crypto.randomUUID(),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await t.request('p1/weight-recipes', {
        cookie: owner,
        method: 'POST',
        data: payload,
        key: crypto.randomUUID(),
      })
    ).status,
    409,
    'uma ficha por sabor',
  );
  const mass = await call('p1/supplies', undefined, 'GET');
  const ingredient = mass.items.find((s) => s.id === ids.dough);
  assert.equal(
    (
      await t.request('p1/supplies/' + ids.dough, {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: {
          ...ingredient,
          active: !!ingredient.active,
          unit: 'g',
          version: ingredient.version,
          id: undefined,
        },
      })
    ).status,
    409,
  );
  const boxSupply = mass.items.find((s) => s.id === ids.food);
  assert.equal(
    (
      await t.request('p1/supplies/' + ids.food, {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: { ...boxSupply, id: undefined, unit: 'g', active: true },
      })
    ).status,
    409,
    'configuração também protege unidade',
  );
  const settingsRace = await Promise.all(
    [1, 2].map(() =>
      t.request('p1/costing-settings', {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: { version: 1, data: settings },
      }),
    ),
  );
  assert.deepEqual(settingsRace.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (
      await t.request('p1/costing-settings', {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: {
          version: 2,
          data: { ...settings, optional_supply_ids: [ids.dough] },
        },
      })
    ).status,
    409,
    'massa não pode virar opcional e ser contada duas vezes',
  );
  const foreignSupply = (
    await call(
      'p1/supplies',
      {
        name: 'DEMONSTRAÇÃO outra organização',
        unit: 'unit',
        pack_quantity_milli: 1000,
        pack_cost_cents: 1,
      },
      'POST',
      outside,
    )
  ).id;
  assert.equal(
    (
      await t.request('p1/weight-recipes/' + recipe, {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: {
          ...payload,
          version: 1,
          data: {
            ...data,
            components: [{ ...data.components[0], supply_id: foreignSupply }],
          },
        },
      })
    ).status,
    404,
  );
  const finish = {
    supply_id: ids.finish,
    group: 'finish',
    quantity_milli: 0,
    sizes: [{ weight_grams: 30, quantity_milli: 1000, estimated: false }],
  };
  await call(
    'p1/weight-recipes/' + recipe,
    {
      ...payload,
      version: 1,
      data: { ...data, components: [...data.components, finish] },
    },
    'PUT',
  );
  const proposed = await call(
    'p1/weight-recipes/' + recipe + '/calculate',
    undefined,
    'GET',
  );
  const size15 = proposed.rows.find((k) => k.kit.weight_grams === 15);
  assert.equal(size15.adjusted_cents, null);
  assert.equal(size15.suggestions[0].quantity_milli, 630);
  assert.equal(
    (await call('p1/weight-recipes/' + recipe, undefined, 'GET')).data
      .components[1].sizes.length,
    1,
    'GET não aceita sugestão sozinho',
  );
  const accepted = {
    ...payload,
    version: 2,
    data: {
      ...data,
      reference_yield: 17,
      components: [
        ...data.components,
        {
          ...finish,
          sizes: [
            ...finish.sizes,
            { weight_grams: 15, quantity_milli: 630, estimated: true },
          ],
        },
      ],
    },
  };
  const race = await Promise.all(
    [1, 2].map(() =>
      t.request('p1/weight-recipes/' + recipe, {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: accepted,
      }),
    ),
  );
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
  const confirmed = await call(
    'p1/weight-recipes/' + recipe + '/calculate',
    undefined,
    'GET',
  );
  assert.equal(
    confirmed.rows.find((k) => k.kit.weight_grams === 15).yield.units,
    34,
  );
  assert.notEqual(
    confirmed.rows.find((k) => k.kit.weight_grams === 15).adjusted_cents,
    null,
  );
  const badOptional = await t.request(
    'p1/weight-recipes/' + recipe + '/calculate?optional=' + ids.dough,
    { cookie: owner },
  );
  assert.equal(badOptional.status, 400);
  assert.equal(
    (
      await t.request('p1/weight-recipes/' + recipe, {
        cookie: outside,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: { ...payload, version: 3 },
      })
    ).status,
    404,
  );
  // Ficha e configuração são cadastros protegidos; não podem desaparecer numa limpeza de produtos.
  const schema = await readSchema(
    async (sql) => (await t.db.prepare(sql).all()).results,
  );
  assert.ok(KEEP.has('weight_recipes') && KEEP.has('costing_settings'));
  assert.throws(
    () => planCleanup(schema, { products: true }),
    /proteg|preserv|KEEP/i,
  );
  const plan = planCleanup(schema, {});
  assert.ok(!plan.includes('weight_recipes'));
  await t.db.exec(cleanupSql(plan).replaceAll('\n', ' '));
  assert.equal(
    (await call('p1/weight-recipes', undefined, 'GET')).items.length,
    1,
  );
  const backup = await t.request('p1/backup', { cookie: owner });
  assert.equal(backup.status, 200);
  const restored = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import sqlite3,json,sys
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON');c.executescript(sys.stdin.read());print(json.dumps({'profiles':c.execute('SELECT COUNT(*) FROM weight_recipes').fetchone()[0],'refs':c.execute('SELECT COUNT(*) FROM weight_recipe_supplies').fetchone()[0],'settings':c.execute('SELECT COUNT(*) FROM costing_settings').fetchone()[0],'fk':list(c.execute('PRAGMA foreign_key_check'))}))`,
      ],
      { input: await backup.text(), encoding: 'utf8' },
    ),
  );
  assert.deepEqual(restored, { profiles: 1, refs: 2, settings: 1, fk: [] });
  const updated = {
    ...ingredient,
    active: !!ingredient.active,
    pack_cost_cents: null,
    id: undefined,
    version: ingredient.version,
  };
  await call('p1/supplies/' + ids.dough, updated, 'PUT');
  assert.equal(
    (
      await call('p1/weight-recipes/' + recipe + '/calculate', undefined, 'GET')
    ).rows.find((k) => k.kit.weight_grams === 30).adjusted_cents,
    null,
  );
  assert.equal(
    (await call('products/' + product.id, undefined, 'GET')).variants.length,
    1,
  );
  console.log(
    'OK R16 aceite fictício, rendimento17, acabamento confirmado, opcionais sem gravação, CAS/tenant/papéis, unidade protegida, backup/KEEP e custo desconhecido.',
  );
} finally {
  await t.dispose();
}
const old = await runtime({
  migrationLimit: 22,
  financeEnabled: true,
  p1Enabled: true,
});
try {
  const c = await old.login('owner@example.test');
  assert.equal(
    (await old.request('p1/weight-recipes', { cookie: c })).status,
    503,
  );
  assert.equal(
    (await (await old.request('session', { cookie: c })).json()).weight_costing,
    false,
  );
  assert.equal((await old.request('p1/recipes', { cookie: c })).status, 200);
  console.log('OK R16 fallback até0022 preserva fichas anteriores.');
} finally {
  await old.dispose();
}
