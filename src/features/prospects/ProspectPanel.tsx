import { DisclosureSummary } from '../../components/DisclosureSummary';
import { StaffIdentity } from '../field/FieldContext';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ChoiceChips } from '../../components/ChoiceChips';
import { Failure } from '../operations/common';
import { api, dateTime } from '../api';
import {
  emptyProspect,
  prospectLabels,
  prospectStages,
  type ProspectData,
} from '../../../shared/prospects';
export function ProspectFields({
  value,
  onChange,
}: {
  value: ProspectData;
  onChange: (v: ProspectData) => void;
}) {
  return (
    <>
      <label>
        Pessoa de contato
        <input
          maxLength={120}
          value={value.contact_person}
          onChange={(e) =>
            onChange({ ...value, contact_person: e.target.value })
          }
        />
      </label>
      <label>
        Como conheceu
        <input
          maxLength={200}
          value={value.source}
          onChange={(e) => onChange({ ...value, source: e.target.value })}
        />
      </label>
      <FollowUp value={value} onChange={onChange} />
    </>
  );
}
function FollowUp({
  value,
  onChange,
}: {
  value: ProspectData;
  onChange: (v: ProspectData) => void;
}) {
  const local = value.next_step_at
    ? new Date(Date.parse(value.next_step_at) - 10800000)
        .toISOString()
        .slice(0, 16)
    : '';
  return (
    <>
      <ChoiceChips
        label="Etapa do contato"
        value={value.stage}
        options={prospectStages.map((s) => [s, prospectLabels[s]] as const)}
        onChange={(stage) =>
          onChange({ ...value, stage: stage as ProspectData['stage'] })
        }
      />
      <label>
        Data do próximo passo
        <input
          type="datetime-local"
          value={local}
          onChange={(e) =>
            onChange({
              ...value,
              next_step_at: e.target.value
                ? new Date(e.target.value + ':00-03:00').toISOString()
                : '',
            })
          }
        />
      </label>
      {value.stage === 'not_interested' && (
        <label>
          Motivo (opcional)
          <textarea
            maxLength={500}
            value={value.reason}
            onChange={(e) => onChange({ ...value, reason: e.target.value })}
          />
        </label>
      )}
    </>
  );
}
interface History {
  events: {
    id: string;
    user_id: string;
    from_stage: string;
    to_stage: keyof typeof prospectLabels;
    next_step_at: string;
    reason: string;
    created_at: string;
  }[];
}
export function ProspectPanel({
  customer,
  financial,
  onChanged,
}: {
  customer: {
    id: string;
    kind?: string;
    version: number;
    active: number;
    prospect?: ProspectData;
  };
  financial: boolean;
  onChanged: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState(customer.prospect ?? emptyProspect());
  const [history, setHistory] = useState<History | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const pending = useRef(false),
    request = useRef({ signature: '', key: '' });
  async function send(action: 'stage' | 'convert') {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const data =
      action === 'convert'
        ? { version: customer.version }
        : {
            version: customer.version,
            stage: value.stage,
            next_step_at: value.next_step_at,
            reason: value.reason,
          };
    const signature = action + JSON.stringify(data);
    if (request.current.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    try {
      await api(
        'prospects/' + customer.id + '/' + action,
        'POST',
        data,
        request.current.key,
      );
      await onChanged();
      if (action === 'convert' && financial)
        navigate('/gestao/clientes/' + customer.id + '/b2b?convertido=1');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (!customer.prospect) return null;
  const contact = customer.kind === 'prospect';
  return (
    <section className="prospect-panel" aria-label="Acompanhamento do contato">
      <p>
        <strong className="status-tag">
          {prospectLabels[customer.prospect.stage]}
        </strong>
      </p>
      {contact && (
        <p>
          Próximo passo:{' '}
          {customer.prospect.next_step_at
            ? dateTime(customer.prospect.next_step_at)
            : 'a definir'}
        </p>
      )}
      <Failure message={error} />
      {contact && !!customer.active && (
        <>
          <details>
            <DisclosureSummary>Atualizar acompanhamento</DisclosureSummary>
            <form
              className="data-form"
              onSubmit={(e) => {
                e.preventDefault();
                void send('stage');
              }}
            >
              <fieldset disabled={busy}>
                <FollowUp value={value} onChange={setValue} />
                <Button variant="primary" loading={busy} disabled={busy}>
                  Salvar acompanhamento
                </Button>
              </fieldset>
            </form>
          </details>
          <Button
            type="button"
            variant="primary"
            loading={busy}
            disabled={busy}
            onClick={() => void send('convert')}
          >
            Virou cliente
          </Button>
        </>
      )}
      <details
        onToggle={(e) => {
          if (e.currentTarget.open && !history)
            void api<History>('prospects/' + customer.id)
              .then(setHistory)
              .catch((e) => setError(e.message));
        }}
      >
        <DisclosureSummary>Histórico do contato</DisclosureSummary>
        {history && (
          <ul>
            {history.events.map((e) => (
              <li key={e.id}>
                {dateTime(e.created_at)} · {prospectLabels[e.to_stage]}
                {' · '}
                <StaffIdentity id={e.user_id} />
                {e.from_stage === e.to_stage ? ' (cadastro atualizado)' : ''}
                {e.next_step_at
                  ? ' · Próximo passo: ' + dateTime(e.next_step_at)
                  : ''}
                {e.reason ? ' · ' + e.reason : ''}
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}
