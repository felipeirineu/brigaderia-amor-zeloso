import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

describe('api: conexão que cai no meio', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('troca o erro cru do navegador por mensagem em português', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Load failed')),
    );
    await expect(api('orders', 'POST', {}, 'k1')).rejects.toThrow(
      /não duplica/,
    );
    await expect(api('orders', 'POST', {})).rejects.toThrow(/Confira na lista/);
    await expect(api('orders')).rejects.toThrow(/A conexão caiu/);
  });
  it('resposta cortada (sem JSON) não vira erro em inglês', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })),
    );
    await expect(api('orders', 'PUT', {}, 'k2')).rejects.toThrow(
      /A conexão caiu/,
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('erro', { status: 502 })),
    );
    await expect(api('orders', 'PUT', {}, 'k3')).rejects.toThrow(
      'Não foi possível concluir.',
    );
  });
});
