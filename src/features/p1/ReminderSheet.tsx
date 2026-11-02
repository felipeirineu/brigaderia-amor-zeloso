import {
  DayShortcuts,
  TimeShortcuts,
} from '../../components/ScheduleShortcuts';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { api } from '../api';
import { Failure } from '../operations/common';
export function ReminderSheet({
  day,
  onClose,
  onSaved,
}: {
  day: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null),
    pending = useRef(false),
    request = useRef({ body: '', key: crypto.randomUUID() });
  const [title, setTitle] = useState(''),
    [notes, setNotes] = useState(''),
    [due, setDue] = useState(
      () =>
        day + 'T' + new Date(Date.now() - 10800000).toISOString().slice(11, 16),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    trigger.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => trigger.current?.focus();
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const data = {
        title,
        notes,
        due_at: new Date(due + ':00-03:00').toISOString(),
        customer_id: null,
      };
      const body = JSON.stringify(data);
      if (request.current.body !== body)
        request.current = { body, key: crypto.randomUUID() };
      await api('p1/reminders', 'POST', data, request.current.key);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="help-sheet"
      aria-label="Novo lembrete"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="sheet-body">
        <h2>Novo lembrete</h2>
        <Failure message={error} />
        <form className="data-form" onSubmit={(e) => void save(e)}>
          <fieldset disabled={busy} className="customer-form-fields">
            <label>
              Título do lembrete
              <input
                required
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <fieldset className="schedule-shortcuts">
              <legend>Quando</legend>
              <DayShortcuts
                day={due.slice(0, 10)}
                onChange={(day) => setDue(day + due.slice(10))}
              />
            </fieldset>
            <fieldset className="schedule-shortcuts">
              <legend>Horário</legend>
              <TimeShortcuts
                time={due.slice(11, 16)}
                onChange={(time) => setDue(due.slice(0, 11) + time)}
              />
            </fieldset>
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
              Notas do lembrete
              <textarea
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <Button variant="primary" loading={busy} disabled={busy}>
              Salvar lembrete
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </Button>
          </fieldset>
        </form>
      </div>
    </dialog>
  );
}
