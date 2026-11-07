// Matriz de segurança da API. Fixtures fictícias em D1 efêmero; nada remoto.
// Cobre: rotas sem sessão, sessão/JWT forjados, proteção de gravação,
// isolamento entre organizações (IDOR), papéis e catálogo desligado.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  toolsEnabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
  fieldEnabled: true,
});
let checks = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  checks++;
};
try {
  const { call, owner, operator, outside, customer, makeOrder } =
    await demoProject(t);
  const order = await makeOrder();
  const fake = crypto.randomUUID();

  // Todas as famílias de rotas protegidas (GET), incluindo IDs reais e inexistentes.
  const protectedGets = [
    'session',
    'capabilities',
    'members',
    'customers',
    'customers/' + customer,
    'products',
    'orders',
    'orders/' + order,
    'today',
    'today/calendar',
    'recurring',
    'message-templates',
    'brand/flavors/tradicional',
    'finance/settings',
    'finance/summary',
    'finance/customers/' + customer,
    'mobile/defaults/' + customer,
    'field/context',
    'field/company',
    'field/profile',
    'field/search?q=teste',
    'field/trips',
    'field/travel-report',
    'p1/backup',
    'p1/calendar',
    'p1/calendar.ics',
    'p1/cashflow.csv',
    'p1/expenses',
    'p1/inventory',
    'p1/recipes',
    'p1/reminders',
    'p1/reports',
    'p1/reports.csv',
    'p1/shopping',
    'p1/supplies',
    'rota-inexistente/' + fake,
  ];

  // 1. Sem sessão: tudo 401, sem vazar dados nem detalhes internos.
  for (const path of protectedGets) {
    const r = await t.request(path);
    ok(
      r.status === 401,
      `${path} sem sessão deveria ser 401, veio ${r.status}`,
    );
    const text = await r.text();
    ok(
      !/stack|at .*\.ts|SQLITE|D1_/i.test(text),
      `${path} vazou detalhe interno: ${text}`,
    );
  }
  for (const [path, method] of [
    ['customers', 'POST'],
    ['orders', 'POST'],
    ['orders/' + order, 'PUT'],
    ['mobile/orders', 'POST'],
    ['finance/customers/' + customer + '/payments', 'POST'],
    ['p1/backup', 'POST'],
    ['members', 'POST'],
    ['auth/logout', 'POST'],
  ]) {
    const r = await t.request(path, { method, data: {} });
    ok(r.status === 401, `${method} ${path} sem sessão: ${r.status}`);
  }

  // 2. Cookie forjado, expirado ou com nome errado.
  for (const cookie of [
    '__Host-session=' + 'a'.repeat(64),
    '__Host-session=',
    'session=' + owner.split('=')[1],
    owner.replace('__Host-session=', '__Host-session=x'),
  ]) {
    const r = await t.request('customers', { cookie });
    ok(r.status === 401, `cookie forjado aceito: ${cookie.slice(0, 24)}…`);
  }

  // 3. JWT do Access: emissor, audiência, expiração e e-mail não autorizado.
  const login = (jwt) =>
    t.request('access/login', { method: 'POST', data: {}, jwt });
  ok(
    (await login(await t.token('owner@example.test', { expired: true })))
      .status === 401,
    'JWT expirado aceito',
  );
  ok(
    (
      await login(
        await t.token('owner@example.test', { audience: 'outra-aplicacao' }),
      )
    ).status === 401,
    'JWT de outra aplicação aceito',
  );
  ok(
    (
      await login(
        await t.token('owner@example.test', {
          issuer: 'https://atacante.cloudflareaccess.com',
        }),
      )
    ).status === 401,
    'JWT de outro emissor aceito',
  );
  ok(
    (await login('eyJhbGciOiJub25lIn0.eyJlbWFpbCI6Im8ifQ.')).status === 401,
    'JWT sem assinatura (alg none) aceito',
  );
  ok(
    (await login(await t.token('intruso@example.test'))).status === 403,
    'e-mail fora da lista autorizada entrou',
  );
  ok((await login(undefined)).status === 401, 'login sem JWT aceito');

  // 4. Proteção de gravação: origem, tipo de conteúdo e tamanho.
  const raw = (headers, body = '{}') =>
    t.mf.dispatchFetch(t.url + '/api/customers', {
      method: 'POST',
      headers: { Cookie: owner, 'Idempotency-Key': fake, ...headers },
      body,
    });
  ok(
    (
      await raw({
        Origin: 'https://atacante.example',
        'Content-Type': 'application/json',
      })
    ).status === 403,
    'gravação de outra origem aceita (CSRF)',
  );
  ok(
    (await raw({ 'Content-Type': 'application/json' })).status === 403,
    'gravação sem Origin aceita',
  );
  ok(
    (await raw({ Origin: t.url, 'Content-Type': 'text/plain' })).status === 415,
    'gravação sem JSON aceita',
  );
  ok(
    (
      await raw(
        { Origin: t.url, 'Content-Type': 'application/json' },
        JSON.stringify({ name: 'x'.repeat(200000) }),
      )
    ).status === 413,
    'corpo gigante aceito',
  );

  // 5. Outra organização (IDOR): não lê, não altera, não lista.
  for (const path of [
    'customers/' + customer,
    'orders/' + order,
    'finance/customers/' + customer,
    'mobile/defaults/' + customer,
  ]) {
    const r = await t.request(path, { cookie: outside });
    ok(r.status === 404, `outra organização leu ${path}: ${r.status}`);
  }
  for (const path of ['customers', 'orders', 'products']) {
    const list = await (await t.request(path, { cookie: outside })).json();
    ok(
      Array.isArray(list) && list.length === 0,
      `outra organização listou ${path}`,
    );
  }
  for (const [path, method, data] of [
    ['customers/' + customer, 'PUT', { name: 'Invasão', version: 1 }],
    ['orders/' + order + '/status', 'POST', { version: 3, to: 'cancelled' }],
    [
      'finance/customers/' + customer + '/payments',
      'POST',
      { amount_cents: 100, method: 'pix', received_at: '2030-01-07' },
    ],
  ]) {
    const r = await t.request(path, {
      cookie: outside,
      method,
      data,
      key: crypto.randomUUID(),
    });
    ok(r.status === 404, `outra organização alterou ${path}: ${r.status}`);
  }
  const still = await call('orders/' + order, undefined, 'GET');
  ok(still.status === 'confirmed', 'pedido mudou após tentativa externa');
  const cust = await call('customers/' + customer, undefined, 'GET');
  ok(cust.name !== 'Invasão', 'cliente mudou após tentativa externa');

  // 6. Papéis: operadora não acessa funções exclusivas do owner.
  for (const [path, method, data] of [
    ['p1/backup', 'GET'],
    ['p1/customer-import/preview', 'POST', { csv: 'nome\nTeste' }],
    ['members', 'POST', { email: 'novo@example.test', role: 'owner' }],
    ['finance/settings', 'PUT', { version: 1 }],
  ]) {
    const r = await t.request(path, {
      cookie: operator,
      method,
      data,
      key: crypto.randomUUID(),
    });
    ok(r.status === 403, `operadora usou ${method} ${path}: ${r.status}`);
  }
  const members = await t.db
    .prepare(
      "SELECT count(*) n FROM authorized_emails WHERE email LIKE 'novo@%'",
    )
    .first();
  ok(members.n === 0, 'operadora autorizou novo e-mail');

  // 7. Catálogo público desligado, inclusive na API.
  for (const path of ['catalogo', 'catalogo/produto/teste']) {
    ok((await t.request(path)).status === 404, `catálogo respondeu em ${path}`);
  }

  // 8. Cabeçalhos de segurança nas respostas JSON.
  const h = (await t.request('customers', { cookie: owner })).headers;
  ok(h.get('Cache-Control') === 'no-store', 'JSON sem no-store');
  ok(h.get('X-Content-Type-Options') === 'nosniff', 'JSON sem nosniff');
  ok(
    /frame-ancestors 'none'/.test(h.get('Content-Security-Policy') ?? ''),
    'JSON sem CSP',
  );

  // 9. Logout invalida a sessão no servidor (não só no navegador).
  const temp = await t.login('operator@example.test');
  await t.request('auth/logout', { cookie: temp, method: 'POST', data: {} });
  ok(
    (await t.request('customers', { cookie: temp })).status === 401,
    'sessão continua válida após sair',
  );

  console.log(
    `OK segurança: ${checks} verificações (sessão, JWT, CSRF, IDOR, papéis, catálogo, cabeçalhos).`,
  );
} finally {
  await t.dispose();
}
