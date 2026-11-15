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
  // A conexão pode cair no meio do envio. Com a mesma Idempotency-Key, tocar
  // de novo não duplica: o servidor devolve o que já tinha gravado. Sem chave,
  // não prometemos isso.
  const lost = () =>
    new ApiError(
      0,
      method === 'GET'
        ? 'A conexão caiu. Confira a internet e tente de novo.'
        : key
          ? 'A conexão caiu antes da resposta. Confira a internet e toque de novo — o app não duplica o registro.'
          : 'A conexão caiu antes da resposta. Confira na lista se foi salvo antes de tentar de novo.',
    );
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
  } catch {
    throw lost();
  }
  let result: { error?: string };
  try {
    result = (await response.json()) as { error?: string };
  } catch {
    if (response.ok) throw lost();
    result = {};
  }
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

export function nextWeeklyTime(weekday: number, time: string) {
  const clock = Date.now(),
    date = new Date(
      new Date(clock - 10800000).toISOString().slice(0, 10) + 'T12:00:00Z',
    );
  date.setUTCDate(
    date.getUTCDate() + ((weekday - (date.getUTCDay() || 7) + 7) % 7),
  );
  let due = date.toISOString().slice(0, 10) + 'T' + time;
  if (Date.parse(due + ':00-03:00') < clock) {
    date.setUTCDate(date.getUTCDate() + 7);
    due = date.toISOString().slice(0, 10) + 'T' + time;
  }
  return due;
}

export const civilDate = (value: string) =>
  value.split('-').reverse().join('/');
