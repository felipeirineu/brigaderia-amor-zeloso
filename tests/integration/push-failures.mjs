import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { pushKeys, receiver } from '../helpers/push-project.mjs';
const vapid = await pushKeys();
let count = 0;
const t = await runtime({
  p1Enabled: true,
  financeEnabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
  toolsEnabled: true,
  entryPoint: 'tests/helpers/push-worker.ts',
  vapid,
  pushProvider: async (req) => {
    count++;
    if (req.url.includes('redirect'))
      return new Response(null, {
        status: 307,
        headers: { Location: 'http://127.0.0.1/PRIVADO' },
      });
    return new Response(null, { status: 503 }); // Provedor pode ter aceitado antes da falha.
  },
});
try {
  const { call, owner } = await demoProject(t);
  // Esta suíte isola falhas dos lembretes comuns; backup é exercitado em backup-reminders.mjs.
  await t.db
    .prepare("UPDATE backup_reminders SET period='off' WHERE organization_id=?")
    .bind(t.org)
    .run();
  const actor = (await call('session', undefined, 'GET')).user_id;
  const alert = await call('p1/reminders', {
    title: 'DEMONSTRAÇÃO não repetir restauração',
    due_at: new Date(Date.now() + 3600000).toISOString(),
    alert_at: new Date(Date.now() - 100000).toISOString(),
    recipient_ids: [actor],
  });
  // Restauração não traz subscriptions; assinatura futura não dispara lembrete antigo.
  await t.db
    .prepare('UPDATE reminder_alerts SET updated_at=?')
    .bind(new Date(Date.now() - 100000).toISOString())
    .run();
  const devices = [];
  for (const name of ['redirect', 'network', 'third', 'fourth', 'fifth']) {
    const d = await receiver(
      'https://fcm.googleapis.com/fcm/send/DEMONSTRACAO-' + name,
    );
    devices.push(
      await call('p1/push/subscriptions', { subscription: d.subscription }),
    );
  }
  const sixth = await receiver();
  assert.equal(
    (
      await t.request('p1/push/subscriptions', {
        cookie: owner,
        method: 'POST',
        data: { subscription: sixth.subscription },
        key: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  await t.scheduled();
  assert.equal(count, 0, 'nenhum aviso antigo enviado após nova assinatura');
  const result = await call(
    'p1/push/subscriptions/' + devices[0].id + '/test',
    {},
  );
  assert.equal(result.state, 'failed', '307 não seguido');
  assert.equal(count, 1);
  const k = crypto.randomUUID();
  assert.equal(
    (
      await call(
        'p1/push/subscriptions/' + devices[1].id + '/test',
        {},
        'POST',
        owner,
        k,
      )
    ).state,
    'unknown',
  );
  assert.equal(
    (
      await call(
        'p1/push/subscriptions/' + devices[1].id + '/test',
        {},
        'POST',
        owner,
        k,
      )
    ).state,
    'unknown',
  );
  await t.scheduled();
  assert.equal(count, 2, 'falha incerta não reenvia');
  const sql = await (await t.request('p1/backup', { cookie: owner })).text();
  assert(
    !sql.includes(
      Buffer.from('https://fcm.googleapis.com/fcm/send/DEMONSTRACAO').toString(
        'hex',
      ),
    ),
    'backup não inclui endpoints',
  );
  assert(
    !sql.includes(Buffer.from(vapid.privateKey).toString('hex')),
    'backup não inclui VAPID',
  );
  const jobId = crypto.randomUUID();
  await t.db
    .prepare(
      "INSERT INTO push_jobs(organization_id,id,subscription_id,schedule_key,state,claim_nonce,created_at,attempted_at,mutation_id) VALUES(?,?,?,?,'processing','DEMONSTRACAO',?,?,'')",
    )
    .bind(
      t.org,
      jobId,
      devices[2].id,
      'DEMONSTRACAO',
      new Date().toISOString(),
      new Date(Date.now() - 700000).toISOString(),
    )
    .run();
  await t.scheduled();
  assert.equal(
    (
      await t.db
        .prepare('SELECT state FROM push_jobs WHERE id=?')
        .bind(jobId)
        .first()
    ).state,
    'unknown',
  );
  assert.equal(count, 2);
  assert.equal(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results.length,
    0,
  );
  assert.ok(alert.id);
} finally {
  await t.dispose();
}
for (const migrationLimit of [17, 18]) {
  const legacy = await runtime({
    migrationLimit,
    financeEnabled: true,
    p1Enabled: true,
    entryPoint: 'tests/helpers/push-worker.ts',
  });
  try {
    const cookie = await legacy.login('owner@example.test');
    const request = (path, method = 'GET', data) =>
      legacy.request(path, { cookie, method, data, key: crypto.randomUUID() });
    const state = await (await request('p1/push')).json();
    assert.equal(state.ready, migrationLimit === 18);
    assert.equal(state.configured, false);
    const simple = await request('p1/reminders', 'POST', {
      title: 'DEMONSTRAÇÃO sem configuração',
      due_at: '2030-01-07T13:00:00Z',
    });
    assert.equal(simple.status, 201);
    const id = (await simple.json()).id;
    assert.equal(
      (await request('p1/reminders/' + id + '/calendar.ics')).status,
      200,
    );
    assert.equal(
      (
        await request('p1/push/subscriptions', 'POST', {
          subscription: (await receiver()).subscription,
        })
      ).status,
      503,
    );
    assert.equal((await legacy.scheduled()).outcome, 'ok');
  } finally {
    await legacy.dispose();
  }
}
console.log(
  'OK push: redirecionamento bloqueado, falha incerta sem retry, recuperação de claim, limite de aparelhos, backup privado e ausência de schema/configuração.',
);
