import { describe, expect, it } from 'vitest';
import { promptError } from './prompt-value';
describe('folha de motivo e valor', () => {
  it('exige motivo não vazio e respeita o limite atual', () => {
    expect(promptError('', {})).toBeTruthy();
    expect(promptError('   ', {})).toBeTruthy();
    expect(promptError('Correção DEMONSTRAÇÃO', {})).toBe('');
    expect(promptError('x'.repeat(501), {})).toBeTruthy();
  });
  it('respeita os três caracteres mínimos do cancelamento de visita', () => {
    expect(promptError('ab', { minLength: 3 })).toBeTruthy();
    expect(promptError('abc', { minLength: 3 })).toBe('');
  });
  it.each([
    '',
    '0',
    '0,00',
    '-1,00',
    '1.50',
    '1,001',
    '1e2',
    'NaN',
    '99999999',
  ])('recusa valor inválido %s', (raw) => {
    expect(promptError(raw, { kind: 'money' })).toBeTruthy();
  });
  it('usa centavos e só permite até o saldo não alocado', () => {
    expect(promptError('0,01', { kind: 'money', maxCents: 150 })).toBe('');
    expect(promptError('1,50', { kind: 'money', maxCents: 150 })).toBe('');
    expect(promptError('1,51', { kind: 'money', maxCents: 150 })).toBeTruthy();
  });
});
