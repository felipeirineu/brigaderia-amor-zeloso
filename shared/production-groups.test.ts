import { describe, expect, it } from 'vitest';
import {
  packagingText,
  partsText,
  productionGroups,
  type ProductionLine,
} from './production-groups';

const line = (
  name: string,
  units: number,
  units_per_box = 12,
  day = '2030-01-02',
  weight_grams = 30,
): ProductionLine => ({
  day,
  name,
  label: '',
  weight_grams,
  units_per_box,
  units,
  photo_key: null,
});

describe('productionGroups', () => {
  it('soma o mesmo sabor de kits diferentes em unidades inteiras', () => {
    const [g] = productionGroups(
      [line('Sabor A', 25), line('Sabor A', 10, 1), line('Sabor B', 7)],
      [
        { day: '2030-01-02', weight_grams: 30, units_per_box: 12, boxes: 3 },
        { day: '2030-01-02', weight_grams: 30, units_per_box: 1, boxes: 10 },
      ],
    );
    expect(g.units).toBe(42);
    expect(g.flavors.map((f) => [f.name, f.units])).toEqual([
      ['Sabor A', 35],
      ['Sabor B', 7],
    ]);
    expect(partsText(g.flavors[0].parts)).toBe(
      '25 nas caixas de 12 · 10 avulsos',
    );
    expect(partsText(g.flavors[1].parts)).toBe('nas caixas de 12');
    expect(g.packaging.map(packagingText)).toEqual([
      { name: 'Caixa de 12', value: '3 caixas' },
      { name: 'Avulso', value: '10 un.' },
    ]);
  });

  it('separa por dia e por tamanho do doce', () => {
    const groups = productionGroups([
      line('Sabor A', 12, 12, '2030-01-03'),
      line('Sabor A', 12, 12, '2030-01-02', 15),
      line('Sabor A', 12, 12, '2030-01-02', 30),
    ]);
    expect(groups.map((g) => [g.day, g.weight_grams])).toEqual([
      ['2030-01-02', 30],
      ['2030-01-02', 15],
      ['2030-01-03', 30],
    ]);
  });

  it('mostra a variante só quando o produto tem mais de uma', () => {
    const one = { ...line('Sabor A', 12), label: 'Única' };
    const [a, b] = [
      { ...line('Sabor B', 2), label: 'X' },
      { ...line('Sabor B', 2, 2), label: 'Y' },
    ];
    const flavors = productionGroups([one, a, b])[0].flavors;
    expect(flavors.find((f) => f.name === 'Sabor A')?.showLabel).toBe(false);
    expect(flavors.filter((f) => f.showLabel).map((f) => f.label)).toEqual([
      'X',
      'Y',
    ]);
  });

  it('uma caixa no singular', () => {
    expect(packagingText({ units_per_box: 25, boxes: 1 }).value).toBe(
      '1 caixa',
    );
  });
});
