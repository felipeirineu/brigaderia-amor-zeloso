import { fortalezaDay, shiftDay } from './workday';
export const backupPeriods = {
  weekly: 'Toda semana',
  fortnightly: 'A cada 15 dias',
  monthly: 'Todo mês',
  off: 'Não lembrar',
} as const;
export type BackupPeriod = keyof typeof backupPeriods;
export interface BackupReminder {
  id: string;
  period: BackupPeriod;
  weekday: number;
  time: string;
  last_backup_at: string | null;
  snoozed_until: string | null;
  created_at: string;
  alert_key: string;
  version: number;
}
export interface BackupReminderView {
  ready: boolean;
  settings?: BackupReminder;
}
const weekdayOf = (day: string) =>
  new Date(day + 'T12:00:00Z').getUTCDay() || 7;
function addMonth(day: string) {
  const d = new Date(day + 'T12:00:00Z'),
    n = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const end = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();
  d.setUTCDate(Math.min(n, end));
  return d.toISOString().slice(0, 10);
}
/** Janelas por dia civil local: um backup às10h não pula a próxima segunda às9h. */
export function backupDueAt(s: BackupReminder): string | null {
  if (s.period === 'off') return null;
  let day: string;
  if (s.last_backup_at) {
    const lastDay = fortalezaDay(new Date(s.last_backup_at));
    day =
      s.period === 'monthly'
        ? addMonth(lastDay)
        : shiftDay(lastDay, s.period === 'weekly' ? 7 : 15);
    day = shiftDay(day, (s.weekday - weekdayOf(day) + 7) % 7);
  } else {
    // Primeira janela da semana da configuração; sem backup anterior pode já estar vencida.
    const created = fortalezaDay(new Date(s.created_at));
    day = shiftDay(created, s.weekday - weekdayOf(created));
  }
  const scheduled = new Date(day + 'T' + s.time + ':00-03:00').toISOString();
  return s.snoozed_until && s.snoozed_until > scheduled
    ? s.snoozed_until
    : scheduled;
}
export function backupIsDue(s: BackupReminder, now = new Date()) {
  const due = backupDueAt(s);
  return !!due && due <= now.toISOString();
}
export function backupLastLabel(
  s: Pick<BackupReminder, 'last_backup_at'>,
  now = new Date(),
) {
  if (!s.last_backup_at) return 'Nenhum backup feito ainda';
  const day = fortalezaDay(new Date(s.last_backup_at));
  const elapsed = Math.max(
    0,
    Math.round(
      (Date.parse(fortalezaDay(now) + 'T12:00Z') -
        Date.parse(day + 'T12:00Z')) /
        86400000,
    ),
  );
  return `Último backup: ${day.slice(8, 10)}/${day.slice(5, 7)} (há ${elapsed} ${elapsed === 1 ? 'dia' : 'dias'})`;
}
export function backupNextLabel(s: BackupReminder) {
  const due = backupDueAt(s);
  if (!due) return 'Lembrete desligado.';
  const day = fortalezaDay(new Date(due));
  return `Próximo lembrete: ${day.slice(8, 10)}/${day.slice(5, 7)}.`;
}
