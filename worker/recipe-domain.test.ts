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
  expect(estimateRecipe(r, items)).toEqual({
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
