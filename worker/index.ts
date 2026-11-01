import { flavorImages } from './flavor-images';
import { mobile } from './mobile';
import { mobileReady } from './mobile-ready';
import { flavorPhotos } from '../shared/flavors';
import { p1 } from './p1';
import { finance } from './finance';
import { financeReady } from './finance-ready';
import { operationalReady } from './operational-ready';
import {
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
import { operations } from './operations';
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
        // Navegação completa: o Access verifica a identidade antes de chegar aqui.
        // A sessão só é emitida após assinatura JWT e allowlist verificadas no login.
        const result = await login(req, env);
        return new Response(null, {
          status: 303,
          headers: {
            Location: new URL('/gestao', req.url).href,
            'Set-Cookie': result.headers.get('Set-Cookie')!,
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
      if (pathname.startsWith('/api/brand/flavors/') && req.method === 'GET') {
        const key = pathname.split('/')[4];
        if (
          !flavorPhotos.includes(key as (typeof flavorPhotos)[number]) ||
          !(await mobileReady(env))
        )
          return json({ error: 'Imagem indisponível.' }, 404);
        return new Response(flavorImages[key] as unknown as BodyInit, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
      if (pathname === '/api/capabilities' && req.method === 'GET')
        return json({
          operations: await operationalReady(env),
          finance: await financeReady(env),
        });
      if (req.method !== 'GET') writeGuard(req);
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        await env
          .DB!.prepare('DELETE FROM sessions WHERE token_hash=?')
          .bind(user.token_hash)
          .run();
        return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
      }
      if (pathname.startsWith('/api/mobile/'))
        return await mobile(req, env, user);
      if (pathname.startsWith('/api/p1/')) return await p1(req, env, user);
      if (pathname.startsWith('/api/finance/'))
        return await finance(req, env, user);
      if (
        /^\/api\/(today|recurring|generate-week|confirm-reviewed|message-templates)(?:\/|$)/.test(
          pathname,
        ) ||
        /^\/api\/orders\/[^/]+\/[^/]+/.test(pathname)
      )
        return await operations(req, env, user);
      return await management(req, env, user);
    } catch (e) {
      if (e instanceof z.ZodError)
        return json(
          {
            error:
              'Dados financeiros inválidos. Confira os campos obrigatórios.',
          },
          400,
        );
      if (String(e).includes('UNIQUE constraint failed'))
        return json(
          { error: 'Registro já existente. Atualize antes de repetir.' },
          409,
        );
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      // Não registrar requisições, JWT, cookies ou dados pessoais.
      return json(
        { error: 'Não foi possível concluir a operação. Tente novamente.' },
        500,
      );
    }
  },
};
