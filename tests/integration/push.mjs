// Rede de push simulada, D1 efêmero e chaves geradas só para demonstração.
import assert from 'node:assert/strict';
import { jwtVerify } from 'jose';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { pushKeys, receiver, decryptPush } from '../helpers/push-project.mjs';
const vapid = await pushKeys(),
  device = await receiver(),
  second = await receiver(),
  gone = await receiver('https://web.push.apple.com/DEMONSTRACAO-gone'),
  sent = [];
let deliveryError;
const targets = new Map(
  [device, second, gone].map((d) => [d.subscription.endpoint, d]),
);
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
  entryPoint: 'tests/helpers/push-worker.ts',
  vapid,
  pushProvider: async (req) => {
    try {
      const decoded = await decryptPush(req.clone(), targets.get(req.url));
      const auth = req.headers.get('authorization');
      assert.match(auth, /^vapid /);
      assert.equal(req.headers.get('content-encoding'), 'aes128gcm');
      const token = auth.match(/t=([^, ]+)/)[1],
        key = await crypto.subtle.importKey(
          'raw',
          Buffer.from(vapid.publicKey, 'base64url'),
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['verify'],
        );
      const verified = await jwtVerify(token, key, {
        audience: new URL(req.url).origin,
      });
      assert.equal(verified.payload.sub, vapid.subject);
      sent.push({ endpoint: req.url, data: decoded });
      return new Response(null, {
        status: req.url === gone.subscription.endpoint ? 410 : 201,
      });
    } catch (e) {
      deliveryError = e;
      throw e;
    }
  },
});
const request = (path, options = {}) =>
  t.request(path, { ...options, key: options.key ?? crypto.randomUUID() });
try {
  const { call, owner, operator, outside } = await demoProject(t);
  const actor = (await call('session', undefined, 'GET')).user_id,
    op = (await call('session', undefined, 'GET', operator)).user_id;
  let status = await call('p1/push', undefined, 'GET');
  assert.equal(status.configured, true);
  assert.equal(status.public_key, vapid.publicKey);
  assert.ok(!JSON.stringify(status).includes(vapid.privateKey));
  const key = crypto.randomUUID(),
    registration = await call(
      'p1/push/subscriptions',
      { subscription: device.subscription },
      'POST',
      owner,
      key,
    );
  assert.equal(
    (
      await call(
        'p1/push/subscriptions',
        { subscription: device.subscription },
        'POST',
        owner,
        key,
      )
    ).id,
    registration.id,
  );
  status = await call('p1/push', undefined, 'GET');
  assert.equal(status.subscriptions.length, 1);
  assert.equal(status.subscriptions[0].current, 1);
  const sessionExpiry = await t.db
    .prepare(
      'SELECT expires_at FROM sessions WHERE organization_id=? AND token_hash=(SELECT session_hash FROM push_subscriptions WHERE organization_id=? AND id=?)',
    )
    .bind(t.org, t.org, registration.id)
    .first();
  assert.equal(status.subscriptions[0].valid_until, sessionExpiry.expires_at);
  assert.ok(status.subscriptions[0].valid_until > Date.now() / 1000);
  assert.ok(!JSON.stringify(status).includes('session_hash'));

  assert.ok(!JSON.stringify(status).includes(device.subscription.endpoint));
  for (const endpoint of [
    'http://127.0.0.1:80/x',
    'https://fcm.googleapis.com.evil.example/x',
    'https://user:secret@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
  ])
    assert.equal(
      (
        await request('p1/push/subscriptions', {
          cookie: owner,
          method: 'POST',
          data: { subscription: { ...device.subscription, endpoint } },
        })
      ).status,
      400,
    );
  for (const method of ['GET', 'DELETE']) {
    if (method === 'GET') continue;
    assert.equal(
      (
        await request('p1/push/subscriptions/' + registration.id, {
          cookie: outside,
          method,
          data: { version: 1 },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request('p1/push/subscriptions/' + registration.id, {
          cookie: operator,
          method,
          data: { version: 1 },
        })
      ).status,
      404,
    );
  }
  assert.equal(
    (
      await request('p1/push/subscriptions/' + registration.id + '/test', {
        cookie: outside,
        method: 'POST',
        data: {},
      })
    ).status,
    404,
  );
  const testKey = crypto.randomUUID();
  assert.equal(
    (
      await call(
        'p1/push/subscriptions/' + registration.id + '/test',
        {},
        'POST',
        owner,
        testKey,
      )
    ).state,
    'sent',
    deliveryError?.message,
  );
  await call(
    'p1/push/subscriptions/' + registration.id + '/test',
    {},
    'POST',
    owner,
    testKey,
  );
  assert.equal(sent.length, 1, 'aviso de teste repetido não reenvia');
  const secondRegistration = await call(
    'p1/push/subscriptions',
    { subscription: second.subscription },
    'POST',
    operator,
  );
  const dead = await call(
    'p1/push/subscriptions',
    { subscription: gone.subscription },
    'POST',
  );
  const due = new Date(Date.now() + 3600000).toISOString(),
    alert = new Date(Date.now() - 1000).toISOString();
  const data = {
    title: 'LEMBRETE DEMONSTRAÇÃO; vírgula, teste',
    notes: 'NOTA PRIVADA DEMONSTRAÇÃO NÃO ENVIAR',
    due_at: due,
    alert_at: alert,
    recipient_ids: [actor, op],
  };
  const reminder = await call('p1/reminders', data);
  const response = await t.scheduled();
  assert.equal(response.outcome, 'ok');
  assert.equal(
    sent.length,
    4,
    'um aviso por aparelho destinatário (inclui expirado)',
  );
  assert.equal((await t.scheduled()).outcome, 'ok');
  assert.equal(sent.length, 4);
  const actual = sent.filter((s) =>
    s.data.body.includes('LEMBRETE DEMONSTRAÇÃO'),
  );
  assert.equal(actual.length, 3);
  assert.ok(actual.every((s) => !JSON.stringify(s.data).includes(data.notes)));
  assert.ok(actual.every((s) => s.data.url.startsWith('/gestao?day=')));
  assert.equal(
    (await call('p1/push', undefined, 'GET')).subscriptions.some(
      (s) => s.id === dead.id,
    ),
    false,
    '410 revoga assinatura',
  );
  const icsResponse = await request(
    'p1/reminders/' + reminder.id + '/calendar.ics',
    { cookie: owner },
  );
  assert.equal(icsResponse.status, 200);
  assert.equal(icsResponse.headers.get('cache-control'), 'no-store');
  const ics = await icsResponse.text();
  assert.match(ics, /BEGIN:VALARM/);
  assert.match(ics, /TRIGGER;VALUE=DATE-TIME:/);
  assert.match(ics, /DEMONSTRAÇÃO\\; vírgula\\, teste/);
  assert.ok(!ics.includes(data.notes));
  assert.equal(
    (await request('p1/reminders/' + reminder.id + '/calendar.ics')).status,
    401,
  );
  assert.equal(
    (
      await request('p1/reminders/' + reminder.id + '/calendar.ics', {
        cookie: outside,
      })
    ).status,
    404,
  );
  // Concluir/reabrir preserva horário/responsáveis e não reenvia aviso já tentado.
  await call(
    'p1/reminders/' + reminder.id,
    { ...data, version: 1, done: true },
    'PUT',
  );
  await call(
    'p1/reminders/' + reminder.id,
    {
      title: data.title,
      notes: data.notes,
      due_at: due,
      version: 2,
      done: false,
    },
    'PUT',
  );
  const reopened = await call('p1/reminders/' + reminder.id, undefined, 'GET');
  assert.equal(reopened.alert_at, alert);
  assert.deepEqual([...reopened.recipient_ids].sort(), [actor, op].sort());
  await t.scheduled();
  assert.equal(sent.length, 4);
  // Dois crons concorrentes só fazem uma tentativa por aparelho.
  await call('p1/reminders', { ...data, title: 'Concorrência DEMONSTRAÇÃO' });
  await Promise.all([t.scheduled(), t.scheduled()]);
  assert.equal(sent.length, 6);
  const future = await call('p1/reminders', {
    ...data,
    title: 'Cancelado DEMONSTRAÇÃO',
    alert_at: new Date(Date.now() + 86400000).toISOString(),
  });
  await call(
    'p1/reminders/' + future.id,
    { ...data, title: 'Cancelado DEMONSTRAÇÃO', version: 1, done: true },
    'PUT',
  );
  await t.scheduled();
  assert.equal(sent.length, 6);
  // Sair invalida apenas aparelhos desta sessão; cron não envia para o usuário desconectado.
  assert.equal(
    (await request('auth/logout', { cookie: owner, method: 'POST', data: {} }))
      .status,
    200,
  );
  assert.equal((await request('p1/push', { cookie: owner })).status, 401);
  const after = (
    await t.db
      .prepare(
        'SELECT active FROM push_subscriptions WHERE organization_id=? AND id=?',
      )
      .bind(t.org, registration.id)
      .first()
  ).active;
  assert.equal(after, 0);
  await call(
    'p1/reminders',
    { ...data, title: 'Após sair DEMONSTRAÇÃO', recipient_ids: [actor, op] },
    'POST',
    operator,
  );
  await t.scheduled();
  assert.equal(sent.length, 7);
  assert.equal(sent.at(-1).endpoint, second.subscription.endpoint);
  const revokeKey = crypto.randomUUID();
  assert.equal(
    (
      await request('p1/push/subscriptions/' + secondRegistration.id, {
        key: revokeKey,
        cookie: operator,
        method: 'DELETE',
        data: { version: 1 },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request('p1/push/subscriptions/' + secondRegistration.id, {
        cookie: operator,
        method: 'DELETE',
        data: { version: 1 },
        key: revokeKey,
      })
    ).status,
    200,
    'repetição da revogação é idempotente',
  );
  assert.equal(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results.length,
    0,
  );
  console.log(
    'OK Web Push interoperável (aes128gcm/VAPID), sessão/tenant/SSRF, cron repetido/concorrente, 410, metadados preservados, ICS/alarme e logout.',
  );
} finally {
  await t.dispose();
}

// R17: o cron deve respeitar autorização/equipe, além de expiração e logout.
let authorizedSent = 0;
const authRuntime = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  entryPoint: 'tests/helpers/push-worker.ts',
  vapid: await pushKeys(),
  pushProvider: async () => {
    authorizedSent++;
    return new Response(null, { status: 201 });
  },
});
try {
  const { call, operator } = await demoProject(authRuntime);
  const op = (await call('session', undefined, 'GET', operator)).user_id;
  const subscription = (await receiver()).subscription;
  await call('p1/push/subscriptions', { subscription }, 'POST', operator);
  await call('p1/reminders', {
    title: 'Autorização DEMONSTRAÇÃO',
    due_at: new Date(Date.now() + 3600000).toISOString(),
    alert_at: new Date(Date.now() - 1000).toISOString(),
    recipient_ids: [op],
  });
  await authRuntime.db
    .prepare(
      "DELETE FROM authorized_emails WHERE organization_id=? AND email='operator@example.test'",
    )
    .bind(authRuntime.org)
    .run();
  await authRuntime.scheduled();
  assert.equal(authorizedSent, 0, 'email revogado bloqueia cron');
  await authRuntime.db
    .prepare(
      "INSERT INTO authorized_emails(email,organization_id,role) VALUES('operator@example.test',?,'operator')",
    )
    .bind(authRuntime.org)
    .run();
  await authRuntime.db
    .prepare('DELETE FROM memberships WHERE organization_id=? AND user_id=?')
    .bind(authRuntime.org, op)
    .run();
  await authRuntime.scheduled();
  assert.equal(authorizedSent, 0, 'sem vínculo na equipe não há envio');
  await authRuntime.db
    .prepare(
      "INSERT INTO memberships(organization_id,user_id,role) VALUES(?,?,'operator')",
    )
    .bind(authRuntime.org, op)
    .run();
  await authRuntime.db
    .prepare(
      'UPDATE sessions SET expires_at=unixepoch()-1 WHERE organization_id=? AND user_id=?',
    )
    .bind(authRuntime.org, op)
    .run();
  await authRuntime.scheduled();
  assert.equal(authorizedSent, 0, 'sessão expirada bloqueia envio');
  const fresh = await authRuntime.login('operator@example.test');
  await call('p1/push/subscriptions', { subscription }, 'POST', fresh);
  // Reativação não deve reproduzir avisos antigos: confirme um novo lembrete após ativar.
  await call('p1/reminders', {
    title: 'Reativado DEMONSTRAÇÃO',
    due_at: new Date(Date.now() + 3600000).toISOString(),
    alert_at: new Date(Date.now() - 1000).toISOString(),
    recipient_ids: [op],
  });
  await authRuntime.scheduled();
  assert.equal(
    authorizedSent,
    1,
    'nova sessão autorizada volta a receber após ativar',
  );
  console.log(
    'OK R17 cron: autorização revogada, equipe removida e sessão vencida bloqueiam envio; reativação humana válida permite.',
  );
} finally {
  await authRuntime.dispose();
}
