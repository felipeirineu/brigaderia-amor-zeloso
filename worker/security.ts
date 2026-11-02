import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';

export interface Env {
  DB?: D1Database;
  OPERATIONS_ENABLED?: string;
  FINANCE_ENABLED?: string;
  P1_ENABLED?: string;
  P1_TOOLS_ENABLED?: string;
  MOBILE_ENABLED?: string;
  FIELD_ENABLED?: string;
  PLACES_USER_AGENT?: string;
  ROUTING_PROVIDER?: string;
  ORS_API_KEY?: string;
  ASSETS?: { fetch: (r: Request) => Promise<Response> };
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  PUBLIC_CATALOG_ENABLED?: string;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      ...headers,
    },
  });
}
export function configured(env: Env): boolean {
  return !!(
    env.DB &&
    env.ACCESS_AUD &&
    env.ACCESS_TEAM_DOMAIN &&
    /^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN)
  );
}
export const hash = async (value: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
export function writeGuard(req: Request) {
  if (req.headers.get('Origin') !== new URL(req.url).origin)
    throw new HttpError(403, 'Origem não permitida.');
  if (
    !req.headers
      .get('Content-Type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    throw new HttpError(415, 'Use JSON.');
}
export async function body<T>(
  req: Pick<Request, 'body'>,
  schema: z.ZodType<T>,
  limit = 32768,
): Promise<T> {
  const reader = req.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, 'Requisição muito grande.');
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'JSON inválido.');
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new HttpError(
      400,
      parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    );
  return parsed.data;
}
const keys = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function accessIdentity(req: Request, env: Env) {
  if (!configured(env))
    throw new HttpError(503, 'Acesso seguro ainda não configurado.');
  const token = req.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new HttpError(401, 'Entre pelo acesso seguro da empresa.');
  const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
  let key = keys.get(issuer);
  if (!key) {
    key = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    keys.set(issuer, key);
  }
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'sub', 'email'],
    });
    if (typeof payload.email !== 'string' || typeof payload.sub !== 'string')
      throw new Error();
    return {
      subject: `${issuer}|${payload.sub}`,
      email: payload.email.toLowerCase(),
    };
  } catch {
    throw new HttpError(401, 'Identidade inválida ou expirada.');
  }
}
export interface Actor {
  user_id: string;
  organization_id: string;
  role: 'owner' | 'operator';
  token_hash: string;
}
export async function actor(req: Request, env: Env): Promise<Actor> {
  const token = req.headers
    .get('Cookie')
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('__Host-session='))
    ?.slice(15);
  if (!token || !env.DB) throw new HttpError(401, 'AUTHENTICATION_REQUIRED');
  const tokenHash = await hash(token);
  const result = await env.DB.prepare(
    `SELECT s.user_id,s.organization_id,a.role,s.token_hash FROM sessions s JOIN memberships m ON m.user_id=s.user_id AND m.organization_id=s.organization_id JOIN users u ON u.id=s.user_id JOIN authorized_emails a ON a.email=u.email AND a.organization_id=s.organization_id WHERE token_hash=? AND expires_at>?`,
  )
    .bind(tokenHash, Math.floor(Date.now() / 1000))
    .first<Actor>();
  if (!result) throw new HttpError(401, 'AUTHENTICATION_REQUIRED');
  return result;
}
export const sessionCookie = (token: string, maxAge: number) =>
  `__Host-session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
export async function login(req: Request, env: Env) {
  if (!configured(env))
    throw new HttpError(
      503,
      'Configure o banco e o Cloudflare Access antes de entrar.',
    );
  const db = env.DB!;
  const now = Math.floor(Date.now() / 1000);
  // Limite persistente, não em memória de um isolate. IP da borda é confiável no Cloudflare.
  const key = await hash(req.headers.get('CF-Connecting-IP') || 'local');
  const attempt = await db
    .prepare(
      `INSERT INTO login_attempts(key,attempts,window_start) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END, window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END RETURNING attempts`,
    )
    .bind(key, now, now - 900, now - 900)
    .first<{ attempts: number }>();
  if (attempt && attempt.attempts > 10)
    throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos.');
  const identity = await accessIdentity(req, env);
  const invitation = await db
    .prepare('SELECT organization_id,role FROM authorized_emails WHERE email=?')
    .bind(identity.email)
    .first<{ organization_id: string; role: string }>();
  if (!invitation)
    throw new HttpError(
      403,
      'Seu acesso ainda não foi autorizado pelo administrador.',
    );
  const userId = crypto.randomUUID();
  await db
    .prepare(
      'INSERT INTO users(id,identity_subject,email) VALUES(?,?,?) ON CONFLICT(identity_subject) DO UPDATE SET email=excluded.email',
    )
    .bind(userId, identity.subject, identity.email)
    .run();
  const user = await db
    .prepare('SELECT id FROM users WHERE identity_subject=?')
    .bind(identity.subject)
    .first<{ id: string }>();
  if (!user) throw new Error();
  await db
    .prepare(
      'INSERT INTO memberships(organization_id,user_id,role) VALUES(?,?,?) ON CONFLICT(organization_id,user_id) DO UPDATE SET role=excluded.role',
    )
    .bind(invitation.organization_id, user.id, invitation.role)
    .run();
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const previous = req.headers
    .get('Cookie')
    ?.match(/(?:^|;\s*)__Host-session=([^;]+)/)?.[1];
  await db.batch([
    db
      .prepare('DELETE FROM sessions WHERE expires_at<? OR token_hash=?')
      .bind(now, await hash(previous || '')),
    db
      .prepare(
        'INSERT INTO sessions(token_hash,organization_id,user_id,expires_at) VALUES(?,?,?,?)',
      )
      .bind(
        await hash(token),
        invitation.organization_id,
        user.id,
        now + 28800,
      ),
    db
      .prepare('DELETE FROM login_attempts WHERE window_start<?')
      .bind(now - 86400),
  ]);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token, 28800) });
}
