import { expect, it } from 'vitest';
import { orderMode } from './order-mode';
it('preserva a escolha completa e migra auto/ausente para simples em qualquer perfil', () => {
  expect(orderMode('full')).toBe('full');
  for (const value of ['simple', 'auto', '', null, undefined, 'outro'])
    expect(orderMode(value)).toBe('simple');
});
