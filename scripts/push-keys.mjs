import { generateKeyPair, exportJWK } from 'jose';
/** ES256/P-256; quem chama decide o destino privado, nunca imprime o resultado. */
export async function generatePushKeys(subject) {
  const { privateKey, publicKey } = await generateKeyPair('ES256', {
    extractable: true,
  });
  const pub = Buffer.from(
    await crypto.subtle.exportKey('raw', publicKey),
  ).toString('base64url');
  const jwk = await exportJWK(privateKey);
  return {
    VAPID_SUBJECT: subject,
    VAPID_PUBLIC_KEY: pub,
    VAPID_PRIVATE_KEY: jwk.d,
  };
}
