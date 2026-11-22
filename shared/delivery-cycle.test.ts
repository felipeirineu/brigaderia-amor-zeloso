import { expect, test } from 'vitest';
import { deliveryCycles, type CycleEntry } from './delivery-cycle';
import { emptyTerms, setTermsCycle, termsDueDate } from './finance';

function entry(
  number: number,
  count: number | null = 2,
  overrides: Partial<CycleEntry> = {},
): CycleEntry {
  return {
    id: String(number),
    customer: 'DEMONSTRAÇÃO',
    day: '2030-01-' + String(number).padStart(2, '0'),
    time: number,
    sequence: number,
    count,
    ...overrides,
  };
}

test('o ciclo vence na última entrega e recomeça sem depender de pagamento', () => {
  const { positions, current } = deliveryCycles([entry(3), entry(1), entry(2)]);
  expect(positions.get('1')?.cycle.due_on).toBe('2030-01-02');
  expect(positions.get('2')).toMatchObject({ position: 2 });
  expect(current.get('DEMONSTRAÇÃO')).toMatchObject({
    orders: ['3'],
    due_on: null,
  });
});

test('uma entrega desfeita sai da sequência e a próxima recompõe o grupo', () => {
  const entries = [entry(1), entry(2), entry(3)];
  expect(deliveryCycles(entries).positions.get('1')?.cycle.orders).toEqual([
    '1',
    '2',
  ]);
  expect(
    deliveryCycles(entries.filter((o) => o.id !== '2')).positions.get('1')
      ?.cycle.orders,
  ).toEqual(['1', '3']);
});

test('troca de condição reinicia e não mistura contas, mantendo o saldo antigo sem vencimento', () => {
  const { positions } = deliveryCycles([
    entry(1),
    entry(2, 3, { customer: 'Outro DEMONSTRAÇÃO' }),
    entry(3, null),
    entry(4, 3),
    entry(5, 2),
    entry(6, 2),
  ]);
  expect(positions.get('1')?.cycle.due_on).toBeNull();
  expect(positions.get('4')?.cycle.orders).toEqual(['4']);
  expect(positions.get('5')?.cycle.orders).toEqual(['5', '6']);
  expect(positions.get('2')?.cycle.orders).toEqual(['2']);
});

test('projeção mostra posição sem criar vencimento', () => {
  const { positions } = deliveryCycles([
    entry(1),
    entry(2, 2, { projected: true }),
  ]);
  expect(positions.get('2')).toMatchObject({
    position: 2,
    cycle: { projected: true, due_on: null },
  });
  const terms = setTermsCycle(
    { ...emptyTerms(), mode: 'credit' },
    'deliveries',
  );
  expect(termsDueDate(entry(1).day, terms)).toBeNull();
  expect(
    termsDueDate(entry(1).day, terms, { deliveryCycle: entry(2).day }),
  ).toBe(entry(2).day);
});
