import { expect, it } from 'vitest';
import { allocateFlavorRevenue } from './flavor-lines';
it('rateia centavos por unidades com maior resto e desempate estável', () => {
  expect(
    Object.fromEntries(
      allocateFlavorRevenue(1001, [
        { id: 'a', units: 8 },
        { id: 'b', units: 3 },
        { id: 'c', units: 1 },
      ]),
    ),
  ).toEqual({ a: 667, b: 250, c: 84 });
  expect(
    Object.fromEntries(
      allocateFlavorRevenue(1, [
        { id: 'b', units: 1 },
        { id: 'a', units: 1 },
        { id: 'c', units: 1 },
      ]),
    ),
  ).toEqual({ b: 0, a: 1, c: 0 });
  expect(
    [
      ...allocateFlavorRevenue(2002, [
        { id: 'a', units: 8 },
        { id: 'b', units: 3 },
        { id: 'c', units: 1 },
      ]).values(),
    ].reduce((a, b) => a + b, 0),
  ).toBe(2002);
  expect([
    ...allocateFlavorRevenue(0, [{ id: 'a', units: 12 }]).values(),
  ]).toEqual([0]);
});
it('usa inteiros exatos para valores grandes e rejeita proporções inválidas', () => {
  const amount = 1000000000000;
  expect(
    [
      ...allocateFlavorRevenue(amount, [
        { id: 'a', units: 9999 },
        { id: 'b', units: 1 },
      ]).values(),
    ].reduce((a, b) => a + b, 0),
  ).toBe(amount);
  expect(() => allocateFlavorRevenue(10, [{ id: 'a', units: 0 }])).toThrow();
});
