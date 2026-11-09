import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({
  financeEnabled: true,
  fieldEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
});
try {
  const { call, owner, operator, outside, customer, makeOrder } =
    await demoProject(t);
  const first = await makeOrder(),
    second = await makeOrder();
  const charge = (data, cookie = operator) =>
    t.request('finance/customers/' + customer + '/charge', {
      cookie,
      method: 'POST',
      data,
    });
  assert.equal((await charge({ order_id: first })).status, 400);
  for (const id of [first, second]) {
    let order = await call('orders/' + id, undefined, 'GET');
    for (const to of ['in_production', 'ready', 'picked_up']) {
      await call('orders/' + id + '/status', { version: order.version, to });
      order = await call('orders/' + id, undefined, 'GET');
    }
  }
  const all = await call(
    'finance/customers/' + customer + '/charge',
    {},
    'POST',
  );
  const one = await (await charge({ order_id: first })).json();
  assert.equal(all.balance_cents, 4000);
  assert.equal(one.balance_cents, 2000);
  assert.match(one.message, /pedido nº 1 /);
  assert.ok(!one.message.includes(second.slice(0, 8)));
  assert.equal(one.pix_code, null);
  assert.equal((await charge({ order_id: crypto.randomUUID() })).status, 404);
  assert.equal((await charge({ order_id: first }, outside)).status, 404);
  assert.equal(
    (await charge({ order_id: first, closing_id: crypto.randomUUID() })).status,
    400,
  );
  assert.equal(
    (
      await t.request('finance/customers/' + customer + '/charge', {
        method: 'POST',
        data: { order_id: first },
      })
    ).status,
    401,
  );
  const arriving = await call(
    'orders/' + first + '/message',
    { kind: 'arriving' },
    'POST',
    operator,
  );
  assert.match(arriving.message, /Estamos chegando/);
  assert.match(arriving.message, /retirada combinada/);
  assert.ok(!/[{}]/.test(arriving.message));
  const contactKey = crypto.randomUUID();
  for (let n = 0; n < 2; n++)
    await call(
      'orders/' + first + '/contact',
      { kind: 'charge' },
      'POST',
      operator,
      contactKey,
    );
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM contact_events').first()).n,
    1,
  );
  const account = await call('finance/customers/' + customer, undefined, 'GET');
  await call('finance/customers/' + customer + '/payments', {
    version: account.version,
    order_id: first,
    kind: 'payment',
    amount_cents: 2000,
    method: 'cash',
    paid_on: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Fortaleza',
    }).format(new Date()),
  });
  assert.equal(
    (await charge({ order_id: first })).status,
    400,
    'quitado não gera cobrança',
  );
  assert.equal(
    (await (await charge({ order_id: second })).json()).balance_cents,
    2000,
  );
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM payment_events').first()).n,
    1,
    'prévia não cria evento financeiro',
  );
  assert.ok(owner);
  console.log(
    'OK R6-8 Chegando, prévia por pedido sem somar outros saldos, sem Pix inventado, quitado/tenant/401 e contato opt-in idempotente.',
  );
} finally {
  await t.dispose();
}
