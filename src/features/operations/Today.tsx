import { QuickReceipt, type ReceiptResult } from '../finance/QuickReceipt';
import { FinanceSummary } from '../finance/Finance';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  Truck,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import { api, dateTime, money } from '../api';
import { HelpTip } from '../../components/HelpTip';
import {
  statusLabels,
  UNDO_SECONDS,
  type Status,
} from '../../../shared/order-state';
import {
  useRemote,
  Failure,
  localDay,
  MapLink,
  type OperationalOrder,
} from './common';
function DayTotals({
  totals,
  financial = false,
}: {
  totals: { expected_cents: number; delivered_cents: number };
  financial?: boolean;
}) {
  return (
    <>
      {' '}
      <div className="summary-grid">
        <section className="panel">
          <h2>Previsto no dia</h2>
          <strong className="big-number">{money(totals.expected_cents)}</strong>
          <p>Confirmados até saída para entrega.</p>
        </section>
        <section className="panel">
          <h2>Entregue no dia</h2>
          <strong className="big-number">
            {money(totals.delivered_cents)}
          </strong>
          <p>Valor dos pedidos entregues/retirados, não recebido.</p>
        </section>
      </div>
      {!financial && (
        <p>
          A receber e recebimentos: disponíveis na próxima etapa financeira.{' '}
          <HelpTip topic="balance" />
        </p>
      )}
    </>
  );
}
export function Today({
  role,
  financial = false,
}: {
  role: string;
  financial?: boolean;
}) {
  const [receipt, setReceipt] = useState<OperationalOrder | null>(null),
    [combinedUndo, setCombinedUndo] = useState<
      (ReceiptResult & { customer_id: string }) | null
    >(null),
    [notice, setNotice] = useState('');
  useEffect(() => {
    if (!combinedUndo) return;
    const timer = setTimeout(() => setCombinedUndo(null), UNDO_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [combinedUndo]);
  const [day, setDay] = useState(localDay);
  const view = useRemote<{
    day: string;
    orders: OperationalOrder[];
    production: {
      name: string;
      label: string;
      day: string;
      boxes: number;
      units: number;
      weight_grams: number;
    }[];
    totals: { expected_cents: number; delivered_cents: number };
    received_available: boolean;
    truncated: boolean;
  }>(`today?date=${day}`);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [undo, setUndo] = useState<{
    orderId: string;
    eventId: string;
    version: number;
  } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [undo]);
  async function quick(order: OperationalOrder, to: Status) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setActionError('');
    try {
      const result = await api<{ event_id: string; undo_seconds: number }>(
        `orders/${order.id}/status`,
        'POST',
        { version: order.version, to },
        crypto.randomUUID(),
      );
      if (result.undo_seconds)
        setUndo({
          orderId: order.id,
          eventId: result.event_id,
          version: order.version + 1,
        });
      await view.refresh();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading today-heading">
        <div>
          <p className="eyebrow">SUA ROTINA</p>
          <h1>Hoje</h1>
          <p>
            {role === 'owner'
              ? 'Produção e pedidos em um só lugar.'
              : 'Entregas e contatos ao alcance da mão.'}
          </p>
        </div>
        <button onClick={() => void view.refresh()} aria-label="Atualizar Hoje">
          <RefreshCw size={20} aria-hidden="true" />
        </button>
      </div>
      <label>
        Dia de trabalho
        <input
          type="date"
          value={day}
          onChange={(e) => {
            if (e.target.value) setDay(e.target.value);
          }}
        />
      </label>
      <Failure message={view.error || actionError} />
      <p role="status">{notice}</p>
      {receipt && (
        <QuickReceipt
          order={receipt}
          onClose={() => setReceipt(null)}
          onSaved={(result) => {
            if (result.undo_id)
              setCombinedUndo({ ...result, customer_id: receipt.customer_id });
            setReceipt(null);
            setNotice(
              result.undo_id
                ? 'Entrega e recebimento registrados.'
                : 'Recebimento registrado.',
            );
            void view.refresh();
          }}
        />
      )}
      {combinedUndo && (
        <button
          disabled={busy}
          onClick={() => {
            if (pending.current) return;
            pending.current = true;
            setBusy(true);
            void api(
              `finance/customers/${combinedUndo.customer_id}/undo-today`,
              'POST',
              {
                version: combinedUndo.account_version,
                order_version: combinedUndo.order_version,
                undo_id: combinedUndo.undo_id,
              },
              crypto.randomUUID(),
            )
              .then(() => {
                setCombinedUndo(null);
                setNotice('Entrega e recebimento desfeitos com histórico.');
                return view.refresh();
              })
              .catch((e) => setActionError(e.message))
              .finally(() => {
                pending.current = false;
                setBusy(false);
              });
          }}
        >
          Desfazer entrega e recebimento
        </button>
      )}

      {undo && (
        <button
          disabled={busy}
          onClick={() => {
            if (pending.current) return;
            pending.current = true;
            setBusy(true);
            void api(
              `orders/${undo.orderId}/undo`,
              'POST',
              { version: undo.version, event_id: undo.eventId },
              crypto.randomUUID(),
            )
              .then(() => {
                setUndo(null);
                return view.refresh();
              })
              .catch((e) => setActionError(e.message))
              .finally(() => {
                pending.current = false;
                setBusy(false);
              });
          }}
        >
          <Undo2 size={20} aria-hidden="true" /> Desfazer entrega
        </button>
      )}
      {view.data && view.data.day === day ? (
        <>
          {view.data.truncated && (
            <p role="alert">
              Mais de 200 pedidos no período. A lista abaixo está limitada; use
              a busca em Pedidos para conferir os demais.
            </p>
          )}
          {role === 'owner' && (
            <section className="panel">
              <h2>
                Produzir hoje / amanhã <HelpTip topic="production" />
              </h2>
              {view.data.production.length ? (
                <ul className="production-list">
                  {view.data.production.map((line, i) => (
                    <li key={i}>
                      <strong>
                        {line.name} · {line.label} · {line.weight_grams} g/un.
                      </strong>
                      <span>
                        {line.units} unidades · {line.boxes} embalagens
                      </span>
                      <small>{line.day === day ? 'Hoje' : 'Amanhã'}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  Nada confirmado para produzir.{' '}
                  <Link to="/gestao/recorrentes">Gerar pedidos da semana?</Link>
                </p>
              )}
            </section>
          )}
          {financial && role === 'owner' && <FinanceSummary compact />}
          {role === 'owner' && (
            <DayTotals totals={view.data.totals} financial={financial} />
          )}
          <h2>
            {role === 'owner' ? 'Pedidos e pendências' : 'Entregas do dia'}
          </h2>
          <div className="record-list">
            {view.data.orders
              .filter(
                (o) =>
                  new Date(Date.parse(o.due_at) - 10800000)
                    .toISOString()
                    .slice(0, 10) === day,
              )
              .map((order) => (
                <article className="panel order-card" key={order.id}>
                  <div className="section-heading">
                    <h3>{order.customer_name}</h3>
                    <span className={`status-tag status-${order.status}`}>
                      <Truck size={16} aria-hidden="true" />
                      {statusLabels[order.status]}
                    </span>
                  </div>
                  <p>
                    {dateTime(order.due_at)} · {money(order.total_cents)}
                  </p>
                  <ul>
                    {order.items.map((i) => (
                      <li key={i.variant_id}>
                        {i.quantity} × {i.product_name} — {i.variant_label}
                      </li>
                    ))}
                  </ul>
                  <p>
                    {order.delivery_type === 'pickup'
                      ? 'Retirada'
                      : order.delivery_address || 'Endereço a preencher'}
                  </p>
                  <p>
                    Entregador:{' '}
                    {order.courier === 'unassigned'
                      ? 'A definir'
                      : order.courier === 'owner'
                        ? 'Proprietário'
                        : order.courier === 'partner'
                          ? 'Esposa'
                          : order.courier_name || 'Motoboy'}
                  </p>
                  <div className="actions">
                    {order.delivery_type === 'delivery' && (
                      <MapLink order={order} />
                    )}
                    <Link
                      className="button secondary"
                      to={`/gestao/pedidos/${order.id}#whatsapp`}
                    >
                      <MessageCircle size={20} aria-hidden="true" /> WhatsApp
                    </Link>
                    {(order.status === 'out_for_delivery' ||
                      (order.status === 'ready' &&
                        order.delivery_type === 'pickup')) && (
                      <button
                        className="primary-action"
                        disabled={busy}
                        onClick={() =>
                          void quick(
                            order,
                            order.delivery_type === 'pickup'
                              ? 'picked_up'
                              : 'delivered',
                          )
                        }
                      >
                        {order.delivery_type === 'pickup'
                          ? 'Marcar retirado'
                          : 'Marcar entregue'}
                      </button>
                    )}
                    {financial &&
                      !['draft', 'awaiting_confirmation', 'cancelled'].includes(
                        order.status,
                      ) && (
                        <button
                          disabled={busy}
                          onClick={() => setReceipt(order)}
                        >
                          Recebi R$
                        </button>
                      )}
                    <Link className="button" to={`/gestao/pedidos/${order.id}`}>
                      Abrir pedido <ChevronRight size={20} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
          </div>
          {view.data.orders.length === 0 && (
            <section className="empty-state">
              <CheckCircle2 size={36} aria-hidden="true" />
              <h2>Nenhuma entrega neste período.</h2>
              <Link to="/gestao/recorrentes">Preparar pedidos da semana</Link>
            </section>
          )}
          {financial && role !== 'owner' && <FinanceSummary compact />}
          {role !== 'owner' && (
            <DayTotals totals={view.data.totals} financial={financial} />
          )}
        </>
      ) : (
        !view.error && <p role="status">Carregando seu dia…</p>
      )}
    </>
  );
}
