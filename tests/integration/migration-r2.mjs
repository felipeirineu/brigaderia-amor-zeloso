import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({ migrationLimit: 5, financeEnabled: true });
try {
  const { owner, call, customer, makeOrder } = await demoProject(t),
    order = await makeOrder(),
    user = (await call('session', undefined, 'GET', owner)).user_id,
    closing = crypto.randomUUID(),
    event = crypto.randomUUID(),
    terms = JSON.stringify({
      mode: 'credit',
      cycle: 'fixed_days',
      fixed_days: [15, 31],
      base_date: '',
      week_end: 7,
      due_days: 3,
    });
  await t.db.batch([
    t.db
      .prepare(
        'INSERT INTO closings(id,organization_id,customer_id,period_start,period_end,due_on,terms,total_cents,user_id) VALUES(?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        closing,
        t.org,
        customer,
        '2025-01-01',
        '2025-01-15',
        '2025-01-18',
        terms,
        2000,
        user,
      ),
    t.db
      .prepare(
        'INSERT INTO closing_orders(organization_id,closing_id,order_id,total_cents) VALUES(?,?,?,?)',
      )
      .bind(t.org, closing, order, 2000),
    t.db
      .prepare(
        "INSERT INTO payment_events(id,organization_id,customer_id,user_id,kind,amount_cents,method,paid_on) VALUES(?,?,?,?,'payment',100,'cash','2025-01-07')",
      )
      .bind(event, t.org, customer, user),
    t.db
      .prepare(
        'INSERT INTO payment_allocations(organization_id,event_id,order_id,amount_cents) VALUES(?,?,?,100)',
      )
      .bind(t.org, event, order),
  ]);
  const before = await t.db
    .prepare('SELECT * FROM closings WHERE id=?')
    .bind(closing)
    .first();
  await t.db.exec(
    (await readFile('database/migrations/0006_finance_r2.sql', 'utf8'))
      .replace(/--[^\n]*/g, '')
      .replace(/\n/g, ' '),
  );
  const after = await t.db
    .prepare('SELECT * FROM closings WHERE id=?')
    .bind(closing)
    .first();
  for (const key of Object.keys(before)) assert.equal(after[key], before[key]);
  assert.equal(after.status, 'active');
  assert.equal(
    (
      await t.db
        .prepare('SELECT COUNT(*) AS n FROM closing_order_history')
        .first()
    ).n,
    1,
  );
  assert.equal(
    (
      await t.db
        .prepare(
          'SELECT amount_cents FROM payment_allocations WHERE event_id=?',
        )
        .bind(event)
        .first()
    ).amount_cents,
    100,
  );
  assert.deepEqual(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results,
    [],
  );
  console.log(
    'OK migração R2: extrato preenchido, membros e pagamento preservados, histórico copiado e FKs válidas.',
  );
} finally {
  await t.dispose();
}
