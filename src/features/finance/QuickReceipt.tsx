import { MoneyField } from '../../components/NumericInputs';
import { useEffect, useRef, useState } from 'react';
import { api, money, parsePrice } from '../api';
import { useRemote, Failure, localDay } from '../operations/common';
import type { OperationalOrder } from '../operations/common';
import { paymentMethods, type Terms } from '../../../shared/finance';
export interface ReceiptResult {
  event_id: string;
  undo_id?: string;
  undo_seconds?: number;
  account_version: number;
  order_version: number;
}
export function QuickReceipt({
  order,
  onClose,
  onSaved,
}: {
  order: OperationalOrder;
  onClose: () => void;
  onSaved: (r: ReceiptResult) => void;
}) {
  const view = useRemote<{
      version: number;
      orders: {
        id: string;
        version: number;
        balance_cents: number;
        status: string;
        terms: Terms;
      }[];
    }>(`finance/customers/${order.customer_id}`),
    dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null),
    pending = useRef(false),
    request = useRef<{ body: string; key: string } | null>(null);
  const [amount, setAmount] = useState<string | null>(null),
    [method, setMethod] = useState<keyof typeof paymentMethods>('pix'),
    [day, setDay] = useState(localDay),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    trigger.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => trigger.current?.focus();
  }, []);
  const current = view.data?.orders.find((o) => o.id === order.id),
    value =
      amount ??
      (current
        ? (current.balance_cents / 100).toFixed(2).replace('.', ',')
        : '');
  const combined =
    current?.terms.mode === 'delivery' &&
    (current.status === 'out_for_delivery' ||
      (current.status === 'ready' && order.delivery_type === 'pickup'));
  async function save(deliver: boolean) {
    if (pending.current || !view.data || !current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const data = {
        version: view.data.version,
        order_id: order.id,
        order_version: current.version,
        amount_cents: parsePrice(value),
        method,
        paid_on: day,
        deliver,
      };
      const signature = JSON.stringify(data);
      if (request.current?.body !== signature)
        request.current = { body: signature, key: crypto.randomUUID() };
      const result = await api<ReceiptResult>(
        `finance/customers/${order.customer_id}/receive-today`,
        'POST',
        data,
        request.current!.key,
      );
      onSaved(result);
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
      aria-label="Recebimento rápido"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) dialog.current?.close();
      }}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
    >
      <div className="sheet-body">
        <h2>Recebi R$ · {order.customer_name}</h2>
        <Failure message={error || view.error} />
        {current ? (
          <form
            className="data-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save(false);
            }}
          >
            <p>
              Saldo do pedido: {money(current.balance_cents)}. Confira o
              recebimento antes de registrar.
            </p>
            <MoneyField
              label="Valor recebido (R$)"
              required
              value={value}
              onValueChange={setAmount}
            />
            <div className="chips" role="group" aria-label="Forma de pagamento">
              {Object.entries(paymentMethods).map(([v, label]) => (
                <button
                  type="button"
                  key={v}
                  aria-pressed={method === v}
                  onClick={() => setMethod(v as typeof method)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label>
              Dia do recebimento
              <input
                type="date"
                required
                max={localDay()}
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
            <button disabled={busy || current.balance_cents <= 0}>
              Registrar
            </button>
            {combined && (
              <button
                type="button"
                className="primary-action"
                disabled={busy || current.balance_cents <= 0}
                onClick={() => void save(true)}
              >
                Entregue e recebido
              </button>
            )}
            <p>Registro manual. Não consulta o banco nem envia mensagem.</p>
          </form>
        ) : (
          !view.error && <p role="status">Conferindo saldo e versão…</p>
        )}
        <button disabled={busy} onClick={() => dialog.current?.close()}>
          Fechar recebimento
        </button>
      </div>
    </dialog>
  );
}
