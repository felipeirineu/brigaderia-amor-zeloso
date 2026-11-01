import type { Actor } from './security';
import { businessDay } from './operations-domain';
export function canReverse(
  actor: Pick<Actor, 'role' | 'user_id'>,
  event: { user_id: unknown; created_at: unknown },
) {
  const day = new Date(Date.parse(String(event.created_at)) - 10800000)
    .toISOString()
    .slice(0, 10);
  return (
    actor.role === 'owner' ||
    (event.user_id === actor.user_id && day === businessDay())
  );
}
