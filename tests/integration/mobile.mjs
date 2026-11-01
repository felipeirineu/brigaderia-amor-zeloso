import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({ mobileEnabled: true, financeEnabled: true });
try {
  const { call, customer, variant, operator, outside, owner } =
    await demoProject(t);
  const data = {
    customer_id: customer,
    due_at: '2030-01-07T13:00:00.000Z',
    items: [{ variant_id: variant, quantity: 2 }],
    delivery: { delivery_type: 'pickup', courier: 'unassigned' },
    terms: null,
  };
  const key = crypto.randomUUID();
  const o = await call('mobile/orders', data, 'POST', operator, key);
  assert.equal(o.status, 'confirmed');
  assert.equal(
    (await call('mobile/orders', data, 'POST', operator, key)).id,
    o.id,
  );
  assert.equal(
    (await call('orders/' + o.id, undefined, 'GET')).total_cents,
    2000,
  );
  assert.equal(
    (
      await t.request('mobile/orders/' + o.id, {
        cookie: operator,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: { ...data, version: 1 },
      })
    ).status,
    409,
  );
  await call('orders/' + o.id + '/status', {
    version: 1,
    to: 'awaiting_confirmation',
    reason: 'Ajuste DEMONSTRAÇÃO',
  });
  const adjusted = await call(
    'mobile/orders/' + o.id,
    { ...data, version: 2, items: [{ variant_id: variant, quantity: 3 }] },
    'PUT',
  );
  assert.equal(adjusted.version, 3);
  assert.equal(
    (await call('orders/' + o.id, undefined, 'GET')).total_cents,
    3000,
  );
  assert.equal(
    (
      await t.request('mobile/orders', {
        cookie: outside,
        method: 'POST',
        key: crypto.randomUUID(),
        data,
      })
    ).status,
    400,
  );
  assert.equal(
    (await t.request('mobile/defaults/' + customer, { cookie: outside }))
      .status,
    404,
  );
  assert.equal((await t.request('brand/flavors/tradicional')).status, 401);
  const photo = await t.request('brand/flavors/tradicional', { cookie: owner });
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get('cache-control'), 'no-store');
  const raw = await fetch(t.url + '/private-flavors/tradicional.webp');
  assert.equal(raw.status, 404);
  assert.equal(
    (await call('mobile/defaults/' + customer, undefined, 'GET')).last.items[0]
      .quantity,
    3,
  );
  console.log(
    'OK R3 confirmação atômica, idempotência, ajuste CAS, totais, defaults, isolamento e fotos privadas.',
  );
} finally {
  await t.dispose();
}
