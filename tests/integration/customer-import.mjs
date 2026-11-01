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
  console.log(
    'OK P1-8 prévia sem escrita, telefone normalizado, seleção, deduplicação concorrente, idempotência e isolamento.',
  );
} finally {
  await t.dispose();
}
