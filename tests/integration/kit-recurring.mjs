// Apenas DEMONSTRAÇÃO em D1 efêmero. Nunca lê planilha ou cadastro real.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import {
  planCleanup,
  readSchema,
  cleanupSql,
  KEEP,
} from '../../scripts/clean-test-data.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
  fieldEnabled: true,
  toolsEnabled: true,
});
try {
  const { call, customer, variant, owner, outside } = await demoProject(t);
  const a = (await call('products', undefined, 'GET'))[0];
  const b = (
    await call('products', {
      name: 'Sabor B DEMONSTRAÇÃO',
      variants: [
        {
          label: 'Legado DEMONSTRAÇÃO',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: 500,
        },
      ],
    })
  ).id;
  const bad = (
    await call('products', {
      name: 'Sabor inativo DEMONSTRAÇÃO',
      variants: [
        {
          label: 'Legado DEMONSTRAÇÃO',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: 500,
        },
      ],
    })
  ).id;
  const kitData = {
    weight_grams: 15,
    dough_weight_grams: 13,
    units_per_kit: 25,
    price_cents: 11111,
    max_flavors: 5,
  };
  const kit = (await call('p1/kits', kitData)).id;
  const input = {
    kit_id: kit,
    quantity: 1,
    components: [
      { product_id: a.id, units: 15 },
      { product_id: b, units: 10 },
    ],
  };
  const data = {
    customer_id: customer,
    name: 'Modelo kit DEMONSTRAÇÃO',
    weekday: 1,
    time: '10:00',
    delivery_type: 'pickup',
    items: [],
    kit_items: [input],
  };
  const id = (await call('recurring', data)).id;
  let model = await call('recurring/' + id, undefined, 'GET');
  assert.equal(model.kit_items.length, 1);
  assert.equal(model.items.length, 0);
  const item = model.kit_items[0];
  assert.equal(
    (await t.request('recurring/' + id, { cookie: outside })).status,
    404,
  );
  assert.equal((await t.request('recurring/' + id)).status, 401);
  const oldEditor = {
    ...data,
    kit_items: undefined,
    items: [{ variant_id: variant, quantity: 1 }],
    version: 1,
  };
  assert.equal(
    (
      await t.request('recurring/' + id, {
        cookie: owner,
        method: 'PUT',
        data: oldEditor,
      })
    ).status,
    409,
  );
  const change = {
    ...data,
    version: 1,
    kit_items: [{ ...input, item_id: item.id, quantity: 2 }],
  };
  const race = await Promise.all(
    [1, 2].map(() =>
      t.request('recurring/' + id, {
        cookie: owner,
        method: 'PUT',
        data: change,
      }),
    ),
  );
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
  for (let n = 1; n < 65; n++)
    await call('recurring', { ...data, name: `Modelo kit DEMONSTRAÇÃO ${n}` });
  await call('recurring', {
    ...data,
    name: 'Modelo legado DEMONSTRAÇÃO',
    kit_items: [],
    items: [{ variant_id: variant, quantity: 1 }],
  });
  const invalidData = {
    ...data,
    name: 'Modelo ignorado DEMONSTRAÇÃO',
    kit_items: [
      {
        kit_id: kit,
        quantity: 1,
        components: [{ product_id: bad, units: 25 }],
      },
    ],
  };
  const invalid = (await call('recurring', invalidData)).id;
  await t.db
    .prepare('UPDATE products SET active=0 WHERE organization_id=? AND id=?')
    .bind(t.org, bad)
    .run();
  const week = '2030-01-07';
  let result = await call('generate-week', { week });
  assert.equal(result.orders.length, 66);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].id, invalid);
  assert.equal(
    result.orders.filter((o) => o.items.some((i) => i.kit_id)).length,
    65,
  );
  assert.equal(
    result.orders.reduce((n, o) => n + o.total_cents, 0),
    66 * 11111 + 1000,
  );
  const before = await t.db
    .prepare('SELECT COUNT(*) n FROM kit_order_items')
    .first();
  await call(
    'p1/kits/' + kit,
    { ...kitData, max_flavors: 1, price_cents: 22222, version: 1 },
    'PUT',
  );
  result = await call('generate-week', { week });
  assert.equal(result.orders.length, 66);
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM kit_order_items').first()).n,
    before.n,
    'não duplica itens ao repetir a semana',
  );
  assert.equal(
    result.orders.reduce((n, o) => n + o.total_cents, 0),
    66 * 11111 + 1000,
    'repetição não reprecifica pedido existente',
  );
  const next = await call('generate-week', { week: '2030-01-14' });
  assert.equal(
    next.orders.reduce((n, o) => n + o.total_cents, 0),
    66 * 22222 + 1000,
    'nova semana fotografa preço atual',
  );
  const restricted = await call(
    'mobile/defaults/' + customer + '?kits=1',
    undefined,
    'GET',
  );
  assert.equal(
    restricted.plans.find((p) => p.id === id).valid,
    false,
    'nova montagem manual respeita limite atual',
  );
  await call('recurring/' + id, { ...change, version: 2 }, 'PUT');
  assert.equal(
    (await call('recurring/' + id, undefined, 'GET')).kit_items[0].components
      .length,
    2,
    'quantidade sem mudar composição mantém modelo anterior',
  );
  await call(
    'p1/kits/' + kit,
    { ...kitData, price_cents: 22222, version: 2 },
    'PUT',
  );
  const legacyDefaults = await call(
    'mobile/defaults/' + customer,
    undefined,
    'GET',
  );
  assert.equal(
    legacyDefaults.plans.find((p) => p.id === id).valid,
    false,
    'cliente antigo não omite kits do modelo',
  );
  const modern = await call(
    'mobile/defaults/' + customer + '?kits=1',
    undefined,
    'GET',
  );
  assert.equal(modern.plans.find((p) => p.id === id).valid, true);
  assert.equal(modern.plans.find((p) => p.id === id).kit_items[0].quantity, 2);
  const pc = await call(
    'finance/customers/' + customer + '/defaults?kits=1',
    undefined,
    'GET',
  );
  assert.equal(pc.plans.find((p) => p.id === id).kit_items.length, 1);
  const wrong = {
    ...data,
    kit_items: [{ ...input, components: [{ product_id: a.id, units: 24 }] }],
  };
  assert.equal(
    (
      await t.request('recurring', {
        cookie: owner,
        method: 'POST',
        data: wrong,
        key: crypto.randomUUID(),
      })
    ).status,
    400,
  );
  const foreignKit = (await call('p1/kits', kitData, 'POST', outside)).id;
  assert.equal(
    (
      await t.request('recurring', {
        cookie: owner,
        method: 'POST',
        data: { ...data, kit_items: [{ ...input, kit_id: foreignKit }] },
        key: crypto.randomUUID(),
      })
    ).status,
    404,
  );
  // Arquivar um modelo com sabor inativo continua possível; reativar exige revisão.
  const badModel = await call('recurring/' + invalid, undefined, 'GET');
  const badInput = {
    ...invalidData,
    version: 1,
    active: false,
    kit_items: badModel.kit_items.map((i) => ({
      item_id: i.id,
      kit_id: i.kit_id,
      quantity: i.quantity,
      components: i.components.map((c) => ({
        product_id: c.product_id,
        units: c.units,
      })),
    })),
  };
  await call('recurring/' + invalid, badInput, 'PUT');
  assert.equal(
    (
      await t.request('recurring/' + invalid, {
        cookie: owner,
        method: 'PUT',
        data: { ...badInput, version: 2, active: true },
      })
    ).status,
    400,
  );
  const backup = await t.request('p1/backup', { cookie: owner });
  assert.equal(backup.status, 200);
  const restored = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import sqlite3,sys,json
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON');c.executescript(sys.stdin.read());print(json.dumps({'models':c.execute('SELECT COUNT(*) FROM kit_recurring_items').fetchone()[0],'orders':c.execute('SELECT COUNT(*) FROM kit_order_items').fetchone()[0],'fk':list(c.execute('PRAGMA foreign_key_check'))}))`,
      ],
      { input: await backup.text(), encoding: 'utf8' },
    ),
  );
  assert.deepEqual(restored, { models: 66, orders: 130, fk: [] });
  const schema = await readSchema(
    async (sql) => (await t.db.prepare(sql).all()).results,
  );
  const cleanup = planCleanup(schema, {});
  assert.ok(KEEP.has('kits') && KEEP.has('kit_settings'));
  assert.ok(!KEEP.has('kit_recurring_items'));
  assert.ok(
    cleanup.indexOf('kit_recurring_components') <
      cleanup.indexOf('kit_recurring_items'),
  );
  assert.ok(
    cleanup.indexOf('kit_recurring_items') <
      cleanup.indexOf('recurring_templates'),
  );
  await t.db.exec(cleanupSql(cleanup).replaceAll('\n', ' '));
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM kit_recurring_items').first())
      .n,
    0,
  );
  assert.equal(
    (
      await t.db
        .prepare('SELECT COUNT(*) n FROM kits WHERE organization_id=?')
        .bind(t.org)
        .first()
    ).n,
    1,
  );
  assert.deepEqual(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results,
    [],
  );
  console.log(
    'OK R15-B recorrências: 67 modelos/66 pedidos, legado+kits, catálogo em lote, CAS/tenant, inativos isolados, semana idempotente/preço atual, defaults modernos, backup e limpeza com KEEP.',
  );
} finally {
  await t.dispose();
}
const old = await runtime({
  migrationLimit: 20,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
});
try {
  const { call, customer, variant, owner } = await demoProject(old);
  await call('recurring', {
    name: 'Legado DEMONSTRAÇÃO',
    customer_id: customer,
    weekday: 1,
    time: '10:00',
    items: [{ variant_id: variant, quantity: 1 }],
  });
  const kit = (
    await call('p1/kits', {
      weight_grams: 30,
      units_per_kit: 12,
      price_cents: 500,
      max_flavors: 3,
    })
  ).id;
  assert.equal(
    (
      await old.request('recurring', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: {
          name: 'Kit DEMONSTRAÇÃO',
          customer_id: customer,
          weekday: 1,
          time: '10:00',
          kit_items: [
            {
              kit_id: kit,
              quantity: 1,
              components: [
                {
                  product_id: (await call('products', undefined, 'GET'))[0].id,
                  units: 12,
                },
              ],
            },
          ],
        },
      })
    ).status,
    503,
  );
  console.log(
    'OK recorrência legada até0020 e kits novos indisponíveis sem0021.',
  );
} finally {
  await old.dispose();
}
