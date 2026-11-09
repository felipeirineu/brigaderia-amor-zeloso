import { HttpError, type Env } from './security';
export function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
export function unbase64url(value: string) {
  return Uint8Array.from(
    atob(value.replaceAll('-', '+').replaceAll('_', '/')),
    (c) => c.charCodeAt(0),
  );
}
export function pushConfigured(env: Env) {
  try {
    return (
      !!env.VAPID_SUBJECT &&
      /^(mailto:|https:\/\/)/.test(env.VAPID_SUBJECT) &&
      unbase64url(env.VAPID_PUBLIC_KEY ?? '').length === 65 &&
      unbase64url(env.VAPID_PRIVATE_KEY ?? '').length === 32
    );
  } catch {
    return false;
  }
}
export async function pushSchema(db: D1Database) {
  const row = await db
    .prepare(
      "SELECT COUNT(*) n FROM sqlite_schema WHERE type='table' AND name IN('reminder_alerts','reminder_recipients','push_subscriptions','push_jobs','push_requests')",
    )
    .first<{ n: number }>();
  return row?.n === 5;
}
/** Evita usar uma assinatura maliciosa para consultar rede interna ou redirecionar. */
export function pushEndpoint(value: string) {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new HttpError(400, 'Serviço de aviso inválido.');
  }
  const host = u.hostname;
  const allowed =
    host === 'fcm.googleapis.com' ||
    host === 'web.push.apple.com' ||
    host.endsWith('.push.apple.com') ||
    host === 'updates.push.services.mozilla.com' ||
    host.endsWith('.push.services.mozilla.com') ||
    host.endsWith('.notify.windows.com');
  if (
    u.protocol !== 'https:' ||
    !allowed ||
    u.username ||
    u.password ||
    (u.port && u.port !== '443') ||
    u.hash ||
    value.length > 2048
  )
    throw new HttpError(400, 'Serviço de aviso inválido.');
  return u;
}
