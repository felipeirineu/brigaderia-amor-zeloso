// Fixtures DEMONSTRAÇÃO, somente D1 efêmero. Sem banco/endereços reais.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
});
try {
  const { call, customer, variant, outside, operator } = await demoProject(t);
  const path = 'finance/customers/' + customer + '/profile';
  const legacy = {
    ...(await call(path, undefined, 'GET')).data,
    address: 'Endereço antigo DEMONSTRAÇÃO',
    neighborhood: 'Bairro antigo DEMONSTRAÇÃO',
    reference: 'Referência antiga DEMONSTRAÇÃO',
  };
  await call(path, { version: 0, data: legacy }, 'PUT');
  const draft = {
    customer_id: customer,
    due_at: '2030-01-07T13:00:00.000Z',
    items: [{ variant_id: variant, quantity: 1 }],
  };
  async function make(extra = {}) {
    const { id } = await call('orders', { ...draft, ...extra });
    return call('orders/' + id, undefined, 'GET');
  }
  const oldOrder = await make();
  assert.equal(
    oldOrder.delivery_address,
    [legacy.address, legacy.neighborhood, legacy.reference].join(' '),
  );
  const place = {
    name: '',
    address: '',
    street: 'Rua DEMONSTRAÇÃO',
    number: '20',
    neighborhood: 'Bairro DEMONSTRAÇÃO',
    city: 'Cidade DEMONSTRAÇÃO',
    reference: 'Referência DEMONSTRAÇÃO',
    latitude: null,
    longitude: null,
    instagram: '',
  };
  await call(
    'field/customers/' + customer,
    { version: 0, data: place },
    'PUT',
    operator,
  );
  const expected =
    'Rua DEMONSTRAÇÃO, 20, Bairro DEMONSTRAÇÃO, Cidade DEMONSTRAÇÃO · Ref.: Referência DEMONSTRAÇÃO';
  const order = await make();
  assert.equal(order.delivery_address, expected);
  assert.equal(
    order.delivery_address.split('Bairro DEMONSTRAÇÃO').length - 1,
    1,
  );
  assert.equal(
    (await call('orders/' + oldOrder.id, undefined, 'GET')).delivery_address,
    oldOrder.delivery_address,
  );
  assert.equal(
    (await call(path, undefined, 'GET')).data.address,
    legacy.address,
  );
  assert.equal(
    (
      await t.request('field/customers/' + customer, {
        cookie: outside,
        method: 'PUT',
        data: { version: 1, data: place },
        key: crypto.randomUUID(),
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await t.request('field/customers/' + customer, {
        cookie: operator,
        method: 'PUT',
        data: { version: 0, data: place },
        key: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  const model = await call('recurring', {
    name: 'Modelo DEMONSTRAÇÃO sem endereço próprio',
    customer_id: customer,
    weekday: 1,
    time: '10:00',
    delivery_type: 'delivery',
    items: draft.items,
  });
  assert.equal(
    (await make({ template_id: model.id })).delivery_address,
    expected,
  );
  const explicit = await call('recurring', {
    name: 'Modelo DEMONSTRAÇÃO com destino próprio',
    customer_id: customer,
    weekday: 1,
    time: '11:00',
    delivery_type: 'delivery',
    delivery_address: 'Destino específico DEMONSTRAÇÃO',
    items: draft.items,
  });
  assert.equal(
    (await make({ template_id: explicit.id })).delivery_address,
    'Destino específico DEMONSTRAÇÃO',
  );
  const generated = await call('generate-week', { week: '2030-01-07' });
  assert.equal(generated.orders.length, 2);
  assert(generated.orders.some((o) => o.delivery_address === expected));
  assert(
    generated.orders.some(
      (o) => o.delivery_address === 'Destino específico DEMONSTRAÇÃO',
    ),
  );
  await call(
    'field/customers/' + customer,
    {
      version: 1,
      data: {
        ...place,
        street: '',
        address: '',
        number: '',
        neighborhood: '',
        city: '',
        reference: '',
      },
    },
    'PUT',
  );
  assert.equal((await make()).delivery_address, ''); // Site apagado não ressuscita legado.
  console.log(
    'Endereço único: legado/site, bairro/referência, CAS/tenant, modelos, geração e snapshots aprovados.',
  );
} finally {
  await t.dispose();
}
