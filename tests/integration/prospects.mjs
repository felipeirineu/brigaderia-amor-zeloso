// R7a: fixtures DEMONSTRAÇÃO em D1 efêmero; nenhuma operação remota.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const flags = {
  prospectsEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
};
const t = await runtime(flags);
try {
  const { call, operator, outside, variant } = await demoProject(t);
  const payload = {
    name: 'Contato DEMONSTRAÇÃO',
    prospect: {
      contact_person: 'Equipe DEMONSTRAÇÃO',
      source: 'Visita DEMONSTRAÇÃO',
      next_step_at: '2030-01-07T13:00:00-03:00',
    },
    site: {
      version: 0,
      data: {
        name: '',
        address: 'Local DEMONSTRAÇÃO',
        neighborhood: '',
        latitude: 0,
        longitude: 0,
        instagram: '@exemplo.demonstracao',
      },
    },
  };
  const key = crypto.randomUUID();
  const created = await call('prospects', payload, 'POST', operator, key);
  assert.deepEqual(
    await call('prospects', payload, 'POST', operator, key),
    created,
  );
  const id = created.id;
  // Conversão só pela ação dedicada; JSON não pode forjar etapa/data de conversão.
  for (const prospect of [
    { stage: 'converted' },
    { converted_at: '2030-01-01T00:00:00Z' },
    { next_step_at: 'amanhã' },
  ]) {
    const result = await t.request('prospects', {
      cookie: operator,
      method: 'POST',
      key: crypto.randomUUID(),
      data: { name: 'Entrada inválida DEMONSTRAÇÃO', prospect },
    });
    assert.equal(result.status, 400);
  }
  assert.equal((await call('customers', undefined, 'GET')).length, 1);
  assert.equal(
    (await call('customers?kind=prospect', undefined, 'GET'))[0].id,
    id,
  );
  assert.equal(
    (await call('mobile/customers', undefined, 'GET')).some((c) => c.id === id),
    false,
  );
  assert.equal((await call('customers/' + id, undefined, 'GET')).phone, '');
  for (const [path, method, data] of [
    [
      'orders',
      'POST',
      {
        customer_id: id,
        due_at: '2030-01-07T13:00:00Z',
        items: [{ variant_id: variant, quantity: 1 }],
      },
    ],
    ['mobile/defaults/' + id, 'GET', undefined],
    [
      'mobile/orders',
      'POST',
      {
        customer_id: id,
        due_at: '2030-01-07T13:00:00Z',
        items: [{ variant_id: variant, quantity: 1 }],
        delivery: { delivery_type: 'pickup', courier: 'unassigned' },
        terms: null,
      },
    ],
    [
      'recurring',
      'POST',
      {
        name: 'Modelo DEMONSTRAÇÃO',
        customer_id: id,
        weekday: 1,
        time: '10:00',
        delivery_type: 'pickup',
        items: [{ variant_id: variant, quantity: 1 }],
      },
    ],
  ])
    assert.equal(
      (
        await t.request(path, {
          cookie: operator,
          method,
          data,
          key: crypto.randomUUID(),
        })
      ).status,
      400,
      path,
    );
  assert.equal(
    (await t.request('prospects/' + id, { cookie: outside })).status,
    404,
  );
  const photo = await sharp({
    create: { width: 20, height: 20, channels: 3, background: '#321d10' },
  })
    .webp()
    .toBuffer();
  await call(
    'field/customers/' + id + '/photo',
    { version: 1, base64: photo.toString('base64') },
    'PUT',
    operator,
  );
  const before = await call('prospects/' + id, undefined, 'GET');
  assert.equal(before.data.stage, 'to_visit');
  const next = {
    version: 1,
    stage: 'sample_delivered',
    next_step_at: '2030-01-08T13:00:00Z',
  };
  const [a, b] = await Promise.all([
    t.request('prospects/' + id + '/stage', {
      cookie: operator,
      method: 'POST',
      data: next,
      key: crypto.randomUUID(),
    }),
    t.request('prospects/' + id + '/stage', {
      cookie: operator,
      method: 'POST',
      data: { ...next, stage: 'follow_up' },
      key: crypto.randomUUID(),
    }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  const current = await call('prospects/' + id, undefined, 'GET');
  assert.equal(current.version, 2);
  assert.equal(current.events.length, 2);
  await call(
    'prospects/' + id + '/stage',
    { version: 2, stage: 'follow_up', next_step_at: '2030-01-09T13:00:00Z' },
    'POST',
    operator,
  );
  const convertKey = crypto.randomUUID();
  const converted = await call(
    'prospects/' + id + '/convert',
    { version: 3 },
    'POST',
    operator,
    convertKey,
  );
  assert.equal(converted.id, id);
  assert.deepEqual(
    await call(
      'prospects/' + id + '/convert',
      { version: 3 },
      'POST',
      operator,
      convertKey,
    ),
    converted,
  );
  assert.equal(
    (
      await t.request('prospects/' + id + '/convert', {
        cookie: operator,
        method: 'POST',
        data: { version: 4 },
        key: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  const history = await call('prospects/' + id, undefined, 'GET');
  assert.equal(history.data.stage, 'converted');
  const profile = await call(
    'finance/customers/' + id + '/profile',
    undefined,
    'GET',
  );
  assert.equal(profile.data.establishment, payload.name);
  assert.equal(profile.data.responsible, payload.prospect.contact_person);
  assert.equal(history.data.contact_person, payload.prospect.contact_person);
  assert.equal(history.events.length, 4);
  assert.equal(history.events.at(-1).from_stage, '');
  assert(
    (await call('customers', undefined, 'GET')).some(
      (c) => c.id === id && c.kind === 'customer',
    ),
  );
  assert.equal(
    (await call('customers?kind=prospect', undefined, 'GET')).length,
    0,
  );
  assert(
    (await call('mobile/customers', undefined, 'GET')).some((c) => c.id === id),
  );
  const site = (await call('field/context', undefined, 'GET')).sites.find(
    (s) => s.id === id,
  );
  assert.equal(site.data.instagram, 'exemplo.demonstracao');
  assert.equal(site.has_photo, 1);
  assert.deepEqual(
    Buffer.from(
      await (
        await t.request('field/customers/' + id + '/photo', {
          cookie: operator,
        })
      ).arrayBuffer(),
    ),
    photo,
  );
  assert.equal(site.data.address, payload.site.data.address);
  for (const table of [
    'orders',
    'payment_events',
    'reminders',
    'expense_events',
    'recurring_templates',
  ])
    assert.equal(
      (await t.db.prepare('SELECT COUNT(*) n FROM ' + table).first()).n,
      0,
      table + ' não pode ser criado pela conversão',
    );
  assert.equal(
    (
      await t.db
        .prepare('SELECT COUNT(*) n FROM pragma_foreign_key_check')
        .first()
    ).n,
    0,
  );
  const lost = await call(
    'prospects',
    { name: 'Sem interesse DEMONSTRAÇÃO', prospect: {} },
    'POST',
    operator,
  );
  await call(
    'prospects/' + lost.id + '/stage',
    { version: 1, stage: 'not_interested', reason: 'Motivo DEMONSTRAÇÃO' },
    'POST',
    operator,
  );
  await call('customers/' + lost.id, { version: 2 }, 'DELETE', operator);
  assert.equal(
    (await call('customers?kind=prospect', undefined, 'GET')).length,
    0,
  );
  assert.equal(
    (await call('customers?kind=prospect&active=all', undefined, 'GET'))[0]
      .active,
    0,
  );
  assert.equal(
    (await call('prospects/' + lost.id, undefined, 'GET')).events.length,
    2,
  );
  await call(
    'prospects/' + lost.id,
    {
      version: 3,
      name: 'Sem interesse DEMONSTRAÇÃO',
      active: true,
      prospect: { stage: 'not_interested', reason: 'Motivo DEMONSTRAÇÃO' },
    },
    'PUT',
    operator,
  );
  assert.equal(
    (await call('customers?kind=prospect', undefined, 'GET'))[0].active,
    1,
  );

  // Um perfil já preenchido sobrevive à conversão; pessoas continuam pessoas.
  const person = await call(
    'prospects',
    {
      name: 'Pessoa DEMONSTRAÇÃO',
      customer_type: 'person',
      prospect: {},
    },
    'POST',
    operator,
  );
  const configured = { responsible: 'Responsável DEMONSTRAÇÃO preservado' };
  await t.db
    .prepare(
      'INSERT INTO customer_profiles(organization_id,customer_id,data) VALUES(?,?,?)',
    )
    .bind(t.org, person.id, JSON.stringify(configured))
    .run();
  await call(
    'prospects/' + person.id + '/convert',
    { version: 1 },
    'POST',
    operator,
  );
  assert.equal(
    (await call('customers/' + person.id, undefined, 'GET')).customer_type,
    'person',
  );
  const preserved = await t.db
    .prepare(
      'SELECT data FROM customer_profiles WHERE organization_id=? AND customer_id=?',
    )
    .bind(t.org, person.id)
    .first();
  assert.deepEqual(JSON.parse(preserved.data), configured);

  console.log(
    'OK R7a: contatos/funil, CAS/concorrência, idempotência, conversão sem finanças/lembretes, histórico/local e arquivamento.',
  );
} finally {
  await t.dispose();
}
for (const options of [
  { ...flags, migrationLimit: 23 },
  { ...flags, prospectsEnabled: false },
]) {
  const t = await runtime(options);
  try {
    const { call, owner } = await demoProject(t);
    assert.equal((await call('session', undefined, 'GET')).prospects, false);
    if (!options.migrationLimit) {
      const contact = crypto.randomUUID();
      await t.db
        .prepare(
          "INSERT INTO customers(organization_id,id,name,phone,kind) VALUES(?,?,?,?,'prospect')",
        )
        .bind(t.org, contact, 'Oculto DEMONSTRAÇÃO', 'sem:' + contact)
        .run();
      assert.equal(
        (await call('mobile/customers', undefined, 'GET')).some(
          (c) => c.id === contact,
        ),
        false,
      );
    }
    assert.equal((await call('customers', undefined, 'GET')).length, 1);
    assert.equal(
      (
        await t.request('prospects', {
          cookie: owner,
          method: 'POST',
          data: { name: 'Contato DEMONSTRAÇÃO', prospect: {} },
          key: crypto.randomUUID(),
        })
      ).status,
      404,
    );
    assert.equal(
      (await t.request('customers?kind=prospect', { cookie: owner })).status,
      404,
    );
  } finally {
    await t.dispose();
  }
}
console.log(
  'OK R7a: até0023 e flag desligada mantêm gestão sem disponibilizar contatos.',
);
