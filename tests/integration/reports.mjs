import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({ financeEnabled: true, p1Enabled: true });
try {
  const { call, makeOrder, owner, outside, customer } = await demoProject(t);
  const ids = [await makeOrder(), await makeOrder()];
  for (const id of ids) {
    for (const [i, to] of ['in_production', 'ready', 'picked_up'].entries())
      await call(`orders/${id}/status`, { version: 3 + i, to });
    await t.db
      .prepare(
        "UPDATE order_status_events SET created_at=unixepoch('2025-01-07T13:00:00Z') WHERE organization_id=? AND order_id=?",
      )
      .bind(t.org, id)
      .run();
  }
  const account = await call(`finance/customers/${customer}`, undefined, 'GET');
  await call(`finance/customers/${customer}/payments`, {
    version: account.version,
    order_id: ids[0],
    kind: 'payment',
    amount_cents: 500,
    method: 'cash',
    paid_on: '2025-01-07',
  });
  const historical = (
    await call('customers', {
      name: 'Cliente DEMONSTRAÇÃO histórico',
      phone: '+5511900000001',
    })
  ).id;
  const priorOrder = (
    await call('orders', {
      customer_id: historical,
      due_at: '2024-12-20T13:00:00Z',
      items: [
        {
          variant_id: (await call('orders/' + ids[0], undefined, 'GET'))
            .items[0].variant_id,
          quantity: 2,
        },
      ],
    })
  ).id;
  await call(
    `orders/${priorOrder}/delivery`,
    { version: 1, delivery_type: 'pickup', courier: 'unassigned' },
    'PUT',
  );
  for (const [i, to] of [
    'confirmed',
    'in_production',
    'ready',
    'picked_up',
  ].entries())
    await call(`orders/${priorOrder}/status`, { version: 2 + i, to });
  await t.db
    .prepare(
      "UPDATE order_status_events SET created_at=unixepoch('2024-12-20T13:00:00Z') WHERE organization_id=? AND order_id=?",
    )
    .bind(t.org, priorOrder)
    .run();
  const query = '?from=2025-01-01&to=2025-01-31',
    report = await call('p1/reports' + query, undefined, 'GET');
  assert.equal(report.sales_cents, 4000);
  assert.equal(report.received_cents, 500);
  assert.equal(report.receivable_cents, 5500);
  assert.equal(report.products[0].units, 8);
  assert.equal(report.customers[0].orders, 2);
  assert.equal(report.weekly[0].total_cents, 4000);
  assert.equal(report.comparison.sales_cents, 2000);
  assert.equal(report.comparison.change_percent, 100);
  assert.equal(report.without_deliveries[0].id, historical);
  assert(
    report.aging.every((a) => a.overdue_days === 0 || a.bucket === '61+ dias'),
  );
  await t.db
    .prepare(
      'UPDATE orders SET customer_name=? WHERE organization_id=? AND id=?',
    )
    .bind('\t=DEMONSTRAÇÃO "cliente";\nlinha', t.org, ids[0])
    .run();
  const response = await t.request('p1/reports.csv' + query, { cookie: owner }),
    csv = await response.text();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert(csv.includes("'\t=DEMONSTRAÇÃO"));
  const count = execFileSync(
    'python3',
    [
      '-c',
      'import csv,sys,io;print(len(list(csv.reader(io.StringIO(sys.stdin.read()),delimiter=";"))))',
    ],
    { input: csv, encoding: 'utf8' },
  ).trim();
  assert.equal(count, '3');
  assert.equal(
    (await call('p1/reports' + query, undefined, 'GET', outside)).sales_cents,
    0,
  );
  assert.equal((await t.request('p1/reports.csv' + query)).status, 401);
  console.log(
    'OK P1-3 vendas efetivas, totais sem duplicar itens, ranking, recebido, aging, CSV com fórmula/aspas/newline e isolamento.',
  );
} finally {
  await t.dispose();
}
