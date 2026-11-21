import { describe, expect, it, vi } from 'vitest';
import { PUSH_SERVICE_HELP, subscribeWithRetry } from './push-device';

const key = new Uint8Array([1, 2, 3]);
const noWait = () => Promise.resolve();
const fail = (name = 'AbortError') =>
  Object.assign(Error('Registration failed - push service error'), { name });

describe('subscribeWithRetry', () => {
  it('tenta de novo quando o serviço de push recusa o primeiro registro', async () => {
    const sub = { endpoint: 'https://push.example/1' };
    const subscribe = vi
      .fn()
      .mockRejectedValueOnce(fail())
      .mockResolvedValueOnce(sub);
    await expect(
      subscribeWithRetry({ pushManager: { subscribe } } as never, key, noWait),
    ).resolves.toBe(sub);
    expect(subscribe).toHaveBeenCalledTimes(2);
  });

  it('explica em português quando falha duas vezes', async () => {
    const subscribe = vi.fn().mockRejectedValue(fail());
    await expect(
      subscribeWithRetry({ pushManager: { subscribe } } as never, key, noWait),
    ).rejects.toThrow(PUSH_SERVICE_HELP);
    expect(subscribe).toHaveBeenCalledTimes(2);
  });

  it('não insiste quando a permissão foi negada', async () => {
    const subscribe = vi.fn().mockRejectedValue(fail('NotAllowedError'));
    await expect(
      subscribeWithRetry({ pushManager: { subscribe } } as never, key, noWait),
    ).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(subscribe).toHaveBeenCalledTimes(1);
  });
});
