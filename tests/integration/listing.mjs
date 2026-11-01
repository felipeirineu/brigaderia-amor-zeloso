import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
const t = await runtime();
try {
  const owner = await t.login('owner@example.test');
  const outsider = await t.login('other@example.test');
  const client = crypto.randomUUID();
  await t.db
    .prepare(
      'INSERT INTO customers(id,organization_id,name,phone) VALUES(?,?,?,?)',
    )
    .bind(client, t.org, 'Cliente DEMONSTRAÇÃO volume', '+5511900000000')
    .run();
  for (let i = 0; i < 65; i++) {
    const product = crypto.randomUUID(),
      variant = crypto.randomUUID(),
      order = crypto.randomUUID();
    await t.db.batch([
      t.db
        .prepare('INSERT INTO products(id,organization_id,name) VALUES(?,?,?)')
        .bind(product, t.org, `Produto DEMONSTRAÇÃO ${i}`),
      t.db
        .prepare(
          'INSERT INTO product_variants(id,organization_id,product_id,label,weight_grams,units_per_box,price_cents) VALUES(?,?,?,?,?,?,?)',
        )
        .bind(variant, t.org, product, 'DEMONSTRAÇÃO', 10, 2, 100),
      t.db
        .prepare(
          'INSERT INTO orders(id,organization_id,customer_id,customer_name,due_at,total_cents,request_key,request_hash) VALUES(?,?,?,?,?,?,?,?)',
        )
        .bind(
          order,
          t.org,
          client,
          'Cliente DEMONSTRAÇÃO volume',
          '2030-01-01T12:00:00.000Z',
          100,
          crypto.randomUUID(),
          'fixture',
        ),
      t.db
        .prepare(
          'INSERT INTO order_items(id,organization_id,order_id,variant_id,product_name,variant_label,weight_grams,units_per_box,unit_price_cents,quantity) VALUES(?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          t.org,
          order,
          variant,
          'Produto DEMONSTRAÇÃO',
          'DEMONSTRAÇÃO',
          10,
          2,
          100,
          1,
        ),
    ]);
  }
  for (const [path, child] of [
    ['products', 'variants'],
    ['orders', 'items'],
  ]) {
    const response = await t.request(path, { cookie: owner });
    assert.equal(response.status, 200);
    const rows = await response.json();
    assert.equal(rows.length, 65);
    assert(rows.every((r) => r[child].length === 1));
    const search = await t.request(path + '?q=volume', { cookie: owner });
    assert.equal(search.status, 200);
    const outside = await t.request(path, { cookie: outsider });
    assert.deepEqual(await outside.json(), []);
    console.log(`OK ${path}: 65 pais com filhos, filtro e isolamento.`);
  }
} finally {
  await t.mf.dispose();
}
