import { expect, it } from 'vitest';
import { recipeBatchQuantity, recipeIngredientCost } from './recipe-quantity';

it('preserva o total do lote e escala milésimos por doce com o rendimento', () => {
  expect(recipeBatchQuantity(375, 'batch', 16)).toBe(375);
  expect(recipeBatchQuantity(375, 'unit', 16)).toBe(6000);
  expect(recipeBatchQuantity(375, 'unit', 20)).toBe(7500);
  expect(recipeIngredientCost(6000, 50000, 1400)).toBe(168n);
  expect(recipeIngredientCost(1, 50000, 1400)).toBe(1n);
  expect(recipeIngredientCost(6000, 50000, 0)).toBe(0n);
});

it('recusa quantidade de lote fora do limite ou rendimento inválido', () => {
  expect(() => recipeBatchQuantity(0, 'unit', 16)).toThrow();
  expect(() => recipeBatchQuantity(1000, 'unit', 1.5)).toThrow();
  expect(() => recipeBatchQuantity(1000000000000, 'unit', 2)).toThrow();
});
