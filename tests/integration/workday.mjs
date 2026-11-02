import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime();
try {
  const { call, customer, variant, owner, outside } = await demoProject(t);
  const create = async (due) => {
    const o = await call('orders', {
      customer_id: customer,
      due_at: due,
      items: [{ variant_id: variant, quantity: 1 }],
    });
    await call(
      `orders/${o.id}/delivery`,
      {
        version: 1,
        delivery_type: 'delivery',
        delivery_address: 'Endereço DEMONSTRAÇÃO',
        courier: 'unassigned',
        courier_name: '',
        courier_fee_cents: 0,
      },
      'PUT',
    );
    await call(`orders/${o.id}/status`, { version: 2, to: 'confirmed' });
  };
  await create('2030-02-01T02:59:00Z');
  await create('2030-02-01T03:00:00Z');
  const jan = await call('today/calendar?month=2030-01', undefined, 'GET');
  const feb = await call('today/calendar?month=2030-02', undefined, 'GET');
  assert.deepEqual(jan.counts, [{ day: '2030-01-31', count: 1 }]);
  assert.deepEqual(feb.counts, [{ day: '2030-02-01', count: 1 }]);
  assert.deepEqual(
    (await call('today/calendar?month=2030-02', undefined, 'GET', outside))
      .counts,
    [],
  );
  for (const month of ['2030-13', '2030-02-01', '0000-00'])
    assert.equal(
      (await t.request('today/calendar?month=' + month, { cookie: owner }))
        .status,
      400,
    );
  assert.equal((await t.request('today/calendar?month=2030-02')).status, 401);
  assert.equal(JSON.stringify(feb).includes('DEMONSTRAÇÃO'), false);
  console.log(
    'OK calendário agregado: fronteira Fortaleza/mês, isolamento, autorização, validação e saída sem dados pessoais.',
  );
} finally {
  await t.dispose();
}
