import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
const org = '00000000-0000-4000-8000-000000000001',
  key = '00000000-0000-4000-8000-000000000002';
const backup = () => ({
  kind: 'backup',
  backup_id: org,
  backup_key: key,
  url: '/gestao/backup',
  title: 'Está na hora de fazer o backup!',
  body: 'Nenhum backup feito ainda',
});
function worker(fetch = vi.fn()) {
  const events = {},
    showNotification = vi.fn(async () => undefined),
    openWindow = vi.fn(async () => undefined);
  const client = {
    url: 'https://app.example.test/gestao',
    navigate: vi.fn(async () => undefined),
    focus: vi.fn(async () => undefined),
    postMessage: vi.fn(),
  };
  const self = {
    addEventListener: (name, fn) => {
      events[name] = fn;
    },
    location: { origin: 'https://app.example.test' },
    registration: { showNotification },
    clients: { matchAll: async () => [client], openWindow },
  };
  vm.runInNewContext(readFileSync('public/push-worker.js', 'utf8'), {
    self,
    fetch,
    URL,
    crypto,
  });
  const dispatch = async (name, event) => {
    let promise;
    events[name]({
      ...event,
      waitUntil: (p) => {
        promise = p;
      },
    });
    await promise;
  };
  return { dispatch, showNotification, openWindow, client };
}
describe('ações do aviso de backup no service worker', () => {
  it('usa duas ações fixas e nunca a URL externa vinda do payload', async () => {
    const w = worker();
    await w.dispatch('push', {
      data: {
        json: () => ({ ...backup(), url: 'https://fora.example.test/segredo' }),
      },
    });
    const options = w.showNotification.mock.calls[0][1];
    expect(JSON.parse(JSON.stringify(options.actions))).toEqual([
      { action: 'backup-open', title: 'Fazer backup' },
      { action: 'backup-snooze', title: 'Lembrar em 1 h' },
    ]);
    expect(options.data.url).toBe('/gestao/backup');
    expect(JSON.stringify(options.data)).not.toMatch(
      /cookie|token|session|email/,
    );
  });
  it('adiar relê a versão/chave e faz POST autenticado e idempotente no mesmo servidor', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          ready: true,
          settings: { version: 3, alert_key: key },
        }),
      )
      .mockResolvedValueOnce(Response.json({}));
    const w = worker(fetch),
      close = vi.fn();
    await w.dispatch('notificationclick', {
      notification: { close, data: backup() },
      action: 'backup-snooze',
    });
    expect(close).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, options] = fetch.mock.calls[1];
    expect(url).toBe('/api/p1/backup-reminders/' + org + '/snooze');
    expect(options.credentials).toBe('same-origin');
    expect(options.cache).toBe('no-store');
    expect(options.headers['Idempotency-Key']).toMatch(/^[a-f\d-]{36}$/);
    expect(JSON.parse(options.body)).toEqual({ version: 3, alert_key: key });
    expect(w.client.postMessage).toHaveBeenCalled();
    expect(w.client.navigate).not.toHaveBeenCalled();
  });
  it.each(['expired', 'stale', 'forbidden'])(
    'falha %s não declara adiamento e abre o backup para ação humana',
    async (kind) => {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(
          kind === 'expired'
            ? new Response(null, { status: 401 })
            : Response.json({
                ready: true,
                settings: {
                  version: 2,
                  alert_key: kind === 'stale' ? 'outro' : key,
                },
              }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 403 }));
      const w = worker(fetch);
      await w.dispatch('notificationclick', {
        notification: { close: () => {}, data: backup() },
        action: 'backup-snooze',
      });
      expect(fetch).toHaveBeenCalledTimes(kind === 'forbidden' ? 2 : 1);
      expect(w.client.postMessage).not.toHaveBeenCalled();
      expect(w.client.navigate).toHaveBeenCalledWith(
        'https://app.example.test/gestao/backup',
      );
    },
  );
  it('abrir backup não faz download nem gravação, apenas navega', async () => {
    const fetch = vi.fn(),
      w = worker(fetch);
    await w.dispatch('notificationclick', {
      notification: { close: () => {}, data: backup() },
      action: 'backup-open',
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(w.client.navigate).toHaveBeenCalledWith(
      'https://app.example.test/gestao/backup',
    );
  });
  it('payload forjado não permite montar caminho de API arbitrário nem abrir outra origem', async () => {
    const fetch = vi.fn(),
      w = worker(fetch);
    await w.dispatch('notificationclick', {
      notification: {
        close: () => {},
        data: {
          ...backup(),
          backup_id: '../qualquer',
          url: '//fora.example.test',
        },
      },
      action: 'backup-snooze',
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(w.client.navigate).toHaveBeenCalledWith(
      'https://app.example.test/gestao',
    );
  });
});
