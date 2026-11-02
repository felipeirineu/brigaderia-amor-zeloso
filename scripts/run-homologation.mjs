// Apenas o administrador executa este runner; não é disparado por push/PR.
import { execFileSync } from 'node:child_process';
import { inspect } from './ops-preflight.mjs';
import {
  validateActivation,
  ActivationCheckError,
} from './activation-policy.mjs';
const mode = process.env.MIGRATION_MODE || 'PRE_CHECAGEM';
try {
  if (!['PRE_CHECAGEM', 'APLICAR_PENDENTES'].includes(mode))
    throw new ActivationCheckError('Ação inválida.');
  if (mode === 'APLICAR_PENDENTES' && process.env.BACKUP_VERIFIED !== 'true')
    throw new ActivationCheckError(
      'Confirme o backup restaurado e dados apenas de teste antes de aplicar.',
    );
  if (
    !process.env.CLOUDFLARE_API_TOKEN ||
    !/^[a-f0-9]{32}$/i.test(process.env.CLOUDFLARE_ACCOUNT_ID || '')
  )
    throw new ActivationCheckError(
      'Configure o secret de D1 e a variável de conta no ambiente homologacao-d1. Não coloque credenciais em logs ou no chat.',
    );
  const database = 'brigaderia-amor-zeloso-homologacao';
  const print = (r) =>
    console.log(
      JSON.stringify(
        {
          migrations_applied_count: r.migrations.length,
          pending: r.pending,
          counts: r.counts,
          foreign_key_violations: r.foreign_key_violations,
        },
        null,
        2,
      ),
    );
  const before = inspect(database, { remote: true });
  validateActivation(before);
  print(before);
  if (mode === 'APLICAR_PENDENTES') {
    execFileSync(
      process.execPath,
      [
        './node_modules/wrangler/bin/wrangler.js',
        'd1',
        'migrations',
        'apply',
        database,
        '--config',
        'wrangler.jsonc',
        '--remote',
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
      },
    );
    const after = inspect(database, { remote: true });
    validateActivation(after, { after: true });
    print(after);
    console.log(
      'Migrações e pré-checagem concluídas. Flags não foram alteradas; nenhum deploy foi executado. Confira contagens antes da ativação humana.',
    );
  } else
    console.log('Somente pré-checagem concluída. Nenhuma escrita solicitada.');
} catch (e) {
  console.error(
    e instanceof ActivationCheckError
      ? e.message
      : 'Etapa não concluída. Preserve backup e banco; confira conta/permissões/histórico. Não ative flags nem repita por tentativa.',
  );
  process.exitCode = 1;
}
