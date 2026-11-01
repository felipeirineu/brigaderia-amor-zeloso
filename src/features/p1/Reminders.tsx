import { Button } from '../../components/Button';
import { useRef, useState } from 'react';

import { api, dateTime } from '../api';
import { Failure, useRemote } from '../operations/common';
interface Reminder {
  id: string;
  title: string;
  notes: string;
  due_at: string;
  customer_id: string | null;
  done: number;
  active: number;
  version: number;
}
const payload = (r: Reminder, done: boolean, active = true) => ({
  title: r.title,
  notes: r.notes,
  due_at: r.due_at,
  customer_id: r.customer_id,
  done,
  active,
  version: r.version,
});
export function TodayReminders({ day }: { day: string }) {
  const view = useRemote<Reminder[]>('p1/reminders?through=' + day),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h2>Lembretes até este dia</h2>
      <Failure message={view.error || error} />
      <Button to="/gestao/lembretes" variant="ghost">
        Novo lembrete / gerenciar
      </Button>
      {view.data?.length === 0 && <p>Nenhum lembrete pendente.</p>}
      {view.data?.map((r) => (
        <article key={r.id}>
          <h3>{r.title}</h3>
          <p>{dateTime(r.due_at)}</p>
          {r.notes && <p>{r.notes}</p>}
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError('');
              void api(
                'p1/reminders/' + r.id,
                'PUT',
                payload(r, true),
                crypto.randomUUID(),
              )
                .then(view.refresh)
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
            loading={busy}
          >
            Concluir lembrete {r.title}
          </Button>
        </article>
      ))}
    </section>
  );
}
export function Reminders() {
  const view = useRemote<Reminder[]>('p1/reminders'),
    customers = useRemote<{ id: string; name: string }[]>('customers'),
    [editing, setEditing] = useState<Reminder | null>(null),
    [title, setTitle] = useState(''),
    [notes, setNotes] = useState(''),
    [due, setDue] = useState(''),
    [customer, setCustomer] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    request = useRef({ body: '', key: crypto.randomUUID() }),
    pending = useRef(false);
  function reset() {
    setEditing(null);
    setTitle('');
    setNotes('');
    setDue('');
    setCustomer('');
  }
  async function save(
    path: string,
    data: object,
    method: string,
    done?: () => void,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const signature = path + JSON.stringify(data);
    if (request.current.body !== signature)
      request.current = { body: signature, key: crypto.randomUUID() };
    try {
      await api(path, method, data, request.current.key);
      done?.();
      await view.refresh();
      setNotice('Lembrete salvo com histórico.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Lembretes</h1>
      <Failure message={error || view.error || customers.error} />
      <p role="status">{notice}</p>
      <form
        className="panel data-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save(
            'p1/reminders' + (editing ? '/' + editing.id : ''),
            {
              title,
              notes,
              due_at: new Date(due + ':00-03:00').toISOString(),
              customer_id: customer || null,
              ...(editing
                ? { version: editing.version, done: !!editing.done }
                : {}),
            },
            editing ? 'PUT' : 'POST',
            reset,
          );
        }}
      >
        <h2>{editing ? 'Editar lembrete' : 'Novo lembrete'}</h2>
        <label>
          Título do lembrete
          <input
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Quando lembrar (João Pessoa)
          <input
            required
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <label>
          Cliente do lembrete (opcional)
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          >
            <option value="">Sem cliente</option>
            {customers.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notas do lembrete
          <textarea
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <Button disabled={busy} variant="primary" loading={busy}>
          Salvar lembrete
        </Button>
        <Button type="button" onClick={reset}>
          Limpar edição
        </Button>
      </form>
      <p>
        São lembretes da gestão e da agenda. Nenhum push ou mensagem é enviado
        automaticamente.
      </p>
      {view.data?.map((r) => (
        <article className="panel" key={r.id}>
          <h2>
            {r.title} · {r.done ? 'Concluído' : 'Pendente'}
          </h2>
          <p>
            {dateTime(r.due_at)} · {r.notes}
          </p>
          <div className="actions">
            <Button
              onClick={() => {
                setEditing(r);
                setTitle(r.title);
                setNotes(r.notes);
                setDue(
                  new Date(Date.parse(r.due_at) - 10800000)
                    .toISOString()
                    .slice(0, 16),
                );
                setCustomer(r.customer_id || '');
              }}
            >
              Editar lembrete {r.title}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void save('p1/reminders/' + r.id, payload(r, !r.done), 'PUT')
              }
              loading={busy}
            >
              {r.done ? 'Reabrir' : 'Concluir'} lembrete {r.title}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (confirm('Arquivar este lembrete?'))
                  void save(
                    'p1/reminders/' + r.id,
                    payload(r, !!r.done, false),
                    'PUT',
                  );
              }}
              variant="danger"
              loading={busy}
            >
              Arquivar lembrete {r.title}
            </Button>
          </div>
        </article>
      ))}
    </>
  );
}
