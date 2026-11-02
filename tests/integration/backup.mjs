import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import sharp from 'sharp';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
  toolsEnabled: true,
});
try {
  const { call, customer, owner, operator, outside, makeOrder, variant } =
    await demoProject(t);
  const order = await makeOrder();
  await t.db
    .prepare(
      'INSERT INTO order_item_components(organization_id,item_id,variant_id,units,product_name,variant_label,weight_grams,units_per_box) SELECT organization_id,id,variant_id,units_per_box,product_name,variant_label,weight_grams,units_per_box FROM order_items WHERE organization_id=? AND order_id=?',
    )
    .bind(t.org, order)
    .run();
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const account = await call('finance/customers/' + customer, undefined, 'GET');
  const payment = await call('finance/customers/' + customer + '/payments', {
    version: account.version,
    order_id: order,
    kind: 'payment',
    amount_cents: 500,
    method: 'cash',
    paid_on: day,
  });
  const acct = await call('finance/customers/' + customer, undefined, 'GET');
  await call('finance/customers/' + customer + '/reverse', {
    version: acct.version,
    event_id: payment.event_id,
    reason: 'Correção DEMONSTRAÇÃO',
  });
  const supply = await call('p1/supplies', {
    name: 'Insumo DEMONSTRAÇÃO backup',
    unit: 'g',
    pack_quantity_milli: 1000000,
    pack_cost_cents: 1000,
  });
  await call('p1/recipes', {
    name: 'Ficha DEMONSTRAÇÃO',
    variant_id: variant,
    yield_units: 10,
    packaging_cents: 0,
    labor_cents: 0,
    overhead_cents: 0,
    margin_bps: 5000,
    components: [{ supply_id: supply.id, quantity_milli: 500000 }],
  });
  await call('p1/inventory/' + supply.id, {
    action: 'move',
    version: 0,
    kind: 'entry',
    delta_milli: 1000000,
    reason: 'Entrada DEMONSTRAÇÃO',
  });
  const place = {
    name: 'Local DEMONSTRAÇÃO',
    address: 'Endereço DEMONSTRAÇÃO',
    neighborhood: '',
    latitude: 0,
    longitude: 0,
    instagram: '',
  };
  await call('field/customers/' + customer, { data: place, version: 0 }, 'PUT');
  const photo = (
    await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#321d10' },
    })
      .webp()
      .toBuffer()
  ).toString('base64');
  await call(
    'field/customers/' + customer + '/photo',
    { version: 1, base64: photo },
    'PUT',
  );
  const trip = await call('field/trips', {
    mode: 'uber',
    leg: 'roundtrip',
    occurred_at: new Date().toISOString(),
    amount_cents: 1001,
    order_ids: [order],
  });
  await call('field/trips/' + trip.id + '/reverse', {
    reason: 'Correção DEMONSTRAÇÃO',
  });
  await call('p1/customer-import/confirm', {
    rows: [
      {
        name: "Importado DEMONSTRAÇÃO ' ; --",
        phone: '11900000001',
        email: '',
        notes: 'DEMONSTRAÇÃO\u0000texto\ncom quebra',
      },
    ],
    selected: [0],
  });
  await t.db.exec(
    'CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TEXT);',
  );
  for (const name of (await readdir('database/migrations'))
    .filter((p) => p.endsWith('.sql'))
    .sort())
    await t.db
      .prepare('INSERT INTO d1_migrations(name,applied_at) VALUES(?,?)')
      .bind(name, new Date().toISOString())
      .run();
  assert.equal(
    (await t.request('p1/backup', { cookie: operator })).status,
    403,
  );
  assert.equal((await t.request('p1/backup')).status, 401);
  const r = await t.request('p1/backup', { cookie: owner });
  if (!r.ok) throw Error(r.status + ' ' + (await r.text()));
  assert.equal(r.headers.get('cache-control'), 'no-store');
  const sql = await r.text();
  const restored = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import sqlite3,sys,json,base64
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON');c.executescript(sys.stdin.read())
tables=[r[0] for r in c.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
counts={t:c.execute('SELECT COUNT(*) FROM "'+t+'"').fetchone()[0] for t in tables}
print(json.dumps({'counts':counts,'fk':list(c.execute('PRAGMA foreign_key_check')),'photo':base64.b64encode(c.execute('SELECT photo FROM customer_sites').fetchone()[0]).decode(),'organizations':c.execute('SELECT COUNT(*) FROM organizations').fetchone()[0],'notes':c.execute('SELECT notes FROM customers WHERE phone=?',('+5511900000001',)).fetchone()[0]}))`,
      ],
      { input: sql, encoding: 'utf8' },
    ),
  );
  assert.equal(restored.counts.order_item_components, 1);
  assert.equal(restored.counts.sessions, 0);
  assert.equal(restored.counts.login_attempts, 0);
  assert.equal(restored.organizations, 1);
  assert.equal(restored.photo, photo);
  assert.equal(restored.notes, 'DEMONSTRAÇÃO\u0000texto\ncom quebra');
  assert.equal(restored.fk.length, 0);
  assert.equal(restored.counts.inventory_events, 1);
  assert.equal(restored.counts.payment_events, 2);
  assert.equal(restored.counts.displacements, 2);
  assert.equal(restored.counts.customers, 2);
  const other = await t.request('p1/backup', { cookie: outside });
  assert.equal(other.status, 200);
  const otherSql = await other.text();
  assert(!otherSql.includes(Buffer.from(customer).toString('hex')));
  await mkdir('.local', { recursive: true });
  await writeFile('.local/backup-demonstracao-tests.sql', sql, { mode: 0o600 });
  console.log(
    'OK P1-9 backup coerente da organização, fotos, nul/UTF-8, eventos financeiros/estoque, permissões e restauração SQLite com FKs; sessões/caches excluídos.',
  );
} finally {
  await t.dispose();
}
