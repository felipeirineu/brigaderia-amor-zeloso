// Fixtures fictícias, somente workerd/D1 efêmero.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { mixedAnalysisProject } from '../helpers/mixed-analysis-project.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
  toolsEnabled: true,
});
try {
  const { call, variants, customer, owner, operator, outside, variant } =
    await mixedAnalysisProject(t);
  const parts = (units) =>
    variants.map((v, i) => ({ variant_id: v.id, units: units[i] }));
  const data = {
    name: 'Modelo misto DEMONSTRAÇÃO',
    customer_id: customer,
    weekday: 1,
    time: '10:00',
    delivery_type: 'pickup',
    composition_version: 1,
    items: [
      { variant_id: variants[0].id, quantity: 2, components: parts([8, 3, 1]) },
      { variant_id: variants[0].id, quantity: 1, components: parts([7, 4, 1]) },
      { variant_id: variants[1].id, quantity: 1 },
    ],
  };
  const model = await call('recurring', data, 'POST', operator);
  let saved = await call('recurring/' + model.id, undefined, 'GET');
  assert.equal(saved.items.length, 3);
  assert.equal(saved.items.filter((i) => i.components).length, 2);
  for (const path of [
    'mobile/defaults/' + customer,
    'finance/customers/' + customer + '/defaults',
  ]) {
    const d = await call(path, undefined, 'GET');
    if (path.startsWith('mobile/'))
      assert.equal(d.last.items.filter((i) => i.components?.length).length, 1);
    const p = d.plans.find((p) => p.id === model.id);
    assert.equal(p.valid, true);
    assert.equal(p.items.filter((i) => i.components).length, 2);
  }
  const oldEditor = await t.request('recurring/' + model.id, {
    cookie: owner,
    method: 'PUT',
    data: {
      ...data,
      version: 1,
      composition_version: undefined,
      items: [{ variant_id: variants[0].id, quantity: 1 }],
    },
  });
  assert.equal(oldEditor.status, 409);
  assert.equal(
    (await call('recurring/' + model.id, undefined, 'GET')).version,
    1,
  );
  const bad = await call('recurring', {
    ...data,
    name: 'Inválido DEMONSTRAÇÃO',
    items: [{ variant_id: variant, quantity: 1 }],
  });
  await t.db
    .prepare(
      'UPDATE product_variants SET active=0 WHERE organization_id=? AND id=?',
    )
    .bind(t.org, variant)
    .run();
  const generated = await call('generate-week', { week: '2030-01-07' });
  assert.equal(generated.created, 1);
  assert.equal(generated.skipped[0].id, bad.id);
  const order = generated.orders[0];
  assert.equal(order.total_cents, 5006);
  assert.equal(order.items.filter((i) => i.components?.length).length, 2);
  const repeated = await call('generate-week', { week: '2030-01-07' });
  assert.equal(repeated.created, 0);
  assert.equal(repeated.orders[0].id, order.id);
  assert.equal(
    (
      await t.db
        .prepare(
          'SELECT COUNT(*) n FROM order_item_components c JOIN order_items i ON i.organization_id=c.organization_id AND i.id=c.item_id WHERE i.organization_id=? AND i.order_id=?',
        )
        .bind(t.org, order.id)
        .first()
    ).n,
    6,
  );
  // Alteração de modelo não reescreve a composição/snapshot do pedido já gerado.
  await call(
    'recurring/' + model.id,
    { ...data, version: 1, items: [{ ...data.items[0], quantity: 3 }] },
    'PUT',
  );
  assert.equal(
    (await call('orders/' + order.id, undefined, 'GET')).items.length,
    3,
  );
  const race = await Promise.all(
    [0, 1].map(() =>
      t.request('recurring/' + model.id, {
        cookie: owner,
        method: 'PUT',
        data: { ...data, version: 2 },
      }),
    ),
  );
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
  saved = await call('recurring/' + model.id, undefined, 'GET');
  assert.equal(saved.version, 3);
  assert.equal(saved.items.length, 3);
  // Erros não deixam componentes ou versões parciais.
  for (const items of [
    [{ ...data.items[0], components: parts([7, 3, 1]) }],
    [data.items[0], data.items[0]],
    [
      {
        ...data.items[0],
        components: [
          { variant_id: variants[0].id, units: 12 },
          { variant_id: variants[0].id, units: 1 },
        ],
      },
    ],
    [
      {
        ...data.items[0],
        components: [{ variant_id: crypto.randomUUID(), units: 12 }],
      },
    ],
  ]) {
    const response = await t.request('recurring/' + model.id, {
      cookie: owner,
      method: 'PUT',
      data: { ...data, version: 3, items },
    });
    assert.equal(response.status, 400);
  }
  assert.equal(
    (await call('recurring/' + model.id, undefined, 'GET')).version,
    3,
  );
  for (const [column, invalid, original] of [
    ['weight_grams', 40, 30],
    ['units_per_box', 24, 12],
  ]) {
    await t.db
      .prepare(
        `UPDATE product_variants SET ${column}=? WHERE organization_id=? AND id=?`,
      )
      .bind(invalid, t.org, variants[2].id)
      .run();
    const incompatible = await t.request('recurring/' + model.id, {
      cookie: owner,
      method: 'PUT',
      data: { ...data, version: 3 },
    });
    assert.equal(incompatible.status, 400);
    await t.db
      .prepare(
        `UPDATE product_variants SET ${column}=? WHERE organization_id=? AND id=?`,
      )
      .bind(original, t.org, variants[2].id)
      .run();
  }
  assert.equal((await t.request('recurring/' + model.id)).status, 401);
  assert.equal(
    (await t.request('recurring/' + model.id, { cookie: outside })).status,
    404,
  );
  assert.equal(
    (
      await t.request('recurring/' + model.id, {
        cookie: outside,
        method: 'PUT',
        data: { ...data, version: 3 },
      })
    ).status,
    404,
  );
  await call('orders/' + order.id + '/status', { version: 1, to: 'confirmed' });
  const today = await call('today?date=2030-01-07', undefined, 'GET');
  assert.equal(
    today.production.find((p) => p.name === 'Alfa DEMONSTRAÇÃO').units,
    23,
  );
  assert.equal(
    today.production.find((p) => p.name === 'Beta DEMONSTRAÇÃO').units,
    22,
  );
  assert.equal(
    today.production.find((p) => p.name === 'Gama DEMONSTRAÇÃO').units,
    3,
  );
  // Volume acima de 60 modelos, sem consulta por modelo/componente.
  const copies = Array.from({ length: 65 }, (_, i) => ({
    id: crypto.randomUUID(),
    item: crypto.randomUUID(),
    name: 'Modelo DEMONSTRAÇÃO ' + i,
  }));
  await t.db.batch([
    t.db
      .prepare(
        "INSERT INTO recurring_templates(organization_id,id,customer_id,name,weekday,time) SELECT ?,json_extract(value,'$.id'),?,json_extract(value,'$.name'),1,'10:00' FROM json_each(?)",
      )
      .bind(t.org, customer, JSON.stringify(copies)),
    t.db
      .prepare(
        "INSERT INTO recurring_mixed_items(organization_id,id,template_id,variant_id,quantity,composition_key) SELECT ?,json_extract(value,'$.item'),json_extract(value,'$.id'),?,1,'fixture' FROM json_each(?)",
      )
      .bind(t.org, variants[0].id, JSON.stringify(copies)),
    t.db
      .prepare(
        "INSERT INTO recurring_mixed_components(organization_id,item_id,variant_id,units) SELECT ?,json_extract(j.value,'$.item'),json_extract(c.value,'$.variant_id'),json_extract(c.value,'$.units') FROM json_each(?) j CROSS JOIN json_each(?) c",
      )
      .bind(t.org, JSON.stringify(copies), JSON.stringify(parts([8, 3, 1]))),
  ]);
  const volume = await call('generate-week', { week: '2030-01-14' });
  assert.equal(volume.created, 66);
  assert.equal(volume.orders.length, 66);
  assert.ok(
    volume.orders.every((o) => o.items.some((i) => i.components?.length)),
  );
  assert.equal(
    (await call('generate-week', { week: '2030-01-14' })).created,
    0,
  );
  assert.equal(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results.length,
    0,
  );
  const simple = await call('recurring', {
    ...data,
    name: 'Simples DEMONSTRAÇÃO',
    items: [{ variant_id: variants[1].id, quantity: 1 }],
  });
  await t.db
    .prepare(
      'UPDATE product_variants SET active=0 WHERE organization_id=? AND id=?',
    )
    .bind(t.org, variants[2].id)
    .run();
  const inactiveComponent = await call('generate-week', { week: '2030-01-21' });
  assert.equal(inactiveComponent.created, 1);
  assert.ok(inactiveComponent.skipped.some((p) => p.id === model.id));
  const defaults = await call('mobile/defaults/' + customer, undefined, 'GET');
  assert.equal(defaults.plans.find((p) => p.id === model.id).valid, false);
  assert.equal(defaults.plans.find((p) => p.id === simple.id).valid, true);
  console.log(
    'OK misturas recorrentes, defaults, snapshots, CAS, idempotência, inválidos/isolamento e 66 modelos.',
  );
} finally {
  await t.dispose();
}
const old = await runtime({ migrationLimit: 15, mixedEnabled: true });
try {
  const { demoProject } = await import('../helpers/demo-project.mjs');
  const { call, customer, variant, owner } = await demoProject(old);
  const data = {
    name: 'Modelo simples DEMONSTRAÇÃO',
    customer_id: customer,
    weekday: 1,
    time: '10:00',
    items: [{ variant_id: variant, quantity: 1 }],
  };
  await call('recurring', data);
  assert.equal(
    (await call('generate-week', { week: '2030-01-07' })).created,
    1,
  );
  assert.equal(
    (
      await old.request('recurring', {
        cookie: owner,
        method: 'POST',
        data: {
          ...data,
          items: [
            {
              variant_id: variant,
              quantity: 1,
              components: [{ variant_id: variant, units: 2 }],
            },
          ],
        },
      })
    ).status,
    503,
  );
  console.log(
    'OK banco até 0015 mantém modelos simples e recusa montagem recorrente antes de 0016.',
  );
} finally {
  await old.dispose();
}
