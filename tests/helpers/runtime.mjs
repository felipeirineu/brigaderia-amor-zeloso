// Exclusivo dos testes. Não é incluído em worker/ nem no build público.
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { build } from 'esbuild';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

export async function runtime() {
  const issuer = 'https://demonstracao-teste.cloudflareaccess.com';
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = {
    ...(await exportJWK(publicKey)),
    kid: 'demonstracao-key',
    alg: 'RS256',
    use: 'sig',
  };
  const result = await build({
    entryPoints: ['worker/pages.ts'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    write: false,
  });
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: result.outputFiles[0].text,
      compatibilityDate: '2026-10-30',
      host: '127.0.0.1',
      port: 0,
      d1Databases: { DB: 'test-database' },
      bindings: {
        ACCESS_TEAM_DOMAIN: 'demonstracao-teste.cloudflareaccess.com',
        ACCESS_AUD: 'test-audience',
      },
      outboundService: async (req) =>
        new URL(req.url).href === `${issuer}/cdn-cgi/access/certs`
          ? Response.json({ keys: [jwk] })
          : new Response('Network forbidden in tests', { status: 403 }),
      serviceBindings: {
        ASSETS: async (req) => {
          const path = decodeURIComponent(new URL(req.url).pathname);
          const root = resolve('dist');
          let file = resolve(root, `.${path}`);
          if (!file.startsWith(root + '/') || path.includes('..'))
            file = root + '/index.html';
          let contents;
          try {
            contents = await readFile(file);
          } catch {
            file = root + '/index.html';
            contents = await readFile(file);
          }
          const types = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.webmanifest': 'application/manifest+json',
          };
          return new Response(contents, {
            headers: {
              'Content-Type':
                types[extname(file)] || 'application/octet-stream',
            },
          });
        },
      },
    }),
  );
  const db = await mf.getD1Database('DB');
  for (const file of (await readdir('database/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const sql = await readFile('database/migrations/' + file, 'utf8');
    await db.exec(sql.replace(/--[^\n]*/g, '').replace(/\n/g, ' '));
  }
  const org = crypto.randomUUID(),
    otherOrg = crypto.randomUUID();
  await db
    .prepare('INSERT INTO organizations(id,name) VALUES(?,?),(?,?)')
    .bind(
      org,
      'Organização DEMONSTRAÇÃO',
      otherOrg,
      'Outra organização DEMONSTRAÇÃO',
    )
    .run();
  for (const [email, role, orgId] of [
    ['owner@example.test', 'owner', org],
    ['operator@example.test', 'operator', org],
    ['other@example.test', 'owner', otherOrg],
  ]) {
    await db
      .prepare(
        'INSERT INTO authorized_emails(email,organization_id,role) VALUES(?,?,?)',
      )
      .bind(email, orgId, role)
      .run();
  }
  async function token(email = 'owner@example.test', options = {}) {
    return new SignJWT({ email })
      .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
      .setSubject(email)
      .setIssuer(options.issuer || issuer)
      .setAudience(options.audience || 'test-audience')
      .setIssuedAt()
      .setExpirationTime(options.expired ? 1 : '1h')
      .sign(privateKey);
  }
  const url = (await mf.ready).origin;
  async function request(path, options = {}) {
    const {
      method = 'GET',
      data,
      cookie,
      jwt,
      key = method === 'POST' && ['customers', 'products'].includes(path)
        ? crypto.randomUUID()
        : undefined,
      origin = url,
    } = options;
    return mf.dispatchFetch(url + '/api/' + path, {
      method,
      redirect: 'manual',
      headers: {
        ...(method !== 'GET'
          ? { Origin: origin, 'Content-Type': 'application/json' }
          : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
  }
  async function login(email) {
    const response = await request('access/login', {
      method: 'POST',
      data: {},
      jwt: await token(email),
    });
    if (response.status !== 200)
      throw new Error(
        `Test login failed ${response.status}: ${await response.text()}`,
      );
    return response.headers.get('Set-Cookie').split(';')[0];
  }
  return { mf, db, org, otherOrg, url, request, token, login };
}
