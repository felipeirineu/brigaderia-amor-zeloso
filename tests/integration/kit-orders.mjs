// Fixtures DEMONSTRAÇÃO em D1 efêmero; nenhuma migração ou dado remoto.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
  fieldEnabled: true,
});
try {
  const { call, customer, variant, owner, operator, outside } =
    await demoProject(t);
  const flavors = [(await call('products', undefined, 'GET'))[0].id];
  for (let n = 1; n < 5; n++)
    flavors.push(
      (
        await call('products', {
          name: `Sabor DEMONSTRAÇÃO ${n}`,
          variants: [
            {
              label: 'Embalagem DEMONSTRAÇÃO',
              weight_grams: 30,
              units_per_box: 12,
              price_cents: 100,
            },
          ],
        })
      ).id,
    );
  const kitData = {
    weight_grams: 15,
    dough_weight_grams: 13,
    units_per_kit: 25,
    price_cents: 12345,
    max_flavors: 5,
  };
  const kit = (await call('p1/kits', kitData)).id;
  const profilePath = 'finance/customers/' + customer + '/profile';
  const profile = await call(profilePath, undefined, 'GET');
  await call(
    profilePath,
    { version: 0, data: { ...profile.data, default_kit_id: kit } },
    'PUT',
  );
  const oldEditor = { ...profile.data };
  delete oldEditor.default_kit_id;
  await call(
    profilePath,
    {
      version: 1,
      data: { ...oldEditor, reference: 'Referência DEMONSTRAÇÃO' },
    },
    'PUT',
    operator,
  );
  let savedProfile = await call(profilePath, undefined, 'GET');
  assert.equal(
    savedProfile.data.default_kit_id,
    kit,
    'editor antigo preserva o kit padrão',
  );
  assert.equal(
    (await call('mobile/defaults/' + customer, undefined, 'GET')).profile
      .default_kit_id,
    kit,
  );
  const foreignKit = (await call('p1/kits', kitData, 'POST', outside)).id;
  for (const default_kit_id of [foreignKit, crypto.randomUUID()]) {
    const response = await t.request(profilePath, {
      cookie: owner,
      method: 'PUT',
      data: { version: 2, data: { ...savedProfile.data, default_kit_id } },
    });
    assert.equal(response.status, 404);
  }
  assert.equal(
    (
      await t.request(profilePath, {
        cookie: outside,
        method: 'PUT',
        data: { version: 2, data: savedProfile.data },
      })
    ).status,
    404,
  );
  const inactiveData = {
    weight_grams: 20,
    units_per_kit: 6,
    price_cents: 500,
    max_flavors: 2,
  };
  const inactiveKit = (await call('p1/kits', inactiveData)).id;
  await call(
    'p1/kits/' + inactiveKit,
    { ...inactiveData, version: 1, active: false },
    'PUT',
  );
  assert.equal(
    (
      await t.request(profilePath, {
        cookie: owner,
        method: 'PUT',
        data: {
          version: 2,
          data: { ...savedProfile.data, default_kit_id: inactiveKit },
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (await call(profilePath, undefined, 'GET')).version,
    2,
    'tentativa inválida não grava perfil',
  );
  await call(
    profilePath,
    { version: 2, data: { ...savedProfile.data, default_kit_id: null } },
    'PUT',
  );
  savedProfile = await call(profilePath, undefined, 'GET');
  assert.equal(savedProfile.data.default_kit_id, null);
  const composition = {
    kit_id: kit,
    quantity: 1,
    components: flavors.map((product_id) => ({ product_id, units: 5 })),
  };
  const payload = {
    customer_id: customer,
    due_at: '2030-01-07T13:00:00Z',
    items: [{ variant_id: variant, quantity: 1 }],
    kit_items: [composition],
  };
  const key = crypto.randomUUID(),
    order = (await call('orders', payload, 'POST', owner, key)).id;
  assert.equal((await call('orders', payload, 'POST', owner, key)).id, order);
  let detail = await call('orders/' + order, undefined, 'GET');
  assert.equal(detail.total_cents, 13345);
  const snapshot = detail.items.find((i) => i.kit_id);
  assert.equal(snapshot.components.length, 5);
  assert.equal(
    snapshot.weight_grams,
    15,
    'peso do kit independe das variantes dos sabores',
  );
  assert.equal(
    (await t.request('orders/' + order, { cookie: outside })).status,
    404,
  );
  assert.equal(
    (
      await t.request('orders', {
        method: 'POST',
        data: payload,
        key: crypto.randomUUID(),
      })
    ).status,
    401,
  );
  await call(
    'p1/kits/' + kit,
    { ...kitData, price_cents: 22222, version: 1 },
    'PUT',
  );
  const update = {
    ...payload,
    version: 1,
    kit_items: [{ ...composition, item_id: snapshot.id, quantity: 2 }],
  };
  const race = await Promise.all(
    [1, 2].map(() =>
      t.request('orders/' + order, {
        method: 'PUT',
        cookie: owner,
        data: update,
        key: crypto.randomUUID(),
      }),
    ),
  );
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
  detail = await call('orders/' + order, undefined, 'GET');
  assert.equal(
    detail.total_cents,
    25690,
    'quantidade preserva preço do kit histórico',
  );
  assert.equal(detail.items.find((i) => i.kit_id).id, snapshot.id);
  assert.equal(
    (
      await t.request('orders/' + order, {
        method: 'PUT',
        cookie: owner,
        data: { ...payload, kit_items: undefined, version: 2 },
        key: crypto.randomUUID(),
      })
    ).status,
    409,
    'editor antigo não remove kits',
  );
  await call(
    'orders/' + order + '/delivery',
    { version: 2, delivery_type: 'pickup', courier: 'unassigned' },
    'PUT',
  );
  await call('orders/' + order + '/status', { version: 3, to: 'confirmed' });
  assert.equal(
    (await call('orders/' + order, undefined, 'GET')).status,
    'confirmed',
  );
  const small = (
    await call('p1/kits', {
      weight_grams: 30,
      units_per_kit: 12,
      price_cents: 4200,
      max_flavors: 3,
    })
  ).id;
  const four = {
    kit_id: small,
    quantity: 1,
    components: flavors
      .slice(0, 4)
      .map((product_id) => ({ product_id, units: 3 })),
  };
  assert.equal(
    (
      await t.request('orders', {
        method: 'POST',
        cookie: owner,
        data: { ...payload, items: [], kit_items: [four] },
        key: crypto.randomUUID(),
      })
    ).status,
    400,
  );
  const wrong = {
    ...composition,
    components: [{ product_id: flavors[0], units: 24 }],
  };
  assert.equal(
    (
      await t.request('orders', {
        method: 'POST',
        cookie: owner,
        data: { ...payload, items: [], kit_items: [wrong] },
        key: crypto.randomUUID(),
      })
    ).status,
    400,
  );
  const mixedWeight = {
    ...composition,
    components: [{ product_id: flavors[0], units: 25, weight_grams: 30 }],
  };
  assert.equal(
    (
      await t.request('orders', {
        method: 'POST',
        cookie: owner,
        data: { ...payload, kit_items: [mixedWeight] },
        key: crypto.randomUUID(),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await t.request('orders', {
        method: 'POST',
        cookie: outside,
        data: payload,
        key: crypto.randomUUID(),
      })
    ).status,
    400,
    'cliente de outra organização é recusado',
  );
  const mobilePayload = {
    customer_id: customer,
    due_at: payload.due_at,
    kit_items: [composition],
    delivery: { delivery_type: 'pickup', courier: 'unassigned' },
  };
  const mobileKey = crypto.randomUUID(),
    mobile = (
      await call('mobile/orders', mobilePayload, 'POST', operator, mobileKey)
    ).id;
  assert.equal(
    (await call('mobile/orders', mobilePayload, 'POST', operator, mobileKey))
      .id,
    mobile,
  );
  const mobileOrder = await call('orders/' + mobile, undefined, 'GET');
  assert.equal(mobileOrder.status, 'confirmed');
  assert.equal(mobileOrder.total_cents, 22222, 'novo pedido usa preço atual');
  assert.equal(mobileOrder.items.length, 1);
  await t.db
    .prepare(
      'UPDATE orders SET created_at=created_at+10 WHERE organization_id=? AND id=?',
    )
    .bind(t.org, mobile)
    .run();
  await t.db
    .prepare(
      'UPDATE orders SET created_at=created_at+10 WHERE organization_id=? AND id=?',
    )
    .bind(t.org, mobile)
    .run();
  const defaults = await call('mobile/defaults/' + customer, undefined, 'GET');
  assert.equal(defaults.last.valid, false, 'repetição antiga não omite kits');
  assert.equal(defaults.last.kit_items.length, 1);
  const inactive = (
    await call('orders', { ...payload, items: [], kit_items: [composition] })
  ).id;
  await t.db
    .prepare('UPDATE products SET active=0 WHERE organization_id=? AND id=?')
    .bind(t.org, flavors[0])
    .run();
  await call(
    'orders/' + inactive + '/delivery',
    { version: 1, delivery_type: 'pickup', courier: 'unassigned' },
    'PUT',
  );
  assert.equal(
    (
      await t.request('orders/' + inactive + '/status', {
        cookie: owner,
        method: 'POST',
        data: { version: 2, to: 'confirmed' },
        key: crypto.randomUUID(),
      })
    ).status,
    400,
    'confirmar revalida atividade do sabor',
  );
  assert.equal(
    (
      await t.request('mobile/orders', {
        cookie: owner,
        method: 'POST',
        data: mobilePayload,
        key: crypto.randomUUID(),
      })
    ).status,
    400,
  );
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM product_variants').first()).n,
    5,
    'nenhuma variante por kit criada',
  );
  assert.deepEqual(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results,
    [],
  );
  console.log(
    'OK R15-B escrita clássica/móvel: kits25/5 sabores, limites/soma, snapshot, CAS/idempotência, confirmação ativa, tenant/401 e legado combinado.',
  );
} finally {
  await t.dispose();
}
