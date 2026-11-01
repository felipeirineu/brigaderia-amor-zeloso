import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
const t = await runtime({ financeEnabled: true });
try {
  const owner = await t.login('owner@example.test'),
    operator = await t.login('operator@example.test'),
    outside = await t.login('other@example.test');
  const call = async (
    path,
    data,
    method = 'POST',
    cookie = owner,
    key = crypto.randomUUID(),
  ) => {
    const r = await t.request(path, { cookie, data, method, key });
    if (!r.ok) throw Error(`${path}: ${r.status} ${await r.text()}`);
    return r.json();
  };
  const c = await call('customers', {
      name: 'Cliente DEMONSTRAÇÃO R2',
      phone: '+5511900000000',
    }),
    p = await call('products', {
      name: 'Produto DEMONSTRAÇÃO R2',
      variants: [
        {
          label: 'Embalagem DEMONSTRAÇÃO',
          weight_grams: 10,
          units_per_box: 2,
          price_cents: 1000,
        },
      ],
    }),
    v = (await call('products/' + p.id, undefined, 'GET')).variants[0].id,
    root = `finance/customers/${c.id}`;
  const get = () => call(root, undefined, 'GET');
  const make = async (mode = 'delivery') => {
    const o = await call('orders', {
      customer_id: c.id,
      due_at: '2030-01-07T13:00:00.000Z',
      items: [{ variant_id: v, quantity: 1 }],
    });
    await call(
      `finance/orders/${o.id}/terms`,
      {
        version: 1,
        terms: {
          mode,
          cycle: 'fixed_days',
          fixed_days: [15, 31],
          base_date: '',
          week_end: 7,
          due_days: 0,
        },
      },
      'PUT',
    );
    await call(
      `orders/${o.id}/delivery`,
      { version: 2, delivery_type: 'pickup', courier: 'unassigned' },
      'PUT',
    );
    await call(`orders/${o.id}/status`, { version: 3, to: 'confirmed' });
    return o.id;
  };
  const id = await make();
  for (const [i, to] of ['in_production', 'ready'].entries())
    await call(`orders/${id}/status`, { version: 4 + i, to });
  let view = await get(),
    order = view.orders.find((o) => o.id === id),
    key = crypto.randomUUID();
  const data = {
    version: view.version,
    order_id: id,
    order_version: order.version,
    amount_cents: 1000,
    method: 'cash',
    paid_on: '2025-01-01',
    deliver: true,
  };
  const combined = await call(
    root + '/receive-today',
    data,
    'POST',
    operator,
    key,
  );
  assert.equal(
    (await call(root + '/receive-today', data, 'POST', operator, key)).event_id,
    combined.event_id,
  );
  view = await get();
  assert.equal(view.orders.find((o) => o.id === id).status, 'picked_up');
  assert.equal(view.received_cents, 1000);
  const undo = await call(
    root + '/undo-today',
    {
      version: combined.account_version,
      order_version: combined.order_version,
      undo_id: combined.undo_id,
    },
    'POST',
    operator,
  );
  assert(undo.event_id);
  view = await get();
  assert.equal(view.orders.find((o) => o.id === id).status, 'ready');
  assert.equal(view.received_cents, 0);
  console.log(
    'OK R2-1 recebimento/entrega atômicos, idempotência e desfazer conjunto.',
  );
  const credit = await call(
    root + '/credit',
    {
      version: view.version,
      amount_cents: 1200,
      method: 'pix',
      paid_on: '2025-01-01',
    },
    'POST',
    operator,
  );
  view = await get();
  assert.equal(view.available_credit_cents, 1200);
  order = view.orders.find((o) => o.id === id);
  await call(root + '/use-credit', {
    version: view.version,
    credit_event_id: credit.event_id,
    order_id: id,
    order_version: order.version,
    amount_cents: 600,
  });
  view = await get();
  assert.equal(view.available_credit_cents, 600);
  assert.equal(view.received_cents, 1200);
  assert.equal(view.orders.find((o) => o.id === id).paid_cents, 600);
  assert.equal(
    (
      await t.request(root + '/refund-credit', {
        method: 'POST',
        cookie: operator,
        key: crypto.randomUUID(),
        data: {
          version: view.version,
          credit_event_id: credit.event_id,
          amount_cents: 601,
          reason: 'DEMONSTRAÇÃO',
        },
      })
    ).status,
    409,
  );
  await call(
    root + '/refund-credit',
    {
      version: view.version,
      credit_event_id: credit.event_id,
      amount_cents: 600,
      reason: 'DEMONSTRAÇÃO',
    },
    'POST',
    operator,
  );
  view = await get();
  assert.equal(view.available_credit_cents, 0);
  assert.equal(view.received_cents, 600);
  order = view.orders.find((o) => o.id === id);
  await call(root + '/release-credit', {
    version: view.version,
    credit_event_id: credit.event_id,
    order_id: id,
    order_version: order.version,
    amount_cents: 300,
    reason: 'Correção DEMONSTRAÇÃO',
  });
  view = await get();
  assert.equal(view.available_credit_cents, 300);
  assert.equal(view.orders.find((o) => o.id === id).paid_cents, 300);
  await call(root + '/refund-credit', {
    version: view.version,
    credit_event_id: credit.event_id,
    amount_cents: 300,
    reason: 'Segundo estorno DEMONSTRAÇÃO',
  });
  view = await get();
  assert.equal(view.available_credit_cents, 0);
  assert.equal(view.received_cents, 300);
  console.log(
    'OK R2-2 crédito sem pedido, uso manual não duplica caixa, liberação parcial e estorno só do disponível.',
  );
  const closingOrder = await make('credit');
  for (const [i, to] of ['in_production', 'ready', 'picked_up'].entries())
    await call(`orders/${closingOrder}/status`, { version: 4 + i, to });
  await t.db
    .prepare(
      "UPDATE order_status_events SET created_at=unixepoch('2025-01-07T13:00:00Z') WHERE organization_id=? AND order_id=?",
    )
    .bind(t.org, closingOrder)
    .run();
  view = await get();
  const closing = await call(root + '/close', {
    version: view.version,
    order_id: closingOrder,
  });
  view = await get();
  assert.equal(
    (
      await t.request(root + '/annul-closing', {
        method: 'POST',
        cookie: operator,
        key: crypto.randomUUID(),
        data: {
          version: view.version,
          closing_id: closing.closing_id,
          reason: 'DEMONSTRAÇÃO',
        },
      })
    ).status,
    403,
  );
  await call(root + '/annul-closing', {
    version: view.version,
    closing_id: closing.closing_id,
    reason: 'Correção DEMONSTRAÇÃO',
  });
  view = await get();
  assert.equal(view.orders.find((o) => o.id === closingOrder).closing_id, null);
  assert.equal(
    view.closings.find((c) => c.id === closing.closing_id).status,
    'annulled',
  );
  assert(view.closing_history.some((h) => h.closing_id === closing.closing_id));
  const fresh = await call(root + '/close', {
    version: view.version,
    order_id: closingOrder,
  });
  assert.notEqual(fresh.closing_id, closing.closing_id);
  view = await get();
  const payment = await call(root + '/payments', {
    version: view.version,
    closing_id: fresh.closing_id,
    kind: 'payment',
    amount_cents: 50,
    method: 'cash',
    paid_on: '2025-01-01',
  });
  view = await get();
  assert.equal(
    (
      await t.request(root + '/annul-closing', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: {
          version: view.version,
          closing_id: fresh.closing_id,
          reason: 'DEMONSTRAÇÃO',
        },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await t.request(root + '/reverse', {
        cookie: operator,
        method: 'POST',
        key: crypto.randomUUID(),
        data: {
          version: view.version,
          event_id: payment.event_id,
          reason: 'DEMONSTRAÇÃO',
        },
      })
    ).status,
    403,
  );
  await t.db
    .prepare(
      "UPDATE payment_events SET created_at='2000-01-01T12:00:00Z' WHERE organization_id=? AND id=?",
    )
    .bind(t.org, payment.event_id)
    .run();
  await call(root + '/reverse', {
    version: view.version,
    event_id: payment.event_id,
    reason: 'Correção administrativa DEMONSTRAÇÃO',
  });
  view = await get();
  await call(root + '/annul-closing', {
    version: view.version,
    closing_id: fresh.closing_id,
    reason: 'Correção DEMONSTRAÇÃO',
  });
  console.log(
    'OK R2-3 anulação por administrador preserva membros históricos e permite novo fechamento.',
  );
  assert.equal((await t.request(root, { cookie: outside })).status, 404);
  assert.deepEqual(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results,
    [],
  );
  console.log('R2: isolamento e chaves estrangeiras aprovados.');
} finally {
  await t.dispose();
}
