import { expect, it } from 'vitest';
import { safeErrorText } from './safe-error';

it('registra o tipo do erro sem dados pessoais', () => {
  const text = safeErrorText(
    new Error(
      "D1_ERROR: UNIQUE constraint failed: users.email 'pessoa@exemplo.test' 12345678: SQLITE_CONSTRAINT",
    ),
  );
  expect(text).toContain('UNIQUE constraint failed: users.email');
  expect(text).not.toContain('exemplo.test');
  expect(text).not.toContain('12345678');
});
