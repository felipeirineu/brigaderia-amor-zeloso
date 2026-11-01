import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({ financeEnabled: true, p1Enabled: true });
try {
  const { owner, operator, outside, call, makeOrder, customer } =
      await demoProject(t),
    id = await makeOrder(),
    day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
    query = `?from=${day}&to=${day}`;
  const account = await call(`finance/customers/${customer}`, undefined, 'GET');
  await call(`finance/customers/${customer}/payments`, {
    version: account.version,
    order_id: id,
    kind: 'payment',
    amount_cents: 500,
    method: 'cash',
    paid_on: day,
  });
  const data = {
      amount_cents: 200,
      category: 'delivery',
      description: 'Despesa DEMONSTRAÇÃO',
      method: 'cash',
      spent_on: day,
      order_id: id,
    },
    key = crypto.randomUUID(),
    expense = await call('p1/expenses', data, 'POST', owner, key);
  assert.equal(
    (await call('p1/expenses', data, 'POST', owner, key)).id,
    expense.id,
  );
  let flow = await call('p1/expenses' + query, undefined, 'GET');
  assert.equal(flow.received_cents, 500);
  assert.equal(flow.spent_cents, 200);
  assert.equal(flow.net_cents, 300);
  assert.equal(
    (
      await t.request('p1/expenses', {
        cookie: operator,
        method: 'POST',
        key: crypto.randomUUID(),
        data,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await t.request('p1/expenses', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { ...data, spent_on: '2099-01-01' },
      })
    ).status,
    400,
  );
  await call('p1/expenses/' + expense.id, { reason: 'Correção DEMONSTRAÇÃO' });
  flow = await call('p1/expenses' + query, undefined, 'GET');
  assert.equal(flow.spent_cents, 0);
  assert.equal(flow.net_cents, 500);
  assert.equal(flow.events.length, 2);
  assert.equal(
    (
      await t.request('p1/expenses/' + expense.id, {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { reason: 'DEMONSTRAÇÃO' },
      })
    ).status,
    409,
  );
  assert.equal(
    (await call('p1/expenses' + query, undefined, 'GET', outside)).events
      .length,
    0,
  );
  const csv = await t.request('p1/cashflow.csv' + query, { cookie: owner });
  assert.equal(csv.status, 200);
  assert.equal(csv.headers.get('cache-control'), 'no-store');
  console.log(
    'OK P1-7 despesa humana, idempotência, papel, data, estorno único, fluxo líquido, CSV e isolamento.',
  );
} finally {
  await t.dispose();
}
