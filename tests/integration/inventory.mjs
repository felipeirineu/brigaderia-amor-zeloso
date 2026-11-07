import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  toolsEnabled: true,
});
try {
  const { call, owner, operator, outside } = await demoProject(t);
  const s = await call('p1/supplies', {
    name: 'Insumo DEMONSTRAÇÃO',
    unit: 'g',
    pack_quantity_milli: 1000000,
    pack_cost_cents: null,
  });
  await call('p1/inventory/' + s.id, {
    action: 'minimum',
    version: 0,
    minimum_milli: 10000,
  });
  const zeroSupply = await call('p1/supplies', {
    name: 'Embalagem DEMONSTRAÇÃO zero',
    unit: 'unit',
    pack_quantity_milli: 1000,
    pack_cost_cents: null,
  });
  await call('p1/inventory/' + zeroSupply.id, {
    action: 'minimum',
    version: 0,
    minimum_milli: 0,
  });
  const entry = {
      action: 'move',
      version: 1,
      kind: 'entry',
      delta_milli: 20001,
      reason: 'Entrada DEMONSTRAÇÃO',
    },
    key = crypto.randomUUID();
  const e = await call('p1/inventory/' + s.id, entry, 'POST', operator, key);
  assert.equal(
    (await call('p1/inventory/' + s.id, entry, 'POST', operator, key)).event_id,
    e.event_id,
  );
  const results = await Promise.all(
    [1, 2].map(() =>
      t.request('p1/inventory/' + s.id, {
        cookie: operator,
        method: 'POST',
        key: crypto.randomUUID(),
        data: {
          action: 'move',
          version: 2,
          kind: 'consumption',
          delta_milli: -15000,
          reason: 'Produção DEMONSTRAÇÃO',
        },
      }),
    ),
  );
  assert.equal(results.filter((r) => r.ok).length, 1);
  const item = (await call('p1/inventory', undefined, 'GET')).find(
    (i) => i.id === s.id,
  );
  assert.equal(item.balance_milli, 5001);
  assert.equal(
    (
      await t.request('p1/inventory/' + s.id, {
        cookie: operator,
        method: 'POST',
        key: crypto.randomUUID(),
        data: {
          action: 'move',
          version: 3,
          kind: 'loss',
          delta_milli: -6000,
          reason: 'Perda DEMONSTRAÇÃO',
        },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await t.request('p1/inventory/' + s.id, {
        cookie: operator,
        method: 'POST',
        key: crypto.randomUUID(),
        data: {
          action: 'reverse',
          version: 3,
          event_id: e.event_id,
          reason: 'Estorno DEMONSTRAÇÃO',
        },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await t.request('p1/inventory/' + s.id, {
        cookie: outside,
        method: 'POST',
        key: crypto.randomUUID(),
        data: entry,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await t.request('p1/supplies/' + s.id, {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: {
          name: 'Insumo DEMONSTRAÇÃO',
          unit: 'ml',
          pack_quantity_milli: 1000000,
          pack_cost_cents: null,
          version: 1,
        },
      })
    ).status,
    409,
  );
  const now = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
  }).format(new Date());
  const rows = await call(
    `p1/inventory/${s.id}?from=${now}&to=${now}`,
    undefined,
    'GET',
  );
  const consumed = rows.find((r) => r.kind === 'consumption');
  await call(
    'p1/inventory/' + s.id,
    {
      action: 'reverse',
      version: 3,
      event_id: consumed.id,
      reason: 'Correção DEMONSTRAÇÃO',
    },
    'POST',
    operator,
  );
  assert.equal(
    (await call('p1/inventory', undefined, 'GET')).find((i) => i.id === s.id)
      .balance_milli,
    20001,
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
    'OK P1-6 saldo exato, CAS concorrente, sem negativo, estorno sem gasto, isolamento e FKs.',
  );
} finally {
  await t.dispose();
}
