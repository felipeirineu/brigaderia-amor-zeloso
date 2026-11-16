import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp('/tmp/az-visit-count-');
await build({
  entryPoints: ['worker/operations.ts'],
  outfile: dir + '/operations.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
});
const { operations } = await import(
  pathToFileURL(dir + '/operations.mjs').href
);
// R7b: fixtures DEMONSTRAÇÃO em D1 efêmero; nenhum provedor/banco remoto.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { fortalezaDay, shiftDay } from '../../shared/workday.ts';
const flags = {
  prospectsEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
};
const t = await runtime(flags);
try {
  const { call, owner, operator, outside, variant, makeOrder } =
    await demoProject(t);
  const day = fortalezaDay(),
    when = day + 'T14:00:00-03:00';
  const product = (await call('products', undefined, 'GET'))[0];
  const contact = await call(
    'prospects',
    { name: 'Contato DEMONSTRAÇÃO visita', prospect: {} },
    'POST',
    operator,
  );
  const input = {
    customer_id: contact.id,
    scheduled_at: when,
    notes: 'Planejamento DEMONSTRAÇÃO',
    samples: [{ product_id: product.id, units: 3, weight_grams: 10 }],
  };
  const key = crypto.randomUUID();
  const first = await call('visits', input, 'POST', operator, key);
  assert.deepEqual(await call('visits', input, 'POST', operator, key), first);
  const second = await call(
    'visits',
    { ...input, samples: [{ product_id: product.id, units: 5 }] },
    'POST',
    operator,
  );
  const third = await call(
    'visits',
    { ...input, scheduled_at: shiftDay(day, 1) + 'T10:00:00-03:00' },
    'POST',
    operator,
  );
  await makeOrder(when);
  const dayView = () => call('today?date=' + day, undefined, 'GET');
  const before = await dayView();
  assert.equal(before.visits.length, 2);
  assert.equal(
    before.production.reduce((n, p) => n + p.units, 0),
    4,
  );
  assert.equal(
    before.sample_production.reduce((n, p) => n + p.units, 0),
    11,
  );
  assert.equal(
    before.sample_production.find((p) => p.weight_grams === null).units,
    5,
  );
  const agenda = await call(
    `p1/calendar?from=${day}&to=${shiftDay(day, 1)}&kind=visit`,
    undefined,
    'GET',
  );
  assert.equal(agenda.events.length, 3);
  assert.equal(agenda.visits_enabled, true);
  const ics = await t.request(
    `p1/calendar.ics?from=${day}&to=${day}&kind=visit`,
    { cookie: operator },
  );
  assert.match(await ics.text(), /Visita de apresentação/);
  assert.equal(
    (await t.request('visits/' + first.id, { cookie: outside })).status,
    404,
  );
  assert.equal(
    (await call('visits?from=' + day + '&to=' + day, undefined, 'GET', outside))
      .length,
    0,
  );
  const outsider = (await call('session', undefined, 'GET', outside)).user_id;
  const op = (await call('session', undefined, 'GET', operator)).user_id;
  for (const data of [
    { ...input, samples: [...input.samples, ...input.samples] },
    { ...input, samples: [{ product_id: crypto.randomUUID(), units: 2 }] },
    { ...input, samples: [{ product_id: product.id, units: 0 }] },
    { ...input, version: 20 },
  ])
    assert.equal(
      (
        await t.request('visits', {
          cookie: operator,
          method: 'POST',
          key: crypto.randomUUID(),
          data,
        })
      ).status,
      400,
    );
  await call(
    'visits/' + first.id,
    { ...input, version: 1, notes: 'Revisto DEMONSTRAÇÃO' },
    'PUT',
    operator,
  );
  const record = {
    version: 2,
    occurred_at: new Date().toISOString(),
    performer_id: op,
    next_step_at: shiftDay(day, 3) + 'T10:00:00-03:00',
    notes: 'Visita DEMONSTRAÇÃO',
    samples: [{ product_id: product.id, units: 2, weight_grams: 10 }],
  };
  assert.equal(
    (
      await t.request('visits/' + first.id + '/record', {
        cookie: operator,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { ...record, performer_id: outsider },
      })
    ).status,
    400,
  );
  const recKey = crypto.randomUUID();
  const outcomes = await Promise.all(
    [recKey, crypto.randomUUID()].map((key) =>
      t.request('visits/' + first.id + '/record', {
        cookie: operator,
        method: 'POST',
        key,
        data: record,
      }),
    ),
  );
  assert.deepEqual(outcomes.map((r) => r.status).sort(), [201, 409]);
  const recorded = await call('visits/' + first.id, undefined, 'GET');
  assert.equal(recorded.status, 'completed');
  assert.equal(recorded.record.samples[0].units, 2);
  assert.equal(recorded.record.samples[0].product_name, product.name);
  assert.equal(recorded.record.performer_id, op);
  assert.equal(recorded.recorded_by, op);
  if (outcomes[0].ok)
    assert.equal(
      (
        await call(
          'visits/' + first.id + '/record',
          record,
          'POST',
          operator,
          recKey,
        )
      ).id,
      first.id,
    );
  const details = await call('prospects/' + contact.id, undefined, 'GET');
  assert.equal(details.data.stage, 'sample_delivered');
  assert.equal(details.events.length, 2);
  const after = await dayView();
  assert.deepEqual(after.totals, before.totals);
  assert.deepEqual(after.production, before.production);
  assert.equal(
    after.sample_production.reduce((n, p) => n + p.units, 0),
    8,
  );
  const count = async (table) =>
    (await t.db.prepare('SELECT COUNT(*) n FROM ' + table).first()).n;
  for (const table of [
    'payment_events',
    'reminders',
    'expense_events',
    'displacements',
  ])
    assert.equal(await count(table), 0, table);
  assert.equal(await count('orders'), 1);
  await call(
    'visits/' + second.id + '/cancel',
    { version: 1, reason: 'Cancelamento DEMONSTRAÇÃO' },
    'POST',
    operator,
  );
  assert.equal(
    (await dayView()).sample_production.reduce((n, p) => n + p.units, 0),
    3,
  );
  await call(
    'prospects/' + contact.id + '/convert',
    { version: 2 },
    'POST',
    operator,
  );
  assert.equal(
    (await call('visits?customer_id=' + contact.id, undefined, 'GET')).length,
    3,
  );
  assert.equal(
    (await call('visits/' + first.id, undefined, 'GET')).record.samples[0]
      .units,
    2,
  );
  assert.equal(
    (
      await t.request('visits/' + third.id + '/record', {
        cookie: outside,
        method: 'POST',
        key: crypto.randomUUID(),
        data: record,
      })
    ).status,
    404,
  );
  // Corrida só existe depois desta confirmação humana separada. Nunca recebe pedidos falsos.
  const trip = {
    visit_id: first.id,
    order_ids: [],
    mode: 'car',
    leg: 'roundtrip',
    occurred_at: new Date().toISOString(),
    amount_cents: 500,
    method: 'cash',
  };
  const tripKey = crypto.randomUUID();
  const saved = await call('field/trips', trip, 'POST', operator, tripKey);
  assert.deepEqual(
    await call('field/trips', trip, 'POST', operator, tripKey),
    saved,
  );
  assert.equal(await count('expense_events'), 1);
  assert.equal(
    (await t.db.prepare('SELECT category FROM expense_events').first())
      .category,
    'prospecting',
  );
  assert.equal(await count('displacement_orders'), 0);
  assert.equal(await count('prospect_visit_trips'), 1);
  assert.equal(
    (
      await t.request('field/trips', {
        cookie: outside,
        method: 'POST',
        key: crypto.randomUUID(),
        data: trip,
      })
    ).status,
    404,
  );
  const trips = await call(
    `field/trips?from=${day}&to=${day}`,
    undefined,
    'GET',
  );
  assert.equal(trips.find((x) => x.id === saved.id).visit_id, first.id);
  await call(
    'field/trips/' + saved.id + '/reverse',
    { reason: 'Correção DEMONSTRAÇÃO' },
    'POST',
    operator,
  );
  assert.equal(await count('expense_events'), 2);
  assert.equal(
    (await call(`field/trips?from=${day}&to=${day}`, undefined, 'GET')).find(
      (x) => x.reversal_of === saved.id,
    ).visit_id,
    first.id,
  );
  assert.equal(
    (
      await t.db
        .prepare('SELECT COUNT(*) n FROM pragma_foreign_key_check')
        .first()
    ).n,
    0,
  );
  // Uma visita pendente continua editável/registrável após a conversão, sem reabrir o funil.
  await call(
    'visits/' + third.id,
    {
      ...input,
      version: 1,
      scheduled_at: shiftDay(day, 1) + 'T11:00:00-03:00',
    },
    'PUT',
    operator,
  );
  await call(
    'visits/' + third.id + '/record',
    { ...record, version: 2, samples: [] },
    'POST',
    operator,
  );
  assert.equal(
    (await call('prospects/' + contact.id, undefined, 'GET')).data.stage,
    'converted',
  );
  const closed = await call('prospects', {
    name: 'Sem interesse DEMONSTRAÇÃO visita',
    prospect: {},
  });
  const closedVisit = await call('visits', {
    ...input,
    customer_id: closed.id,
  });
  await call('prospects/' + closed.id + '/stage', {
    version: 1,
    stage: 'not_interested',
    reason: 'Motivo DEMONSTRAÇÃO',
  });
  await call('visits/' + closedVisit.id + '/record', { ...record, version: 1 });
  assert.equal(
    (await call('prospects/' + closed.id, undefined, 'GET')).data.stage,
    'not_interested',
  );
  // A amostra já planejada pode ter sido entregue antes de o sabor ser desativado.
  const historic = await call('visits', { ...input, customer_id: closed.id });
  const unplanned = await call('visits', {
    ...input,
    customer_id: closed.id,
    samples: [],
  });
  await t.db
    .prepare('UPDATE products SET active=0 WHERE organization_id=? AND id=?')
    .bind(t.org, product.id)
    .run();
  assert.equal(
    (
      await t.request('visits/' + unplanned.id + '/record', {
        cookie: operator,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { ...record, version: 1 },
      })
    ).status,
    400,
  );
  await call('visits/' + historic.id + '/record', { ...record, version: 1 });
  assert.equal(
    (await call('visits/' + historic.id, undefined, 'GET')).record.samples[0]
      .product_name,
    product.name,
  );
  assert.equal(
    (
      await t.request('visits', {
        cookie: operator,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { ...input, customer_id: closed.id },
      })
    ).status,
    400,
  );
  await t.db
    .prepare('UPDATE products SET active=1 WHERE organization_id=? AND id=?')
    .bind(t.org, product.id)
    .run();
  const bulk = await call('prospects', {
    name: 'Contato DEMONSTRAÇÃO lote',
    prospect: {},
  });
  await t.db.batch(
    Array.from({ length: 65 }, () =>
      t.db
        .prepare(
          'INSERT INTO prospect_visits(organization_id,id,customer_id,scheduled_at,data) VALUES(?,?,?,?,?)',
        )
        .bind(
          t.org,
          crypto.randomUUID(),
          bulk.id,
          new Date().toISOString(),
          JSON.stringify({
            notes: 'Lote DEMONSTRAÇÃO',
            samples: [
              {
                product_id: product.id,
                product_name: product.name,
                photo_key: null,
                units: 1,
                weight_grams: null,
              },
            ],
          }),
        ),
    ),
  );
  let sql = 0;
  const measured = {
    prepare(q) {
      sql++;
      return t.db.prepare(q);
    },
    batch(q) {
      return t.db.batch(q);
    },
  };
  const me = await call('session', undefined, 'GET');
  const result = await operations(
    new Request(t.url + '/api/today?date=' + day),
    {
      DB: measured,
      OPERATIONS_ENABLED: 'true',
      FINANCE_ENABLED: 'true',
      P1_ENABLED: 'true',
      MOBILE_ENABLED: 'true',
      FIELD_ENABLED: 'true',
      PROSPECTS_ENABLED: 'true',
      MIXED_BOXES_ENABLED: 'true',
    },
    {
      organization_id: t.org,
      user_id: me.user_id,
      role: 'owner',
      token_hash: 'fixture',
    },
  );
  assert.equal(result.status, 200);
  const many = await result.json();
  assert(many.visits.length >= 65);
  assert.equal(
    many.sample_production.reduce((n, p) => n + p.units, 0),
    65,
  );
  assert(sql <= 45, 'Hoje com65 visitas: ' + sql + ' SQL; reserva até teto50');
  console.log('OK R7b Hoje com65 visitas:', sql, 'SQL (orçamento45 de50).');
  console.log(
    'OK R7b: agendamento/agenda/ICS, unidades separadas, registro humano/CAS/idempotência, conversão preserva visitas e corrida explícita/estorno.',
  );
} finally {
  await t.dispose();
  await rm(dir, { recursive: true, force: true });
}
for (const options of [
  { ...flags, migrationLimit: 24 },
  { ...flags, migrationLimit: 23 },
  { ...flags, prospectsEnabled: false },
]) {
  const t = await runtime(options);
  try {
    const { call, owner } = await demoProject(t);
    assert.equal((await call('session', undefined, 'GET')).visits, false);
    assert.equal((await t.request('visits', { cookie: owner })).status, 404);
    assert.deepEqual(
      (await call('today', undefined, 'GET')).sample_production,
      [],
    );
    await call('p1/calendar', undefined, 'GET');
    if (options.migrationLimit === 24)
      await call('prospects', {
        name: 'Contato DEMONSTRAÇÃO legado',
        prospect: {},
      });
    console.log('OK R7b fallback:', options.migrationLimit ?? 'flag desligada');
  } finally {
    await t.dispose();
  }
}
