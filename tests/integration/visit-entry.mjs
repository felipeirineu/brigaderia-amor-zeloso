// R7d: somente dados DEMONSTRAÇÃO em D1 efêmero. Nenhum provedor ou banco remoto.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { weightCostingProject } from '../helpers/weight-costing-project.mjs';
import { fortalezaDay } from '../../shared/workday.ts';
const t = await runtime({
  prospectsEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
});
try {
  const { call, operator, outside, customer, product } =
      await weightCostingProject(t),
    day = fortalezaDay();
  const scalar = async (table) =>
    (await t.db.prepare('SELECT COUNT(*) n FROM ' + table).first()).n;
  const baseline = await call('customers/' + customer, undefined, 'GET');
  const samples = [{ product_id: product.id, units: 2, weight_grams: 30 }],
    payload = {
      customer_id: customer,
      scheduled_at: new Date().toISOString(),
      samples,
    };
  assert.equal(
    (
      await t.request('visits', {
        cookie: operator,
        method: 'POST',
        data: { ...payload, audience: 'prospect' },
        key: crypto.randomUUID(),
      })
    ).status,
    400,
    'público não é controlado pelo formulário',
  );
  const key = crypto.randomUUID();
  const visit = await call('visits', payload, 'POST', operator, key);
  assert.deepEqual(await call('visits', payload, 'POST', operator, key), visit);
  let v = await call('visits/' + visit.id, undefined, 'GET');
  assert.equal(v.data.audience, 'customer');
  assert.equal(v.data.purpose, 'new_options');
  for (const action of [
    'visits/' + v.id,
    'visits/' + v.id + '/costs',
    'visits/' + v.id + '/followup?kind=prices',
  ])
    assert.equal((await t.request(action, { cookie: outside })).status, 404);
  assert.equal(
    (
      await t.request('visits', {
        cookie: outside,
        method: 'POST',
        data: payload,
        key: crypto.randomUUID(),
      })
    ).status,
    404,
  );
  const actual = { version: 1, occurred_at: new Date().toISOString(), samples };
  const recordKey = crypto.randomUUID();
  const recorded = await call(
    'visits/' + v.id + '/record',
    actual,
    'POST',
    operator,
    recordKey,
  );
  assert.deepEqual(
    await call(
      'visits/' + v.id + '/record',
      actual,
      'POST',
      operator,
      recordKey,
    ),
    recorded,
  );
  assert.deepEqual(
    await call('customers/' + customer, undefined, 'GET'),
    baseline,
    'visita de cliente não altera cadastro nem sua versão',
  );
  for (const table of [
    'prospect_details',
    'prospect_events',
    'orders',
    'payment_events',
    'expense_events',
    'reminders',
  ])
    assert.equal(await scalar(table), 0, table + ' não é criado pela visita');
  assert.equal(
    (await call('visits/' + v.id + '/costs', undefined, 'GET')).estimate
      .estimated_cents,
    300,
  );
  assert(
    (
      await call('visits/' + v.id + '/followup?kind=feedback', undefined, 'GET')
    ).message.includes('O que achou'),
  );
  const c = await call('prospects', {
    name: 'Contato DEMONSTRAÇÃO aquisição',
    prospect: {},
  });
  const prospects = await call(
    'customers?kind=all&q=DEMONSTRAÇÃO',
    undefined,
    'GET',
  );
  assert(prospects.some((c) => c.kind === 'prospect'));
  assert(prospects.some((c) => c.kind === 'customer'));
  assert(
    (await call('customers', undefined, 'GET')).every(
      (c) => c.kind === 'customer',
    ),
    'lista padrão não passa a misturar contatos',
  );
  const pv = await call('visits', {
    ...payload,
    customer_id: c.id,
    samples: [{ ...samples[0], units: 3 }],
  });
  await call('visits/' + pv.id + '/record', {
    ...actual,
    samples: [{ ...samples[0], units: 3 }],
  });
  await call('prospects/' + c.id + '/convert', { version: 2 });
  const previous = await call('prospects/' + c.id, undefined, 'GET');
  const relationship = await call('visits', {
    ...payload,
    customer_id: c.id,
    samples: [{ ...samples[0], units: 1 }],
  });
  await call('visits/' + relationship.id + '/record', {
    ...actual,
    samples: [{ ...samples[0], units: 1 }],
  });
  assert.deepEqual(
    await call('prospects/' + c.id, undefined, 'GET'),
    previous,
    'relacionamento preserva funil/histórico da conversão',
  );
  const r = await call(
    'prospecting/report?from=' + day + '&to=' + day,
    undefined,
    'GET',
  );
  assert.equal(r.visits, 3);
  assert.equal(r.prospect_visits, 1);
  assert.equal(r.customer_visits, 2);
  assert.equal(r.visited_contacts, 1);
  assert.equal(r.conversions, 1);
  assert.equal(r.cohort_rate, 100);
  assert.equal(r.acquisition_per_customer_cents, 450);
  assert.equal(r.customer_cost_used_cents, 450);
  assert.equal(
    r.flavors[0].units,
    3,
    'amostras de relacionamento não entram no sabor associado à aquisição',
  );
  // Visita antiga sem os novos campos continua no grupo de contatos após converter.
  await t.db
    .prepare(
      "UPDATE prospect_visits SET data=json_remove(data,'$.audience','$.purpose') WHERE organization_id=? AND id=?",
    )
    .bind(t.org, pv.id)
    .run();
  assert.equal(
    (
      await call(
        'prospecting/report?from=' + day + '&to=' + day,
        undefined,
        'GET',
      )
    ).prospect_visits,
    1,
  );
  const upcoming = await call('visits', payload);
  await call('visits/' + upcoming.id, { ...payload, version: 1 }, 'PUT');
  assert.equal(
    (await call('visits/' + upcoming.id, undefined, 'GET')).data.purpose,
    'new_options',
  );
  assert(
    (await call('today?date=' + day, undefined, 'GET')).visits.some(
      (x) => x.id === upcoming.id,
    ),
  );
  assert(
    (
      await call('p1/calendar?from=' + day + '&to=' + day, undefined, 'GET')
    ).events.some((e) => e.title.includes('Visita a cliente')),
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
    'OK R7d: cliente atual sem funil, público/objetivo confiáveis, busca unificada, registros idempotentes, tenant, Hoje/agenda e relatório separado sem inflar aquisição.',
  );
} finally {
  await t.dispose();
}

for (const options of [
  { migrationLimit: 25, prospectsEnabled: true },
  { prospectsEnabled: false },
]) {
  const local = await runtime({
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    fieldEnabled: true,
    ...options,
  });
  try {
    const { call, customer, operator } = await demoProject(local);
    const data = {
      customer_id: customer,
      scheduled_at: new Date().toISOString(),
      samples: [],
    };
    if (options.prospectsEnabled) {
      const v = await call('visits', data, 'POST', operator);
      await call(
        'visits/' + v.id + '/record',
        { version: 1, occurred_at: new Date().toISOString(), samples: [] },
        'POST',
        operator,
      );
      assert.equal(
        (await call('session', undefined, 'GET')).prospect_followup,
        false,
      );
      assert.equal(
        (await call('visits/' + v.id, undefined, 'GET')).data.audience,
        'customer',
      );
    } else {
      assert.equal(
        (
          await local.request('visits', {
            cookie: operator,
            method: 'POST',
            data,
            key: crypto.randomUUID(),
          })
        ).status,
        404,
      );
      assert.equal(
        (await local.request('customers?kind=all', { cookie: operator }))
          .status,
        404,
      );
    }
    console.log(
      'OK R7d compatibilidade:',
      options.migrationLimit ?? 'flag desligada',
    );
  } finally {
    await local.dispose();
  }
}
