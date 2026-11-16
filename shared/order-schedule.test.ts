import { expect, it } from 'vitest';
import {
  isPastToday,
  scheduleDay,
  deliveryDayLabel,
  windowStart,
} from './order-schedule';
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

it('horário já passou usa Fortaleza, somente hoje e minutos completos', () => {
  const now = new Date('2026-11-16T15:00:59Z'); // 12:00 em Fortaleza
  expect(isPastToday('2026-11-16T11:59', now)).toBe(true);
  expect(isPastToday('2026-11-16T12:00', now)).toBe(false);
  expect(isPastToday('2026-11-16T12:01', now)).toBe(false);
  expect(isPastToday('2026-11-15T11:59', now)).toBe(false);
  expect(isPastToday('2026-11-17T09:00', now)).toBe(false);
});
it('horário passado respeita viradas de dia e ano locais, não o dia UTC', () => {
  const utcNextDay = new Date('2026-11-16T01:00:00Z'); // 15/11 22h
  expect(isPastToday('2026-11-15T21:59', utcNextDay)).toBe(true);
  expect(isPastToday('2026-11-16T00:00', utcNextDay)).toBe(false);
  expect(
    isPastToday('2026-11-15T23:59', new Date('2026-11-16T03:00:00Z')),
  ).toBe(false);
  expect(
    isPastToday('2026-12-31T23:58', new Date('2027-01-01T02:59:00Z')),
  ).toBe(true);
  expect(
    isPastToday('2027-01-01T00:00', new Date('2027-01-01T03:00:00Z')),
  ).toBe(false);
});
it('horários inválidos não viram aviso de passado', () => {
  const now = new Date('2026-11-16T15:00:00Z');
  for (const due of [
    '',
    '2026-02-30T09:00',
    '2026-11-16T24:00',
    '2026-11-16T09:99',
    '2026-11-16T9:00',
    '2026-11-16T09:00Z',
  ])
    expect(isPastToday(due, now)).toBe(false);
  expect(isPastToday('2026-11-16T09:00', new Date('invalid'))).toBe(false);
});
