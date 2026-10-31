import api from './index';

interface PagesEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  PUBLIC_CATALOG_ENABLED?: string;
}

// Entrada exclusiva da demonstração no Pages. Não possui binding de banco.
export default {
  async fetch(request: Request, env: PagesEnv): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/api' || path.startsWith('/api/')) {
      return api.fetch(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
