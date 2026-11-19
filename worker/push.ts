import { z } from 'zod';
import { HttpError, hash, json, type Actor, type Env } from './security';
import { p1Mutation } from './p1-common';
import {
  pushConfigured,
  pushSchema,
  pushEndpoint,
  unbase64url,
} from './push-config';
import { processPushJobs } from './push-delivery';
const subscriptionSchema = z
  .object({
    endpoint: z.string().max(2048),
    expirationTime: z.number().finite().nullable().optional(),
    keys: z
      .object({
        p256dh: z
          .string()
          .regex(/^[\w-]+$/)
          .max(90),
        auth: z
          .string()
          .regex(/^[\w-]+$/)
          .max(30),
      })
      .strict(),
  })
  .strict();
export async function push(req: Request, env: Env, a: Actor) {
  const db = env.DB!,
    org = a.organization_id,
    parts = new URL(req.url).pathname.split('/'),
    resource = parts[4],
    id = parts[5],
    action = parts[6];
  if (env.APP_ENVIRONMENT === 'teste') {
    if (req.method === 'GET' && !resource)
      return json({
        environment: 'teste',
        ready: false,
        configured: false,
        public_key: null,
        user_id: a.user_id,
        subscriptions: [],
        staff: [],
      });
    throw new HttpError(503, 'Avisos desativados no ambiente de teste');
  }
  const ready = await pushSchema(db);
  if (req.method === 'GET' && !resource) {
    const subscriptions = ready
      ? (
          await db
            .prepare(
              'SELECT p.id,p.endpoint_hash,p.version,p.created_at,p.session_hash=? AS current,s.expires_at AS valid_until FROM push_subscriptions p JOIN sessions s ON s.organization_id=p.organization_id AND s.token_hash=p.session_hash AND s.user_id=p.user_id WHERE p.organization_id=? AND p.user_id=? AND p.active=1 AND s.expires_at>unixepoch() ORDER BY p.created_at',
            )
            .bind(a.token_hash, org, a.user_id)
            .all()
        ).results
      : [];
    const staff = ready
      ? (
          await db
            .prepare(
              "SELECT m.user_id id,m.role,COALESCE(p.display_name,CASE WHEN m.role='owner' THEN 'Administrador' ELSE 'Operador' END) display_name FROM memberships m LEFT JOIN display_profiles p ON p.organization_id=m.organization_id AND p.id=m.user_id WHERE m.organization_id=? ORDER BY m.role,m.user_id",
            )
            .bind(org)
            .all()
        ).results
      : [];
    return json({
      ready,
      configured: ready && pushConfigured(env),
      public_key: ready && pushConfigured(env) ? env.VAPID_PUBLIC_KEY : null,
      user_id: a.user_id,
      subscriptions,
      staff,
    });
  }
  if (!ready)
    throw new HttpError(
      503,
      'Avisos no celular ainda indisponíveis. Use o calendário.',
    );
  if (resource !== 'subscriptions') throw new HttpError(404, 'Não encontrado.');
  if (id && !z.uuid().safeParse(id).success)
    throw new HttpError(404, 'Aparelho não encontrado.');
  const own = id
    ? await db
        .prepare(
          'SELECT id,version,session_hash,active FROM push_subscriptions WHERE organization_id=? AND id=? AND user_id=?',
        )
        .bind(org, id, a.user_id)
        .first<{
          id: string;
          version: number;
          session_hash: string;
          active: number;
        }>()
    : null;
  if (id && (!own || (!own.active && req.method !== 'DELETE')))
    throw new HttpError(404, 'Aparelho não encontrado.');
  if (req.method === 'POST' && !id) {
    if (!pushConfigured(env))
      throw new HttpError(503, 'Avisos no celular aguardam configuração.');
    return p1Mutation(
      req,
      db,
      a,
      async (raw, nonce) => {
        const d = z
            .object({ subscription: subscriptionSchema })
            .strict()
            .parse(raw),
          sub = d.subscription;
        sub.endpoint = pushEndpoint(sub.endpoint).href;
        let validKeys = false;
        try {
          if (
            unbase64url(sub.keys.p256dh).length === 65 &&
            unbase64url(sub.keys.auth).length === 16
          ) {
            await crypto.subtle.importKey(
              'raw',
              unbase64url(sub.keys.p256dh),
              { name: 'ECDH', namedCurve: 'P-256' },
              false,
              [],
            );
            validKeys = true;
          }
        } catch {
          /* Não expor material criptográfico no erro. */
        }
        if (!validKeys)
          throw new HttpError(400, 'Assinatura de aparelho inválida.');
        const endpointHash = await hash(sub.endpoint),
          existing = await db
            .prepare(
              'SELECT id,organization_id,user_id,version FROM push_subscriptions WHERE endpoint_hash=?',
            )
            .bind(endpointHash)
            .first<{
              id: string;
              organization_id: string;
              user_id: string;
              version: number;
            }>();
        if (
          existing &&
          (existing.organization_id !== org || existing.user_id !== a.user_id)
        )
          throw new HttpError(
            409,
            'Este aparelho precisa desativar a assinatura anterior antes de ativar os avisos.',
          );
        const entity = existing?.id ?? crypto.randomUUID(),
          now = new Date().toISOString();
        return {
          id: entity,
          table: 'push_subscriptions',
          action: 'push.subscribed',
          response: { id: entity },
          first: db
            .prepare(
              `INSERT INTO push_subscriptions(organization_id,id,user_id,session_hash,endpoint_hash,subscription,created_at,mutation_id)
    SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM push_subscriptions WHERE organization_id=? AND id=? AND active=1) OR (SELECT COUNT(*) FROM push_subscriptions WHERE organization_id=? AND user_id=? AND active=1)<5
    ON CONFLICT(organization_id,id) DO UPDATE SET session_hash=excluded.session_hash,subscription=excluded.subscription,active=1,created_at=excluded.created_at,version=push_subscriptions.version+1,mutation_id=excluded.mutation_id`,
            )
            .bind(
              org,
              entity,
              a.user_id,
              a.token_hash,
              endpointHash,
              JSON.stringify({
                ...sub,
                expirationTime: sub.expirationTime ?? null,
              }),
              now,
              nonce,
              org,
              entity,
              org,
              a.user_id,
            ),
          rest: () => [],
        };
      },
      32768,
      'push_requests',
    );
  }
  if (id && req.method === 'DELETE' && !action)
    return p1Mutation(
      req,
      db,
      a,
      async (raw, nonce) => {
        const d = z
          .object({ version: z.number().int().positive() })
          .strict()
          .parse(raw);
        return {
          id,
          table: 'push_subscriptions',
          action: 'push.unsubscribed',
          response: { ok: true },
          first: db
            .prepare(
              "UPDATE push_subscriptions SET active=0,subscription='{}',version=version+1,mutation_id=? WHERE organization_id=? AND id=? AND user_id=? AND version=? AND active=1",
            )
            .bind(nonce, org, id, a.user_id, d.version),
          rest: (guard, args) => [
            db
              .prepare(
                `UPDATE push_jobs SET state='cancelled' WHERE organization_id=? AND subscription_id=? AND state='pending' AND ${guard}`,
              )
              .bind(org, id, ...args),
          ],
        };
      },
      32768,
      'push_requests',
    );
  if (id && action === 'test' && req.method === 'POST') {
    if (own!.session_hash !== a.token_hash)
      throw new HttpError(404, 'Ative os avisos nesta sessão antes de testar.');
    if (!pushConfigured(env))
      throw new HttpError(503, 'Avisos no celular aguardam configuração.');
    const response = await p1Mutation(
      req,
      db,
      a,
      async (raw, nonce) => {
        z.object({}).strict().parse(raw);
        const entity = crypto.randomUUID();
        return {
          id: entity,
          table: 'push_jobs',
          action: 'push.test_requested',
          response: { id: entity },
          first: db
            .prepare(
              'INSERT INTO push_jobs(organization_id,id,subscription_id,schedule_key,created_at,mutation_id) VALUES(?,?,?,?,?,?)',
            )
            .bind(org, entity, id, entity, new Date().toISOString(), nonce),
          rest: () => [],
        };
      },
      32768,
      'push_requests',
    );
    const result = (await response.clone().json()) as { id: string };
    await processPushJobs(env, { org, id: result.id });
    const job = await db
      .prepare('SELECT state FROM push_jobs WHERE organization_id=? AND id=?')
      .bind(org, result.id)
      .first<{ state: string }>();
    return json({ state: job?.state ?? 'unknown' });
  }
  throw new HttpError(405, 'Método não permitido.');
}
