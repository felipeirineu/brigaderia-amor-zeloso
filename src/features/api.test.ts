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
    vi.useFakeTimers();
    const pending = expect(api('orders')).rejects.toThrow(/A conexão caiu/);
    await vi.advanceTimersByTimeAsync(5000);
    await pending;
    vi.useRealTimers();
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
  it('leitura tenta de novo quando a internet volta em instantes', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetcher);
    const pending = api<{ ok: boolean }>('session');
    await vi.advanceTimersByTimeAsync(1600);
    await expect(pending).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
  it('gravação nunca é repetida automaticamente', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Load failed'));
    vi.stubGlobal('fetch', fetcher);
    await expect(api('orders', 'POST', {}, 'k9')).rejects.toThrow(
      /não duplica/,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
