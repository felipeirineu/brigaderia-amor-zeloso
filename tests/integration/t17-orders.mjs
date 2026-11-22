import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  toolsEnabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
});
const civil = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(
    date,
  );
const ago = (days) => new Date(Date.now() - days * 86400000);
const today = civil(ago(0)),
  before = civil(ago(3));
try {
  const { call, owner, operator, outside, customer, variant } =
    await demoProject(t);
  const profile = (await call('mobile/defaults/' + customer, undefined, 'GET'))
    .profile;
  const terms = { ...profile.terms, mode: 'next_delivery' };
  const delivery = {
    delivery_type: 'delivery',
    delivery_address: 'Endereço DEMONSTRAÇÃO',
    courier: 'partner',
  };
  const original = {
    customer_id: customer,
    due_at: ago(3).toISOString(),
    delivered_at: ago(3).toISOString(),
    items: [{ variant_id: variant, quantity: 1 }],
    delivery,
    terms,
  };
  const person = (
    await call('customers', {
      name: 'Pessoa DEMONSTRAÇÃO T17',
      customer_type: 'person',
    })
  ).id;
  const otherOrder = await call(
    'mobile/orders',
    { ...original, customer_id: person, delivered_at: ago(2).toISOString() },
    'POST',
    operator,
  );
  assert.equal(otherOrder.status, 'delivered');
  const initial = await call('mobile/orders', original, 'POST', operator);
  const accountPath = 'finance/customers/' + customer;
  const read = async (id = initial.id) =>
    (await call(accountPath, undefined, 'GET', operator)).orders.find(
      (o) => o.id === id,
    );
  assert.equal(initial.status, 'delivered');
  let row = await read();
  assert.equal(row.business_date, before);
  assert.equal(row.due_on, null);
  assert.equal(row.receivable_cents, 1000);
  const summary = await call(
    'finance/summary?filter=next_delivery',
    undefined,
    'GET',
    operator,
  );
  assert.equal(
    summary.customers.find((c) => c.id === customer).next_delivery_cents,
    1000,
  );
  const daily = await call('today?date=' + before, undefined, 'GET', operator);
  assert.ok(
    daily.orders.some((o) => o.id === initial.id && o.status === 'delivered'),
  );
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM inventory_events').first()).n,
    0,
  );

  const pickup = await call(
    'mobile/orders',
    {
      ...original,
      delivered_at: ago(2).toISOString(),
      delivery: { ...delivery, delivery_type: 'pickup' },
    },
    'POST',
    operator,
  );
  assert.equal(pickup.status, 'picked_up');
  assert.equal((await read()).due_on, null);

  const scheduled = await call(
    'mobile/orders',
    {
      ...original,
      delivered_at: undefined,
      due_at: ago(0).toISOString(),
      terms: { ...terms, mode: 'delivery' },
    },
    'POST',
    operator,
  );
  const advance = async (to) => {
    const current = await call(
      'orders/' + scheduled.id,
      undefined,
      'GET',
      operator,
    );
    return call(
      'orders/' + scheduled.id + '/status',
      { version: current.version, to },
      'POST',
      operator,
    );
  };
  for (const status of ['in_production', 'ready', 'out_for_delivery'])
    await advance(status);
  assert.equal((await read()).due_on, null);
  const completion = await advance('delivered');
  assert.equal((await read()).due_on, today);
  const statusNow = await call(
    'orders/' + scheduled.id,
    undefined,
    'GET',
    operator,
  );
  await call(
    'orders/' + scheduled.id + '/undo',
    { version: statusNow.version, event_id: completion.event_id },
    'POST',
    operator,
  );
  assert.equal((await read()).due_on, null);
  await advance('delivered');
  assert.equal((await read()).due_on, today);

  const rejected = async (payload, status = 400) =>
    assert.equal(
      (
        await t.request('mobile/orders', {
          cookie: operator,
          method: 'POST',
          data: payload,
          key: crypto.randomUUID(),
        })
      ).status,
      status,
    );
  const snapshot = async () =>
    await t.db
      .prepare(
        'SELECT (SELECT COUNT(*) FROM orders) AS orders,(SELECT COUNT(*) FROM payment_events) AS receipts',
      )
      .first();
  const counts = await snapshot();
  await rejected({
    ...original,
    delivered_at: new Date(Date.now() + 60000).toISOString(),
  });
  await rejected({
    ...original,
    receipt: { amount_cents: 1001, method: 'pix', paid_on: today },
  });
  await rejected({
    ...original,
    delivered_at: undefined,
    receipt: { amount_cents: 500, method: 'pix', paid_on: today },
  });
  await rejected({
    ...original,
    delivery: { ...delivery, courier: 'unassigned' },
  });
  assert.deepEqual(await snapshot(), counts);

  const paidData = {
    ...original,
    delivered_at: ago(0).toISOString(),
    terms: { ...terms, mode: 'delivery' },
    receipt: { amount_cents: 1000, method: 'pix', paid_on: today },
  };
  const key = crypto.randomUUID();
  const responses = await Promise.all(
    [0, 1].map(() =>
      t.request('mobile/orders', {
        cookie: operator,
        method: 'POST',
        data: paidData,
        key,
      }),
    ),
  );
  assert.ok(
    responses.every((r) => r.ok),
    responses.map((r) => r.status).join('/'),
  );
  const [a, b] = await Promise.all(responses.map((r) => r.json()));
  assert.equal(a.id, b.id);
  assert.deepEqual(await snapshot(), {
    orders: counts.orders + 1,
    receipts: counts.receipts + 1,
  });
  row = await read(a.id);
  assert.equal(row.paid_cents, 1000);
  assert.equal(row.receivable_cents, 0);
  const ledger = await call(accountPath, undefined, 'GET');
  assert.equal(
    ledger.events.filter((e) => e.kind === 'payment' && e.paid_on === today)
      .length,
    1,
  );
  const production = await call('today?date=' + today, undefined, 'GET');
  assert.equal(production.production.length, 0);
  const reportPath = `p1/reports?from=${before}&to=${today}&condition=next_delivery&customer=${customer}`;
  const report = await call(reportPath, undefined, 'GET');
  assert.equal(report.sales_cents, 2000);
  assert.ok(
    report.aging.some((o) => o.order_id === initial.id && o.due_on === today),
  );
  assert.equal(
    (await call(reportPath, undefined, 'GET', outside)).sales_cents,
    0,
  );

  const fixed = await call(
    'mobile/orders',
    {
      ...original,
      delivered_at: '2020-02-08T13:00:00Z',
      terms: { ...terms, mode: 'credit', due_days: null, due_day_of_month: 10 },
    },
    'POST',
    operator,
  );
  row = await read(fixed.id);
  assert.equal(row.due_on, '2020-03-10');
  const acct = await call(accountPath, undefined, 'GET');
  const close = await call(
    accountPath + '/close',
    { version: acct.version, order_id: fixed.id },
    'POST',
    owner,
  );
  const after = await call(accountPath, undefined, 'GET');
  assert.equal(
    after.closings.find((c) => c.id === close.closing_id).due_on,
    '2020-03-10',
  );
  const charge = await call(accountPath + '/charge', {
    closing_id: close.closing_id,
  });
  assert.match(charge.message, /Vencimento: 2020-03-10/);
  console.log(
    'OK T17 entrega retroativa, recebimento atômico/idempotente, estoque manual, próxima entrega/estorno, produção, filtro, isolamento, fechamento fixo e cobrança.',
  );
} finally {
  await t.dispose();
}
