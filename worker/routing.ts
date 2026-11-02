import { HttpError, type Env, type Actor } from './security';
import { emptyPlace, type Place } from '../shared/field';
import { routePoints, type RouteEstimate } from '../shared/routing';
export const routingConfigured = (env: Env) =>
  env.ROUTING_PROVIDER === 'ors' && !!env.ORS_API_KEY;
export const routeSchema = async (env: Env) =>
  !!env.DB &&
  Number(
    (
      await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM sqlite_schema WHERE type='table' AND name IN('route_cache','route_jobs','route_budget')",
      ).first<{ n: number }>()
    )?.n,
  ) === 3;
const fingerprint = async (base: Place, dest: Place) => {
  const p = routePoints(base, dest);
  return p ? 'ors/driving-car/v1:' + JSON.stringify(p) : null;
};
async function places(env: Env, org: string, id: string) {
  const row = await env
    .DB!.prepare(
      'SELECT s.data AS destination,b.data AS base FROM customer_sites s JOIN customers c ON c.organization_id=s.organization_id AND c.id=s.id LEFT JOIN company_places b ON b.organization_id=s.organization_id AND b.id=s.organization_id WHERE s.organization_id=? AND s.id=? AND c.active=1',
    )
    .bind(org, id)
    .first<{ destination: string; base: string | null }>();
  return row
    ? ({
        base: row.base ? JSON.parse(row.base) : emptyPlace(),
        dest: JSON.parse(row.destination),
      } as { base: Place; dest: Place })
    : null;
}
async function enqueue(env: Env, org: string, id: string, forceKey = '') {
  const p = await places(env, org, id);
  const fp = p ? await fingerprint(p.base, p.dest) : null;
  if (!fp) return false;
  await env
    .DB!.prepare(
      "INSERT INTO route_jobs(organization_id,customer_id,fingerprint,state,force,request_key) VALUES(?,?,?,'pending',?,?) ON CONFLICT(organization_id,customer_id) DO UPDATE SET fingerprint=excluded.fingerprint,state='pending',force=excluded.force,request_key=excluded.request_key,lease_until=0,retry_at=0,nonce='' WHERE route_jobs.fingerprint<>excluded.fingerprint OR (excluded.force=1 AND route_jobs.request_key<>excluded.request_key)",
    )
    .bind(org, id, fp, forceKey ? 1 : 0, forceKey)
    .run();
  return true;
}
export async function fetchRoute(
  env: Env,
  points: number[][],
): Promise<RouteEstimate> {
  const r = await fetch(
    'https://api.openrouteservice.org/v2/directions/driving-car/json',
    {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Authorization: env.ORS_API_KEY!,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: points,
        geometry: false,
        instructions: false,
      }),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!r.ok)
    throw new HttpError(
      503,
      'Rota de carro indisponível. Use o aplicativo de mapas.',
    );
  const data = (await r.json()) as {
    routes?: { summary?: { distance?: number; duration?: number } }[];
  };
  const summary = data.routes?.[0]?.summary;
  if (
    !summary ||
    !Number.isFinite(summary.distance) ||
    !Number.isFinite(summary.duration) ||
    summary.distance! < 0 ||
    summary.duration! < 0 ||
    summary.distance! > 50000000 ||
    summary.duration! > 31536000
  )
    throw new HttpError(503, 'Estimativa de rota inválida.');
  return {
    route_provider: 'ors',
    route_km: summary.distance! / 1000,
    route_minutes: summary.duration! / 60,
    route_computed_at: new Date().toISOString(),
  };
}
export async function routeQueue(env: Env, org: string) {
  const r = await env
    .DB!.prepare(
      "SELECT COUNT(*) AS n,MIN(CASE WHEN state='working' THEN lease_until ELSE retry_at END) AS retry FROM route_jobs WHERE organization_id=? AND state<>'ready'",
    )
    .bind(org)
    .first<{ n: number; retry: number | null }>();
  const budget = await env
    .DB!.prepare("SELECT next_at FROM route_budget WHERE id='ors'")
    .first<{ next_at: number }>();
  return {
    remaining: Number(r?.n ?? 0),
    retry_at: Math.max(r?.retry ?? 0, budget?.next_at ?? 0),
  };
}
export async function processRoute(env: Env, a: Actor, id?: string) {
  const db = env.DB!,
    org = a.organization_id,
    now = Date.now();
  const job = await db
    .prepare(
      "SELECT customer_id FROM route_jobs WHERE organization_id=? AND (state IN('pending','failed') OR (state='working' AND lease_until<=?)) AND retry_at<=?" +
        (id ? ' AND customer_id=?' : '') +
        ' ORDER BY retry_at,customer_id LIMIT 1',
    )
    .bind(org, now, now, ...(id ? [id] : []))
    .first<{ customer_id: string }>();
  if (!job) return routeQueue(env, org);
  const p = await places(env, org, job.customer_id),
    fp = p ? await fingerprint(p.base, p.dest) : null;
  if (!p || !fp) {
    await db
      .prepare(
        'DELETE FROM route_jobs WHERE organization_id=? AND customer_id=?',
      )
      .bind(org, job.customer_id)
      .run();
    return routeQueue(env, org);
  }
  await enqueue(env, org, job.customer_id);
  const nonce = crypto.randomUUID();
  const claim = await db
    .prepare(
      "UPDATE route_jobs SET state='working',nonce=?,lease_until=? WHERE organization_id=? AND customer_id=? AND fingerprint=? AND retry_at<=? AND (state IN('pending','failed') OR lease_until<=?)",
    )
    .bind(nonce, now + 30000, org, job.customer_id, fp, now, now)
    .run();
  if (!claim.meta.changes) return routeQueue(env, org);
  const current = await db
    .prepare(
      'SELECT force FROM route_jobs WHERE organization_id=? AND customer_id=? AND nonce=?',
    )
    .bind(org, job.customer_id, nonce)
    .first<{ force: number }>();
  const cached = await db
    .prepare(
      'SELECT 1 FROM route_cache WHERE organization_id=? AND fingerprint=?',
    )
    .bind(org, fp)
    .first();
  if (cached && !current?.force) {
    await db
      .prepare(
        "UPDATE route_jobs SET state='ready',lease_until=0 WHERE organization_id=? AND customer_id=? AND nonce=?",
      )
      .bind(org, job.customer_id, nonce)
      .run();
    return routeQueue(env, org);
  }
  await db
    .prepare(
      "INSERT OR IGNORE INTO route_budget(id,window_start,used,next_at) VALUES('ors',0,0,0)",
    )
    .run();
  const budget = await db
    .prepare(
      "UPDATE route_budget SET window_start=CASE WHEN window_start<=? THEN ? ELSE window_start END,used=CASE WHEN window_start<=? THEN 1 ELSE used+1 END,next_at=? WHERE id='ors' AND next_at<=? AND (window_start<=? OR used<1000) AND EXISTS(SELECT 1 FROM route_jobs WHERE organization_id=? AND customer_id=? AND nonce=?)",
    )
    .bind(
      now - 86400000,
      now,
      now - 86400000,
      now + 3100,
      now,
      now - 86400000,
      org,
      job.customer_id,
      nonce,
    )
    .run();
  if (!budget.meta.changes) {
    const b = await db
      .prepare(
        "SELECT window_start,used,next_at FROM route_budget WHERE id='ors'",
      )
      .first<{ window_start: number; used: number; next_at: number }>();
    await db
      .prepare(
        "UPDATE route_jobs SET state='pending',retry_at=?,lease_until=0 WHERE organization_id=? AND customer_id=? AND nonce=?",
      )
      .bind(
        b && b.used >= 1000
          ? b.window_start + 86400000
          : (b?.next_at ?? now + 60000),
        org,
        job.customer_id,
        nonce,
      )
      .run();
    return routeQueue(env, org);
  }
  try {
    const result = await fetchRoute(env, routePoints(p.base, p.dest)!);
    const fresh = await places(env, org, job.customer_id);
    if (!fresh || (await fingerprint(fresh.base, fresh.dest)) !== fp) {
      if (!(await enqueue(env, org, job.customer_id)))
        await db
          .prepare(
            'DELETE FROM route_jobs WHERE organization_id=? AND customer_id=? AND nonce=?',
          )
          .bind(org, job.customer_id, nonce)
          .run();
      return routeQueue(env, org);
    }
    await db.batch([
      db
        .prepare(
          "INSERT INTO route_cache(organization_id,fingerprint,provider,route_km,route_minutes,route_computed_at) SELECT ?,?,'ors',?,?,? WHERE EXISTS(SELECT 1 FROM route_jobs WHERE organization_id=? AND customer_id=? AND nonce=? AND fingerprint=?) ON CONFLICT(organization_id,fingerprint) DO UPDATE SET route_km=excluded.route_km,route_minutes=excluded.route_minutes,route_computed_at=excluded.route_computed_at",
        )
        .bind(
          org,
          fp,
          result.route_km,
          result.route_minutes,
          result.route_computed_at,
          org,
          job.customer_id,
          nonce,
          fp,
        ),
      db
        .prepare(
          "UPDATE route_jobs SET state='ready',force=0,lease_until=0,retry_at=0 WHERE organization_id=? AND customer_id=? AND nonce=? AND fingerprint=?",
        )
        .bind(org, job.customer_id, nonce, fp),
      db
        .prepare(
          "INSERT INTO audit_events(id,organization_id,user_id,action,entity_id) SELECT ?,?,?,'route.estimated',? WHERE EXISTS(SELECT 1 FROM route_jobs WHERE organization_id=? AND customer_id=? AND nonce=? AND state='ready')",
        )
        .bind(
          crypto.randomUUID(),
          org,
          a.user_id,
          job.customer_id,
          org,
          job.customer_id,
          nonce,
        ),
    ]);
  } catch {
    await db
      .prepare(
        "UPDATE route_jobs SET state='failed',retry_at=?,lease_until=0 WHERE organization_id=? AND customer_id=? AND nonce=?",
      )
      .bind(now + 3600000, org, job.customer_id, nonce)
      .run();
  }
  if (
    (
      await db
        .prepare(
          'SELECT state FROM route_jobs WHERE organization_id=? AND customer_id=? AND nonce=?',
        )
        .bind(org, job.customer_id, nonce)
        .first<{ state: string }>()
    )?.state === 'failed'
  )
    return { ...(await routeQueue(env, org)), stopped: true };
  return routeQueue(env, org);
}
export async function afterPlaceWrite(
  req: Request,
  res: Response,
  env: Env,
  a: Actor,
) {
  if (
    !res.ok ||
    !['POST', 'PUT'].includes(req.method) ||
    !routingConfigured(env)
  )
    return res;
  try {
    if (!(await routeSchema(env))) return res;
    const path = new URL(req.url).pathname;
    if (path === '/api/field/company') {
      await env
        .DB!.prepare(
          "INSERT INTO route_jobs(organization_id,customer_id,fingerprint,state) SELECT s.organization_id,s.id,'pending','pending' FROM customer_sites s JOIN customers c ON c.organization_id=s.organization_id AND c.id=s.id WHERE s.organization_id=? AND c.active=1 AND json_extract(s.data,'$.latitude') IS NOT NULL AND EXISTS(SELECT 1 FROM company_places b WHERE b.organization_id=s.organization_id AND json_extract(b.data,'$.latitude') IS NOT NULL) ON CONFLICT(organization_id,customer_id) DO UPDATE SET fingerprint='pending',state='pending',retry_at=0,lease_until=0,force=0,nonce=''",
        )
        .bind(a.organization_id)
        .run();
      const data = (await res.clone().json()) as object;
      return new Response(JSON.stringify({ ...data, routes_queued: true }), {
        status: res.status,
        headers: res.headers,
      });
    }
    const id =
      path.startsWith('/api/field/customers/') && !path.endsWith('/photo')
        ? path.split('/')[4]
        : /^\/api\/customers(?:\/[^/]+)?$/.test(path)
          ? ((await res.clone().json()) as { id: string }).id
          : null;
    if (id && (await enqueue(env, a.organization_id, id)))
      await processRoute(env, a, id);
  } catch {
    /* O cadastro já foi salvo: falha derivada nunca vira erro de gravação. */
  }
  return res;
}
export async function requestRoute(
  env: Env,
  a: Actor,
  id: string,
  forceKey = '',
) {
  const exists = await env
    .DB!.prepare(
      'SELECT 1 FROM customers WHERE organization_id=? AND id=? AND active=1',
    )
    .bind(a.organization_id, id)
    .first();
  if (!exists) throw new HttpError(404, 'Cliente não encontrado.');
  if (!(await enqueue(env, a.organization_id, id, forceKey)))
    throw new HttpError(
      400,
      'Cadastre as coordenadas da base e do cliente para calcular a rota.',
    );
  return processRoute(env, a, id);
}
export async function routeContext(
  env: Env,
  org: string,
  base: Place,
  sites: { id: string; data: Place }[],
  orders: { order_id: string; data: Place }[],
) {
  if (!(await routeSchema(env)))
    return {
      routes: [],
      order_routes: [],
      routing: { configured: false, remaining: 0, retry_at: 0 },
    };
  const pairs = await Promise.all(
    [
      ...sites.map((s) => ({ id: s.id, data: s.data, kind: 'site' })),
      ...orders.map((o) => ({ id: o.order_id, data: o.data, kind: 'order' })),
    ].map(async (s) => ({ ...s, fp: await fingerprint(base, s.data) })),
  );
  const keys = [...new Set(pairs.map((s) => s.fp).filter(Boolean))];
  const rows = (
    await env
      .DB!.prepare(
        'SELECT * FROM route_cache WHERE organization_id=? AND fingerprint IN(SELECT value FROM json_each(?))',
      )
      .bind(org, JSON.stringify(keys))
      .all<RouteEstimate & { fingerprint: string; provider: 'ors' }>()
  ).results;
  const map = new Map(
    rows.map((r) => [
      r.fingerprint,
      {
        route_provider: r.provider,
        route_km: r.route_km,
        route_minutes: r.route_minutes,
        route_computed_at: r.route_computed_at,
      },
    ]),
  );
  return {
    routes: pairs
      .filter((s) => s.kind === 'site' && s.fp && map.has(s.fp))
      .map((s) => ({ id: s.id, ...map.get(s.fp!)! })),
    order_routes: pairs
      .filter((s) => s.kind === 'order' && s.fp && map.has(s.fp))
      .map((s) => ({ id: s.id, ...map.get(s.fp!)! })),
    routing: {
      configured: routingConfigured(env),
      ...(await routeQueue(env, org)),
    },
  };
}
