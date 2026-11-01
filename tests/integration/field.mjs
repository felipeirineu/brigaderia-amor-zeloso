import assert from 'node:assert/strict';
import sharp from 'sharp';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({
  mobileEnabled: true,
  fieldEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  placesProvider: true,
});
try {
  const { call, customer, variant, owner, operator, outside } =
    await demoProject(t);
  const c = await call('field/context', undefined, 'GET'),
    place = {
      name: 'Local DEMONSTRAÇÃO',
      address: 'Endereço DEMONSTRAÇÃO',
      neighborhood: 'Bairro DEMONSTRAÇÃO',
      latitude: 0,
      longitude: 0,
      instagram: '@perfil.demonstracao',
    };
  assert.equal(c.company.version, 0);
  const found = await call('field/search', { q: 'Local DEMONSTRAÇÃO' });
  assert.equal(found[0].latitude, 0);
  assert.equal(
    (await call('field/search', { q: 'Local DEMONSTRAÇÃO' }))[0].name,
    found[0].name,
  );
  assert.equal(
    (
      await t.request('field/search', {
        cookie: owner,
        method: 'POST',
        data: { q: 'Outro DEMONSTRAÇÃO' },
      })
    ).status,
    429,
  );

  const site = await call(
    'field/customers/' + customer,
    { data: place, version: 0 },
    'PUT',
  );
  assert.equal(site.version, 1);
  await call('field/customers/' + customer, { data: place, version: 1 }, 'PUT');
  assert.equal(
    (
      await t.request('field/customers/' + customer, {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: { data: place, version: 1 },
      })
    ).status,
    409,
  );
  await call('field/company', { data: place, version: 0 }, 'PUT');
  assert.equal(
    (
      await t.request('field/company', {
        cookie: operator,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: { data: place, version: 1 },
      })
    ).status,
    403,
  );
  await call(
    'field/profile',
    { display_name: 'Operador DEMONSTRAÇÃO', version: 0 },
    'PUT',
    operator,
  );
  await call(
    'field/profile',
    { display_name: 'Operador DEMONSTRAÇÃO atualizado', version: 1 },
    'PUT',
    operator,
  );
  assert(
    (await call('field/context', undefined, 'GET')).staff.some(
      (s) => s.display_name === 'Operador DEMONSTRAÇÃO atualizado',
    ),
  );
  assert.equal(
    (
      await t.request('field/customers/' + customer, {
        cookie: outside,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: { data: place, version: 2 },
      })
    ).status,
    404,
  );
  const base64 = (
    await sharp({
      create: { width: 64, height: 64, channels: 3, background: '#321d10' },
    })
      .webp()
      .toBuffer()
  ).toString('base64');
  await call(
    'field/customers/' + customer + '/photo',
    { version: 2, base64 },
    'PUT',
  );
  const img = await t.request('field/customers/' + customer + '/photo', {
    cookie: operator,
  });
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('cache-control'), 'no-store');
  assert.equal(
    (await t.request('field/customers/' + customer + '/photo')).status,
    401,
  );
  assert.equal(
    (
      await t.request('field/customers/' + customer + '/photo', {
        cookie: outside,
      })
    ).status,
    404,
  );
  const data = {
    customer_id: customer,
    due_at: '2030-01-07T13:00:00.000Z',
    items: [{ variant_id: variant, quantity: 2 }],
    delivery: {
      delivery_type: 'delivery',
      delivery_address: place.address,
      courier: 'partner',
    },
    terms: null,
  };
  const order = (await call('mobile/orders', data)).id;
  assert.equal(
    (await call('field/orders/' + order, undefined, 'GET')).latitude,
    0,
  );
  await call(
    'field/customers/' + customer,
    { data: { ...place, latitude: 1 }, version: 3 },
    'PUT',
  );
  assert.equal(
    (await call('field/orders/' + order, undefined, 'GET')).latitude,
    0,
  );
  const currentCustomer = await call('customers/' + customer, undefined, 'GET');
  await call(
    'customers/' + customer,
    {
      ...{
        name: currentCustomer.name,
        phone: currentCustomer.phone,
        email: '',
        notes: '',
        active: true,
      },
      version: currentCustomer.version,
      site: { data: place, version: 4 },
    },
    'PUT',
  );
  const savedCustomer = await call('customers/' + customer, undefined, 'GET');
  assert.equal(
    (
      await t.request('customers/' + customer, {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: {
          name: 'Alteração obsoleta DEMONSTRAÇÃO',
          phone: currentCustomer.phone,
          version: savedCustomer.version,
          site: { data: place, version: 4 },
        },
      })
    ).status,
    409,
  );
  assert.equal(
    (await call('customers/' + customer, undefined, 'GET')).name,
    currentCustomer.name,
  );
  const second = (
    await call('mobile/orders', {
      ...data,
      items: [{ variant_id: variant, quantity: 1 }],
    })
  ).id;
  const trip = {
    mode: 'uber',
    leg: 'roundtrip',
    occurred_at: new Date().toISOString(),
    amount_cents: 1001,
    order_ids: [order, second],
  };
  const key = crypto.randomUUID();
  const recorded = await call('field/trips', trip, 'POST', operator, key);
  assert.equal(
    (await call('field/trips', trip, 'POST', operator, key)).id,
    recorded.id,
  );
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const q = `?from=${today}&to=${today}`;
  const rows = await call('field/trips' + q, undefined, 'GET');
  assert.equal(
    rows[0].orders.reduce((n, o) => n + o.allocated_cents, 0),
    1001,
  );
  assert.equal(
    rows[0].orders.find((o) => o.order_id === order).allocated_cents,
    667,
  );
  assert.equal(
    (await call('p1/expenses' + q, undefined, 'GET')).spent_cents,
    1001,
  );
  assert.equal(
    (
      await t.request('p1/expenses/' + recorded.expense_id + '/reverse', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { reason: 'Correção DEMONSTRAÇÃO' },
      })
    ).status,
    409,
  );
  await call(
    'field/trips/' + recorded.id + '/reverse',
    { reason: 'Correção DEMONSTRAÇÃO' },
    'POST',
    operator,
  );
  assert.equal(
    (await call('p1/expenses' + q, undefined, 'GET')).spent_cents,
    0,
  );
  assert.equal(
    (await call('field/travel-report' + q, undefined, 'GET')).total_cents,
    0,
  );
  assert.equal(
    (await call('field/trips' + q, undefined, 'GET', outside)).length,
    0,
  );
  const newer = await call('field/trips', trip, 'POST', operator);
  await t.db
    .prepare(
      "UPDATE displacements SET created_at='2020-01-01T12:00:00.000Z' WHERE id=?",
    )
    .bind(newer.id)
    .run();
  assert.equal(
    (
      await t.request('field/trips/' + newer.id + '/reverse', {
        cookie: operator,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { reason: 'Correção DEMONSTRAÇÃO' },
      })
    ).status,
    403,
  );
  await call(
    'field/trips/' + newer.id + '/reverse',
    { reason: 'Correção administrativa DEMONSTRAÇÃO' },
    'POST',
  );
  assert.equal(
    (
      await t.db
        .prepare('SELECT COUNT(*) n FROM pragma_foreign_key_check')
        .first()
    ).n,
    0,
  );
  console.log(
    'OK R4 locais CAS, perfis, fotos privadas, snapshots, rateio, despesa única, idempotência, estornos e isolamento.',
  );
} finally {
  await t.dispose();
}
