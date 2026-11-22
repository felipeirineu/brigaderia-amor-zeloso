import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { demoProject } from '../helpers/demo-project.mjs';
import { runtime } from '../helpers/runtime.mjs';

const dir = await mkdtemp('/tmp/az-t20-');
await build({
  entryPoints: ['worker/operations.ts'],
  outfile: dir + '/operations.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
});
const { operations } = await import(
  pathToFileURL(dir + '/operations.mjs').href
);
const t = await runtime({
  mobileEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  mixedEnabled: true,
});
const now = new Date();
const civil = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(
    date,
  );
const today = civil(now);
const yesterday = new Date(now.getTime() - 86400000);
try {
  const { owner, operator, call, customer, variant } = await demoProject(t);
  const { profile } = await call(
    'mobile/defaults/' + customer,
    undefined,
    'GET',
  );
  const terms = profile.terms;
  const cycle = {
    ...terms,
    mode: 'credit',
    cycle: 'deliveries',
    every_deliveries: 2,
    due_days: null,
  };
  const create = (options = {}) =>
    call(
      'mobile/orders',
      {
        customer_id: customer,
        due_at: '2030-01-08T01:35:29.000Z',
        items: [{ variant_id: variant, quantity: 1 }],
        delivery: {
          delivery_type: 'delivery',
          delivery_address: 'Rua DEMONSTRAÇÃO',
          courier: 'owner',
        },
        terms,
        ...options,
      },
      'POST',
      operator,
    );
  const get = (id) => call('orders/' + id, undefined, 'GET');
  const history = (id) => call('orders/' + id + '/history', undefined, 'GET');
  const entry = (order) => ({
    id: order.id,
    version: order.version,
    key: crypto.randomUUID(),
  });
  const batch = async (data, cookie = operator) =>
    (await call('orders-batch', data, 'POST', cookie)).results;
  const account = () => call('finance/customers/' + customer, undefined, 'GET');
  const next = await create({
    due_at: yesterday.toISOString(),
    delivered_at: yesterday.toISOString(),
    terms: { ...terms, mode: 'next_delivery' },
  });
  const first = await create({
    due_at: yesterday.toISOString(),
    delivered_at: yesterday.toISOString(),
    terms: cycle,
    delivery: { delivery_type: 'pickup', courier: 'unassigned' },
  });
  const second = await create({ terms: cycle });
  const pickup = await create({
    delivery: { delivery_type: 'pickup', courier: 'unassigned' },
  });
  const invalid = await create({
    delivery: {
      delivery_type: 'delivery',
      delivery_address: 'Rua DEMONSTRAÇÃO',
      courier: 'unassigned',
    },
  });

  const moving = {
    action: 'date',
    day: '2030-01-10',
    orders: [entry(second), entry(first)],
  };
  const originalFirstDate = (await get(first.id)).due_at;
  const [move, repeated] = await Promise.all([batch(moving), batch(moving)]);
  assert.deepEqual(move, repeated);
  assert.equal(move[0].ok, true);
  assert.equal(move[1].status, 409);
  assert.equal((await get(second.id)).due_at, '2030-01-11T01:35:29.000Z');
  assert.equal((await get(first.id)).due_at, originalFirstDate);
  const reverseMove = {
    action: 'undo',
    orders: [
      {
        ...entry({ id: second.id, version: move[0].version }),
        original_key: moving.orders[0].key,
      },
    ],
  };
  assert.equal((await batch(reverseMove, owner))[0].status, 409);
  assert.equal((await batch(reverseMove))[0].ok, true);
  assert.equal((await get(second.id)).due_at, '2030-01-08T01:35:29.000Z');

  const concurrent = await get(second.id);
  const attempts = await Promise.all(
    ['2030-01-12', '2030-01-13'].map((day) =>
      batch({ action: 'date', day, orders: [entry(concurrent)] }),
    ),
  );
  assert.equal(attempts.flat().filter((r) => r.ok).length, 1);
  assert.equal(attempts.flat().filter((r) => r.status === 409).length, 1);
  const step = await batch({
    action: 'advance',
    orders: [entry(await get(second.id))],
  });
  assert.equal(step[0].ok, true);
  assert.equal((await get(second.id)).status, 'in_production');

  const invalidHistory = (await history(invalid.id)).length;
  const rejected = await batch({
    action: 'complete',
    orders: [entry(await get(invalid.id))],
  });
  assert.equal(rejected[0].status, 400);
  assert.equal((await get(invalid.id)).status, 'confirmed');
  assert.equal((await history(invalid.id)).length, invalidHistory);
  const complete = {
    action: 'complete',
    orders: [entry(await get(second.id)), entry(await get(pickup.id))],
  };
  let prepared = 0;
  const result = await operations(
    new Request(t.url + '/api/orders-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(complete),
    }),
    {
      OPERATIONS_ENABLED: 'true',
      FINANCE_ENABLED: 'true',
      DB: {
        prepare(sql) {
          prepared++;
          return t.db.prepare(sql);
        },
        batch(statements) {
          return t.db.batch(statements);
        },
      },
    },
    {
      organization_id: t.org,
      user_id: (
        await t.db
          .prepare(
            "SELECT user_id FROM memberships WHERE organization_id=? AND role='operator'",
          )
          .bind(t.org)
          .first()
      ).user_id,
      role: 'operator',
      token_hash: 'DEMONSTRACAO',
    },
  );
  assert.equal(result.status, 200);
  const finished = (await result.json()).results;
  assert(prepared <= 32, `consultas D1: ${prepared}`);
  assert(finished.every((r) => r.ok));
  assert.deepEqual(
    (await history(second.id)).slice(-3).map((e) => e.to_status),
    ['ready', 'out_for_delivery', 'delivered'],
  );
  assert.deepEqual(
    (await history(pickup.id)).slice(-3).map((e) => e.to_status),
    ['in_production', 'ready', 'picked_up'],
  );
  const settled = await account();
  assert.equal(settled.orders.find((o) => o.id === next.id).due_on, today);
  assert.equal(settled.orders.find((o) => o.id === first.id).due_on, today);
  const dashboard = await call('today?date=' + today, undefined, 'GET');
  assert.equal(
    dashboard.delivery_cycles.find((c) => c.order_id === second.id).due_on,
    today,
  );
  assert.deepEqual(await batch(complete), finished);
  const restore = {
    action: 'undo',
    orders: finished.map(({ id, version }, i) => ({
      ...entry({ id, version }),
      original_key: complete.orders[i].key,
    })),
  };
  assert((await batch(restore)).every((r) => r.ok));
  assert.equal((await get(second.id)).status, 'in_production');
  assert.equal((await get(pickup.id)).status, 'confirmed');
  const reverted = (await history(second.id)).slice(-3);
  assert.deepEqual(
    reverted.map((e) => e.to_status),
    ['out_for_delivery', 'ready', 'in_production'],
  );
  assert(reverted.every((e) => e.undo_of));
  const open = await account();
  assert.equal(open.orders.find((o) => o.id === next.id).due_on, null);
  assert.equal(open.orders.find((o) => o.id === first.id).due_on, null);
  assert((await batch(restore)).every((r) => r.ok));
  console.log(
    `OK T20 horário local, CAS, reenvio, etapas, retirada, auditoria financeira e desfazer (${prepared} consultas no lote medido).`,
  );
} finally {
  await t.dispose();
  await rm(dir, { recursive: true, force: true });
}
