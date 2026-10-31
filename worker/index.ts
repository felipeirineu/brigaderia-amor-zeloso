import {
  accessIdentity,
  actor,
  body,
  configured,
  HttpError,
  json,
  login,
  sessionCookie,
  writeGuard,
  type Env,
} from './security';
import { management } from './management';
import { z } from 'zod';
export type { Env } from './security';
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      const { pathname } = new URL(req.url);
      if (
        pathname === '/catalogo' ||
        pathname.startsWith('/catalogo/') ||
        pathname === '/api/catalogo' ||
        pathname.startsWith('/api/catalogo/')
      )
        return json({ error: 'CATALOG_UNAVAILABLE' }, 404);
      if (pathname === '/api/health' && req.method === 'GET')
        return json({
          status: 'ok',
          phase: 1,
          mode: 'management',
          database: env.DB ? 'bound' : 'not-connected',
        });
      if (pathname === '/api/auth/config' && req.method === 'GET')
        return json({
          configured: configured(env),
          login_url: configured(env)
            ? new URL('/api/access/start', req.url).href
            : null,
        });
      if (pathname === '/api/access/start' && req.method === 'GET') {
        await accessIdentity(req, env);
        return new Response(null, {
          status: 303,
          headers: {
            Location: new URL('/login', req.url).href,
            'Cache-Control': 'no-store',
          },
        });
      }
      if (pathname === '/api/access/login' && req.method === 'POST') {
        writeGuard(req);
        await body(req, z.object({}).strict());
        return await login(req, env);
      }
      if (!pathname.startsWith('/api/'))
        return json({ error: 'NOT_FOUND' }, 404);
      const user = await actor(req, env);
      if (req.method !== 'GET') writeGuard(req);
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        await env
          .DB!.prepare('DELETE FROM sessions WHERE token_hash=?')
          .bind(user.token_hash)
          .run();
        return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
      }
      return await management(req, env, user);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      // Não registrar requisições, JWT, cookies ou dados pessoais.
      return json(
        { error: 'Não foi possível concluir a operação. Tente novamente.' },
        500,
      );
    }
  },
};
