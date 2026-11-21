import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
// Papel Desenvolvedor: administrador de suporte, fora das escolhas de equipe.
const t = await runtime({
  mobileEnabled: true,
  fieldEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  placesProvider: true,
  developerEmails: ' Dev@Example.test ',
});
try {
  const { call, owner, operator } = await demoProject(t);
  await call('members', { email: 'dev@example.test', role: 'owner' });
  const dev = await t.login('dev@example.test');
  const get = (path, cookie) => call(path, undefined, 'GET', cookie);

  assert.equal((await get('session', dev)).developer, true);
  assert.equal((await get('session', dev)).role, 'owner', 'mantém permissões');
  assert.equal((await get('session', owner)).developer, false);

  const devId = (await get('session', dev)).user_id;
  for (const cookie of [owner, operator]) {
    const staff = (await get('field/context', cookie)).staff;
    assert.ok(
      !staff.some((s) => s.id === devId),
      'desenvolvedor fora da equipe de quem opera',
    );
    assert.equal(staff.length, 2, 'administrador e operador continuam');
  }
  const own = (await get('field/context', dev)).staff;
  assert.equal(
    own.find((s) => s.id === devId)?.developer,
    true,
    'o próprio desenvolvedor vê o seu perfil marcado',
  );
  assert.ok(!own.some((s) => s.id !== devId && s.developer));

  const members = await get('members', owner);
  assert.equal(
    members.find((m) => m.email === 'dev@example.test')?.developer,
    true,
    'Acessos continua mostrando o desenvolvedor',
  );
  assert.equal(
    members.find((m) => m.email === 'owner@example.test')?.developer,
    false,
  );
  console.log(
    'OK papel Desenvolvedor: sessão, equipe oculta para os outros, perfil próprio e Acessos visível.',
  );
} finally {
  await t.dispose();
}
