import { nextStatuses, type Status } from './order-state';

export const batchOrderLimit = 2;
export type BatchOrderAction = 'date' | 'advance' | 'complete';

export function batchOrderClosed(status: Status) {
  return ['delivered', 'picked_up', 'cancelled'].includes(status);
}

export function batchOrderPath(
  status: Status,
  deliveryType: string,
  action: 'advance' | 'complete',
) {
  const path: Status[] = [];
  let current = status;
  while (!batchOrderClosed(current)) {
    const allowed = nextStatuses(current, deliveryType);
    const next = allowed.find(
      (candidate) =>
        candidate !== 'draft' &&
        candidate !== 'cancelled' &&
        !(candidate === 'awaiting_confirmation' && current === 'confirmed'),
    );
    if (!next) break;
    path.push(next);
    if (action === 'advance') break;
    current = next;
  }
  return path;
}

export function dateKeepingBusinessTime(iso: string, day: string) {
  const local = new Date(Date.parse(iso) - 3 * 3600000).toISOString();
  return new Date(day + local.slice(10, -1) + '-03:00').toISOString();
}

export interface BatchOrderResult {
  id: string;
  ok: boolean;
  status?: number;
  error?: string;
  expires_at?: number;
  version?: number;
}
