export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = 'GET',
  data?: unknown,
  key?: string,
): Promise<T> {
  if (method !== 'GET' && !navigator.onLine)
    throw new ApiError(
      0,
      'Sem conexão. Alterações não foram enviadas nem guardadas offline.',
    );
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(
      response.status,
      result.error || 'Não foi possível concluir.',
    );
  }
  return result as T;
}
export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100,
  );
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date(value));
export function parsePrice(value: string): number {
  if (!/^\d{1,7}(,\d{1,2})?$/.test(value))
    throw new Error('Informe preço com vírgula, como 42,00.');
  const [whole, fraction = ''] = value.split(',');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
