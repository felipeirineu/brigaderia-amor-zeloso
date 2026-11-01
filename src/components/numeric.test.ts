import { expect, it } from 'vitest';
import { centsFromDigits, displayCents, MAX_MONEY } from './numeric';
it('máscara direita-esquerda, colagem, vazio e limites sem ponto flutuante', () => {
  expect(centsFromDigits('4')).toBe(4);
  expect(displayCents(4)).toBe('0,04');
  expect(displayCents(centsFromDigits('42')!)).toBe('0,42');
  expect(displayCents(centsFromDigits('R$ 42,00')!)).toBe('42,00');
  expect(centsFromDigits('texto')).toBeNull();
  expect(centsFromDigits('')).toBeNull();
  expect(() => centsFromDigits(String(MAX_MONEY + 1))).toThrow();
  for (const value of [0, 1, 42, 4200, MAX_MONEY])
    expect(centsFromDigits(displayCents(value))).toBe(value);
});
