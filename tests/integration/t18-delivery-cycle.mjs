import assert from 'node:assert/strict';
import { demoProject } from '../helpers/demo-project.mjs';
import { runtime } from '../helpers/runtime.mjs';
import { decryptPush, pushKeys, receiver } from '../helpers/push-project.mjs';

const device = await receiver('https://fcm.googleapis.com/DEMONSTRACAO-T18');
const sent = [];
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  entryPoint: 'tests/helpers/push-worker.ts',
  vapid: await pushKeys(),
  pushProvider: async (req) => {
    sent.push(await decryptPush(req, device));
    return new Response(null, { status: 201 });
  },
});
const prior = new Date(Date.now() - 86400000);
const business = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(
    date,
  );
const today = business(new Date());
try {
  const { call, customer, variant, owner, operator, outside } =
    await demoProject(t);
  await call(
    'p1/push/subscriptions',
    { subscription: device.subscription },
    'POST',
    owner,
  );
  const { profile } = await call(
    'mobile/defaults/' + customer,
    undefined,
    'GET',
  );
  const terms = {
    ...profile.terms,
    mode: 'credit',
    cycle: 'deliveries',
    every_deliveries: 2,
    due_days: null,
  };
  const data = {
    customer_id: customer,
    due_at: today + 'T15:00:00.000Z',
    items: [{ variant_id: variant, quantity: 1 }],
    delivery: {
      delivery_type: 'delivery',
      delivery_address: 'Rua DEMONSTRAÇÃO T18',
      courier: 'owner',
    },
    terms,
  };
  const first = await call(
    'mobile/orders',
    {
      ...data,
      delivered_at: prior.toISOString(),
      delivery: { ...data.delivery, delivery_type: 'pickup' },
    },
    'POST',
    operator,
  );
  const second = await call('mobile/orders', data, 'POST', operator);
  const cancelled = await call('mobile/orders', data, 'POST', operator);
  await call(
    'orders/' + cancelled.id + '/status',
    {
      version: cancelled.version,
      to: 'cancelled',
      reason: 'DEMONSTRAÇÃO cancelada',
    },
    'POST',
    operator,
  );
  const path = 'finance/customers/' + customer;
  const account = () => call(path, undefined, 'GET', operator);
  assert.equal((await account()).delivery_cycles.length, 0);
  assert.equal(
    (await account()).orders.find((o) => o.id === first.id).due_on,
    null,
  );
  const dashboard = await call(
    'today?date=' + today,
    undefined,
    'GET',
    operator,
  );
  const projected = dashboard.delivery_cycles.find(
    (x) => x.order_id === second.id,
  );
  assert.deepEqual(projected.order_ids, [first.id, second.id]);
  assert.equal(projected.projected, true);
  assert.equal(projected.due_on, null);
  assert.equal(projected.balance_cents, 2000);
  assert(!dashboard.delivery_cycles.some((x) => x.order_id === cancelled.id));
  const charge = () =>
    call(path + '/charge', { delivery_cycle_id: second.id }, 'POST', operator);
  const projectedCharge = await charge();
  assert.match(projectedCharge.message, /Previsão para o fechamento/);
  assert.equal(projectedCharge.pix_code, null);
  const morning = Date.parse(today + 'T11:15:00Z');
  await t.scheduled({ scheduledTime: morning - 3600000 });
  assert.equal(sent.length, 0);
  await Promise.all([
    t.scheduled({ scheduledTime: morning }),
    t.scheduled({ scheduledTime: morning }),
  ]);
  assert.equal(sent.length, 1);
  assert.match(sent[0].title, /Cobrança no Hoje/);
  assert.equal(sent[0].url, '/gestao');
  assert(!JSON.stringify(sent).includes('DEMONSTRAÇÃO'));

  const order = () => call('orders/' + second.id, undefined, 'GET', operator);
  const advance = async (to) =>
    call(
      'orders/' + second.id + '/status',
      { version: (await order()).version, to },
      'POST',
      operator,
    );
  for (const to of ['in_production', 'ready', 'out_for_delivery'])
    await advance(to);
  const completion = await advance('delivered');
  assert.equal(
    (await account()).orders.find((o) => o.id === first.id).due_on,
    today,
  );
  await call(
    'orders/' + second.id + '/undo',
    { version: (await order()).version, event_id: completion.event_id },
    'POST',
    operator,
  );
  assert.equal(
    (await account()).orders.find((o) => o.id === first.id).due_on,
    null,
  );
  await advance('delivered');
  const third = await call(
    'mobile/orders',
    { ...data, delivered_at: new Date().toISOString() },
    'POST',
    operator,
  );
  const closed = await account();
  assert.deepEqual(closed.delivery_cycle_progress.orders, [third.id]);
  assert.equal(closed.delivery_cycles[0].total_cents, 2000);
  const readyCharge = await charge();
  assert.equal(readyCharge.balance_cents, 2000);
  assert.match(readyCharge.message, /Fechamos as últimas 2 entregas/);
  assert.equal(
    readyCharge.message
      .split('\n')
      .filter(
        (line) => line.startsWith('•') && line.includes('Produto DEMONSTRAÇÃO'),
      ).length,
    2,
  );
  const key = crypto.randomUUID();
  const payment = {
    version: closed.version,
    delivery_cycle_id: second.id,
    kind: 'payment',
    amount_cents: 1500,
    method: 'cash',
    paid_on: today,
  };
  const receipt = await call(
    path + '/payments',
    payment,
    'POST',
    operator,
    key,
  );
  assert.equal(
    (await call(path + '/payments', payment, 'POST', operator, key)).event_id,
    receipt.event_id,
  );
  const after = await account();
  assert.equal(after.delivery_cycles[0].balance_cents, 500);
  assert.equal(after.receivable_cents, 1500);
  assert.equal(after.orders.find((o) => o.id === third.id).due_on, null);
  const report = await call(
    `p1/reports?from=${business(prior)}&to=${today}`,
    undefined,
    'GET',
    owner,
  );
  assert.equal(report.sales_cents, 3000);
  assert.equal(
    report.aging.find((o) => o.order_id === second.id).due_on,
    today,
  );
  assert.equal(
    (
      await t.request(path + '/payments', {
        cookie: outside,
        method: 'POST',
        key: crypto.randomUUID(),
        data: payment,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await t.request('mobile/orders', {
        cookie: operator,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { ...data, terms: { ...terms, every_deliveries: 13 } },
      })
    ).status,
    400,
  );
  console.log(
    'OK T18 compatibilidade, projeção, retirada, desfazer, reinício, recebimento, relatórios, isolamento e push deduplicado.',
  );
} finally {
  await t.dispose();
}
