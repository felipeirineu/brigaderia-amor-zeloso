import { expect, it } from 'vitest';
import { foldICS, toICS } from './calendar';
it('ICS escapa conteúdo e impede injeção de propriedades com CRLF', () => {
  const content = toICS([
    {
      id: 'fixture-1',
      title: 'DEMONSTRAÇÃO, teste; \\ \r\nBEGIN:VEVENT',
      date: '2030-01-01',
      kind: 'reminder',
      href: '/gestao',
    },
  ]);
  expect(content.match(/\r\nBEGIN:VEVENT/g)).toHaveLength(1);
  expect(content).toContain('\\nBEGIN:VEVENT');
  expect(content).toContain('DTSTART;VALUE=DATE:20300101');
  expect(content).toContain('DTEND;VALUE=DATE:20300102');
});
it('folding limita bytes sem partir acentos UTF-8 e mantém UID estável', () => {
  const text = 'SUMMARY:' + 'Ação DEMONSTRAÇÃO '.repeat(20),
    folded = foldICS(text);
  for (const line of folded.split('\r\n'))
    expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  expect(folded.replace(/\r\n /g, '')).toBe(text);
  const e = {
    id: 'demo-id',
    title: 'DEMO',
    date: '2030-01-01',
    kind: 'delivery' as const,
    at: '2030-01-01T13:00:00Z',
    href: '',
  };
  expect(toICS([e])).toContain('UID:demo-id@amor-zeloso.local');
  expect(toICS([e])).toContain('DTSTART:20300101T130000Z');
});

it('lembrete exporta instante UTC e alarme absoluto, sem alarme quando concluído', async () => {
  const { reminderICS } = await import('./calendar');
  const reminder = {
    id: 'DEMONSTRACAO',
    title: 'Ação;\\\r\nEND:VEVENT',
    due_at: '2030-01-01T10:00:00-03:00',
    version: 3,
    done: 0,
  };
  const file = reminderICS(reminder, '2030-01-01T09:45:00-03:00');
  expect(file).toContain('DTSTART:20300101T130000Z');
  expect(file).toContain('TRIGGER;VALUE=DATE-TIME:20300101T124500Z');
  expect(file).toContain('SEQUENCE:3');
  expect(file.match(/\r\nEND:VEVENT/g)).toHaveLength(1);
  const cancelled = reminderICS(
    { ...reminder, done: 1 },
    '2030-01-01T09:45:00-03:00',
  );
  expect(cancelled).toContain('STATUS:CANCELLED');
  expect(cancelled).not.toContain('VALARM');
});
