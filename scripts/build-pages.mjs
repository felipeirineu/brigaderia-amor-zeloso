import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';

await build({
  entryPoints: ['worker/pages.ts'],
  outfile: 'dist/_worker.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
});
// Somente a API precisa de execução server-side. A demonstração é estática.
await writeFile(
  'dist/_routes.json',
  JSON.stringify(
    {
      version: 1,
      include: ['/api', '/api/*'],
      exclude: [],
    },
    null,
    2,
  ),
);
