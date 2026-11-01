import { expect, it } from 'vitest';
import { sortFlavors } from './flavorOrder';
it('prioriza cliente, vendas gerais e preferência manual sem alfabeto', () => {
  const products = [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    rank = { a: { customer: 0, total: 10 }, b: { customer: 1, total: 1 } };
  expect(
    sortFlavors(products, rank, [], ['c', 'b', 'a']).map((p) => p.id),
  ).toEqual(['b', 'a', 'c']);
  expect(sortFlavors(products, {}, ['b', 'c', 'a']).map((p) => p.id)).toEqual([
    'b',
    'c',
    'a',
  ]);
  expect(
    sortFlavors(products, {}, [], ['c', 'a', 'b']).map((p) => p.id),
  ).toEqual(['c', 'a', 'b']);
  expect(products[0].id).toBe('a');
});
