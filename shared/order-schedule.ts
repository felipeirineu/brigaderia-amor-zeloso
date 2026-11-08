/** Datas civis sem depender do fuso do navegador. */
export function scheduleDay(value: string | null) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < '1900-01-01' ||
    value > '2199-12-31'
  )
    return null;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : null;
}
export function deliveryDayLabel(day: string) {
  if (!scheduleDay(day)) return '';
  const label = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Fortaleza',
  })
    .format(new Date(day + 'T12:00:00Z'))
    .replace('.', '');
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
}
export function windowStart(value: string) {
  const time = '(?:[01]\\d|2[0-3]):[0-5]\\d';
  const match = value
    .trim()
    .match(new RegExp(`^(${time})(?:\\s*[-–]\\s*${time})?$`));
  return match?.[1] ?? '';
}
