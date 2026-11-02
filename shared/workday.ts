export function fortalezaDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Fortaleza',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  );
  return hour >= 5 && hour < 12
    ? 'Bom dia'
    : hour >= 12 && hour < 18
      ? 'Boa tarde'
      : 'Boa noite';
}
export function shiftDay(day: string, amount: number) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
export function shiftMonth(month: string, amount: number) {
  const d = new Date(month + '-01T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + amount);
  return d.toISOString().slice(0, 7);
}
export function dayChip(day: string, today = fortalezaDay()) {
  return day === today
    ? 'Hoje'
    : day === shiftDay(today, 1)
      ? 'Amanhã'
      : day === shiftDay(today, -1)
        ? 'Ontem'
        : new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Fortaleza',
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
          }).format(new Date(day + 'T12:00Z'));
}
