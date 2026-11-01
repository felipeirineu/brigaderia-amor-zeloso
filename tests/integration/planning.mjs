import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({ financeEnabled: true, p1Enabled: true });
try {
  const { owner, outside, call, makeOrder, customer, operator } =
    await demoProject(t);
  const id = await makeOrder();
  const query = '?from=2030-01-07&to=2030-01-13';
  const agenda = await call('p1/calendar' + query, undefined, 'GET');
  assert(agenda.events.some((e) => e.id === 'delivery-' + id));
  assert(agenda.events.some((e) => e.kind === 'production'));
  assert.equal(agenda.events[0].date, '2030-01-07');
  const ics = await t.request('p1/calendar.ics' + query, { cookie: owner });
  assert.equal(ics.status, 200);
  assert.equal(ics.headers.get('cache-control'), 'no-store');
  assert.match(await ics.text(), /BEGIN:VCALENDAR/);
  const other = await call('p1/calendar' + query, undefined, 'GET', outside);
  assert.equal(other.events.length, 0);
  assert.equal((await t.request('p1/calendar' + query)).status, 401);
  assert.equal(
    (
      await t.request('p1/calendar?from=2030-01-01&to=2030-12-31', {
        cookie: owner,
      })
    ).status,
    400,
  );
  const key = crypto.randomUUID(),
    data = {
      title: 'Lembrete DEMONSTRAÇÃO, revisar; \nBEGIN:VEVENT',
      due_at: '2030-01-07T15:00:00.000Z',
      customer_id: customer,
    };
  const reminder = await call('p1/reminders', data, 'POST', operator, key);
  assert.equal(
    (await call('p1/reminders', data, 'POST', operator, key)).id,
    reminder.id,
  );
  const pending = await call(
    'p1/reminders?through=2030-01-07',
    undefined,
    'GET',
  );
  assert.equal(pending.length, 1);
  const updatedAgenda = await call('p1/calendar' + query, undefined, 'GET');
  assert(updatedAgenda.events.some((e) => e.id === 'reminder-' + reminder.id));
  await call(
    'p1/reminders/' + reminder.id,
    { ...data, version: 1, done: true },
    'PUT',
    operator,
  );
  assert.equal(
    (await call('p1/reminders?through=2030-01-07', undefined, 'GET')).length,
    0,
  );
  assert.equal(
    (
      await t.request('p1/reminders/' + reminder.id, {
        cookie: owner,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: { ...data, version: 1 },
      })
    ).status,
    409,
  );
  assert.equal(
    (await t.request('p1/reminders/' + reminder.id, { cookie: outside }))
      .status,
    404,
  );
  console.log(
    'OK P1-2 lembrete manual, idempotência, Hoje/agenda, concluir, CAS e isolamento.',
  );
  console.log(
    'OK P1-1 agenda semana/mês, produção planejada, ICS privado, limite e isolamento.',
  );
} finally {
  await t.dispose();
}
