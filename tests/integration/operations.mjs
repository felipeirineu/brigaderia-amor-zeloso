import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
const t = await runtime();
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log('OK', name);
}
async function call(
  path,
  data,
  method = 'POST',
  cookie = owner,
  key = crypto.randomUUID(),
) {
  const r = await t.request(path, { cookie, method, data, key });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
let owner;
try {
  owner = await t.login('owner@example.test');
  const operator = await t.login('operator@example.test'),
    outside = await t.login('other@example.test');
  const customer = await call('customers', {
    name: 'Estabelecimento DEMONSTRAÇÃO',
    phone: '+5511900000000',
  });
  const product = await call('products', {
    name: 'Produto DEMONSTRAÇÃO',
    variants: [
      {
        label: 'Variante DEMONSTRAÇÃO',
        weight_grams: 10,
        units_per_box: 2,
        price_cents: 1234,
      },
    ],
  });
  const p = await call('products/' + product.id, undefined, 'GET');
  const variant = p.variants[0].id;
  const draft = {
    customer_id: customer.id,
    due_at: '2030-01-07T13:00:00.000Z',
    items: [{ variant_id: variant, quantity: 2 }],
  };
  const order = await call('orders', draft);
  const get = () => call('orders/' + order.id, undefined, 'GET');
  await check(
    'isolamento e acesso anônimo nas rotas operacionais',
    async () => {
      assert.equal((await t.request('today')).status, 401);
      assert.equal(
        (await t.request(`orders/${order.id}/history`, { cookie: outside }))
          .status,
        404,
      );
      assert.equal(
        (
          await t.request(`orders/${order.id}/status`, {
            cookie: outside,
            method: 'POST',
            data: { version: 1, to: 'confirmed' },
            key: crypto.randomUUID(),
          })
        ).status,
        404,
      );
    },
  );
  await check(
    'confirmação exige endereço/retirada e estado válido',
    async () => {
      assert.equal(
        (
          await t.request(`orders/${order.id}/status`, {
            cookie: owner,
            method: 'POST',
            key: crypto.randomUUID(),
            data: { version: 1, to: 'confirmed' },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await t.request(`orders/${order.id}/status`, {
            cookie: owner,
            method: 'POST',
            key: crypto.randomUUID(),
            data: { version: 1, to: 'delivered' },
          })
        ).status,
        409,
      );
    },
  );
  await call(
    `orders/${order.id}/delivery`,
    {
      version: 1,
      delivery_type: 'delivery',
      delivery_address: 'Endereço de DEMONSTRAÇÃO',
      courier: 'courier',
      courier_name: 'Entregador DEMONSTRAÇÃO',
      courier_fee_cents: 1000,
    },
    'PUT',
  );
  await check('taxa do motoboy não altera preço nem cria gasto', async () => {
    const o = await get();
    assert.equal(o.total_cents, 2468);
    assert.equal(o.courier_fee_cents, 1000);
    assert.equal(
      (
        await t.db
          .prepare(
            "SELECT count(*) AS count FROM sqlite_schema WHERE name='expenses'",
          )
          .first()
      ).count,
      0,
    );
  });
  const statusKey = crypto.randomUUID();
  await call(
    `orders/${order.id}/status`,
    { version: 2, to: 'confirmed' },
    'POST',
    operator,
    statusKey,
  );
  await check(
    'transição idempotente e edição concorrente protegida',
    async () => {
      await call(
        `orders/${order.id}/status`,
        { version: 2, to: 'confirmed' },
        'POST',
        operator,
        statusKey,
      );
      assert.equal(
        (
          await t.request(`orders/${order.id}/status`, {
            cookie: owner,
            method: 'POST',
            key: crypto.randomUUID(),
            data: { version: 2, to: 'in_production' },
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await t.request(`orders/${order.id}`, {
            cookie: owner,
            method: 'PUT',
            data: { ...draft, version: 3 },
          })
        ).status,
        409,
      );
    },
  );
  await check(
    'Hoje usa unidades por embalagem e separa previsto/recebido',
    async () => {
      const today = await call('today?date=2030-01-07', undefined, 'GET');
      assert.equal(today.production[0].units, 4);
      assert.equal(today.production[0].boxes, 2);
      assert.equal(today.totals.expected_cents, 2468);
      assert.equal(today.received_available, false);
    },
  );
  let version = 3;
  for (const target of [
    'in_production',
    'ready',
    'out_for_delivery',
    'delivered',
  ]) {
    await call(
      `orders/${order.id}/status`,
      { version, to: target },
      'POST',
      operator,
    );
    version++;
  }
  const history = await call(`orders/${order.id}/history`, undefined, 'GET');
  await check(
    'entrega tem histórico e desfazer compensatório auditado',
    async () => {
      assert.equal(history.length, 5);
      assert(history.every((e) => e.user_id));
      const last = history.at(-1);
      await call(
        `orders/${order.id}/undo`,
        { version, event_id: last.id },
        'POST',
        operator,
      );
      version++;
      assert.equal((await get()).status, 'out_for_delivery');
      const updated = await call(
        `orders/${order.id}/history`,
        undefined,
        'GET',
      );
      assert.equal(updated.at(-1).undo_of, last.id);
      assert.equal(updated.length, 6);
    },
  );
  await check(
    'cancelamento exige motivo e encerra novas transições',
    async () => {
      assert.equal(
        (
          await t.request(`orders/${order.id}/status`, {
            cookie: owner,
            method: 'POST',
            key: crypto.randomUUID(),
            data: { version, to: 'cancelled' },
          })
        ).status,
        400,
      );
      await call(`orders/${order.id}/status`, {
        version,
        to: 'cancelled',
        reason: 'Motivo de DEMONSTRAÇÃO',
      });
      assert.equal(
        (
          await t.request(`orders/${order.id}/status`, {
            cookie: owner,
            method: 'POST',
            key: crypto.randomUUID(),
            data: { version: version + 1, to: 'confirmed' },
          })
        ).status,
        409,
      );
    },
  );
  await check(
    'R1-3 reabertura com motivo antes da produção, versão e histórico',
    async () => {
      const o = await call('orders', draft);
      await call(
        `orders/${o.id}/delivery`,
        { version: 1, delivery_type: 'pickup', courier: 'unassigned' },
        'PUT',
      );
      await call(`orders/${o.id}/status`, { version: 2, to: 'confirmed' });
      const invalid = await t.request(`orders/${o.id}/status`, {
        cookie: owner,
        method: 'POST',
        key: crypto.randomUUID(),
        data: { version: 3, to: 'awaiting_confirmation' },
      });
      assert.equal(invalid.status, 400);
      await call(`orders/${o.id}/status`, {
        version: 3,
        to: 'awaiting_confirmation',
        reason: 'Ajuste DEMONSTRAÇÃO',
      });
      await call(
        `orders/${o.id}`,
        { ...draft, version: 4, items: [{ variant_id: variant, quantity: 3 }] },
        'PUT',
      );
      const adjusted = await call(`orders/${o.id}`, undefined, 'GET');
      assert.equal(adjusted.total_cents, 3702);
      await call(`orders/${o.id}/status`, { version: 5, to: 'confirmed' });
      await call(`orders/${o.id}/status`, { version: 6, to: 'in_production' });
      assert.equal(
        (
          await t.request(`orders/${o.id}/status`, {
            cookie: owner,
            method: 'POST',
            key: crypto.randomUUID(),
            data: {
              version: 7,
              to: 'awaiting_confirmation',
              reason: 'DEMONSTRAÇÃO',
            },
          })
        ).status,
        409,
      );
      const events = await call(`orders/${o.id}/history`, undefined, 'GET');
      assert(events.some((e) => e.reason === 'Ajuste DEMONSTRAÇÃO'));
      await call(`orders/${o.id}/status`, {
        version: 7,
        to: 'cancelled',
        reason: 'Fim do teste DEMONSTRAÇÃO',
      });
    },
  );
  const plan = {
    name: 'Modelo DEMONSTRAÇÃO',
    courier: 'partner',
    courier_fee_cents: 150,
    customer_id: customer.id,
    weekday: 1,
    time: '10:00',
    delivery_address: 'Endereço de DEMONSTRAÇÃO',
    items: [{ variant_id: variant, quantity: 3 }],
  };
  const recurring = await call('recurring', plan);
  await check(
    'geração semanal cria somente rascunhos e não duplica',
    async () => {
      const first = await call('generate-week', { week: '2030-01-07' });
      assert.equal(first.created, 1);
      const repeated = await call('generate-week', { week: '2030-01-07' });
      assert.equal(repeated.created, 0);
      assert.equal(repeated.already_present, 1);
      const orders = await call('orders', undefined, 'GET');
      const generated = orders.find((o) => o.order_type === 'recurring');
      assert(generated);
      assert.equal(generated.status, 'draft');
      assert.equal(generated.courier, 'partner');
      assert.equal(generated.courier_fee_cents, 150);
      assert.equal(generated.total_cents, 3702);
      assert.equal(generated.items[0].quantity, 3);
      await t.db
        .prepare(
          'UPDATE product_variants SET price_cents=2000 WHERE organization_id=? AND id=?',
        )
        .bind(t.org, variant)
        .run();
      assert.equal(
        (await call('generate-week', { week: '2030-01-14' })).created,
        1,
      );
      const freshOrders = await call('orders', undefined, 'GET');
      assert.equal(
        freshOrders.find((o) => o.id === generated.id).total_cents,
        3702,
      );
      assert(
        freshOrders.some(
          (o) => o.order_type === 'recurring' && o.total_cents === 6000,
        ),
      );
    },
  );
  await check(
    'R1-1 ignora modelo inválido sem bloquear válidos e preserva idempotência',
    async () => {
      const badProduct = await call('products', {
        name: 'Produto DEMONSTRAÇÃO inativo',
        variants: [
          {
            label: 'DEMONSTRAÇÃO',
            weight_grams: 10,
            units_per_box: 2,
            price_cents: 100,
          },
        ],
      });
      const bad = await call('products/' + badProduct.id, undefined, 'GET');
      const badPlan = await call('recurring', {
        ...plan,
        name: 'Modelo DEMONSTRAÇÃO inválido',
        items: [{ variant_id: bad.variants[0].id, quantity: 1 }],
      });
      await t.db
        .prepare(
          'UPDATE products SET active=0 WHERE organization_id=? AND id=?',
        )
        .bind(t.org, badProduct.id)
        .run();
      const generated = await call('generate-week', { week: '2030-01-21' });
      assert.equal(generated.created, 1);
      assert.equal(generated.skipped[0].id, badPlan.id);
      assert.match(generated.skipped[0].reason, /inativa/);
      const repeated = await call('generate-week', { week: '2030-01-21' });
      assert.equal(repeated.created, 0);
      assert.equal(repeated.already_present, 1);
    },
  );
  await check(
    'modelo de outra organização rejeitado e arquivamento interrompe geração',
    async () => {
      assert.equal(
        (
          await t.request('recurring', {
            cookie: outside,
            method: 'POST',
            key: crypto.randomUUID(),
            data: plan,
          })
        ).status,
        400,
      );
      await call(
        'recurring/' + recurring.id,
        { ...plan, version: 1, active: false },
        'PUT',
      );
      assert.equal(
        (await call('generate-week', { week: '2030-01-14' })).created,
        0,
      );
    },
  );
  await check(
    'WhatsApp monta texto sem envio e sem placeholders pendentes',
    async () => {
      const preview = await call(`orders/${order.id}/message`, {
        kind: 'confirmation',
      });
      assert(preview.message.includes('Estabelecimento DEMONSTRAÇÃO'));
      assert(!/[{}]/.test(preview.message));
      assert.equal(preview.phone, '+5511900000000');
      assert.equal(
        (
          await t.request('message-templates', {
            cookie: owner,
            method: 'PUT',
            data: { kind: 'confirmation', content: 'Teste {saldo}' },
          })
        ).status,
        400,
      );
      const key = crypto.randomUUID();
      await call(
        `orders/${order.id}/contact`,
        { kind: 'confirmation' },
        'POST',
        operator,
        key,
      );
      await call(
        `orders/${order.id}/contact`,
        { kind: 'confirmation' },
        'POST',
        operator,
        key,
      );
      assert.equal(
        (
          await t.db
            .prepare('SELECT count(*) AS count FROM contact_events')
            .first()
        ).count,
        1,
      );
    },
  );
  assert.equal(
    (
      await t.db
        .prepare(
          "SELECT count(*) AS count FROM audit_events WHERE action='order.contact_recorded'",
        )
        .first()
    ).count,
    1,
  );
  await check(
    'Hoje mantém produção completa mesmo acima do limite de cartões',
    async () => {
      const records = Array.from({ length: 205 }, () => ({
        id: crypto.randomUUID(),
        item: crypto.randomUUID(),
        key: crypto.randomUUID(),
      }));
      await t.db.batch([
        t.db
          .prepare(
            "INSERT INTO orders(id,organization_id,customer_id,customer_name,status,due_at,total_cents,request_key,request_hash,delivery_type) SELECT json_extract(value,'$.id'),?,?,'Cliente DEMONSTRAÇÃO volume','confirmed','2030-02-01T13:00:00.000Z',100,json_extract(value,'$.key'),'fixture','pickup' FROM json_each(?)",
          )
          .bind(t.org, customer.id, JSON.stringify(records)),
        t.db
          .prepare(
            "INSERT INTO order_items(id,organization_id,order_id,variant_id,product_name,variant_label,weight_grams,units_per_box,unit_price_cents,quantity) SELECT json_extract(value,'$.item'),?,json_extract(value,'$.id'),?,'Produto DEMONSTRAÇÃO volume','Variante DEMONSTRAÇÃO',10,2,100,1 FROM json_each(?)",
          )
          .bind(t.org, variant, JSON.stringify(records)),
      ]);
      const today = await call('today?date=2030-02-01', undefined, 'GET');
      assert.equal(today.orders.length, 200);
      assert.equal(today.truncated, true);
      assert.equal(today.production[0].units, 410);
      assert.equal(today.production[0].boxes, 205);
      assert.equal(today.production[0].weight_grams, 10);
    },
  );
  console.log(`${passed} verificações operacionais passaram.`);
} finally {
  await t.mf.dispose();
}
