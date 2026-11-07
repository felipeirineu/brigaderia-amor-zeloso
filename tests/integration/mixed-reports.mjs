import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { mixedAnalysisProject } from '../helpers/mixed-analysis-project.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
});
try {
  const { call, variants, day, order, deliver, owner, outside, customer } =
    await mixedAnalysisProject(t);
  const query = `?from=${day}&to=${day}`;
  assert.equal(
    (await call('p1/reports' + query, undefined, 'GET')).orders_count,
    0,
    'confirmado não conta como venda entregue',
  );
  await deliver(order);
  const r = await call('p1/reports' + query, undefined, 'GET');
  assert.equal(r.sales_cents, 4005);
  assert.equal(r.orders_count, 1);
  const names = Object.fromEntries(r.products.map((p) => [p.name, p]));
  assert.equal(names['Alfa DEMONSTRAÇÃO'].units, 16);
  assert.equal(names['Beta DEMONSTRAÇÃO'].units, 18);
  assert.equal(names['Gama DEMONSTRAÇÃO'].units, 2);
  assert.equal(names['Alfa DEMONSTRAÇÃO'].boxes, 0);
  assert.equal(names['Alfa DEMONSTRAÇÃO'].mixed_units, 16);
  assert.equal(names['Beta DEMONSTRAÇÃO'].boxes, 1);
  assert.equal(names['Beta DEMONSTRAÇÃO'].mixed_units, 6);
  assert.equal(
    r.products[0].name,
    'Beta DEMONSTRAÇÃO',
    'ranking usa unidades, não caixas ou sabor base',
  );
  assert.equal(
    r.products.reduce((n, p) => n + p.total_cents, 0),
    r.sales_cents,
  );
  assert.equal(names['Beta DEMONSTRAÇÃO'].total_cents, 2503);
  assert.match(r.orders[0].items_text, /2× Mista: .*8 Alfa DEMONSTRAÇÃO/);
  assert.equal(
    (
      await call(
        'p1/reports' + query + '&customer=' + customer,
        undefined,
        'GET',
      )
    ).sales_cents,
    4005,
  );
  const csv = await (
    await t.request('p1/reports.csv' + query + '&kind=products', {
      cookie: owner,
    })
  ).text();
  assert.match(csv, /Unidades em caixas mistas/);
  assert.match(csv, /Vendas atribuídas/);
  const orderCSV = await (
    await t.request('p1/reports.csv' + query + '&kind=orders', {
      cookie: owner,
    })
  ).text();
  assert.match(orderCSV, /2× Mista:/);
  const second = await call('customers', {
    name: 'Outro cliente DEMONSTRAÇÃO relatórios',
    phone: '11900000002',
  });
  assert.equal(
    (
      await call(
        'p1/reports' + query + '&customer=' + second.id,
        undefined,
        'GET',
      )
    ).orders_count,
    0,
  );
  // Mudança/inativação do catálogo não reescreve nomes e unidades históricos.
  const v = variants[0];
  await call(
    'products/' + v.product_id,
    {
      name: 'Nome novo DEMONSTRAÇÃO',
      version: 1,
      active: false,
      variants: [
        {
          id: v.id,
          label: v.label,
          weight_grams: 40,
          units_per_box: 24,
          price_cents: 9999,
          active: false,
        },
      ],
    },
    'PUT',
  );
  assert.equal(
    (await call('p1/reports' + query, undefined, 'GET')).products.find(
      (p) => p.name === 'Alfa DEMONSTRAÇÃO',
    ).units,
    16,
  );
  // CSV de sabor protege fórmulas mesmo quando o snapshot contém texto perigoso.
  await t.db
    .prepare(
      'UPDATE order_item_components SET product_name=? WHERE organization_id=? AND variant_id=?',
    )
    .bind('=DEMONSTRAÇÃO;"teste"', t.org, variants[2].id)
    .run();
  const escaped = await (
    await t.request('p1/reports.csv' + query + '&kind=products', {
      cookie: owner,
    })
  ).text();
  assert.ok(escaped.includes("'=DEMONSTRAÇÃO"));
  assert.ok(escaped.includes('""teste""'));
  assert.equal(
    (await call('p1/reports' + query, undefined, 'GET', outside)).products
      .length,
    0,
  );
  assert.equal((await t.request('p1/reports.csv' + query)).status, 401);
  console.log(
    'OK R11-4 unidades simples/mistas, ranking, rateio exato, snapshots, período/cliente, CSV de composição/fórmulas e isolamento.',
  );
} finally {
  await t.dispose();
}
// Sem 0015, o relatório mantém o comportamento dos itens simples.
const old = await runtime({
  migrationLimit: 14,
  financeEnabled: true,
  p1Enabled: true,
});
try {
  const { call, makeOrder } = await (
    await import('../helpers/demo-project.mjs')
  ).demoProject(old);
  const id = await makeOrder(new Date().toISOString(), 1);
  for (const to of ['in_production', 'ready', 'picked_up']) {
    const o = await call('orders/' + id, undefined, 'GET');
    await call('orders/' + id + '/status', { version: o.version, to });
  }
  const report = await call('p1/reports', undefined, 'GET');
  assert.equal(report.products[0].units, 2);
} finally {
  await old.dispose();
}
