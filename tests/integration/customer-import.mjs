import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  toolsEnabled: true,
});
try {
  const { call, operator, outside } = await demoProject(t);
  const rows = [
    { name: 'Cliente DEMONSTRAÇÃO importado', phone: '(11) 90000-0001' },
    { name: 'Duplicado DEMONSTRAÇÃO', phone: '+5511900000001' },
    { name: 'Existente DEMONSTRAÇÃO', phone: '11900000000' },
    { name: 'Inválido DEMONSTRAÇÃO', phone: 'inválido' },
  ];
  const p = await call('p1/customer-import/preview', { rows });
  assert.deepEqual(
    p.rows.map((r) => r.status),
    ['ready', 'duplicate', 'existing', 'invalid'],
  );
  assert.equal(
    (
      await t.db
        .prepare('SELECT COUNT(*) n FROM customers WHERE organization_id=?')
        .bind(t.org)
        .first()
    ).n,
    1,
  );
  assert.equal(
    (
      await t.request('p1/customer-import/preview', {
        cookie: operator,
        method: 'POST',
        data: { rows },
      })
    ).status,
    403,
  );
  const data = { rows, selected: [0] },
    key = crypto.randomUUID();
  const r = await call(
    'p1/customer-import/confirm',
    data,
    'POST',
    undefined,
    key,
  );
  assert.equal(r.rows[0].status, 'created');
  assert.equal(
    (await call('p1/customer-import/confirm', data, 'POST', undefined, key))
      .import_id,
    r.import_id,
  );
  assert.equal(
    (await call('p1/customer-import/confirm', data)).rows[0].status,
    'existing',
  );
  const other = await call(
    'p1/customer-import/preview',
    { rows },
    'POST',
    outside,
  );
  assert.equal(other.rows[0].status, 'ready');
  const concurrentRows = [
    { name: 'Concorrente DEMONSTRAÇÃO', phone: '11900000002' },
  ];
  const both = await Promise.all([
    call('p1/customer-import/confirm', { rows: concurrentRows, selected: [0] }),
    call('p1/customer-import/confirm', { rows: concurrentRows, selected: [0] }),
  ]);
  assert.equal(
    both.flatMap((r) => r.rows).filter((r) => r.status === 'created').length,
    1,
  );
  assert.equal(
    (
      await t.request('p1/customer-import/confirm', {
        method: 'POST',
        cookie: await t.login('owner@example.test'),
        key: crypto.randomUUID(),
        data: { rows, selected: [1, 3] },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await t.db
        .prepare('SELECT COUNT(*) n FROM pragma_foreign_key_check')
        .first()
    ).n,
    0,
  );
  // Telefone opcional: importa sem telefone, reconhece repetição pelo nome,
  // nunca devolve o marcador interno e aceita mensagem sem telefone.
  const semFone = [
    { name: 'Sem Fone DEMONSTRAÇÃO', phone: '', email: '', notes: 'Bairro X' },
    { name: 'sem fone demonstracao', phone: '', email: '', notes: '' },
    { name: 'Outro Sem Fone DEMONSTRAÇÃO', phone: '', email: '', notes: '' },
  ];
  const prev = await call('p1/customer-import/preview', { rows: semFone });
  assert.deepEqual(
    prev.rows.map((r) => r.status),
    ['ready', 'duplicate', 'ready'],
  );
  const done = await call('p1/customer-import/confirm', {
    rows: semFone,
    selected: [0, 2],
  });
  assert.equal(done.rows.filter((r) => r.status === 'created').length, 2);
  const again = await call('p1/customer-import/preview', { rows: semFone });
  assert.equal(again.rows[0].status, 'existing');
  await call('p1/customer-import/confirm', { rows: semFone, selected: [0] });
  const listed = await call('customers?q=Sem%20Fone', undefined, 'GET');
  assert.equal(listed.length, 2, 'reimportar não duplica cliente sem telefone');
  assert.ok(listed.every((c) => c.phone === ''));
  assert.equal(
    (await call('customers?q=sem%3A', undefined, 'GET')).length,
    0,
    'marcador interno não é pesquisável',
  );
  const manual = await call('customers', {
    name: 'Manual Sem Fone DEMONSTRAÇÃO',
  });
  const one = await call('customers/' + manual.id, undefined, 'GET');
  assert.equal(one.phone, '');
  await call(
    'customers/' + manual.id,
    { name: one.name, phone: '83 99999-0000', version: one.version },
    'PUT',
  );
  assert.equal(
    (await call('customers/' + manual.id, undefined, 'GET')).phone,
    '+5583999990000',
  );
  assert.equal(
    (
      await t.request('customers', {
        method: 'POST',
        cookie: await t.login('owner@example.test'),
        key: crypto.randomUUID(),
        data: { name: 'Fone Ruim DEMONSTRAÇÃO', phone: '123' },
      })
    ).status,
    400,
  );
  console.log(
    'OK P1-8 prévia sem escrita, telefone normalizado ou ausente, seleção, deduplicação concorrente, idempotência e isolamento.',
  );
} finally {
  await t.dispose();
}
