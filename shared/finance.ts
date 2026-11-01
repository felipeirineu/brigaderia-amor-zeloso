export type Terms = {
  mode: 'unset' | 'advance' | 'delivery' | 'credit';
  cycle: 'weekly' | 'monthly' | 'fixed_days' | 'fourteen_days';
  fixed_days: number[];
  base_date: string;
  week_end: number;
  due_days: number | null;
};
export const emptyTerms = (): Terms => ({
  mode: 'unset',
  cycle: 'fixed_days',
  fixed_days: [15, 31],
  base_date: '',
  week_end: 7,
  due_days: null,
});
export interface B2BProfile {
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
/** Datas civis do negócio, intervalos inclusivos, independentes do fuso do navegador. */
export function closingPeriod(day: string, t: Terms) {
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
    due_on: t.due_days === null ? null : shift(end, t.due_days),
  };
}
export const addCivilDays = shift;
