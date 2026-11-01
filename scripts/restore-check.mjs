// Ensaio somente LOCAL em diretório novo; nenhuma chamada --remote neste script.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { inspect } from './ops-preflight.mjs';
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error(
    'Use: npm run ops:restore-check -- .local/backup-antes-fase2.sql',
  );
  process.exit(1);
}
try {
  const backup = resolve(args[0]);
  await access(backup);
  const root = resolve('.local', 'restore-check-' + randomUUID()),
    config = resolve(root, 'wrangler.json');
  await mkdir(root, { recursive: true, mode: 0o700 });
  await writeFile(
    config,
    JSON.stringify({
      name: 'brigaderia-restore-local',
      compatibility_date: '2026-10-30',
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'restore-local',
          database_id: randomUUID(),
        },
      ],
    }),
    { mode: 0o600 },
  );
  const persist = resolve(root, 'state');
  execFileSync(
    process.execPath,
    [
      './node_modules/wrangler/bin/wrangler.js',
      'd1',
      'execute',
      'restore-local',
      '--config',
      config,
      '--local',
      '--persist-to',
      persist,
      '--file',
      backup,
      '--json',
    ],
    {
      maxBuffer: 8 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    },
  );
  const result = inspect('restore-local', { config, persist });
  console.log(JSON.stringify(result, null, 2));
  console.log(
    'Restauração LOCAL concluída. Compare contagens e migrações com a pré-checagem remota. Nenhum banco remoto foi alterado. Estado privado em ' +
      root,
  );
  if (result.foreign_key_violations) process.exitCode = 2;
} catch {
  console.error(
    'Ensaio local não concluído. Preserve o backup; não aplique migrações nem ative flags no remoto. Confira caminho/formato do arquivo e espaço local. Nenhum comando remoto foi solicitado.',
  );
  process.exitCode = 1;
}
