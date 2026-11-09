import { generateKeyPair, exportJWK } from 'jose';
export const b64url = (bytes) => Buffer.from(bytes).toString('base64url');
export async function pushKeys() {
  const { privateKey, publicKey } = await generateKeyPair('ES256', {
    extractable: true,
  });
  const pub = await crypto.subtle.exportKey('raw', publicKey),
    jwk = await exportJWK(privateKey);
  return {
    subject: 'mailto:demonstracao@example.test',
    publicKey: b64url(pub),
    privateKey: jwk.d,
  };
}
export async function receiver(
  endpoint = 'https://fcm.googleapis.com/fcm/send/DEMONSTRACAO-' +
    crypto.randomUUID(),
) {
  const key = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const pub = new Uint8Array(
      await crypto.subtle.exportKey('raw', key.publicKey),
    ),
    auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    key,
    pub,
    auth,
    subscription: {
      endpoint,
      expirationTime: null,
      keys: { p256dh: b64url(pub), auth: b64url(auth) },
    },
  };
}
/** Decodificação independente pelo lado receptor, conforme RFC8291/RFC8188. */
export async function decryptPush(req, target) {
  const bytes = new Uint8Array(await req.arrayBuffer()),
    salt = bytes.slice(0, 16),
    len = bytes[20],
    sender = bytes.slice(21, 21 + len),
    encrypted = bytes.slice(21 + len);
  const pub = await crypto.subtle.importKey(
      'raw',
      sender,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    ),
    secret = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: pub },
      target.key.privateKey,
      256,
    );
  const enc = new TextEncoder(),
    concat = (...arr) => {
      const out = new Uint8Array(arr.reduce((n, v) => n + v.length, 0));
      let at = 0;
      for (const a of arr) {
        out.set(a, at);
        at += a.length;
      }
      return out;
    };
  const hkdf = async (raw, salt, info, bits) =>
    crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info },
      await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveBits']),
      bits,
    );
  const ikm = await hkdf(
    secret,
    target.auth,
    concat(enc.encode('WebPush: info\0'), target.pub, sender),
    256,
  );
  const cek = await hkdf(
      ikm,
      salt,
      enc.encode('Content-Encoding: aes128gcm\0'),
      128,
    ),
    iv = await hkdf(ikm, salt, enc.encode('Content-Encoding: nonce\0'), 96);
  const plain = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']),
      encrypted,
    ),
  );
  let end = plain.length - 1;
  while (plain[end] === 0) end--;
  if (plain[end] !== 2) throw Error('Delimitador RFC8188 inválido.');
  return JSON.parse(new TextDecoder().decode(plain.slice(0, end)));
}
