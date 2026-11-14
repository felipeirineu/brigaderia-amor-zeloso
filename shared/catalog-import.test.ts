import { describe, expect, it } from 'vitest';
import { parseDecimal, planCatalog, resolveRecipes } from './catalog-import';

// Fixtures fictícias, no mesmo formato das planilhas preparadas para o responsável.
const sabores = [
  ['Nome', 'Embalagem', 'Peso (g)', 'Unidades', 'Preço', 'Foto'],
  ['Sabor A DEMONSTRAÇÃO', 'Caixa 12 un.', 30, 12, '42,00', ''],
  ['Caipirinha', '', '30', '12', 'R$ 42,00', ''],
];
const insumos = [
  [
    'Nome do insumo',
    'Unidade de referência',
    'Quantidade por embalagem',
    'Preço da embalagem (R$)',
    'Observação',
  ],
  ['Leite DEMONSTRAÇÃO', 'Gramas (g)', 395, 7.1, ''],
  ['Creme DEMONSTRAÇÃO', 'Mililitros (mL)', '200', '3,15', ''],
  ['Pétala DEMONSTRAÇÃO', 'Unidades', 50, '', 'sem preço'],
  [],
  ['Gás', '—', '—', 0.5, 'não é insumo'],
];
const fichas = [
  ['Ficha (sabor)', 'Insumo', 'Quantidade no lote', 'Unidade', 'De onde veio'],
  ['Sabor A DEMONSTRAÇÃO', 'Leite DEMONSTRAÇÃO', 395, 'g', ''],
  ['Sabor A DEMONSTRAÇÃO', 'Creme DEMONSTRAÇÃO', '30,3', 'mL', ''],
  ['Sabor A DEMONSTRAÇÃO', 'Rendimento do lote (unidades)', 16, 'doces', ''],
  ['Sabor A DEMONSTRAÇÃO', 'Outros custos por lote (R$)', '0,50', 'R$', ''],
  [],
  ['Limão', '(receita a preencher pelo Tiago)', null, null, ''],
];

describe('planCatalog', () => {
  it('lê sabores, insumos e fichas no formato das planilhas', () => {
    const plan = planCatalog({
      flavors: sabores,
      supplies: insumos,
      recipes: fichas,
    });
    expect(plan.problems).toEqual([]);
    expect(plan.flavors.map((f) => [f.name, f.photo_key, f.variant])).toEqual([
      [
        'Sabor A DEMONSTRAÇÃO',
        null,
        {
          label: 'Caixa 12 un.',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: 4200,
        },
      ],
      [
        'Caipirinha',
        'caipirinha',
        {
          label: 'Caixa 12 un.',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: 4200,
        },
      ],
    ]);
    expect(plan.supplies).toEqual([
      {
        line: 2,
        name: 'Leite DEMONSTRAÇÃO',
        unit: 'g',
        pack_quantity_milli: 395000,
        pack_cost_cents: 710,
      },
      {
        line: 3,
        name: 'Creme DEMONSTRAÇÃO',
        unit: 'ml',
        pack_quantity_milli: 200000,
        pack_cost_cents: 315,
      },
      {
        line: 4,
        name: 'Pétala DEMONSTRAÇÃO',
        unit: 'unit',
        pack_quantity_milli: 50000,
        pack_cost_cents: null,
      },
    ]);
    expect(plan.recipes).toEqual([
      {
        name: 'Sabor A DEMONSTRAÇÃO',
        flavor: 'Sabor A DEMONSTRAÇÃO',
        yield_units: 16,
        overhead_cents: 50,
        packaging_cents: 0,
        labor_cents: 0,
        margin_bps: 0,
        components: [
          { line: 2, supply: 'Leite DEMONSTRAÇÃO', quantity_milli: 395000 },
          { line: 3, supply: 'Creme DEMONSTRAÇÃO', quantity_milli: 30300 },
        ],
      },
    ]);
    expect(
      resolveRecipes(plan, ['sabor a demonstracao'], ['Leite DEMONSTRAÇÃO']),
    ).toEqual([
      'Ficha "Sabor A DEMONSTRAÇÃO", linha 3: insumo "Creme DEMONSTRAÇÃO" não encontrado em Insumos nem no app.',
    ]);
  });
  it('aponta erros com aba e linha, sem gravar nada', () => {
    const plan = planCatalog({
      flavors: [
        sabores[0],
        ['Sem preço', '', 30, 12, ''],
        ['Sem preço', '', 30, 12, '1'],
      ],
      supplies: [insumos[0], ['X', 'litros', 1, 1]],
      recipes: [
        fichas[0],
        ['Y', 'Leite', 0, 'g', ''],
        ['Y', 'Leite', 1, 'g', ''],
      ],
    });
    expect(plan.problems).toEqual([
      'Sabores, linha 2: preço da caixa (ex.: 42,00).',
      'Insumos, linha 2: unidade "litros" (use g, mL ou unidades).',
      'Fichas, linha 2: quantidade de "Leite" maior que zero.',
      'Fichas: ficha "Y" sem "Rendimento do lote".',
    ]);
    expect(plan.recipes).toEqual([]);
  });
  it('números no formato brasileiro', () => {
    expect(parseDecimal('1.234,56')).toBe(1234.56);
    expect(parseDecimal('R$ 7,10')).toBe(7.1);
    expect(parseDecimal('30.3')).toBe(30.3);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNaN();
  });
});
