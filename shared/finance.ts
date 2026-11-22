import {
  deliveryCycleDefault,
  deliveryCycleMax,
  deliveryCycleMin,
} from './delivery-cycle';
export type Terms = {
  mode: 'unset' | 'advance' | 'delivery' | 'next_delivery' | 'credit';
  cycle: 'weekly' | 'monthly' | 'fixed_days' | 'fourteen_days' | 'deliveries';
  fixed_days: number[];
  base_date: string;
  week_end: number;
  due_days: number | null;
  every_deliveries?: number;
  due_day_of_month?: number | null;
};
export const paymentModeLabels: Record<Terms['mode'], string> = {
  unset: 'A definir',
  advance: 'Adiantado',
  delivery: 'Na entrega',
  next_delivery: 'Na próxima entrega',
  credit: 'A prazo',
};
export const dueDayLabel = (day: number) =>
  day === 31 ? 'último dia do mês' : `dia ${day} do mês`;
export function deliveryCycleSize(terms: Terms) {
  const n = terms.every_deliveries;
  return terms.mode === 'credit' &&
    terms.cycle === 'deliveries' &&
    n != null &&
    Number.isInteger(n) &&
    n >= deliveryCycleMin &&
    n <= deliveryCycleMax
    ? n
    : null;
}
export function setTermsCycle(terms: Terms, cycle: Terms['cycle']): Terms {
  if (cycle === 'deliveries')
    return {
      ...terms,
      cycle,
      every_deliveries: deliveryCycleSize(terms) ?? deliveryCycleDefault,
      due_days: null,
      due_day_of_month: undefined,
    };
  return {
    ...terms,
    cycle,
    every_deliveries: undefined,
    due_days: terms.due_day_of_month != null ? null : (terms.due_days ?? 0),
  };
}
export function termsModeLabel(terms: Terms) {
  const count = deliveryCycleSize(terms);
  return count
    ? `A prazo · a cada ${count} entregas`
    : paymentModeLabels[terms.mode];
}
export const emptyTerms = (): Terms => ({
  mode: 'unset',
  cycle: 'fixed_days',
  fixed_days: [15, 31],
  base_date: '',
  week_end: 7,
  due_days: null,
});
export interface B2BProfile {
  default_kit_id?: string | null;
  establishment: string;
  responsible: string;
  address: string;
  neighborhood: string;
  reference: string;
  delivery_days: number[];
  delivery_window: string;
  courier: 'unassigned' | 'owner' | 'partner' | 'courier';
  courier_name: string;
  courier_fee_cents: number;
  terms: Terms;
}
export const emptyProfile = (): B2BProfile => ({
  default_kit_id: null,
  establishment: '',
  responsible: '',
  address: '',
  neighborhood: '',
  reference: '',
  delivery_days: [],
  delivery_window: '',
  courier: 'unassigned',
  courier_name: '',
  courier_fee_cents: 0,
  terms: emptyTerms(),
});
export const paymentMethods = {
  pix: 'Pix',
  cash: 'Dinheiro',
  debit: 'Cartão de débito',
  credit: 'Cartão de crédito',
  transfer: 'Transferência',
  other: 'Outro',
} as const;
const shift = (date: string, n: number) =>
  new Date(Date.parse(date + 'T12:00:00Z') + n * 86400000)
    .toISOString()
    .slice(0, 10);
const monthEnd = (date: string) =>
  new Date(
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0),
  ).getUTCDate();
export function fixedDueDate(after: string, day: number) {
  if (!Number.isInteger(day) || day < 1 || day > 31)
    throw new Error('Dia de vencimento inválido.');
  let month = after.slice(0, 8) + '01';
  for (;;) {
    const last = monthEnd(month);
    // Como a fatura do cartão: dia que não existe no mês vira o último dia
    // (dia 30 em fevereiro vence em 28/29, não em março).
    const date = Math.min(day, last);
    const candidate = month.slice(0, 8) + String(date).padStart(2, '0');
    if (candidate > after) return candidate;
    month = shift(month, last);
  }
}
export function termsDueDate(
  day: string,
  terms: Terms,
  {
    closing,
    nextDelivery,
    deliveryCycle,
  }: {
    closing?: string | null;
    nextDelivery?: string | null;
    deliveryCycle?: string | null;
  } = {},
) {
  if (terms.mode === 'unset') return null;
  if (terms.mode === 'next_delivery') return nextDelivery ?? null;
  if (terms.mode === 'credit' && terms.cycle === 'deliveries')
    return deliveryCycle ?? null;
  if (terms.mode === 'credit')
    return closing || closingPeriod(day, terms).due_on;
  return day;
}
/** Datas civis do negócio, intervalos inclusivos, independentes do fuso do navegador. */
export function closingPeriod(day: string, t: Terms) {
  if (t.cycle === 'deliveries')
    throw new Error('Fechamento por entregas não usa período fixo.');
  let start: string, end: string;
  if (t.cycle === 'fourteen_days') {
    if (!t.base_date) throw new Error('Informe a data-base.');
    const offset =
      Math.floor(
        (Date.parse(day + 'T12:00:00Z') -
          Date.parse(t.base_date + 'T12:00:00Z')) /
          86400000 /
          14,
      ) * 14;
    start = shift(t.base_date, offset);
    end = shift(start, 13);
  } else if (t.cycle === 'weekly') {
    const weekday = new Date(day + 'T12:00:00Z').getUTCDay() || 7;
    end = shift(day, (t.week_end - weekday + 7) % 7);
    start = shift(end, -6);
  } else if (t.cycle === 'monthly') {
    start = day.slice(0, 8) + '01';
    end = day.slice(0, 8) + String(monthEnd(day));
  } else {
    const last = monthEnd(day),
      d = Number(day.slice(8));
    const ends = [
      ...new Set([...t.fixed_days.map((x) => Math.min(x, last)), last]),
    ].sort((a, b) => a - b);
    const e = ends.find((x) => x >= d)!;
    const prev = ends.filter((x) => x < d).at(-1) || 0;
    start = day.slice(0, 8) + String(prev + 1).padStart(2, '0');
    end = day.slice(0, 8) + String(e).padStart(2, '0');
  }
  return {
    start,
    end,
    due_on:
      t.due_day_of_month != null
        ? fixedDueDate(end, t.due_day_of_month)
        : t.due_days === null
          ? null
          : shift(end, t.due_days),
  };
}
export const addCivilDays = shift;
