import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp('/tmp/az-prospect-costs-');
await build({
  entryPoints: ['worker/prospect-costs.ts', 'worker/management.ts'],
  outdir: dir,
  bundle: true,
  platform: 'node',
  format: 'esm',
  outExtension: { '.js': '.mjs' },
});
const { prospectReport, prospectVisitTools } = await import(
  pathToFileURL(dir + '/prospect-costs.mjs').href
);
const { management } = await import(
  pathToFileURL(dir + '/management.mjs').href
);
// Custos, nomes e valores exclusivamente fictícios em D1 efêmero.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { weightCostingProject } from '../helpers/weight-costing-project.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { fortalezaDay } from '../../shared/workday.ts';
const flags = {
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
  prospectsEnabled: true,
};
const t = await runtime(flags);
try {
  const { call, owner, operator, outside, product, ids } =
      await weightCostingProject(t),
    day = fortalezaDay();
  const contact = await call('prospects', {
    name: 'Contato DEMONSTRAÇÃO custos',
    phone: '+5511900000060',
    prospect: {},
  });
  const input = {
    customer_id: contact.id,
    scheduled_at: new Date().toISOString(),
    samples: [{ product_id: product.id, weight_grams: 30, units: 3 }],
  };
  const visit = await call('visits', input);
  await call('visits/' + visit.id + '/record', {
    version: 1,
    occurred_at: new Date().toISOString(),
    samples: input.samples,
  });
  const path = 'visits/' + visit.id;
  const before = JSON.stringify(
    (
      await t.db.batch(
        [
          'orders',
          'expense_events',
          'contact_events',
          'p1_requests',
          'audit_events',
        ].map((n) => t.db.prepare('SELECT COUNT(*) n FROM ' + n)),
      )
    ).map((r) => r.results),
  );
  let costs = await call(path + '/costs', undefined, 'GET', operator);
  assert.equal(costs.estimate.lines[0].source, 'weight');
  assert.equal(costs.estimate.lines[0].unit_cost_cents, 150);
  assert.equal(costs.estimate.estimated_cents, 450);
  assert.equal(costs.total_cost_cents, 450);
  assert.equal(costs.can_register_expense, false);
  assert.equal(costs.expense, null);
  assert.equal(
    (await call(path + '/followup?kind=thanks', undefined, 'GET')).has_name,
    false,
  );
  await call(path + '/followup?kind=feedback', undefined, 'GET');
  const prices = await call(path + '/followup?kind=prices', undefined, 'GET');
  assert.match(prices.message, /50,00/);
  assert.doesNotMatch(prices.message, /Pix|sem:/i);
  assert.equal(
    JSON.stringify(
      (
        await t.db.batch(
          [
            'orders',
            'expense_events',
            'contact_events',
            'p1_requests',
            'audit_events',
          ].map((n) => t.db.prepare('SELECT COUNT(*) n FROM ' + n)),
        )
      ).map((r) => r.results),
    ),
    before,
    'consultas/prévias não gravam nada',
  );
  await call(
    'field/profile',
    { version: 0, display_name: 'Equipe DEMONSTRAÇÃO' },
    'PUT',
  );
  assert.match(
    (await call(path + '/followup?kind=thanks', undefined, 'GET')).message,
    /Equipe DEMONSTRAÇÃO/,
  );
  for (const suffix of ['costs', 'followup?kind=prices'])
    assert.equal(
      (await t.request(path + '/' + suffix, { cookie: outside })).status,
      404,
    );
  const payload = {
    version: costs.visit_version,
    estimate_hash: costs.estimate_hash,
    amount_cents: 1000,
    method: 'cash',
    spent_on: day,
    notes: 'Pagamento DEMONSTRAÇÃO',
  };
  assert.equal(
    (
      await t.request(path + '/sample-expense', {
        cookie: operator,
        method: 'POST',
        data: payload,
        key: crypto.randomUUID(),
      })
    ).status,
    403,
  );
  const keys = [crypto.randomUUID(), crypto.randomUUID()];
  const results = await Promise.all(
    keys.map((key) =>
      t.request(path + '/sample-expense', {
        cookie: owner,
        method: 'POST',
        data: payload,
        key,
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const winner = results.findIndex((r) => r.ok),
    saved = await results[winner].json();
  assert.deepEqual(
    await call(path + '/sample-expense', payload, 'POST', owner, keys[winner]),
    saved,
  );
  costs = await call(path + '/costs', undefined, 'GET');
  assert.equal(costs.total_cost_cents, 1000);
  assert.equal(costs.source, 'paid');
  await call('p1/expenses/' + saved.expense_id + '/reverse', {
    reason: 'Correção DEMONSTRAÇÃO',
  });
  costs = await call(path + '/costs', undefined, 'GET');
  assert.equal(costs.expense, null);
  assert.equal(costs.total_cost_cents, 450);
  await t.db
    .prepare(
      'UPDATE supplies SET pack_cost_cents=4000 WHERE organization_id=? AND id=?',
    )
    .bind(t.org, ids.dough)
    .run();
  assert.equal(
    (
      await t.request(path + '/sample-expense', {
        cookie: owner,
        method: 'POST',
        data: { ...payload, version: costs.visit_version },
        key: crypto.randomUUID(),
      })
    ).status,
    409,
    'custo alterado exige nova conferência',
  );
  costs = await call(path + '/costs', undefined, 'GET');
  assert.equal(costs.estimate.estimated_cents, 900);
  await call(path + '/sample-expense', {
    ...payload,
    version: costs.visit_version,
    estimate_hash: costs.estimate_hash,
    amount_cents: 500,
  });
  const trip = await call('field/trips', {
    visit_id: visit.id,
    order_ids: [],
    mode: 'car',
    leg: 'roundtrip',
    occurred_at: new Date().toISOString(),
    amount_cents: 200,
    method: 'cash',
  });
  await call('prospects/' + contact.id + '/convert', { version: 2 });
  const report = () =>
    call('prospecting/report?from=' + day + '&to=' + day, undefined, 'GET');
  let r = await report();
  assert.equal(r.visits, 1);
  assert.equal(r.cohort_converted, 1);
  assert.equal(r.cohort_rate, 100);
  assert.equal(r.conversions, 1);
  assert.equal(r.estimated_samples_cents, 900);
  assert.equal(r.paid_samples_cents, 500);
  assert.equal(r.rides_cents, 200);
  assert.equal(r.cost_used_cents, 700);
  assert.equal(r.acquisition_per_customer_cents, 700);
  assert.equal(r.flavors[0].units, 3);
  assert.equal(r.top_flavor.converted, 1);
  await call('field/trips/' + trip.id + '/reverse', {
    reason: 'Correção DEMONSTRAÇÃO',
  });
  assert.equal((await report()).acquisition_per_customer_cents, 500);
  await t.db
    .prepare(
      'UPDATE supplies SET pack_cost_cents=NULL WHERE organization_id=? AND id=?',
    )
    .bind(t.org, ids.dough)
    .run();
  costs = await call(path + '/costs', undefined, 'GET');
  assert.equal(costs.estimate.estimated_cents, null);
  assert.equal(
    costs.total_cost_cents,
    500,
    'pagamento conhecido substitui estimativa ausente',
  );
  const unknown = await call('prospects', {
    name: 'Contato DEMONSTRAÇÃO sem peso',
    prospect: {},
  });
  const u = await call('visits', {
    ...input,
    customer_id: unknown.id,
    samples: [{ product_id: product.id, units: 1 }],
  });
  await call('visits/' + u.id + '/record', {
    version: 1,
    occurred_at: new Date().toISOString(),
    samples: [{ product_id: product.id, units: 1 }],
  });
  const uc = await call('visits/' + u.id + '/costs', undefined, 'GET');
  assert.equal(uc.estimate.estimated_cents, null);
  assert.match(uc.estimate.missing.join(), /Peso/);
  r = await report();
  assert.equal(r.cost_used_cents, null);
  assert.equal(
    r.acquisition_per_customer_cents,
    500,
    'grupo de convertidos não mistura o custo de contatos sem conversão',
  );
  assert.equal(r.cohort_rate, 50);
  // Ficha P1-4 continua compatível, sem a embalagem de venda presumida.
  const legacy = await call('products', {
    name: 'Sabor DEMONSTRAÇÃO legado',
    variants: [
      {
        label: 'Amostra DEMONSTRAÇÃO',
        weight_grams: 10,
        units_per_box: 2,
        price_cents: 1000,
      },
    ],
  });
  const variant = (await call('products/' + legacy.id, undefined, 'GET'))
    .variants[0];
  const supply = await call('p1/supplies', {
    name: 'Insumo DEMONSTRAÇÃO legado',
    unit: 'g',
    pack_quantity_milli: 1000000,
    pack_cost_cents: 1000,
  });
  await call('p1/recipes', {
    name: 'Ficha DEMONSTRAÇÃO legado',
    variant_id: variant.id,
    yield_units: 10,
    packaging_cents: 300,
    labor_cents: 0,
    overhead_cents: 0,
    margin_bps: 0,
    components: [{ supply_id: supply.id, quantity_milli: 100000 }],
  });
  const lv = await call('visits', {
    ...input,
    customer_id: unknown.id,
    samples: [{ product_id: legacy.id, units: 2, weight_grams: 10 }],
  });
  await call('visits/' + lv.id + '/record', {
    version: 1,
    occurred_at: new Date().toISOString(),
    samples: [{ product_id: legacy.id, units: 2, weight_grams: 10 }],
  });
  const lc = await call('visits/' + lv.id + '/costs', undefined, 'GET');
  assert.equal(lc.estimate.estimated_cents, 20);
  assert.equal(lc.estimate.lines[0].source, 'recipe');
  // Conversão no mês seguinte: tempo/CAC usam a primeira visita histórica, não um denominador de outro grupo.
  const rec = JSON.parse(
    (
      await t.db
        .prepare(
          'SELECT data FROM prospect_visit_records WHERE organization_id=? AND visit_id=?',
        )
        .bind(t.org, visit.id)
        .first()
    ).data,
  );
  rec.occurred_at = '2020-01-30T15:00:00.000Z';
  await t.db
    .prepare(
      'UPDATE prospect_visit_records SET data=? WHERE organization_id=? AND visit_id=?',
    )
    .bind(JSON.stringify(rec), t.org, visit.id)
    .run();
  await t.db
    .prepare(
      "UPDATE prospect_details SET data=json_set(data,'$.converted_at','2020-02-02T15:00:00.000Z') WHERE organization_id=? AND customer_id=?",
    )
    .bind(t.org, contact.id)
    .run();
  r = await call(
    'prospecting/report?from=2020-02-01&to=2020-02-28',
    undefined,
    'GET',
  );
  assert.equal(r.visits, 0);
  assert.equal(r.conversions, 1);
  assert.equal(r.average_days, 3);
  assert.equal(r.cohort_rate, null);
  assert.equal(r.acquisition_per_customer_cents, 500);
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM orders').first()).n,
    0,
  );
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM payment_events').first()).n,
    0,
  );
  assert.equal(
    (
      await t.db
        .prepare('SELECT COUNT(*) n FROM pragma_foreign_key_check')
        .first()
    ).n,
    0,
  );
  // 65 registros e dois pesos do mesmo sabor: custo do relatório independe da quantidade de visitas.
  const bulk = await call('prospects', {
    name: 'Contato DEMONSTRAÇÃO lote de custos',
    prospect: {},
  });
  const records = Array.from({ length: 65 }, (_, i) => {
    const id = crypto.randomUUID(),
      samples = [
        {
          product_id: product.id,
          product_name: product.name,
          photo_key: null,
          weight_grams: i % 2 ? 15 : 30,
          units: 1,
        },
      ];
    return {
      id,
      data: JSON.stringify({ samples, occurred_at: new Date().toISOString() }),
    };
  });
  const me = await call('session', undefined, 'GET');
  await t.db.batch(
    records.flatMap((r) => [
      t.db
        .prepare(
          "INSERT INTO prospect_visits(organization_id,id,customer_id,scheduled_at,status,data) VALUES(?,?,?,?,'completed','{}')",
        )
        .bind(t.org, r.id, bulk.id, new Date().toISOString()),
      t.db
        .prepare(
          'INSERT INTO prospect_visit_records(organization_id,visit_id,user_id,data) VALUES(?,?,?,?)',
        )
        .bind(t.org, r.id, me.user_id, r.data),
    ]),
  );
  await call('prospects/' + bulk.id + '/convert', { version: 1 });
  let sql = 0;
  const db = {
    prepare(q) {
      sql++;
      return t.db.prepare(q);
    },
    batch(q) {
      return t.db.batch(q);
    },
  };
  const env = {
    DB: db,
    OPERATIONS_ENABLED: 'true',
    FINANCE_ENABLED: 'true',
    P1_ENABLED: 'true',
    MOBILE_ENABLED: 'true',
    FIELD_ENABLED: 'true',
    PROSPECTS_ENABLED: 'true',
    MIXED_BOXES_ENABLED: 'true',
  };
  const actor = {
    organization_id: t.org,
    user_id: me.user_id,
    role: 'owner',
    token_hash: 'fixture',
  };
  const many = await prospectReport(
    new Request(t.url + '/api/prospecting/report?from=' + day + '&to=' + day),
    env,
    actor,
  );
  const manyReport = await many.json();
  assert(manyReport.visits >= 65);
  assert.equal(
    manyReport.top_flavor.converted,
    1,
    'um contato em dois pesos conta uma vez no sabor',
  );
  assert(sql <= 45, 'Relatório 65 visitas: ' + sql + ' SQL');
  console.log('OK R7c relatório 65 visitas:', sql, 'SQL de45 reservados.');
  sql = 0;
  await prospectVisitTools(
    new Request(t.url + '/api/' + path + '/costs'),
    env,
    actor,
  );
  assert(sql <= 45, 'Custos: ' + sql + ' SQL');
  console.log('OK R7c custos:', sql, 'SQL.');
  sql = 0;
  await management(new Request(t.url + '/api/session'), env, actor);
  assert(sql <= 45, 'Sessão: ' + sql + ' SQL');
  console.log('OK R7c sessão:', sql, 'SQL.');
  console.log(
    'OK R7c custos R16/P1-4, ausências, despesa confirmada/CAS/idempotência/estorno, WhatsApp só prévia, coortes/tempo/CAC sem dupla contagem.',
  );
} finally {
  await t.dispose();
  await rm(dir, { recursive: true, force: true });
}
for (const options of [
  { ...flags, migrationLimit: 25 },
  { ...flags, migrationLimit: 24 },
  { ...flags, migrationLimit: 23 },
  { ...flags, prospectsEnabled: false },
  { ...flags, financeEnabled: false },
]) {
  const t = await runtime(options);
  try {
    const { call, owner } = await demoProject(t);
    assert.equal(
      (await call('session', undefined, 'GET')).prospect_followup,
      false,
    );
    assert.equal(
      (await t.request('prospecting/report', { cookie: owner })).status,
      404,
    );
    if (options.migrationLimit === 25) {
      const c = await call('prospects', {
        name: 'Contato DEMONSTRAÇÃO R7b',
        prospect: {},
      });
      await call('visits', {
        customer_id: c.id,
        scheduled_at: new Date().toISOString(),
        samples: [],
      });
    }
    console.log(
      'OK R7c fallback:',
      options.migrationLimit ??
        (options.financeEnabled === false
          ? 'financeiro pausado'
          : 'flag desligada'),
    );
  } finally {
    await t.dispose();
  }
}
