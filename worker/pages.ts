import api, { type Env } from './index';

interface PagesEnv extends Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  PUBLIC_CATALOG_ENABLED?: string;
}

// Assets públicos contêm apenas o shell; dados privados vêm da API autenticada.
export default {
  async fetch(request: Request, env: PagesEnv): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/api' || path.startsWith('/api/')) {
      return api.fetch(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
