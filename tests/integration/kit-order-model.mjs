import { execFileSync } from 'node:child_process';
// Helpers Node com D1/workerd efêmero real; nenhuma rota de teste no produto.
// Todos os registros e preços são exclusivamente DEMONSTRAÇÃO.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const dir = await mkdtemp('/tmp/az-kit-model-');
await build({
  entryPoints: ['worker/kit-order-items.ts'],
  outfile: dir + '/helpers.mjs',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
});
const h = await import(pathToFileURL(dir + '/helpers.mjs').href);
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
  fieldEnabled: true,
  toolsEnabled: true,
});
try {
  const { call, customer, variant, owner } = await demoProject(t);
  const order = (
    await call('orders', {
      customer_id: customer,
      due_at: '2030-01-07T13:00:00Z',
      items: [{ variant_id: variant, quantity: 1 }],
    })
  ).id;
  const kit = (
    await call('p1/kits', {
      weight_grams: 15,
      dough_weight_grams: 13,
      units_per_kit: 25,
      price_cents: 12345,
      max_flavors: 5,
    })
  ).id;
  const product = (await call('products', undefined, 'GET'))[0];
  const input = [
    {
      kit_id: kit,
      quantity: 2,
      components: [{ product_id: product.id, units: 25 }],
    },
  ];
  const items = await h.prepareOrderKits(t.db, t.org, input, []);
  assert.equal(items[0].unit_price_cents, 12345);
  const nonce = crypto.randomUUID(),
    guard =
      'EXISTS(SELECT 1 FROM orders WHERE organization_id=? AND id=? AND mutation_id=?)',
    args = [t.org, order, nonce];
  await t.db.batch([
    t.db
      .prepare(
        'UPDATE orders SET total_cents=?,mutation_id=?,version=version+1 WHERE organization_id=? AND id=? AND version=1',
      )
      .bind(1000 + 2 * 12345, nonce, t.org, order),
    ...h.writeKitItems(t.db, t.org, order, items, guard, args),
  ]);
  const saved = await h.readKitItems(t.db, t.org, [order]);
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0].components, items[0].components);
  const source = await h.saleItemSource(t.db),
    components = await h.saleComponentSource(t.db);
  const rows = (
    await t.db
      .prepare(`SELECT * FROM ${source} WHERE organization_id=? AND order_id=?`)
      .bind(t.org, order)
      .all()
  ).results;
  assert.equal(rows.length, 2);
  assert.equal(rows.filter((r) => r.kit_id).length, 1);
  assert.equal(
    rows.reduce((n, r) => n + r.quantity * r.unit_price_cents, 0),
    25690,
  );
  const flavors = (
    await t.db
      .prepare(
        `SELECT * FROM ${components} WHERE organization_id=? AND item_id=?`,
      )
      .bind(t.org, items[0].id)
      .all()
  ).results;
  assert.equal(flavors[0].weight_grams, 15);
  assert.equal(flavors[0].units, 25);
  assert.equal(flavors[0].product_id, product.id);
  const detail = await call('orders/' + order, undefined, 'GET');
  assert.equal(detail.items.length, 2, 'detalhe inclui legado e kit');
  const visible = detail.items.find((i) => i.kit_id === kit);
  assert.equal(visible.variant_id, null, 'kit não é anunciado como variante');
  assert.equal(visible.components[0].product_id, product.id);
  const list = await call('orders', undefined, 'GET');
  assert.equal(list.find((o) => o.id === order).items.length, 2);
  const blockedEdit = await t.request('orders/' + order, {
    cookie: owner,
    method: 'PUT',
    key: crypto.randomUUID(),
    data: {
      customer_id: customer,
      due_at: '2030-01-07T13:00:00Z',
      items: [{ variant_id: variant, quantity: 1 }],
      version: 2,
    },
  });
  assert.equal(blockedEdit.status, 409, 'editor antigo não perde os kits');
  await t.db
    .prepare(
      "UPDATE orders SET status='confirmed' WHERE organization_id=? AND id=?",
    )
    .bind(t.org, order)
    .run();
  const today = await call('today?date=2030-01-07', undefined, 'GET');
  assert.equal(today.orders[0].items.length, 2);
  assert.equal(today.production.find((r) => r.weight_grams === 15).units, 50);
  assert.equal(today.production.find((r) => r.weight_grams === 10).units, 2);
  await t.db
    .prepare(
      "UPDATE orders SET status='picked_up' WHERE organization_id=? AND id=?",
    )
    .bind(t.org, order)
    .run();
  const report = await call(
    'p1/reports?from=2030-01-07&to=2030-01-07',
    undefined,
    'GET',
  );
  assert.equal(
    report.products.reduce((n, p) => n + p.total_cents, 0),
    25690,
  );
  assert.equal(report.products.find((p) => p.weight_grams === 15).units, 50);
  assert.equal(report.products.find((p) => p.weight_grams === 15).boxes, 2);
  const absentCost = await call('p1/order-costs/' + order, undefined, 'GET');
  assert.equal(absentCost.estimated_cost_cents, null);
  assert.ok(absentCost.missing.some((m) => /Embalagem não informada/.test(m)));
  const ingredient = (
    await call('p1/supplies', {
      name: 'Insumo DEMONSTRAÇÃO cálculo',
      unit: 'unit',
      pack_quantity_milli: 1000,
      pack_cost_cents: 100,
    })
  ).id;
  const packaging = (
    await call('p1/supplies', {
      name: 'Caixa DEMONSTRAÇÃO cálculo',
      unit: 'unit',
      pack_quantity_milli: 1000,
      pack_cost_cents: 300,
    })
  ).id;
  await call('p1/recipes', {
    name: 'Ficha DEMONSTRAÇÃO cálculo',
    variant_id: variant,
    yield_units: 10,
    packaging_cents: 999,
    labor_cents: 0,
    overhead_cents: 0,
    margin_bps: 0,
    components: [{ supply_id: ingredient, quantity_milli: 1000 }],
  });
  // Alteração de snapshot só nesta fixture: simula pedido criado com embalagem vinculada.
  await t.db.batch([
    t.db
      .prepare(
        'UPDATE product_variants SET weight_grams=15 WHERE organization_id=? AND id=?',
      )
      .bind(t.org, variant),
    t.db
      .prepare(
        'UPDATE kit_order_items SET packaging_supply_id=? WHERE organization_id=? AND id=?',
      )
      .bind(packaging, t.org, items[0].id),
    t.db
      .prepare(
        "UPDATE orders SET status='confirmed' WHERE organization_id=? AND id=?",
      )
      .bind(t.org, order),
  ]);
  const cost = await call('p1/order-costs/' + order, undefined, 'GET');
  assert.deepEqual(cost.missing, []);
  assert.equal(
    cost.items.find((i) => i.item_id === items[0].id).estimated_cost_cents,
    1100,
    '500 ingredientes + 600 embalagens, sem os 999 da ficha',
  );
  assert.equal(
    cost.estimated_cost_cents,
    1320,
    'item legado mantém a fórmula anterior',
  );
  const shopping = await call(
    'p1/shopping?from=2030-01-07&to=2030-01-07',
    undefined,
    'GET',
  );
  assert.equal(
    shopping.items.find((s) => s.supply_id === packaging).required_milli,
    2000,
    'uma embalagem por kit',
  );
  await t.db
    .prepare(
      "UPDATE orders SET status='picked_up' WHERE organization_id=? AND id=?",
    )
    .bind(t.org, order)
    .run();
  const message = await call('orders/' + order + '/message', {
    kind: 'confirmation',
  });
  assert.match(JSON.stringify(message), /Kit 25/);
  await call(
    'p1/kits/' + kit,
    {
      weight_grams: 15,
      dough_weight_grams: 13,
      units_per_kit: 25,
      price_cents: 22222,
      max_flavors: 5,
      version: 1,
    },
    'PUT',
  );
  await call(
    'products/' + product.id,
    {
      name: 'Sabor DEMONSTRAÇÃO renomeado',
      variants: [
        {
          id: variant,
          label: 'Nova embalagem DEMONSTRAÇÃO',
          weight_grams: 10,
          units_per_box: 2,
          price_cents: 777,
        },
      ],
      version: 1,
    },
    'PUT',
  );
  const quantity = await h.prepareOrderKits(
    t.db,
    t.org,
    [{ ...input[0], item_id: items[0].id, quantity: 3 }],
    saved,
  );
  assert.equal(quantity[0].unit_price_cents, 12345);
  assert.equal(quantity[0].components[0].product_name, product.name);
  // Um guard perdedor não apaga nem insere componentes; o cabeçalho continua coerente.
  await t.db.batch(
    h.writeKitItems(t.db, t.org, order, [], guard, [
      t.org,
      order,
      crypto.randomUUID(),
    ]),
  );
  assert.equal((await h.readKitItems(t.db, t.org, [order])).length, 1);
  const other = (
    await call('session', undefined, 'GET', await t.login('other@example.test'))
  ).organization_id;
  await assert.rejects(
    () => h.prepareOrderKits(t.db, other, input, []),
    /não encontrado/,
  );
  assert.deepEqual(await h.readKitItems(t.db, other, [order]), []);
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM product_variants').first()).n,
    1,
    'sem variante artificial',
  );
  assert.equal(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results.length,
    0,
  );
  const backup = await t.request('p1/backup', { cookie: owner });
  assert.equal(backup.status, 200);
  const restored = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import sqlite3,sys,json
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON');c.executescript(sys.stdin.read())
print(json.dumps({'parents':c.execute('SELECT COUNT(*) FROM kit_order_items').fetchone()[0],'components':c.execute('SELECT COUNT(*) FROM kit_order_components').fetchone()[0],'price':c.execute('SELECT unit_price_cents FROM kit_order_items').fetchone()[0],'catalog_price':c.execute('SELECT price_cents FROM kits').fetchone()[0],'legacy':c.execute('SELECT COUNT(*) FROM order_items').fetchone()[0],'fk':list(c.execute('PRAGMA foreign_key_check'))}))`,
      ],
      { input: await backup.text(), encoding: 'utf8' },
    ),
  );
  assert.deepEqual(restored, {
    parents: 1,
    components: 1,
    price: 12345,
    catalog_price: 22222,
    legacy: 1,
    fk: [],
  });
  // Mais de 60 pais: hidratação em lote inclui kits sem uma consulta por pedido.
  for (let n = 0; n < 65; n++) {
    const parent = crypto.randomUUID(),
      child = crypto.randomUUID();
    await t.db.batch([
      t.db
        .prepare(
          "INSERT INTO orders(id,organization_id,customer_id,customer_name,due_at,total_cents,request_key,request_hash,status) VALUES(?,?,?,'Cliente DEMONSTRAÇÃO volume','2030-01-07T13:00:00Z',12345,?,'DEMONSTRAÇÃO','confirmed')",
        )
        .bind(parent, t.org, customer, crypto.randomUUID()),
      t.db
        .prepare(
          'INSERT INTO kit_order_items SELECT organization_id,?,?,kit_id,1,weight_grams,dough_weight_grams,units_per_kit,unit_price_cents,packaging_supply_id FROM kit_order_items WHERE organization_id=? AND id=?',
        )
        .bind(child, parent, t.org, items[0].id),
      t.db
        .prepare(
          'INSERT INTO kit_order_components SELECT organization_id,?,product_id,units,product_name,photo_key,contains_alcohol FROM kit_order_components WHERE organization_id=? AND item_id=?',
        )
        .bind(child, t.org, items[0].id),
    ]);
  }
  const many = await call('orders', undefined, 'GET');
  assert.equal(many.length, 66);
  assert.ok(many.every((o) => o.items.some((i) => i.kit_id === kit)));
  assert.deepEqual(
    await call('orders', undefined, 'GET', await t.login('other@example.test')),
    [],
  );
  const volume = await call('today?date=2030-01-07', undefined, 'GET');
  assert.equal(volume.orders.length, 66);
  assert.equal(
    volume.production.find((r) => r.weight_grams === 15).units,
    1625,
    '65 kits confirmados; pedido retirado fica fora da produção',
  );
  console.log(
    'OK R15-B leitores: 66 pedidos com kits, detalhe/lista/Hoje, produção por peso, relatórios/WhatsApp, custos/embalagens/compras, guardas e backup; escrita pública ainda não ligada.',
  );
} finally {
  await t.dispose();
  await rm(dir, { recursive: true, force: true });
}
const legacy = await runtime({
  migrationLimit: 19,
  financeEnabled: true,
  p1Enabled: true,
});
try {
  assert.equal(await h.saleItemSource(legacy.db), 'order_items');
  assert.equal(await h.saleComponentSource(legacy.db), 'order_item_components');
  assert.deepEqual(await h.readKitItems(legacy.db, legacy.org, []), []);
  console.log('OK R15-B fallback até0019.');
} finally {
  await legacy.dispose();
}
