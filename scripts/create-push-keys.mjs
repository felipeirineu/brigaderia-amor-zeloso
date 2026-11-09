// Só gera um arquivo local privado; não envia chaves nem altera a Cloudflare.
import { generateKeyPair, exportJWK } from 'jose';
import { mkdir, writeFile } from 'node:fs/promises';
const subject = process.argv[2];
if (!subject || !/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject))
  throw Error(
    'Use: node scripts/create-push-keys.mjs mailto:SEU_EMAIL (substitua pelo contato administrativo).',
  );
const { privateKey, publicKey } = await generateKeyPair('ES256', {
  extractable: true,
});
const pub = Buffer.from(
  await crypto.subtle.exportKey('raw', publicKey),
).toString('base64url');
const jwk = await exportJWK(privateKey);
await mkdir('.local', { recursive: true, mode: 0o700 });
// wx nunca substitui a identidade anterior, que invalidaria os aparelhos já inscritos.
await writeFile(
  '.local/push-secrets.json',
  JSON.stringify(
    { VAPID_SUBJECT: subject, VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: jwk.d },
    null,
    2,
  ) + '\n',
  { mode: 0o600, flag: 'wx' },
);
console.log(
  'Chaves salvas em .local/push-secrets.json (privado e ignorado pelo Git). Não copie para o chat ou para commits.',
);
