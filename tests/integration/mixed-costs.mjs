import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import {
  mixedAnalysisProject,
  seedAnalysisRecipe,
} from '../helpers/mixed-analysis-project.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
});
try {
  const { call, order, variants, day, owner, operator, outside } =
    await mixedAnalysisProject(t);
  const recipes = [];
  for (let i = 0; i < 2; i++)
    recipes.push(await seedAnalysisRecipe(call, variants[i], i));
  const costPath = 'p1/order-costs/' + order,
    shoppingPath = `p1/shopping?from=${day}&to=${day}`;
  const absent = await call(costPath, undefined, 'GET');
  assert.equal(absent.estimated_cost_cents, null);
  assert.ok(absent.missing.some((s) => s.includes('Gama DEMONSTRAÇÃO')));
  assert.equal(
    (await call(shoppingPath, undefined, 'GET')).estimated_purchase_cents,
    null,
  );
  recipes.push(await seedAnalysisRecipe(call, variants[2], 2));
  const cost = await call(costPath, undefined, 'GET', operator);
  assert.equal(cost.estimated_cost_cents, 798);
  assert.equal(cost.items.find((i) => i.mixed).estimated_cost_cents, 486);
  const totals = Object.fromEntries(
    cost.items
      .flatMap((i) => i.components)
      .map((c) => [c.variant_id, c.unit_cost_cents]),
  );
  assert.deepEqual(
    variants.map((v) => totals[v.id]),
    [16, 26, 37],
    'inclui custos da ficha, arredondados para cima por unidade',
  );
  const gamma = cost.items
    .flatMap((i) => i.components)
    .find((c) => c.variant_id === variants[2].id);
  assert.equal(gamma.units, 2);
  assert.equal(
    gamma.estimated_cost_cents,
    74,
    'não aplica caixa inteira do componente',
  );
  const shopping = await call(shoppingPath, undefined, 'GET');
  const demand = Object.fromEntries(
    shopping.batches.map((b) => [b.recipe_id, b.needed_units]),
  );
  assert.deepEqual(
    recipes.map((r) => demand[r.recipe]),
    [16, 18, 2],
  );
  assert.deepEqual(
    recipes.map(
      (r) => shopping.batches.find((b) => b.recipe_id === r.recipe).batches,
    ),
    [2, 2, 1],
  );
  assert.equal(shopping.estimated_purchase_cents, 3000);
  assert.deepEqual(
    recipes.map(
      (r) =>
        shopping.items.find((s) => s.supply_id === r.supply).required_milli,
    ),
    [240000, 480000, 360000],
  );
  const updateSupply = async (changes) => {
    const current = (await call('p1/supplies', undefined, 'GET')).items.find(
      (s) => s.id === recipes[0].supply,
    );
    await call(
      'p1/supplies/' + current.id,
      {
        name: current.name,
        unit: current.unit,
        pack_quantity_milli: current.pack_quantity_milli,
        pack_cost_cents: current.pack_cost_cents,
        active: !!current.active,
        version: current.version,
        ...changes,
      },
      'PUT',
    );
  };
  await updateSupply({ pack_cost_cents: null });
  assert.equal(
    (await call(costPath, undefined, 'GET')).estimated_cost_cents,
    null,
  );
  assert.equal(
    (await call(shoppingPath, undefined, 'GET')).estimated_purchase_cents,
    null,
  );
  await updateSupply({ pack_cost_cents: 0 });
  assert.equal(
    (await call(costPath, undefined, 'GET')).estimated_cost_cents,
    638,
    'zero cadastrado é custo conhecido',
  );
  await updateSupply({ pack_cost_cents: 1000, active: false });
  assert.equal(
    (await call(costPath, undefined, 'GET')).estimated_cost_cents,
    null,
  );
  await updateSupply({ active: true });
  await call(
    'p1/recipes/' + recipes[2].recipe,
    { ...recipes[2].data, version: 1, active: false },
    'PUT',
  );
  assert.equal(
    (await call(costPath, undefined, 'GET')).estimated_cost_cents,
    null,
  );
  assert.equal(
    (await call(shoppingPath, undefined, 'GET')).estimated_purchase_cents,
    null,
  );
  assert.equal((await t.request(costPath)).status, 401);
  assert.equal((await t.request(costPath, { cookie: outside })).status, 404);
  assert.equal(
    (
      await t.request('p1/order-costs/' + crypto.randomUUID(), {
        cookie: owner,
      })
    ).status,
    404,
  );
  const response = await t.request(costPath, { cookie: owner });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(
    (
      await t.request(costPath, {
        cookie: owner,
        method: 'POST',
        data: {},
        key: crypto.randomUUID(),
      })
    ).status,
    405,
  );
  assert.equal(
    (await call(shoppingPath, undefined, 'GET', outside)).items.length,
    0,
  );
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM expense_events').first()).n,
    0,
  );
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM inventory_events').first()).n,
    0,
  );
  assert.equal(
    (await call('orders/' + order, undefined, 'GET')).total_cents,
    4005,
  );
  // Custo fora do limite não vira um número incorreto nem erro interno.
  await call(
    'p1/recipes/' + recipes[2].recipe,
    { ...recipes[2].data, version: 2, active: true },
    'PUT',
  );
  await call(
    'p1/recipes/' + recipes[0].recipe,
    {
      ...recipes[0].data,
      version: 1,
      yield_units: 1,
      components: [
        { supply_id: recipes[0].supply, quantity_milli: 1000000000000 },
      ],
    },
    'PUT',
  );
  await updateSupply({ pack_quantity_milli: 1, pack_cost_cents: 100000000 });
  const large = await call(costPath, undefined, 'GET');
  assert.equal(large.estimated_cost_cents, null);
  assert.ok(large.missing.some((m) => m.includes('Cálculo excede o limite')));
  console.log(
    'OK R11-5 custo por unidades simples/mistas, arredondamento, lotes/compras, custos ausentes/zero/inativos, autorização e nenhuma despesa/baixa implícita.',
  );
} finally {
  await t.dispose();
}
// Banco anterior à composição: custo simples mantém o critério da ficha existente.
const old = await runtime({
  migrationLimit: 14,
  financeEnabled: true,
  p1Enabled: true,
});
try {
  const { demoProject } = await import('../helpers/demo-project.mjs');
  const { call, variant, makeOrder } = await demoProject(old);
  const id = await makeOrder(new Date().toISOString(), 2);
  await seedAnalysisRecipe(call, { id: variant }, 0);
  assert.equal(
    (await call('p1/order-costs/' + id, undefined, 'GET')).estimated_cost_cents,
    64,
  );
} finally {
  await old.dispose();
}
