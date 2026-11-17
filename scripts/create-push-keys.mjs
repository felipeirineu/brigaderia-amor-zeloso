// Só gera um arquivo local privado; não envia chaves nem altera a Cloudflare.
import { generatePushKeys } from './push-keys.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const subject = process.argv[2];
if (!subject || !/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject))
  throw Error(
    'Use: node scripts/create-push-keys.mjs https://ENDERECO_DO_APP (substitua pelo endereço HTTPS do aplicativo).',
  );
const keys = await generatePushKeys(subject);
await mkdir('.local', { recursive: true, mode: 0o700 });
// wx nunca substitui a identidade anterior, que invalidaria os aparelhos já inscritos.
await writeFile(
  '.local/push-secrets.json',
  JSON.stringify(keys, null, 2) + '\n',
  { mode: 0o600, flag: 'wx' },
);
console.log(
  'Chaves salvas em .local/push-secrets.json (privado e ignorado pelo Git). Não copie para o chat ou para commits.',
);
