import { describe, it, expect } from 'vitest';
import {
  calculateWeightKit,
  defaultCostingSettings,
  emptyWeightRecipe,
  finishSuggestion,
  ifoodPrice,
  yieldByWeight,
  type WeightSupply,
  type WeightRecipeData,
  type CostingSettings,
} from './weight-costing';
import type { Kit } from './kits';
// Exemplo de aceite estritamente fictício: não representa custos da brigaderia.
function fixture() {
  const data: WeightRecipeData = {
    ...emptyWeightRecipe(),
    reference_confirmed: true,
    components: [
      {
        supply_id: 'dough',
        group: 'dough' as const,
        quantity_milli: 1000,
        sizes: [],
      },
    ],
  };
  const settings: CostingSettings = {
    ...defaultCostingSettings(),
    liners: [{ weight_grams: 30, supply_id: 'liner' }],
    ifood_packaging_supply_id: 'pack-food',
    ifood_label_supply_id: 'label',
    ifood_bag_supply_id: 'bag',
    optional_supply_ids: ['extra'],
  };
  const supplies: WeightSupply[] = [
    ['dough', 2000],
    ['liner', 0],
    ['pack', 200],
    ['pack-food', 100],
    ['label', 50],
    ['bag', 50],
    ['extra', 50],
  ].map(([id, cost]) => ({
    id: String(id),
    name: `DEMONSTRAÇÃO ${id}`,
    unit: 'unit',
    pack_quantity_milli: 1000,
    pack_cost_cents: Number(cost),
    active: 1,
  }));
  const kit: Kit = {
    id: 'kit-demo',
    weight_grams: 30,
    dough_weight_grams: 26,
    units_per_kit: 12,
    price_cents: 5000,
    max_flavors: 3,
    packaging_supply_id: 'pack',
    active: 1,
    version: 1,
  };
  return { data, settings, supplies, kit };
}
describe('R16 por peso, somente demonstração', () => {
  it('reproduz integralmente o aceite:125/1700/2040 e iFood7028', () => {
    const f = fixture(),
      r = calculateWeightKit(f.data, f.settings, f.kit, f.supplies);
    expect(r.missing).toEqual([]);
    expect(r.unit_cost_cents).toBe(125);
    expect(r.calculated_cents).toBe(1700);
    expect(r.adjusted_cents).toBe(2040);
    expect(r.ifood.table?.price_cents).toBe(7028);
    expect(r.ifood.table?.numerator_cents).toBe(5200);
    expect(r.ifood.assumption).toContain('1 sacola');
  });
  it.each([
    [16, 32, 20, 16],
    [17, 34, 22, 17],
    [15, 30, 19, 15],
  ])('rendimento editável %i, divide para baixo13/20/26g', (units, a, b, c) => {
    const f = fixture();
    f.data.reference_yield = units;
    expect(
      [
        [15, 13],
        [23, 20],
        [30, 26],
      ].map(([w, n]) => yieldByWeight(f.data, w, n * 1000).units),
    ).toEqual([a, b, c]);
    expect(yieldByWeight(f.data, 15, 13000).estimated).toBe(true);
  });
  it('massa total e medição substituem a referência sem perder a indicação de estimativa', () => {
    const f = fixture();
    f.data.mass_milli = 390000;
    expect(yieldByWeight(f.data, 15, 13000)).toMatchObject({
      units: 30,
      estimated: true,
    });
    f.data.measured = [
      { weight_grams: 15, dough_milli: 13000, yield_units: 29 },
    ];
    expect(yieldByWeight(f.data, 15, 13000)).toMatchObject({
      units: 29,
      estimated: false,
    });
    expect(() => yieldByWeight(f.data, 15, 500000)).toThrow();
  });
  it('escala de superfície é sugestão, ausente impede custo até confirmação', () => {
    const f = fixture();
    f.data.components.push({
      supply_id: 'extra',
      group: 'finish',
      quantity_milli: 0,
      sizes: [{ weight_grams: 15, quantity_milli: 1000, estimated: false }],
    });
    const r = calculateWeightKit(f.data, f.settings, f.kit, f.supplies);
    expect(finishSuggestion(1000, 30, 15)).toBe(630);
    expect(r.suggestions[0].quantity_milli).toBe(
      finishSuggestion(1000, 15, 30),
    );
    expect(r.adjusted_cents).toBeNull();
    expect(f.data.components[1].sizes).toHaveLength(1);
  });
  it('forminha é específica por tamanho, não herda a de30g', () => {
    const f = fixture(),
      r = calculateWeightKit(
        f.data,
        f.settings,
        { ...f.kit, weight_grams: 15, dough_weight_grams: 13 },
        f.supplies,
      );
    expect(r.missing.some((s) => s.startsWith('Forminha'))).toBe(true);
    expect(r.adjusted_cents).toBeNull();
  });
  it('opcionais só entram ao selecionar e não alteram ficha/configuração', () => {
    const f = fixture(),
      before = JSON.stringify(f),
      r = calculateWeightKit(f.data, f.settings, f.kit, f.supplies, ['extra']);
    expect(r.calculated_cents).toBe(2300);
    expect(r.adjusted_cents).toBe(2760);
    expect(JSON.stringify(f)).toBe(before);
    expect(
      calculateWeightKit(f.data, f.settings, f.kit, f.supplies).adjusted_cents,
    ).toBe(2040);
    expect(() =>
      calculateWeightKit(f.data, f.settings, f.kit, f.supplies, ['foreign']),
    ).toThrow();
  });
  it('adicional precede margem, e taxa/embalagem do canal são independentes', () => {
    const f = fixture(),
      r = calculateWeightKit(f.data, f.settings, f.kit, f.supplies, [], 4000);
    expect(r.suggested_price_cents).toBe(3400);
    expect(r.table_margin_bps).toBe(5920);
    expect(ifoodPrice(5000, 100, 50, 50, 8000).price_cents).toBe(6500);
    f.settings.overhead_bps = 2500;
    expect(
      calculateWeightKit(f.data, f.settings, f.kit, f.supplies).adjusted_cents,
    ).toBe(2125);
    f.settings.ifood_packaging_supply_id = null;
    expect(
      calculateWeightKit(f.data, f.settings, f.kit, f.supplies).ifood.table
        ?.price_cents,
    ).toBe(7163);
  });
  it('preço desconhecido/inativo impede custo; canal pode usar preço de tabela conhecido', () => {
    const f = fixture();
    f.supplies[0].pack_cost_cents = null;
    const r = calculateWeightKit(f.data, f.settings, f.kit, f.supplies);
    expect(r.unit_cost_cents).toBeNull();
    expect(r.adjusted_cents).toBeNull();
    expect(r.ifood.table?.price_cents).toBe(7028);
    f.supplies[4].active = 0;
    expect(
      calculateWeightKit(f.data, f.settings, f.kit, f.supplies).ifood.table,
    ).toBeNull();
  });
  it('zero explícito é válido; falta de ficha/massa não vira zero', () => {
    const f = fixture();
    f.supplies[0].pack_cost_cents = 0;
    expect(
      calculateWeightKit(f.data, f.settings, f.kit, f.supplies).adjusted_cents,
    ).toBe(240);
    f.data.components = [];
    expect(
      calculateWeightKit(f.data, f.settings, f.kit, f.supplies).adjusted_cents,
    ).toBeNull();
    expect(
      calculateWeightKit(
        f.data,
        f.settings,
        { ...f.kit, dough_weight_grams: null },
        f.supplies,
      ).yield,
    ).toBeNull();
  });
  it('valores extremos/divisor inválido falham sem dinheiro fracionário/Infinity', () => {
    expect(() => ifoodPrice(5000, 100, 50, 50, 0)).toThrow();
    const f = fixture();
    f.data.components[0].quantity_milli = 1000000000000;
    f.supplies[0].pack_quantity_milli = 1;
    expect(() =>
      calculateWeightKit(f.data, f.settings, f.kit, f.supplies),
    ).toThrow();
  });
});
