import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { validateActivation } from './activation-policy.mjs';
const base = () => ({
  pending: ['0003_operations.sql'],
  counts: { organizations: 1, orders: 2 },
  foreign_key_violations: 0,
});
it('permite somente upgrade com vínculos/histórico íntegros', () => {
  expect(validateActivation(base())).toBe(true);
  expect(() =>
    validateActivation({ ...base(), pending: ['0001_initial.sql'] }),
  ).toThrow(/histórico/);
  expect(() =>
    validateActivation({ ...base(), pending: ['0002_management.sql'] }),
  ).toThrow(/histórico/);
  expect(() =>
    validateActivation({ ...base(), foreign_key_violations: 1 }),
  ).toThrow(/vínculos/);
  expect(() => validateActivation({ counts: {} })).toThrow(/incompleta/);
});
it('não libera ativação com migração pendente ou schema parcial', () => {
  expect(() => validateActivation(base(), { after: true })).toThrow(
    /incompleto/,
  );
  const full = {
    ...base(),
    pending: [],
    schema_operations_ready: true,
    schema_finance_ready: true,
    schema_p1_ready: true,
    schema_mobile_ready: true,
    schema_field_ready: true,
    schema_tools_ready: true,
    generated_condition_columns: true,
  };
  expect(validateActivation(full, { after: true })).toBe(true);
  expect(() =>
    validateActivation({ ...full, schema_field_ready: false }, { after: true }),
  ).toThrow(/incompleto/);
});

it('runner recusa execução sem confirmação/credenciais antes de consultar D1', () => {
  for (const [mode, backup, message] of [
    ['APLICAR_PENDENTES', 'false', 'backup'],
    ['PRE_CHECAGEM', 'false', 'Configure'],
    ['OUTRA', 'true', 'Ação inválida'],
  ]) {
    const r = spawnSync(process.execPath, ['scripts/run-homologation.mjs'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        MIGRATION_MODE: mode,
        BACKUP_VERIFIED: backup,
        CLOUDFLARE_API_TOKEN: '',
        CLOUDFLARE_ACCOUNT_ID: '',
      },
    });
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain(message);
  }
});
