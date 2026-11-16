import { expect, it } from 'vitest';
import { formatPhone, noPhone, visiblePhone } from './phone';
// Telefones sintéticos DEMONSTRAÇÃO, sem cadastro real.
it('exibe celular e fixo brasileiros sem mudar o valor armazenado', () => {
  const stored = '+5511900000000';
  expect(formatPhone(stored)).toBe('(11) 90000-0000');
  expect(formatPhone('+551130000000')).toBe('(11) 3000-0000');
  expect(visiblePhone(stored)).toBe(stored);
});
it('preserva telefone internacional sem inventar máscara brasileira', () => {
  expect(formatPhone('+12025550100')).toBe('+12025550100');
});
it('oculta marcadores, vazio e valores inválidos', () => {
  for (const value of [
    noPhone('DEMONSTRACAO'),
    '',
    null,
    undefined,
    123,
    '+abc',
    '+5511',
    '11900000000',
  ])
    expect(formatPhone(value)).toBe('');
});
