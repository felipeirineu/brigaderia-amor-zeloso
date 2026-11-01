import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { execFileSync } from 'node:child_process';
const t = await runtime({ financeEnabled: true });
let checks = 0;
try {
  const owner = await t.login('owner@example.test'),
    outside = await t.login('other@example.test'),
    operator = await t.login('operator@example.test');
  async function call(
    path,
    data,
    method = 'POST',
    cookie = owner,
    key = crypto.randomUUID(),
  ) {
    const r = await t.request(path, { cookie, data, method, key });
    if (!r.ok) throw Error(`${path}: ${r.status} ${await r.text()}`);
    return r.json();
  }
  const c = await call('customers', {
    name: 'Cliente DEMONSTRAÇÃO financeiro',
    phone: '+5511900000000',
  });
  const p = await call('products', {
    name: 'Produto DEMONSTRAÇÃO',
    variants: [
      {
        label: 'DEMONSTRAÇÃO',
        weight_grams: 10,
        units_per_box: 2,
        price_cents: 1234,
      },
    ],
  });
  const product = await call('products/' + p.id, undefined, 'GET'),
    variant = product.variants[0].id;
  const root = `finance/customers/${c.id}`;
  const terms = {
    mode: 'credit',
    cycle: 'fixed_days',
    fixed_days: [15, 31],
    base_date: '',
    week_end: 7,
    due_days: 3,
  };
  const profile = {
    establishment: 'Loja DEMONSTRAÇÃO',
    responsible: 'Responsável DEMONSTRAÇÃO',
    address: 'Endereço DEMONSTRAÇÃO',
    neighborhood: 'Bairro DEMONSTRAÇÃO',
    reference: 'Referência fictícia',
    delivery_days: [1],
    delivery_window: 'Manhã',
    courier: 'partner',
    courier_name: '',
    courier_fee_cents: 0,
    terms,
  };
  await call(root + '/profile', { version: 0, data: profile }, 'PUT');
  assert.equal((await t.request(root, { cookie: outside })).status, 404);
  assert.equal(
    (await t.request('finance/settings', { cookie: operator })).status,
    403,
  );
  assert.equal((await t.request(root)).status, 401);
  checks++;
  const draft = {
    customer_id: c.id,
    due_at: '2025-01-07T13:00:00.000Z',
    items: [{ variant_id: variant, quantity: 2 }],
  };
  const model = await call('recurring', {
    name: 'Modelo DEMONSTRAÇÃO B2B',
    customer_id: c.id,
    weekday: 1,
    time: '10:00',
    delivery_type: 'pickup',
    courier: 'owner',
    items: [{ variant_id: variant, quantity: 2 }],
  });
  const defaults = await call(root + '/defaults', undefined, 'GET');
  assert.equal(defaults.plans[0].valid, true);
  const templateOrder = await call('orders', {
    ...draft,
    template_id: model.id,
  });
  const snap = await call('orders/' + templateOrder.id, undefined, 'GET');
  assert.equal(snap.courier, 'owner');
  assert.equal(snap.delivery_type, 'pickup');
  await call(
    `finance/orders/${templateOrder.id}/terms`,
    { version: snap.version, terms: { ...terms, mode: 'delivery' } },
    'PUT',
  );
  await call(
    'orders/' + templateOrder.id,
    { version: snap.version + 1 },
    'DELETE',
  );
  const o = await call('orders', draft);
  let order = await call('orders/' + o.id, undefined, 'GET');
  assert.equal(order.courier, 'partner');
  assert.match(order.delivery_address, /DEMONSTRAÇÃO/);
  let account = await call(root, undefined, 'GET');
  assert.equal(account.orders.find((x) => x.id === o.id).terms.mode, 'credit');
  await call(
    root + '/profile',
    { version: 1, data: { ...profile, terms: { ...terms, due_days: 9 } } },
    'PUT',
  );
  account = await call(root, undefined, 'GET');
  assert.equal(account.orders.find((x) => x.id === o.id).terms.due_days, 3);
  checks++;
  await call(`orders/${o.id}/status`, { version: 1, to: 'confirmed' });
  const deposit = {
      version: 1,
      order_id: o.id,
      kind: 'deposit',
      amount_cents: 468,
      method: 'pix',
      paid_on: '2025-01-01',
    },
    key = crypto.randomUUID();
  const received = await call(
    root + '/payments',
    deposit,
    'POST',
    operator,
    key,
  );
  assert.equal(
    (await call(root + '/payments', deposit, 'POST', operator, key)).event_id,
    received.event_id,
  );
  account = await call(root, undefined, 'GET');
  assert.equal(account.orders.find((x) => x.id === o.id).paid_cents, 468);
  assert.equal(account.receivable_cents, 0);
  assert.equal(account.received_cents, 468);
  checks++;
  order = await call('orders/' + o.id, undefined, 'GET');
  assert.equal(
    (
      await t.request(`orders/${o.id}/status`, {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: {
          version: order.version,
          to: 'cancelled',
          reason: 'DEMONSTRAÇÃO',
        },
      })
    ).status,
    409,
  );
  const second = await call('customers', {
    name: 'Outro cliente DEMONSTRAÇÃO financeiro',
    phone: '+5511900000001',
  });
  await call(`orders/${o.id}/status`, {
    version: order.version,
    to: 'awaiting_confirmation',
    reason: 'Revisão DEMONSTRAÇÃO',
  });
  order = await call('orders/' + o.id, undefined, 'GET');
  assert.equal(
    (
      await t.request('orders/' + o.id, {
        cookie: owner,
        method: 'PUT',
        data: { ...draft, customer_id: second.id, version: order.version },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await t.request('orders/' + o.id, {
        cookie: owner,
        method: 'DELETE',
        data: { version: order.version },
      })
    ).status,
    409,
  );
  await call(`orders/${o.id}/status`, {
    version: order.version,
    to: 'confirmed',
  });
  for (const to of [
    'in_production',
    'ready',
    'out_for_delivery',
    'delivered',
  ]) {
    order = await call('orders/' + o.id, undefined, 'GET');
    await call(`orders/${o.id}/status`, { version: order.version, to });
  }
  await t.db
    .prepare(
      "UPDATE order_status_events SET created_at=unixepoch('2025-01-07T13:00:00Z') WHERE organization_id=? AND order_id=?",
    )
    .bind(t.org, o.id)
    .run();
  account = await call(root, undefined, 'GET');
  assert.equal(account.receivable_cents, 2000);
  assert(account.overdue_days > 0);
  const closing = await call(root + '/close', {
    version: account.version,
    order_id: o.id,
  });
  account = await call(root, undefined, 'GET');
  assert.equal(account.closings[0].due_on, '2025-01-18');
  assert.equal(account.closings[0].balance_cents, 2000);
  checks++;
  const charge = await call(root + '/charge', {
    closing_id: closing.closing_id,
  });
  assert.equal(charge.pix_code, null);
  assert.match(charge.message, /20,00/);
  assert(!charge.message.includes('copia e cola'));
  await call(
    'finance/settings',
    {
      version: 0,
      data: {
        type: 'email',
        key: 'pix@example.test',
        receiver: 'DEMONSTRACAO',
        city: 'CIDADE TESTE',
      },
    },
    'PUT',
  );
  const pix = await call(root + '/charge', {});
  assert(pix.pix_code);
  const computed = execFileSync(
    'python3',
    [
      '-c',
      'import binascii,sys;print(format(binascii.crc_hqx(sys.argv[1].encode(),65535),"04X"))',
      pix.pix_code.slice(0, -4),
    ],
    { encoding: 'utf8' },
  ).trim();
  assert.equal(pix.pix_code.slice(-4), computed);
  checks++;
  const payment = {
    version: account.version,
    closing_id: closing.closing_id,
    kind: 'payment',
    amount_cents: 2000,
    method: 'cash',
    paid_on: '2025-01-20',
  };
  const concurrent = await Promise.all([
    t.request(root + '/payments', {
      cookie: operator,
      method: 'POST',
      data: payment,
      key: crypto.randomUUID(),
    }),
    t.request(root + '/payments', {
      cookie: owner,
      method: 'POST',
      data: payment,
      key: crypto.randomUUID(),
    }),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
  account = await call(root, undefined, 'GET');
  assert.equal(account.receivable_cents, 0);
  assert.equal(account.received_cents, 2468);
  assert.equal(account.closings[0].balance_cents, 0);
  checks++;
  const last = account.events.find((e) => e.kind === 'payment');
  const reversal = await call(root + '/reverse', {
    version: account.version,
    event_id: last.id,
    reason: 'Correção DEMONSTRAÇÃO',
  });
  await t.db
    .prepare(
      "UPDATE order_status_events SET created_at=unixepoch('2025-01-07T13:00:00Z') WHERE organization_id=? AND order_id=?",
    )
    .bind(t.org, o.id)
    .run();
  account = await call(root, undefined, 'GET');
  assert.equal(account.receivable_cents, 2000);
  assert.equal(account.received_cents, 468);
  assert(
    account.events.some(
      (e) => e.id === reversal.event_id && e.kind === 'reversal',
    ),
  );
  checks++;
  assert.equal(
    (
      await t.request(root + '/reverse', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: {
          version: account.version,
          event_id: last.id,
          reason: 'Repetição DEMONSTRAÇÃO',
        },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await t.request(root + '/payments', {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { ...payment, version: account.version, amount_cents: 2001 },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await t.request(root + '/payments', {
        cookie: owner,
        method: 'POST',
        origin: 'https://evil.example',
        key: crypto.randomUUID(),
        data: payment,
      })
    ).status,
    403,
  );
  assert.equal((await t.request('catalogo')).status, 404);
  assert.deepEqual(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results,
    [],
  );
  checks++;
  const gated = await runtime({ financeEnabled: true, migrationLimit: 4 });
  try {
    const cookie = await gated.login('owner@example.test');
    assert.equal(
      (await (await gated.request('capabilities', { cookie })).json()).finance,
      false,
    );
    assert.equal(
      (await gated.request('finance/summary', { cookie })).status,
      503,
    );
  } finally {
    await gated.dispose();
  }
  console.log(
    `${checks} verificações financeiras: condições/snapshots, isolamento, sinal/idempotência, fechamento, Pix/CRC independente, concorrência, estorno, limites e CSRF passaram.`,
  );
} finally {
  await t.dispose();
}
