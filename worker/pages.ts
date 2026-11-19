import api, { type Env } from './index';
import { json } from './security';

interface PagesEnv extends Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  PUBLIC_CATALOG_ENABLED?: string;
}

// Assets públicos contêm apenas o shell; dados privados vêm da API autenticada.
export default {
  async fetch(request: Request, env: PagesEnv): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/private-flavors/'))
      return new Response('Not found', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    if (path === '/api' || path.startsWith('/api/')) {
      const preview = new URL(request.url).hostname.endsWith(
        '.brigaderia-amor-zeloso.pages.dev',
      );
      if (preview || env.APP_ENVIRONMENT === 'teste') {
        // A variável sozinha não prova que o binding aponta para o banco certo.
        // A tabela existe exclusivamente no banco de teste preparado pelo workflow.
        const ready =
          preview &&
          env.APP_ENVIRONMENT === 'teste' &&
          (await env.DB?.prepare(
            "SELECT 1 AS ready FROM test_environment WHERE name='brigaderia-amor-zeloso-teste'",
          )
            .first()
            .catch(() => null));
        if (!ready)
          return json(
            { error: 'Ambiente de teste ainda não configurado.' },
            503,
          );
      }
      return api.fetch(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
