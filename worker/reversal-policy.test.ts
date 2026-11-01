import { expect, it } from 'vitest';
import { canReverse } from './reversal-policy';
it('operador somente autor e dia civil atual; administrador pode corrigir antigos', () => {
  const operator = { role: 'operator' as const, user_id: 'fixture-user' },
    owner = { ...operator, role: 'owner' as const };
  const current = {
    user_id: 'fixture-user',
    created_at: new Date().toISOString(),
  };
  expect(canReverse(operator, current)).toBe(true);
  expect(canReverse(operator, { ...current, user_id: 'fixture-other' })).toBe(
    false,
  );
  expect(
    canReverse(operator, { ...current, created_at: '2000-01-01T12:00:00Z' }),
  ).toBe(false);
  expect(
    canReverse(owner, {
      ...current,
      user_id: 'fixture-other',
      created_at: '2000-01-01T12:00:00Z',
    }),
  ).toBe(true);
});
