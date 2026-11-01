export const MAX_MONEY = 999999999;
export function centsFromDigits(raw: string, max = MAX_MONEY) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  const value = Number(digits);
  if (!Number.isSafeInteger(value) || value > max)
    throw Error('Valor excede o limite.');
  return value;
}
export function displayCents(value: number) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw Error('Centavos inválidos.');
  return (value / 100).toFixed(2).replace('.', ',');
}
export function readCents(value: string | number | null) {
  if (typeof value === 'number')
    return Number.isSafeInteger(value) ? value : null;
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
