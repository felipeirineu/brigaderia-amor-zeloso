// Cadastros e valores estritamente DEMONSTRAÇÃO, somente D1 efêmero.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const terms = {
  mode: 'delivery',
  cycle: 'fixed_days',
  fixed_days: [15, 31],
  base_date: '',
  week_end: 7,
  due_days: null,
};
const profile = {
  default_kit_id: null,
  establishment: '',
  responsible: '',
  address: '',
  neighborhood: '',
  reference: '',
  delivery_days: [],
  delivery_window: '',
  courier: 'unassigned',
  courier_name: '',
  courier_fee_cents: 0,
  terms,
};
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
  toolsEnabled: true,
  mixedEnabled: true,
});
try {
  const { call, customer, variant, owner, operator, outside } =
    await demoProject(t);
  assert.equal((await call('session', undefined, 'GET')).customer_orders, true);
  const person = (
    await call('customers', {
      name: 'Pessoa DEMONSTRAÇÃO',
      customer_type: 'person',
    })
  ).id;
  assert.equal(
    (await call('customers/' + customer, undefined, 'GET')).customer_type,
    'establishment',
  );
  let p = await call('customers/' + person, undefined, 'GET');
  assert.equal(p.phone, '');
  assert.equal(p.customer_type, 'person');
  await call(
    'customers/' + person,
    { name: p.name, notes: 'Editor anterior DEMONSTRAÇÃO', version: 1 },
    'PUT',
  );
  p = await call('customers/' + person, undefined, 'GET');
  assert.equal(p.customer_type, 'person', 'omissão conserva o tipo');
  const race = await Promise.all(
    [1, 2].map(() =>
      t.request('customers/' + person, {
        cookie: owner,
        method: 'PUT',
        data: { name: p.name, version: 2, customer_type: 'person' },
      }),
    ),
  );
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
  const model = {
    customer_id: person,
    name: 'Modelo DEMONSTRAÇÃO',
    weekday: 1,
    time: '10:00',
    delivery_type: 'pickup',
    items: [{ variant_id: variant, quantity: 1 }],
  };
  for (const active of [true, false])
    assert.equal(
      (
        await t.request('recurring', {
          cookie: owner,
          method: 'POST',
          key: crypto.randomUUID(),
          data: { ...model, active },
        })
      ).status,
      400,
    );
  await call('recurring', { ...model, customer_id: customer });
  const old = await call('customers/' + customer, undefined, 'GET');
  await call(
    'customers/' + customer,
    {
      name: old.name,
      phone: old.phone,
      version: old.version,
      customer_type: 'person',
    },
    'PUT',
  );
  assert.equal(
    (await call('generate-week', { week: '2030-01-07' })).skipped.length,
    1,
  );
  assert.deepEqual(
    (await call('mobile/defaults/' + customer + '?kits=1', undefined, 'GET'))
      .plans,
    [],
  );
  assert.deepEqual(
    (
      await call(
        'finance/customers/' + customer + '/defaults?kits=1',
        undefined,
        'GET',
      )
    ).plans,
    [],
  );
  assert.equal(
    (await call('finance/customers/' + person, undefined, 'GET')).customer
      .phone,
    '',
    'financeiro nunca expõe marcador de telefone',
  );
  const credit = { ...terms, mode: 'credit', due_days: 7 };
  for (const cookie of [owner, operator])
    assert.equal(
      (
        await t.request('finance/customers/' + person + '/profile', {
          cookie,
          method: 'PUT',
          data: { version: 0, data: { ...profile, terms: credit } },
        })
      ).status,
      400,
    );
  const data = {
    customer_id: person,
    due_at: '2030-01-07T13:00:00.000Z',
    occasion: 'birthday',
    items: [{ variant_id: variant, quantity: 1 }],
    delivery: { delivery_type: 'pickup', courier: 'unassigned' },
    terms,
  };
  for (const invalid of [credit, { ...terms, mode: 'unset' }])
    assert.equal(
      (
        await t.request('mobile/orders', {
          cookie: operator,
          method: 'POST',
          key: crypto.randomUUID(),
          data: { ...data, terms: invalid },
        })
      ).status,
      400,
    );
  const key = crypto.randomUUID();
  const created = await call('mobile/orders', data, 'POST', operator, key);
  assert.equal(
    (await call('mobile/orders', data, 'POST', operator, key)).id,
    created.id,
  );
  assert.equal(
    (
      await t.request('mobile/orders', {
        cookie: operator,
        method: 'POST',
        key,
        data: { ...data, occasion: 'gift' },
      })
    ).status,
    409,
  );
  let order = await call('orders/' + created.id, undefined, 'GET');
  assert.equal(order.occasion, 'birthday');
  const message = await call('orders/' + created.id + '/message', {
    kind: 'confirmation',
  });
  assert.match(message.message, /Ocasião: Aniversário/);
  assert.equal(message.phone, '');
  assert.equal(
    (await t.request('orders/' + created.id, { cookie: outside })).status,
    404,
  );
  await call('orders/' + created.id + '/status', {
    version: order.version,
    to: 'awaiting_confirmation',
    reason: 'Ajuste DEMONSTRAÇÃO',
  });
  order = await call('orders/' + created.id, undefined, 'GET');
  const { occasion, ...older } = data;
  assert.equal(occasion, 'birthday');
  await call(
    'mobile/orders/' + created.id,
    { ...older, version: order.version, terms: null },
    'PUT',
    operator,
  );
  assert.equal(
    (await call('orders/' + created.id, undefined, 'GET')).occasion,
    'birthday',
  );
  const draftData = {
    customer_id: person,
    due_at: data.due_at,
    occasion: 'gift',
    items: data.items,
  };
  const draft = (await call('orders', draftData)).id;
  await call(
    'orders/' + draft + '/delivery',
    { version: 1, delivery_type: 'pickup', courier: 'unassigned' },
    'PUT',
  );
  assert.equal(
    (
      await t.request('orders/' + draft + '/status', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { version: 2, to: 'confirmed' },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await t.request('finance/orders/' + draft + '/terms', {
        cookie: owner,
        method: 'PUT',
        data: { version: 2, terms: credit },
      })
    ).status,
    400,
  );
  const { occasion: ignored, ...oldDraft } = draftData;
  assert.equal(ignored, 'gift');
  const edits = await Promise.all(
    [1, 2].map(() =>
      t.request('orders/' + draft, {
        cookie: owner,
        method: 'PUT',
        data: { ...oldDraft, version: 2 },
      }),
    ),
  );
  assert.deepEqual(edits.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (await call('orders/' + draft, undefined, 'GET')).occasion,
    'gift',
  );
  await call(
    'finance/orders/' + draft + '/terms',
    { version: 3, terms },
    'PUT',
  );
  await call('orders/' + draft + '/status', { version: 4, to: 'confirmed' });
  assert.equal(
    (
      await t.request('customers/' + person, {
        cookie: outside,
        method: 'PUT',
        data: {
          name: 'Pessoa DEMONSTRAÇÃO',
          version: 3,
          customer_type: 'person',
        },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await t.request('orders', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { ...draftData, occasion: 'inventada' },
      })
    ).status,
    400,
  );
  const backup = await t.request('p1/backup', { cookie: owner });
  assert.equal(backup.status, 200);
  const restored = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import sqlite3,sys,json
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON');c.executescript(sys.stdin.read());print(json.dumps({'people':c.execute("SELECT COUNT(*) FROM customers WHERE customer_type='person'").fetchone()[0],'occasions':c.execute("SELECT COUNT(*) FROM orders WHERE occasion<>''").fetchone()[0],'fk':list(c.execute('PRAGMA foreign_key_check'))}))`,
      ],
      { input: await backup.text(), encoding: 'utf8' },
    ),
  );
  assert.deepEqual(restored, { people: 2, occasions: 2, fk: [] });
  assert.deepEqual(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results,
    [],
  );
  console.log(
    'OK R15 pessoa/ocasião: legado preservado, CAS/idempotência/tenant, telefone opcional, crédito/recorrência recusados, confirmação validada, WhatsApp e omissão preservada.',
  );
} finally {
  await t.dispose();
}
const old = await runtime({
  migrationLimit: 21,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
});
try {
  const { call, customer, variant, owner } = await demoProject(old);
  assert.equal(
    (await call('session', undefined, 'GET')).customer_orders,
    false,
  );
  assert.equal(
    (
      await old.request('customers', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { name: 'Pessoa DEMONSTRAÇÃO', customer_type: 'person' },
      })
    ).status,
    503,
  );
  const data = {
    customer_id: customer,
    due_at: '2030-01-07T13:00:00Z',
    items: [{ variant_id: variant, quantity: 1 }],
  };
  assert.equal(
    (
      await old.request('orders', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { ...data, occasion: 'gift' },
      })
    ).status,
    503,
  );
  await call('orders', data);
  assert.equal(
    (await call('mobile/customers', undefined, 'GET'))[0].customer_type,
    'establishment',
  );
  console.log('OK schema0021 mantém APIs antigas; campos novos aguardam0022.');
} finally {
  await old.dispose();
}

const paused = await runtime({ mobileEnabled: true });
try {
  const { call, owner, variant } = await demoProject(paused);
  const person = (
    await call('customers', {
      name: 'Pessoa DEMONSTRAÇÃO financeiro pausado',
      customer_type: 'person',
    })
  ).id;
  const data = {
    customer_id: person,
    due_at: '2030-01-07T13:00:00Z',
    items: [{ variant_id: variant, quantity: 1 }],
  };
  assert.equal(
    (
      await paused.request('mobile/orders', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: {
          ...data,
          delivery: { delivery_type: 'pickup', courier: 'unassigned' },
          terms: null,
        },
      })
    ).status,
    503,
  );
  const order = (await call('orders', data)).id;
  await call(
    'orders/' + order + '/delivery',
    { version: 1, delivery_type: 'pickup', courier: 'unassigned' },
    'PUT',
  );
  assert.equal(
    (
      await paused.request('orders/' + order + '/status', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { version: 2, to: 'confirmed' },
      })
    ).status,
    503,
  );
  console.log(
    'OK pessoa não confirma pelo móvel ou PC com financeiro pausado.',
  );
} finally {
  await paused.dispose();
}
