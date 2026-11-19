import { AvatarChip } from '../../components/AvatarChip';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { HelpTip } from '../../components/HelpTip';
import { StaffAvatar, StaffIdentity } from '../field/FieldContext';
import { Failure, useRemote } from '../operations/common';
import { privateDownload } from '../PrivateDownload';
import { dateTime } from '../api';
import { enablePushDevice, type PushState } from './push-device';
import type { AlertForm } from './reminder-form';
export function ReminderAlerts({
  value,
  onChange,
}: {
  value: AlertForm;
  onChange: (v: AlertForm) => void;
}) {
  const view = useRemote<PushState>('p1/push'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const state = view.data,
    recipients = value.recipients ?? (state ? [state.user_id] : []);
  function choose(next: AlertForm) {
    onChange(next);
    // Somente a escolha explícita de aviso para si pode pedir permissão.
    if (
      next.mode !== 'none' &&
      state?.configured &&
      recipients.includes(state.user_id) &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      setBusy(true);
      void enablePushDevice(state)
        .then(() => setNotice('Avisos ativados neste aparelho.'))
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false));
    }
  }
  return (
    <fieldset className="schedule-shortcuts" disabled={busy}>
      <legend>
        Avisar no celular <HelpTip topic="push" />
      </legend>
      <Failure message={error || view.error} />
      <p role="status">{notice}</p>
      {state?.environment === 'teste' ? (
        <p>Avisos desativados no ambiente de teste</p>
      ) : state?.ready ? (
        <>
          <div className="actions">
            {(
              [
                ['0', 'Na hora'],
                ['15', '15 min antes'],
                ['60', '1 h antes'],
                ['1440', '1 dia antes'],
                ['custom', 'Outro horário'],
                ['none', 'Não avisar'],
              ] as const
            ).map(([mode, label]) => (
              <Button
                key={mode}
                type="button"
                variant="chip"
                aria-pressed={value.mode === mode}
                onClick={() => choose({ ...value, mode })}
              >
                {label}
              </Button>
            ))}
          </div>
          {value.mode === 'custom' && (
            <label>
              Data e hora do aviso (João Pessoa)
              <input
                type="datetime-local"
                required
                value={value.custom}
                onChange={(e) => onChange({ ...value, custom: e.target.value })}
              />
            </label>
          )}
          <p>Para quem</p>
          <div className="actions">
            {state.staff.map((s) => (
              <AvatarChip
                key={s.id}
                type="button"
                aria-pressed={recipients.includes(s.id)}
                avatar={<StaffAvatar id={s.id} name={s.display_name} />}
                onClick={() =>
                  onChange({
                    ...value,
                    recipients: recipients.includes(s.id)
                      ? recipients.filter((id) => id !== s.id)
                      : [...recipients, s.id],
                  })
                }
              >
                {s.display_name}
              </AvatarChip>
            ))}
            {state.staff.length === 2 && (
              <Button
                type="button"
                variant="chip"
                aria-pressed={recipients.length === 2}
                onClick={() =>
                  onChange({
                    ...value,
                    recipients: state.staff.map((s) => s.id),
                  })
                }
              >
                Os dois
              </Button>
            )}
          </div>
          {value.mode !== 'none' && recipients.length === 0 && (
            <p role="alert">Escolha quem recebe o aviso.</p>
          )}
          <p>
            O aviso também acompanha o arquivo do calendário. Confira o alarme
            ao importar.
          </p>
          {!state.configured ? (
            <p>
              Avisos no celular ainda indisponíveis. Salve e use Adicionar ao
              calendário do celular.
            </p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setBusy(true);
                setError('');
                void enablePushDevice(state)
                  .then(() => setNotice('Avisos ativados neste aparelho.'))
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              Ativar avisos neste aparelho
            </Button>
          )}
        </>
      ) : (
        <p>
          Você pode salvar o lembrete e adicioná-lo ao calendário do celular.
        </p>
      )}
    </fieldset>
  );
}
export function ReminderDelivery({
  reminder,
}: {
  reminder: { id: string; alert_at?: string | null; recipient_ids?: string[] };
}) {
  const [error, setError] = useState('');
  return (
    <>
      {reminder.alert_at && <p>Aviso: {dateTime(reminder.alert_at)}</p>}
      {!!reminder.recipient_ids?.length && (
        <p>
          Para:{' '}
          {reminder.recipient_ids.map((id) => (
            <StaffIdentity key={id} id={id} />
          ))}
        </p>
      )}
      <Failure message={error} />
      <Button
        variant="ghost"
        type="button"
        onClick={() => {
          setError('');
          void privateDownload(
            `p1/reminders/${reminder.id}/calendar.ics`,
            'lembrete.ics',
          ).catch((e) => setError(e.message));
        }}
      >
        Adicionar ao calendário do celular
      </Button>
    </>
  );
}
