// Somente aparelhos de demonstração, D1 efêmero e entrega interceptada.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { pushKeys, receiver, decryptPush } from '../helpers/push-project.mjs';

const ownerDevice = await receiver(
  'https://fcm.googleapis.com/DEMONSTRACAO-owner-feedback',
);
const operatorDevice = await receiver(
  'https://fcm.googleapis.com/DEMONSTRACAO-operator-feedback',
);
const sent = [];
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  entryPoint: 'tests/helpers/push-worker.ts',
  vapid: await pushKeys(),
  feedbackWhatsapp: '5500900000000',
  pushProvider: async (req) => {
    sent.push({
      target: req.url,
      ...(await decryptPush(
        req,
        req.url === ownerDevice.subscription.endpoint
          ? ownerDevice
          : operatorDevice,
      )),
    });
    return new Response(null, { status: 201 });
  },
});
try {
  const { call, owner, operator } = await demoProject(t);
  for (const [cookie, device] of [
    [owner, ownerDevice],
    [operator, operatorDevice],
  ])
    await call(
      'p1/push/subscriptions',
      { subscription: device.subscription },
      'POST',
      cookie,
    );
  await call('feedback/phone', { phone: '5511900000001' }, 'PUT', operator);
  const payload = {
    kind: 'suggestion',
    message: 'DEMONSTRAÇÃO jamais no push',
  };
  const key = crypto.randomUUID();
  const message = await call('feedback', payload, 'POST', operator, key);
  assert.equal(
    new URL(message.whatsapp_url).searchParams.get('text'),
    'Sugestão no app:\n' + payload.message,
  );
  assert.equal(
    (await call('feedback', payload, 'POST', operator, key)).id,
    message.id,
  );
  const inbox = await call('feedback/inbox', undefined, 'GET');
  assert.equal(new URL(inbox.messages[0].reply_url).pathname, '/5511900000001');
  assert.equal((await call('feedback', undefined, 'GET')).messages.length, 0);
  await Promise.all([t.scheduled(), t.scheduled()]);
  await t.scheduled();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].target, ownerDevice.subscription.endpoint);
  assert.equal(sent[0].title, 'Nova sugestão no app');
  assert.equal(sent[0].body, 'Veja em Recebidas.');
  assert.equal(sent[0].url, '/gestao/recebidas');
  assert.ok(!JSON.stringify(sent).includes(payload.message));
  assert.ok(!JSON.stringify(sent).includes(message.id));

  const read = await call('feedback', payload, 'POST', operator);
  await call(`feedback/${read.id}/read`, { version: 1 });
  await t.scheduled();
  assert.equal(sent.length, 1);
  console.log(
    'OK T14 aviso genérico aos donos ativos, concorrência de reenvio, oculto após leitura e WhatsApp optativo.',
  );
} finally {
  await t.dispose();
}

const beforeMigration = await runtime({ migrationLimit: 27 });
try {
  const op = await beforeMigration.login('operator@example.test');
  const session = await beforeMigration.request('session', { cookie: op });
  assert.equal((await session.json()).feedback, false);
  assert.equal(
    (await beforeMigration.request('feedback', { cookie: op })).status,
    404,
  );
  console.log('OK T14 canal fica oculto antes da migração 0028.');
} finally {
  await beforeMigration.dispose();
}
