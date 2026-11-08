import { describe, expect, it } from 'vitest';
import { containsAlcohol } from './alcohol';
describe('containsAlcohol', () => {
  it('marca a Caipirinha pela foto ou pelo nome', () => {
    expect(containsAlcohol('caipirinha')).toBe(true);
    expect(containsAlcohol(null, 'Caipirinha')).toBe(true);
    expect(containsAlcohol(null, 'Sabor X', 'Leva cachaça')).toBe(true);
    expect(containsAlcohol(null, 'Trufa', 'Contém álcool')).toBe(true);
  });
  it('não marca os demais sabores', () => {
    expect(containsAlcohol('limao', 'Limão', '')).toBe(false);
    expect(containsAlcohol('tradicional', 'Brigadeiro')).toBe(false);
  });
});
