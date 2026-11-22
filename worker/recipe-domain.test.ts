import { expect, it } from 'vitest';
import { ceilDivide, estimateRecipe } from './recipe-domain';
it('custo estimado usa centavos e arredonda para cima; preço deriva de margem, sem markup', () => {
  const r = {
      yield_units: 10,
      packaging_cents: 100,
      labor_cents: 200,
      overhead_cents: 0,
      margin_bps: 5000,
      units_per_box: 2,
    },
    items = [
      {
        supply_id: 'demo',
        name: 'Insumo DEMONSTRAÇÃO',
        quantity_milli: 500000,
        pack_quantity_milli: 1000000,
        pack_cost_cents: 1000,
        supply_active: 1,
      },
    ];
  expect(estimateRecipe(r, items)).toMatchObject({
    missing: [],
    total_cents: 800,
    unit_cost_cents: 80,
    box_cost_cents: 160,
    suggested_price_cents: 320,
  });
  expect(ceilDivide(1n, 3n)).toBe(1n);
  expect(
    estimateRecipe({ ...r, yield_units: 3 }, [
      { ...items[0], quantity_milli: 1, pack_cost_cents: 1 },
    ]).unit_cost_cents,
  ).toBe(101);
});
it('custo desconhecido ou insumo inativo não vira zero ou preço fictício', () => {
  const r = {
    yield_units: 10,
    packaging_cents: 0,
    labor_cents: 0,
    overhead_cents: 0,
    margin_bps: 3000,
    units_per_box: 2,
  };
  const c = {
    supply_id: 'demo',
    name: 'Insumo DEMONSTRAÇÃO',
    quantity_milli: 1000,
    pack_quantity_milli: 1000,
    pack_cost_cents: null,
    supply_active: 1,
  };
  expect(estimateRecipe(r, [c]).suggested_price_cents).toBeNull();
  expect(
    estimateRecipe(r, [{ ...c, pack_cost_cents: 100, supply_active: 0 }])
      .total_cents,
  ).toBeNull();
});

it('T19 arredonda cada valor por doce, aplica custos não calculados antes da margem e aceita zero', () => {
  const recipe = {
    yield_units: 50,
    packaging_cents: 300,
    labor_cents: 1500,
    overhead_cents: 200,
    margin_bps: 4000,
    units_per_box: 12,
    unmeasured_bps: 2000,
  };
  const ingredients = [1398, 349, 420, 210, 640].map((cost, i) => ({
    supply_id: String(i),
    name: 'Insumo DEMONSTRAÇÃO',
    quantity_milli: 1000,
    pack_quantity_milli: 1000,
    pack_cost_cents: cost,
    supply_active: 1,
  }));
  const result = estimateRecipe(recipe, ingredients);
  expect(result.ingredient_costs.map((c) => c.unit_cents)).toEqual([
    28, 7, 8, 4, 13,
  ]);
  expect(result).toMatchObject({
    production_cents: 5017,
    production_unit_cents: 100,
    unmeasured_cents: 1003,
    unmeasured_unit_cents: 20,
    total_cents: 6020,
    unit_cost_cents: 120,
    suggested_batch_cents: 10034,
    suggested_unit_cents: 201,
    suggested_price_cents: 2408,
  });
  expect(
    estimateRecipe({ ...recipe, unmeasured_bps: 0 }, ingredients),
  ).toMatchObject({
    unmeasured_cents: 0,
    total_cents: 5017,
  });
  const half = estimateRecipe(
    {
      ...recipe,
      unmeasured_bps: 0,
      yield_units: 2,
      packaging_cents: 0,
      labor_cents: 0,
      overhead_cents: 0,
    },
    [ingredients[1]],
  );
  expect(half.unit_cost_cents).toBe(175);
});
