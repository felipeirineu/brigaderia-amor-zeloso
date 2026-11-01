import { MoneyField } from '../../components/NumericInputs';
import { useRef, useState } from 'react';
import { api, money, parsePrice } from '../api';
import { Failure, localDay } from '../operations/common';
import { paymentMethods } from '../../../shared/finance';
import type { View } from './Account';
export function CreditTools({
  data,
  root,
  onSaved,
}: {
  data: View;
  root: string;
  onSaved: () => Promise<void>;
}) {
  const [amount, setAmount] = useState(''),
    [method, setMethod] = useState<keyof typeof paymentMethods>('pix'),
    [day, setDay] = useState(localDay),
    [credit, setCredit] = useState(''),
    [order, setOrder] = useState(''),
    [useAmount, setUseAmount] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    pending = useRef(false),
    request = useRef({ body: '', key: crypto.randomUUID() });
  async function run(action: string, payload: object) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const body = { version: data.version, ...payload },
      signature = action + JSON.stringify(body);
    if (request.current.body !== signature)
      request.current = { body: signature, key: crypto.randomUUID() };
    try {
      await api(root + '/' + action, 'POST', body, request.current.key);
      await onSaved();
      setAmount('');
      setUseAmount('');
      setNotice('Crédito atualizado com histórico.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Saldo a favor: {money(data.available_credit_cents)}</h2>
      <Failure message={error} />
      {notice && <p role="status">{notice}</p>}
      <p>
        Adiantamento sem pedido. Usar crédito é uma escolha humana e não
        registra novo dinheiro entrando.
      </p>
      <details>
        <summary>Registrar adiantamento sem pedido</summary>
        <form
          className="data-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const cents = parsePrice(amount);
              if (
                confirm(
                  'Registrar o adiantamento recebido, sem vincular a pedido?',
                )
              )
                void run('credit', {
                  amount_cents: cents,
                  method,
                  paid_on: day,
                });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <MoneyField
            label="Crédito recebido (R$)"
            required
            value={amount}
            onValueChange={(value) => setAmount(value)}
          />
          <label>
            Forma do adiantamento
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
            >
              {Object.entries(paymentMethods).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Dia do adiantamento
            <input
              type="date"
              required
              max={localDay()}
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>
          <button disabled={busy}>Registrar crédito</button>
        </form>
      </details>
      {data.available_credit_cents > 0 && (
        <form
          className="data-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const selected = data.orders.find((o) => o.id === order);
              if (
                selected &&
                confirm('Usar crédito neste pedido? Não gera novo recebimento.')
              )
                void run('use-credit', {
                  credit_event_id: credit,
                  order_id: order,
                  order_version: selected.version,
                  amount_cents: parsePrice(useAmount),
                });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <h3>Usar crédito</h3>
          <label>
            Crédito disponível
            <select
              required
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
            >
              <option value="">Selecione</option>
              {data.credits
                .filter((c) => c.available_cents > 0)
                .map((c) => (
                  <option key={c.event_id} value={c.event_id}>
                    {c.event_id.slice(0, 8)} · {money(c.available_cents)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Pedido para usar crédito
            <select
              required
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            >
              <option value="">Selecione</option>
              {data.orders
                .filter(
                  (o) =>
                    !['draft', 'awaiting_confirmation', 'cancelled'].includes(
                      o.status,
                    ) && o.balance_cents > 0,
                )
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id.slice(0, 8)} · saldo {money(o.balance_cents)}
                  </option>
                ))}
            </select>
          </label>
          <MoneyField
            label="Valor a alocar (R$)"
            required
            value={useAmount}
            onValueChange={(value) => setUseAmount(value)}
          />
          <button disabled={busy}>Usar crédito selecionado</button>
        </form>
      )}
      {data.credits.map((c) => (
        <article key={c.event_id}>
          <h3>Crédito {c.event_id.slice(0, 8)}</h3>
          <p>
            Recebido {money(c.amount_cents)} · alocado{' '}
            {money(c.allocated_cents)} · estornado {money(c.refunded_cents)} ·
            disponível {money(c.available_cents)}
          </p>
          {c.available_cents > 0 && c.can_refund && (
            <button
              disabled={busy}
              onClick={() => {
                const value = prompt(
                    'Valor não alocado a estornar (R$):',
                    (c.available_cents / 100).toFixed(2).replace('.', ','),
                  ),
                  reason = value
                    ? prompt('Motivo do estorno do crédito:')
                    : null;
                if (
                  value &&
                  reason?.trim() &&
                  confirm('Registrar estorno do crédito não alocado?')
                )
                  try {
                    void run('refund-credit', {
                      credit_event_id: c.event_id,
                      amount_cents: parsePrice(value),
                      reason,
                    });
                  } catch (e) {
                    setError((e as Error).message);
                  }
              }}
            >
              Estornar crédito {c.event_id.slice(0, 8)}
            </button>
          )}
        </article>
      ))}
      {data.actor.role === 'owner' &&
        data.credit_allocations.map((p) => (
          <p key={p.event_id + ':' + p.order_id}>
            Crédito {p.event_id.slice(0, 8)} no pedido {p.order_id.slice(0, 8)}:{' '}
            {money(p.amount_cents)}{' '}
            <button
              disabled={busy}
              onClick={() => {
                const reason = prompt(
                  'Motivo para liberar esta alocação de crédito:',
                );
                const selected = data.orders.find((o) => o.id === p.order_id);
                if (
                  reason?.trim() &&
                  selected &&
                  confirm(
                    'Devolver a alocação ao saldo a favor? O pedido voltará a ter saldo.',
                  )
                )
                  void run('release-credit', {
                    credit_event_id: p.event_id,
                    order_id: p.order_id,
                    order_version: selected.version,
                    amount_cents: p.amount_cents,
                    reason,
                  });
              }}
            >
              Liberar alocação
            </button>
          </p>
        ))}
    </section>
  );
}
