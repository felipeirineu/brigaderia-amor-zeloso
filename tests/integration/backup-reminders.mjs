// Fixtures DEMONSTRAÇÃO, workerd/D1 e provedores simulados; nenhuma operação remota.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { pushKeys, receiver, decryptPush } from '../helpers/push-project.mjs';
const flags = {
  financeEnabled: true,
  p1Enabled: true,
  toolsEnabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
};
const vapid = await pushKeys(),
  ownerDevice = await receiver(),
  operatorDevice = await receiver(),
  sent = [];
let uncertain = false;
const targets = new Map(
  [ownerDevice, operatorDevice].map((d) => [d.subscription.endpoint, d]),
);
const t = await runtime({
  // Aplica/remove migrações no meio do teste: sem cache de estrutura.
  schemaCacheSeconds: 0,
  ...flags,
  vapid,
  entryPoint: 'tests/helpers/push-worker.ts',
  pushProvider: async (req) => {
    const data = await decryptPush(req, targets.get(req.url));
    sent.push(data);
    return new Response(null, { status: uncertain ? 503 : 201 });
  },
});
try {
  const { call, owner, operator, outside } = await demoProject(t);
  const root = 'p1/backup-reminders/' + t.org;
  const get = () => call(root, undefined, 'GET');
  let view = await get();
  assert.equal(view.ready, true);
  assert.equal(view.settings.period, 'weekly');
  assert.equal(view.settings.weekday, 1);
  assert.equal(view.settings.time, '09:00');
  assert.equal(view.settings.last_backup_at, null);
  const changed = {
      version: view.settings.version,
      period: 'fortnightly',
      weekday: 3,
      time: '08:30',
    },
    key = crypto.randomUUID();
  await call(root, changed, 'PUT', owner, key);
  await call(root, changed, 'PUT', owner, key);
  view = await get();
  assert.equal(view.settings.version, 2);
  const stale = await t.request(root, {
    cookie: owner,
    method: 'PUT',
    key: crypto.randomUUID(),
    data: changed,
  });
  assert.equal(stale.status, 409);
  const foreign = await t.request(root, { cookie: outside });
  assert.equal(foreign.status, 404);
  // Certificado só é criado quando o SQL inteiro foi gerado.
  const file = await t.request('p1/backup', { cookie: owner });
  assert.equal(file.status, 200);
  const receipt = file.headers.get('x-backup-receipt');
  assert.ok(receipt);
  assert.equal(
    (await get()).settings.last_backup_at,
    null,
    'Gerar/baixar ainda não confirma salvamento',
  );
  const complete = 'p1/backup-exports/' + receipt + '/complete';
  assert.equal(
    (
      await t.request(complete, {
        method: 'POST',
        cookie: operator,
        data: {},
        key: crypto.randomUUID(),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await t.request(complete, {
        method: 'POST',
        cookie: outside,
        data: {},
        key: crypto.randomUUID(),
      })
    ).status,
    404,
  );
  const completeKey = crypto.randomUUID();
  await call(complete, {}, 'POST', owner, completeKey);
  await call(complete, {}, 'POST', owner, completeKey);
  const completed = (await get()).settings;
  assert.ok(completed.last_backup_at);
  assert.equal(completed.snoozed_until, null);
  assert.equal(
    (
      await t.request(complete, {
        method: 'POST',
        cookie: owner,
        data: {},
        key: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await t.db
        .prepare(
          "SELECT COUNT(*) n FROM audit_events WHERE organization_id=? AND action='backup.export_completed'",
        )
        .bind(t.org)
        .first()
    ).n,
    1,
  );
  const expired = await t.request('p1/backup', { cookie: owner }),
    expiredId = expired.headers.get('x-backup-receipt');
  await t.db
    .prepare(
      "UPDATE backup_exports SET expires_at='2000-01-01T00:00:00.000Z' WHERE organization_id=? AND id=?",
    )
    .bind(t.org, expiredId)
    .run();
  assert.equal(
    (
      await t.request('p1/backup-exports/' + expiredId + '/complete', {
        method: 'POST',
        cookie: owner,
        data: {},
        key: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  assert.equal((await get()).settings.last_backup_at, completed.last_backup_at);
  // Comprovante mais antigo não pode voltar a data da organização para trás.
  await t.db
    .prepare(
      "UPDATE backup_exports SET expires_at=?,requested_at='2000-01-01T12:00:00.000Z' WHERE organization_id=? AND id=?",
    )
    .bind(new Date(Date.now() + 60000).toISOString(), t.org, expiredId)
    .run();
  await call('p1/backup-exports/' + expiredId + '/complete', {});
  assert.equal((await get()).settings.last_backup_at, completed.last_backup_at);
  const beforeFailed = (
    await t.db
      .prepare('SELECT COUNT(*) n FROM backup_exports WHERE organization_id=?')
      .bind(t.org)
      .first()
  ).n;
  const customerRow = await t.db
    .prepare('SELECT id FROM customers WHERE organization_id=? LIMIT 1')
    .bind(t.org)
    .first();
  await t.db
    .prepare('UPDATE customers SET notes=? WHERE organization_id=? AND id=?')
    .bind('DEMONSTRACAO'.repeat(10000), t.org, customerRow.id)
    .run();
  const tooBig = await t.request('p1/backup', { cookie: owner });
  assert.equal(tooBig.status, 409);
  assert.equal(tooBig.headers.get('x-backup-receipt'), null);
  assert.equal(
    (
      await t.db
        .prepare(
          'SELECT COUNT(*) n FROM backup_exports WHERE organization_id=?',
        )
        .bind(t.org)
        .first()
    ).n,
    beforeFailed,
  );
  assert.equal((await get()).settings.last_backup_at, completed.last_backup_at);
  await t.db
    .prepare("UPDATE customers SET notes='' WHERE organization_id=? AND id=?")
    .bind(t.org, customerRow.id)
    .run();
  // Vencimento explícito de fixture, sem depender do dia/horário da máquina.
  await t.db
    .prepare(
      "UPDATE backup_reminders SET period='weekly',created_at='2020-01-01T12:00:00.000Z',last_backup_at='2020-01-01T12:00:00.000Z',snoozed_until=NULL,alert_key='11111111111111111111111111111111' WHERE organization_id=?",
    )
    .bind(t.org)
    .run();
  await call(
    'p1/push/subscriptions',
    { subscription: ownerDevice.subscription },
    'POST',
    owner,
  );
  await call(
    'p1/push/subscriptions',
    { subscription: operatorDevice.subscription },
    'POST',
    operator,
  );
  await Promise.all([t.scheduled(), t.scheduled()]);
  assert.equal(
    sent.length,
    1,
    'Só owner, uma tentativa mesmo com crons concorrentes',
  );
  assert.equal(sent[0].kind, 'backup');
  assert.equal(sent[0].url, '/gestao/backup');
  assert.equal(sent[0].title, 'Está na hora de fazer o backup!');
  assert.equal(sent[0].backup_id, t.org);
  await t.scheduled();
  assert.equal(sent.length, 1);
  const unchanged = (await get()).settings;
  await call(
    root,
    {
      version: unchanged.version,
      period: unchanged.period,
      weekday: unchanged.weekday,
      time: unchanged.time,
    },
    'PUT',
  );
  assert.equal(
    (await get()).settings.alert_key,
    unchanged.alert_key,
    'Salvar configuração igual não cria outro vencimento',
  );
  await t.scheduled();
  assert.equal(sent.length, 1);
  view = await get();
  const snoozeKey = crypto.randomUUID();
  const snooze = {
    version: view.settings.version,
    alert_key: view.settings.alert_key,
  };
  const delayed = await call(
    root + '/snooze',
    snooze,
    'POST',
    owner,
    snoozeKey,
  );
  await call(root + '/snooze', snooze, 'POST', owner, snoozeKey);
  const delta = Date.parse(delayed.snoozed_until) - Date.now();
  assert.ok(delta > 3590000 && delta <= 3600000);
  await t.scheduled();
  assert.equal(sent.length, 1, 'Adiamento bloqueia envio imediato');
  assert.equal(
    (
      await t.request(root + '/snooze', {
        cookie: owner,
        method: 'POST',
        data: snooze,
        key: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  // Avançar somente o estado fictício do D1 para simular a expiração do adiamento.
  await t.db
    .prepare(
      "UPDATE backup_reminders SET snoozed_until='2020-01-01T12:00:00.000Z' WHERE organization_id=?",
    )
    .bind(t.org)
    .run();
  await t.scheduled();
  await t.scheduled();
  assert.equal(sent.length, 2, 'Uma tentativa por adiamento');
  // Erro incerto nunca é reenviado no próximo cron.
  await t.db
    .prepare(
      "UPDATE backup_reminders SET alert_key='22222222222222222222222222222222' WHERE organization_id=?",
    )
    .bind(t.org)
    .run();
  uncertain = true;
  await t.scheduled();
  await t.scheduled();
  assert.equal(sent.length, 3);
  assert.equal(
    (
      await t.db
        .prepare(
          "SELECT state FROM push_jobs WHERE organization_id=? AND backup_key='22222222222222222222222222222222'",
        )
        .bind(t.org)
        .first()
    ).state,
    'unknown',
  );
  // Downgrade em autorização já bloqueia, mesmo que membership ainda esteja antiga.
  await t.db
    .prepare(
      "UPDATE backup_reminders SET alert_key='33333333333333333333333333333333' WHERE organization_id=?",
    )
    .bind(t.org)
    .run();
  await t.db
    .prepare(
      "UPDATE authorized_emails SET role='operator' WHERE organization_id=? AND email='owner@example.test'",
    )
    .bind(t.org)
    .run();
  await t.scheduled();
  assert.equal(sent.length, 3);
  console.log(
    'OK T11 configuração/CAS, comprovante/expiração/idempotência, isolamento, push owner, cron concorrente, adiamento e envio incerto sem retry.',
  );
} finally {
  await t.dispose();
}
const legacy = await runtime({
  // Aplica/remove migrações no meio do teste: sem cache de estrutura.
  schemaCacheSeconds: 0,
  ...flags,
  migrationLimit: 26,
});
try {
  const owner = await legacy.login('owner@example.test');
  const r = await legacy.request('p1/backup-reminders/' + legacy.org, {
    cookie: owner,
  });
  assert.deepEqual(await r.json(), { ready: false });
  const file = await legacy.request('p1/backup', { cookie: owner });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('x-backup-receipt'), null);
  const actor = await (
    await legacy.request('session', { cookie: owner })
  ).json();
  await legacy.db
    .prepare(
      "DELETE FROM audit_events WHERE organization_id=? AND action='backup.export_requested'",
    )
    .bind(legacy.org)
    .run();
  await legacy.db
    .prepare(
      "INSERT INTO audit_events(id,organization_id,user_id,action,entity_id,created_at) VALUES(?,?,?,'backup.export_requested',?,'2026-11-01T12:00:00.000Z')",
    )
    .bind(crypto.randomUUID(), legacy.org, actor.user_id, legacy.org)
    .run();
  const { readFile } = await import('node:fs/promises');
  const migration = await readFile(
    'database/migrations/0027_backup_reminders.sql',
    'utf8',
  );
  await legacy.db.exec(migration.replace(/--[^\n]*/g, '').replace(/\n/g, ' '));
  const upgraded = await (
    await legacy.request('p1/backup-reminders/' + legacy.org, { cookie: owner })
  ).json();
  assert.equal(upgraded.ready, true);
  assert.equal(upgraded.settings.last_backup_at, '2026-11-01T12:00:00.000Z');
  console.log('OK T11 sem0027: lembrete oculto, backup antigo preservado.');
} finally {
  await legacy.dispose();
}
