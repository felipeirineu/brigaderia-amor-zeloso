import { api } from '../api';
export async function drainRoutes() {
  for (let i = 0; i < 50; i++) {
    const result = await api<{
      remaining: number;
      retry_at: number;
      stopped?: boolean;
    }>('field/routes/process', 'POST', {}, crypto.randomUUID());
    if (result.stopped) return false;
    if (!result.remaining) return true;
    const delay = result.retry_at - Date.now();
    if (delay > 5000) return false;
    await new Promise((r) => setTimeout(r, Math.max(100, delay + 20)));
  }
  return false;
}
