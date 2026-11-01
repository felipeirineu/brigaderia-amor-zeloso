import { expect, it } from 'vitest';
import {
  addDays,
  interpolate,
  nextStatuses,
  utcStart,
} from './operations-domain';
it('fluxo diferencia entrega e retirada e termina sem regressão arbitrária', () => {
  expect(nextStatuses('ready', 'pickup')).toContain('picked_up');
  expect(nextStatuses('ready', 'pickup')).not.toContain('out_for_delivery');
  expect(nextStatuses('delivered', 'delivery')).toEqual([]);
  expect(nextStatuses('draft', 'delivery')).not.toContain('delivered');
});
it('mensagem não deixa placeholders nem inventa campos financeiros', () => {
  expect(
    interpolate('Olá {cliente}', { cliente: 'Cliente DEMONSTRAÇÃO' }),
  ).toBe('Olá Cliente DEMONSTRAÇÃO');
  expect(() => interpolate('{saldo}', {})).toThrow();
  expect(() => interpolate('{cliente', {})).toThrow();
});
it('dia comercial é convertido em Fortaleza sem depender do fuso do dispositivo', () => {
  expect(utcStart('2030-01-07')).toBe('2030-01-07T03:00:00.000Z');
  expect(addDays('2030-01-31', 1)).toBe('2030-02-01');
});
