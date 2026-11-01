import { useEffect, useRef, useState } from 'react';
import { MoneyInput } from '../../components/NumericInputs';
import { api, money } from '../api';
import { Failure, type OperationalOrder } from '../operations/common';
import { travelLegs, travelModes } from '../../../shared/field';
import { useField } from './FieldContext';
export function TravelSheet({
  orders,
  onClose,
  onSaved,
}: {
  orders: OperationalOrder[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const c = useField(),
    dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null),
    pending = useRef(false),
    request = useRef({ body: '', key: crypto.randomUUID() });
  const [mode, setMode] = useState<keyof typeof travelModes>('uber'),
    [leg, setLeg] = useState<keyof typeof travelLegs>('roundtrip'),
    [amount, setAmount] = useState<number | null>(null),
    [performer, setPerformer] = useState(c?.data?.user_id ?? ''),
    [courier, setCourier] = useState(''),
    [notes, setNotes] = useState(''),
    [when, setWhen] = useState(() =>
      new Date(Date.now() - 10800000).toISOString().slice(0, 16),
    ),
    [method, setMethod] = useState('pix'),
    [selected, setSelected] = useState(orders.map((o) => o.id)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    trigger.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => trigger.current?.focus();
  }, []);
  async function save() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const invalid =
        dialog.current?.querySelector<HTMLInputElement>('input:invalid');
      if (invalid) {
        invalid.reportValidity();
        throw Error('Confira o valor indicado.');
      }
      if (amount === null)
        throw Error('Informe o valor pago, inclusive zero se não houve custo.');
      const data = {
          mode,
          leg,
          occurred_at: new Date(when + ':00-03:00').toISOString(),
          amount_cents: amount,
          performer_id: mode === 'courier' ? null : performer || null,
          courier_name: mode === 'courier' ? courier : '',
          notes,
          method,
          order_ids: selected,
        },
        body = JSON.stringify(data);
      if (request.current.body !== body)
        request.current = { body, key: crypto.randomUUID() };
      await api('field/trips', 'POST', data, request.current.key);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const fee = orders.length === 1 ? orders[0].courier_fee_cents : 0;
  return (
    <dialog
      ref={dialog}
      className="help-sheet"
      aria-label="Quanto custou a corrida?"
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
    >
      <div className="sheet-body">
        <h2>Quanto custou a corrida?</h2>
        <p>
          Registre somente o que foi pago. Isto cria uma despesa de entrega; não
          solicita transporte.
        </p>
        <Failure message={error} />
        <div className="chips" aria-label="Meio de transporte">
          {Object.entries(travelModes).map(([v, label]) => (
            <button
              key={v}
              aria-pressed={mode === v}
              onClick={() => setMode(v as typeof mode)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="chips" aria-label="Trecho">
          {Object.entries(travelLegs).map(([v, label]) => (
            <button
              key={v}
              aria-pressed={leg === v}
              onClick={() => setLeg(v as typeof leg)}
            >
              {label}
            </button>
          ))}
        </div>
        <MoneyInput
          label="Valor pago (R$)"
          value={amount}
          onValueChange={setAmount}
        />
        {mode === 'courier' && fee > 0 && (
          <button
            onClick={() => {
              setAmount(fee);
              setCourier(orders[0].courier_name);
            }}
          >
            Confirmar pagamento da taxa combinada · {money(fee)}
          </button>
        )}
        <label>
          Data e hora do deslocamento
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </label>
        {mode === 'courier' ? (
          <label>
            Nome do motoboy
            <input
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
            />
          </label>
        ) : (
          <label>
            Quem fez
            <select
              value={performer}
              onChange={(e) => setPerformer(e.target.value)}
            >
              {c?.data?.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Forma do pagamento
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {[
              ['pix', 'Pix'],
              ['cash', 'Dinheiro'],
              ['debit', 'Débito'],
              ['credit', 'Crédito'],
              ['transfer', 'Transferência'],
              ['other', 'Outro'],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Pedidos atendidos</legend>
          {orders.map((o) => (
            <label key={o.id}>
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, o.id]
                      : selected.filter((id) => id !== o.id),
                  )
                }
              />
              {o.customer_name} · {money(o.total_cents)}
            </label>
          ))}
        </fieldset>
        <label>
          Observação
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button
          className="primary-action"
          disabled={busy || !selected.length || amount === null}
          onClick={() => void save()}
        >
          Registrar despesa paga
        </button>
        <button disabled={busy} onClick={onClose}>
          Pular
        </button>
      </div>
    </dialog>
  );
}
