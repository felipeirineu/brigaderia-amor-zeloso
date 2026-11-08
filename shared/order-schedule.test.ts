import { expect, it } from 'vitest';
import { scheduleDay, deliveryDayLabel, windowStart } from './order-schedule';
it('data de agenda rejeita dias inexistentes e mantém data civil de Fortaleza', () => {
  expect(scheduleDay('2026-02-31')).toBeNull();
  expect(scheduleDay('2026-02-29')).toBeNull();
  expect(scheduleDay('2028-02-29')).toBe('2028-02-29');
  expect(scheduleDay('2026-11-08T00:00Z')).toBeNull();
  expect(scheduleDay('2200-01-01')).toBeNull();
  expect(deliveryDayLabel('2026-11-12')).toBe('Qui, 12/11');
});
it('janela explícita fornece horário sem adivinhar texto livre', () => {
  expect(windowStart('09:00')).toBe('09:00');
  expect(windowStart(' 14:30 – 17:00 ')).toBe('14:30');
  for (const value of [
    'pela manhã',
    'amanhã às 9',
    '24:00',
    '9h',
    '09:72',
    '14:00 e 17:00',
  ])
    expect(windowStart(value)).toBe('');
});
