// D1 efêmero, provedor simulado; nenhuma coordenada comercial ou chamada externa.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
let calls = 0,
  fail = false,
  gate,
  entered;
const t = await runtime({
  mobileEnabled: true,
  fieldEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  routingProvider: async (req) => {
    calls++;
    assert.equal(req.method, 'POST');
    assert.equal(req.headers.get('Authorization'), 'demonstracao-route-key');
    const body = await req.json();
    assert.deepEqual(Object.keys(body).sort(), [
      'coordinates',
      'geometry',
      'instructions',
    ]);
    assert.equal(body.geometry, false);
    assert.equal(body.instructions, false);
    assert.equal(body.coordinates.length, 2);
    if (gate) {
      entered();
      await gate;
    }
    return Response.json(
      fail ? {} : { routes: [{ summary: { distance: 6400, duration: 960 } }] },
      { status: fail ? 503 : 200 },
    );
  },
});
try {
  const { call, customer, owner, operator, outside, variant } =
    await demoProject(t);
  const place = {
    name: 'Local DEMONSTRAÇÃO rota',
    address: 'Endereço DEMONSTRAÇÃO',
    neighborhood: '',
    latitude: 0,
    longitude: 0,
    instagram: '',
  };
  const reset = () =>
    t.db.prepare("UPDATE route_budget SET next_at=0 WHERE id='ors'").run();
  const context = () => call('field/context', undefined, 'GET');
  await call('field/company', { data: place, version: 0 }, 'PUT');
  await call(
    'field/customers/' + customer,
    { data: { ...place, longitude: 1 }, version: 0 },
    'PUT',
  );
  assert.equal(calls, 1);
  let ctx = await context();
  assert.equal(ctx.routes[0].route_km, 6.4);
  assert.equal(ctx.routes[0].route_minutes, 16);
  assert.equal(ctx.routes[0].route_provider, 'ors');
  assert.ok(Date.parse(ctx.routes[0].route_computed_at));
  assert.ok(!JSON.stringify(ctx).includes('demonstracao-route-key'));
  await context();
  await call(
    'field/customers/' + customer,
    { data: { ...place, longitude: 1 }, version: 1 },
    'PUT',
  );
  assert.equal(calls, 1, 'GET e gravação sem mudança não consultam o provedor');
  const order = (
    await call('mobile/orders', {
      customer_id: customer,
      due_at: new Date().toISOString(),
      items: [{ variant_id: variant, quantity: 1 }],
      delivery: {
        delivery_type: 'delivery',
        delivery_address: place.address,
        courier: 'owner',
      },
      terms: null,
    })
  ).id;
  assert.equal((await context()).order_routes[0].id, order);
  await reset();
  const key = crypto.randomUUID();
  await call('field/routes/' + customer, {}, 'POST', owner, key);
  await call('field/routes/' + customer, {}, 'POST', owner, key);
  assert.equal(calls, 2, 'repetir a mesma intenção não recalcula');
  for (const [cookie, status] of [
    [undefined, 401],
    [operator, 403],
    [outside, 404],
  ]) {
    assert.equal(
      (
        await t.request('field/routes/' + customer, {
          method: 'POST',
          data: {},
          key: crypto.randomUUID(),
          cookie,
        })
      ).status,
      status,
    );
  }
  fail = true;
  await reset();
  await call(
    'field/customers/' + customer,
    { data: { ...place, longitude: 2 }, version: 2 },
    'PUT',
  );
  assert.equal(calls, 3);
  assert.equal(
    (await context()).routes.length,
    0,
    'rota antiga não disfarça falha de novo endereço',
  );
  assert.equal(
    (await context()).order_routes[0].id,
    order,
    'snapshot antigo continua associado ao pedido antigo',
  );
  assert.equal((await call('field/routes/process', {})).remaining, 1);
  assert.equal(calls, 3, 'falha aguarda uma hora, sem loop');
  fail = false;
  await reset();
  await call('field/routes/' + customer, {});
  assert.equal((await context()).routes.length, 1);
  assert.equal(calls, 4);
  await call(
    'field/company',
    { data: { ...place, latitude: 1 }, version: 1 },
    'PUT',
  );
  assert.equal((await context()).routes.length, 0);
  assert.equal((await context()).order_routes.length, 0);
  await reset();
  await call('field/routes/process', {});
  assert.equal(calls, 5);
  assert.equal((await context()).routes.length, 1);
  // Limite global aplicado atomicamente, inclusive entre organizações.
  await t.db
    .prepare(
      "UPDATE route_budget SET used=1000,window_start=?,next_at=0 WHERE id='ors'",
    )
    .bind(Date.now())
    .run();
  const denied = await call('field/routes/' + customer, {});
  assert.equal(calls, 5);
  assert.equal(denied.remaining, 1);
  assert.ok(denied.retry_at > Date.now());
  await t.db
    .prepare("UPDATE route_budget SET used=0,next_at=0 WHERE id='ors'")
    .run();
  // Troca da base durante uma chamada em andamento não publica a rota obsoleta.
  let release;
  gate = new Promise((r) => {
    release = r;
  });
  const started = new Promise((r) => {
    entered = r;
  });
  const saving = call(
    'field/customers/' + customer,
    { data: { ...place, longitude: 3 }, version: 3 },
    'PUT',
  );
  await started;
  await call(
    'field/company',
    { data: { ...place, latitude: 2 }, version: 2 },
    'PUT',
  );
  release();
  gate = null;
  await saving;
  assert.equal((await context()).routes.length, 0);
  await reset();
  await call('field/routes/process', {});
  assert.equal((await context()).routes.length, 1);
  assert.equal(
    (await call('field/context', undefined, 'GET', outside)).routes.length,
    0,
  );
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM expense_events').first()).n,
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
  console.log(
    'OK R6-1: cache, snapshots, recálculo, orçamento, concorrência, fallback, privacidade e isolamento.',
  );
} finally {
  await t.dispose();
}
// Banco anterior à 0014 continua operacional sem inventar rota.
const old = await runtime({
  migrationLimit: 13,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
});
try {
  const { call } = await demoProject(old);
  assert.equal(
    (await call('field/context', undefined, 'GET')).routing.configured,
    false,
  );
} finally {
  await old.dispose();
}
