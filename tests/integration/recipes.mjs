import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({ financeEnabled: true, p1Enabled: true });
try {
  const { owner, operator, outside, call, variant, makeOrder } =
    await demoProject(t);
  await makeOrder();
  const source = {
      name: 'Insumo DEMONSTRAÇÃO',
      unit: 'g',
      pack_quantity_milli: 1000000,
      pack_cost_cents: 1000,
    },
    key = crypto.randomUUID(),
    supply = await call('p1/supplies', source, 'POST', owner, key);
  assert.equal(
    (await call('p1/supplies', source, 'POST', owner, key)).id,
    supply.id,
  );
  const draft = {
      name: 'Ficha DEMONSTRAÇÃO',
      variant_id: variant,
      yield_units: 3,
      packaging_cents: 0,
      labor_cents: 0,
      overhead_cents: 0,
      margin_bps: 5000,
      components: [{ supply_id: supply.id, quantity_milli: 500000 }],
    },
    recipe = await call('p1/recipes', draft);
  let list = await call('p1/recipes', undefined, 'GET');
  assert.equal(list.items[0].estimate.total_cents, 500);
  assert.equal(list.items[0].estimate.unit_cost_cents, 167);
  assert.equal(list.items[0].estimate.suggested_price_cents, 668);
  const shopping = await call(
    'p1/shopping?from=2030-01-07&to=2030-01-07',
    undefined,
    'GET',
  );
  assert.equal(shopping.batches[0].batches, 2);
  assert.equal(shopping.items[0].required_milli, 1000000);
  assert.equal(shopping.items[0].packs, 1);
  assert.equal(shopping.estimated_purchase_cents, 1000);
  assert.equal(
    (
      await t.db
        .prepare(
          'SELECT price_cents FROM product_variants WHERE organization_id=? AND id=?',
        )
        .bind(t.org, variant)
        .first()
    ).price_cents,
    1000,
  );
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) AS n FROM expense_events').first()).n,
    0,
  );
  assert.equal(
    (
      await t.request('p1/supplies', {
        cookie: operator,
        method: 'POST',
        key: crypto.randomUUID(),
        data: source,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await t.request('p1/recipes', {
        cookie: outside,
        method: 'POST',
        key: crypto.randomUUID(),
        data: draft,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await t.request('p1/supplies/' + supply.id, {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: { ...source, unit: 'ml', version: 1 },
      })
    ).status,
    409,
  );
  await call(
    'p1/supplies/' + supply.id,
    { ...source, pack_cost_cents: null, version: 1 },
    'PUT',
  );
  list = await call('p1/recipes', undefined, 'GET');
  assert.equal(list.items[0].estimate.suggested_price_cents, null);
  assert.equal(
    (await call('p1/shopping?from=2030-01-07&to=2030-01-07', undefined, 'GET'))
      .estimated_purchase_cents,
    null,
  );
  await call(
    'p1/recipes/' + recipe.id,
    { ...draft, active: false, version: 1 },
    'PUT',
  );
  assert.match(
    (await call('p1/shopping?from=2030-01-07&to=2030-01-07', undefined, 'GET'))
      .missing[0],
    /Sem ficha/,
  );
  assert.deepEqual(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results,
    [],
  );
  console.log(
    'OK P1-4/P1-5 custos/margem/centavos, lotes e embalagens, custo ausente, ficha ausente, unidade protegida, isolamento e nenhuma alteração automática de preço/despesa.',
  );
} finally {
  await t.dispose();
}
