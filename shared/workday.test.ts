import { describe, it, expect } from 'vitest';
import {
  greeting,
  shiftDay,
  shiftMonth,
  fortalezaDay,
  dayChip,
} from './workday';
describe('Fortaleza sem depender do fuso do aparelho', () => {
  for (const [utc, label] of [
    ['07:59', 'Boa noite'],
    ['08:00', 'Bom dia'],
    ['14:59', 'Bom dia'],
    ['15:00', 'Boa tarde'],
    ['20:59', 'Boa tarde'],
    ['21:00', 'Boa noite'],
  ])
    it(utc, () =>
      expect(greeting(new Date(`2026-11-02T${utc}:00Z`))).toBe(label),
    );
  it('virada de dia, mês e ano', () => {
    expect(fortalezaDay(new Date('2026-11-02T02:59Z'))).toBe('2026-11-01');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftDay('2028-02-28', 1)).toBe('2028-02-29');
    expect(dayChip('2026-11-03', '2026-11-02')).toBe('Amanhã');
  });
});

import { relativeDateTime } from './workday';
it('lembrete relativo segue Fortaleza nas viradas do dia', () => {
  expect(relativeDateTime('2026-11-03T02:16:00Z', '2026-11-02')).toBe(
    'Hoje · 23:16',
  );
  expect(relativeDateTime('2026-11-03T13:00:00Z', '2026-11-02')).toBe(
    'Amanhã · 10:00',
  );
  expect(relativeDateTime('2026-11-05T13:00:00Z', '2026-11-02')).toBe(
    'Qui, 05/11 · 10:00',
  );
});
