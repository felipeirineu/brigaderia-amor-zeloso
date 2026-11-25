import { expect, it } from 'vitest';
import { calculateExchange } from './order-exchange';

const lines = [
  { id: 'expensive', units: 2, cents: 1800 },
  { id: 'cheap', units: 4, cents: 2000 },
];
it('desconta os doces mais baratos e aceita trocar todos', () => {
  expect(calculateExchange(lines, 2).discount).toBe(1000);
  expect(calculateExchange(lines, 5).discount).toBe(2900);
  expect(calculateExchange(lines, 6).discount).toBe(3800);
});
it('rateia preços fracionários ao centavo e mantém zero', () => {
  expect(
    calculateExchange([{ id: 'a', units: 3, cents: 100 }], 2).discount,
  ).toBe(67);
  expect(calculateExchange(lines, 0).discount).toBe(0);
  expect(() => calculateExchange(lines, 7)).toThrow();
  expect(() => calculateExchange(lines, 1.5)).toThrow();
  expect(() => calculateExchange([], 1)).toThrow();
});
