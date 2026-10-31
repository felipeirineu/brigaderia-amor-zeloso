import { describe, expect, it } from 'vitest';
import worker from './index';

describe('Worker da Fase 0: negação por padrão', () => {
  it('reporta saúde sem afirmar banco conectado', async () => {
    const result = await worker.fetch(
      new Request('https://example.test/api/health'),
      {},
    );
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({
      phase: 0,
      database: 'not-connected',
    });
    expect(result.headers.get('Cache-Control')).toBe('no-store');
  });
  for (const flag of [undefined, 'false', 'true']) {
    for (const path of [
      '/catalogo',
      '/catalogo/produto/teste',
      '/api/catalogo',
      '/api/catalogo/produto/teste',
    ]) {
      it(`bloqueia ${path} com flag ${flag}`, async () => {
        const result = await worker.fetch(
          new Request(`https://example.test${path}`),
          { PUBLIC_CATALOG_ENABLED: flag },
        );
        expect(result.status).toBe(404);
        expect(await result.json()).toEqual({ error: 'CATALOG_UNAVAILABLE' });
      });
    }
  }
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    it(`nega ${method} em rota privada mesmo com cookie e organização forjados`, async () => {
      const result = await worker.fetch(
        new Request(
          'https://example.test/api/customers?organization_id=other',
          {
            method,
            headers: { Cookie: 'session=demo', Authorization: 'Bearer demo' },
          },
        ),
        {},
      );
      expect(result.status).toBe(401);
      expect(await result.json()).toEqual({ error: 'AUTHENTICATION_REQUIRED' });
      expect(result.headers.get('Cache-Control')).toBe('no-store');
      expect(result.headers.has('Access-Control-Allow-Origin')).toBe(false);
    });
  }
  it('nega caminhos desconhecidos', async () => {
    expect(
      (await worker.fetch(new Request('https://example.test/unknown'), {}))
        .status,
    ).toBe(404);
  });
});
