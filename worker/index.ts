/** Esqueleto local: não autentica usuários e não acessa dados operacionais. */
export interface Env {
  PUBLIC_CATALOG_ENABLED?: string;
}
function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    },
  });
}
export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    void _env; // Reservado para bindings; nenhuma flag concede acesso nesta fase.
    const { pathname } = new URL(request.url);
    // A flag nunca habilita publicação nesta fase, nem por alteração acidental.
    if (
      pathname === '/catalogo' ||
      pathname.startsWith('/catalogo/') ||
      pathname === '/api/catalogo' ||
      pathname.startsWith('/api/catalogo/')
    ) {
      return json({ error: 'CATALOG_UNAVAILABLE' }, 404);
    }
    if (pathname === '/api/health' && request.method === 'GET') {
      return json({
        status: 'ok',
        phase: 0,
        mode: 'scaffold',
        database: 'not-connected',
      });
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      // Nenhum cookie ou identificador fornecido pelo cliente concede acesso.
      return json({ error: 'AUTHENTICATION_REQUIRED' }, 401);
    }
    return json({ error: 'NOT_FOUND' }, 404);
  },
};
