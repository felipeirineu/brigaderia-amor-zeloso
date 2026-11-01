import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runtime } from '../helpers/runtime.mjs';
const t = await runtime({ migrationLimit: 2, financeEnabled: true });
try {
  const client = crypto.randomUUID(),
    product = crypto.randomUUID(),
    variant = crypto.randomUUID(),
    order = crypto.randomUUID(),
    item = crypto.randomUUID();
  await t.db.batch([
    t.db
      .prepare(
        'INSERT INTO customers(id,organization_id,name,phone) VALUES(?,?,?,?)',
      )
      .bind(client, t.org, 'Cliente DEMONSTRAÇÃO migração', '+5511900000000'),
    t.db
      .prepare('INSERT INTO products(id,organization_id,name) VALUES(?,?,?)')
      .bind(product, t.org, 'Produto DEMONSTRAÇÃO'),
    t.db
      .prepare(
        'INSERT INTO product_variants(id,organization_id,product_id,label,weight_grams,units_per_box,price_cents) VALUES(?,?,?,?,?,?,?)',
      )
      .bind(variant, t.org, product, 'DEMONSTRAÇÃO', 10, 2, 1234),
    t.db
      .prepare(
        'INSERT INTO orders(id,organization_id,customer_id,customer_name,due_at,total_cents,request_key,request_hash,version) VALUES(?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        order,
        t.org,
        client,
        'Cliente histórico DEMONSTRAÇÃO',
        '2030-01-07T13:00:00.000Z',
        2468,
        crypto.randomUUID(),
        'hash-original',
        7,
      ),
    t.db
      .prepare(
        'INSERT INTO order_items(id,organization_id,order_id,variant_id,product_name,variant_label,weight_grams,units_per_box,unit_price_cents,quantity) VALUES(?,?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        item,
        t.org,
        order,
        variant,
        'Nome histórico DEMONSTRAÇÃO',
        'Variante histórica',
        10,
        2,
        1234,
        2,
      ),
  ]);
  await t.db
    .prepare('UPDATE orders SET notes=? WHERE id=?')
    .bind('Observação histórica DEMONSTRAÇÃO', order)
    .run();
  const cookie = await t.login('owner@example.test');
  assert.equal(
    (await (await t.request('capabilities', { cookie })).json()).operations,
    false,
  );
  const before = await t.db
    .prepare('SELECT * FROM orders WHERE id=?')
    .bind(order)
    .first();
  await t.db.exec(
    (await readFile('database/migrations/0003_operations.sql', 'utf8'))
      .replace(/--[^\n]*/g, '')
      .replace(/\n/g, ' '),
  );
  await t.db.exec(
    (await readFile('database/migrations/0004_recurring_courier.sql', 'utf8'))
      .replace(/--[^\n]*/g, '')
      .replace(/\n/g, ' '),
  );
  assert.equal(
    (await (await t.request('capabilities', { cookie })).json()).finance,
    false,
  );
  await t.db.exec(
    (await readFile('database/migrations/0005_finance.sql', 'utf8'))
      .replace(/--[^\n]*/g, '')
      .replace(/\n/g, ' '),
  );
  assert.equal(
    (await (await t.request('capabilities', { cookie })).json()).finance,
    true,
  );
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) AS n FROM payment_events').first()).n,
    0,
  );
  const after = await t.db
    .prepare('SELECT * FROM orders WHERE id=?')
    .bind(order)
    .first();
  for (const key of Object.keys(before)) assert.equal(after[key], before[key]);
  assert.equal(
    (await (await t.request('capabilities', { cookie })).json()).operations,
    true,
  );
  assert.equal(after.order_type, 'regular');
  assert.equal(after.status, 'draft');
  assert.equal(after.courier, 'unassigned');
  assert.equal(
    (
      await t.db
        .prepare('SELECT * FROM order_items WHERE id=?')
        .bind(item)
        .first()
    ).unit_price_cents,
    1234,
  );
  assert.deepEqual(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results,
    [],
  );
  await t.db
    .prepare("UPDATE orders SET status='confirmed' WHERE id=?")
    .bind(order)
    .run();
  console.log(
    'Migração: cabeçalho completo, itens, preços, versões, chaves e FKs preservados; novo status aceito.',
  );
} finally {
  await t.mf.dispose();
}
