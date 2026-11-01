import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, ChevronRight, Undo2 } from 'lucide-react';
import { api, dateTime, money, parsePrice } from '../api';
import { HelpTip } from '../../components/HelpTip';
import {
  nextStatuses,
  statusLabels,
  type Status,
  type MessageKind,
} from '../../../shared/order-state';
import {
  useRemote,
  Failure,
  MapLink,
  nextLabel,
  type OperationalOrder,
} from './common';
export function OrderDetail() {
  const { id } = useParams();
  const view = useRemote<OperationalOrder>(`orders/${id}`);
  const history = useRemote<
    {
      id: string;
      from_status: Status;
      to_status: Status;
      reason: string;
      user_id: string;
      created_at: number;
      undo_of: string | null;
    }[]
  >(`orders/${id}/history`);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [undo, setUndo] = useState<string | null>(null),
    [kind, setKind] = useState<MessageKind>('confirmation'),
    [message, setMessage] = useState(''),
    [phone, setPhone] = useState('');
  const key = useRef(crypto.randomUUID());
  const [delivery, setDelivery] = useState<{
    delivery_type: 'delivery' | 'pickup';
    delivery_address: string;
    courier: 'unassigned' | 'owner' | 'partner' | 'courier';
    courier_name: string;
    price: string;
  } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 10000);
    return () => clearTimeout(timer);
  }, [undo]);
  async function act(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
      key.current = crypto.randomUUID();
      await view.refresh();
      await history.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function advance(to: Status, reason = '') {
    if (!view.data) return;
    await act(async () => {
      const result = await api<{ event_id: string; undo_seconds: number }>(
        `orders/${id}/status`,
        'POST',
        { version: view.data!.version, to, reason },
        key.current,
      );
      setNotice(`Status atualizado: ${statusLabels[to]}.`);
      if (result.undo_seconds) setUndo(result.event_id);
    });
  }
  useEffect(() => {
    if (view.data && window.location.hash === '#whatsapp')
      document.getElementById('whatsapp')?.scrollIntoView();
  }, [view.data]);
  const order = view.data;
  const next = order
    ? nextStatuses(order.status, order.delivery_type).find(
        (s) =>
          s !== 'cancelled' && s !== 'awaiting_confirmation' && s !== 'draft',
      )
    : undefined;
  const final =
    order && ['delivered', 'picked_up', 'cancelled'].includes(order.status);
  return (
    <>
      <Link to="/gestao/pedidos">
        <ArrowLeft size={20} aria-hidden="true" /> Pedidos
      </Link>
      <Failure message={error || view.error || history.error} />
      {order ? (
        <>
          <h1>{order.customer_name}</h1>
          <p>
            {dateTime(order.due_at)} · {money(order.total_cents)}
          </p>
          <p className={`status-tag status-${order.status}`}>
            {statusLabels[order.status]} <HelpTip topic="status" />
          </p>
          <p role="status">{notice}</p>
          {undo && (
            <button
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await api(
                    `orders/${id}/undo`,
                    'POST',
                    { version: order.version, event_id: undo },
                    key.current,
                  );
                  setUndo(null);
                  setNotice('Entrega desfeita; o histórico foi preservado.');
                })
              }
            >
              <Undo2 size={20} aria-hidden="true" /> Desfazer entrega
            </button>
          )}
          {order.notes && (
            <section className="panel">
              <h2>Observações</h2>
              <p>{order.notes}</p>
            </section>
          )}
          <section className="panel">
            <h2>
              Itens <HelpTip topic="composition" />
            </h2>
            <ul>
              {order.items.map((i) => (
                <li key={i.variant_id}>
                  {i.quantity} embalagens · {i.product_name} — {i.variant_label}{' '}
                  · {i.quantity * i.units_per_box} unidades ·{' '}
                  {money(i.unit_price_cents)} por embalagem
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>
              Entrega / retirada <HelpTip topic="courier" />
            </h2>
            {delivery ? (
              <form
                className="data-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    await api(`orders/${id}/delivery`, 'PUT', {
                      version: order.version,
                      delivery_type: delivery.delivery_type,
                      delivery_address: delivery.delivery_address,
                      courier: delivery.courier,
                      courier_name: delivery.courier_name,
                      courier_fee_cents: parsePrice(delivery.price),
                    });
                    setDelivery(null);
                    setNotice(
                      'Entrega atualizada. Nenhuma despesa foi criada.',
                    );
                  });
                }}
              >
                <div
                  className="chips"
                  role="group"
                  aria-label="Entrega ou retirada"
                >
                  {(['delivery', 'pickup'] as const).map((v) => (
                    <button
                      type="button"
                      key={v}
                      aria-pressed={delivery.delivery_type === v}
                      onClick={() =>
                        setDelivery({ ...delivery, delivery_type: v })
                      }
                    >
                      {v === 'delivery' ? 'Entrega' : 'Retirada'}
                    </button>
                  ))}
                </div>
                <label>
                  Endereço e referência
                  <textarea
                    value={delivery.delivery_address}
                    onChange={(e) =>
                      setDelivery({
                        ...delivery,
                        delivery_address: e.target.value,
                      })
                    }
                  />
                </label>
                <div className="chips" role="group" aria-label="Entregador">
                  {(['unassigned', 'owner', 'partner', 'courier'] as const).map(
                    (v) => (
                      <button
                        type="button"
                        key={v}
                        aria-pressed={delivery.courier === v}
                        onClick={() => setDelivery({ ...delivery, courier: v })}
                      >
                        {v === 'unassigned'
                          ? 'A definir'
                          : v === 'owner'
                            ? 'Proprietário'
                            : v === 'partner'
                              ? 'Esposa'
                              : 'Motoboy'}
                      </button>
                    ),
                  )}
                </div>
                {delivery.courier === 'courier' && (
                  <>
                    <label>
                      Nome do motoboy
                      <input
                        required
                        value={delivery.courier_name}
                        onChange={(e) =>
                          setDelivery({
                            ...delivery,
                            courier_name: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Taxa do motoboy (R$)
                      <input
                        inputMode="decimal"
                        required
                        value={delivery.price}
                        onChange={(e) =>
                          setDelivery({ ...delivery, price: e.target.value })
                        }
                      />
                    </label>
                    <p>
                      Registrar taxa não cria gasto nem muda o total do pedido.
                    </p>
                  </>
                )}
                <div className="actions">
                  <button disabled={busy}>Salvar entrega</button>
                  <button type="button" onClick={() => setDelivery(null)}>
                    Voltar sem salvar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p>
                  {order.delivery_type === 'pickup'
                    ? 'Retirada combinada'
                    : order.delivery_address || 'Endereço não informado'}
                </p>
                <p>
                  Entregador:{' '}
                  {order.courier === 'unassigned'
                    ? 'A definir'
                    : order.courier === 'owner'
                      ? 'Proprietário'
                      : order.courier === 'partner'
                        ? 'Esposa'
                        : order.courier_name || 'Motoboy'}{' '}
                  · taxa registrada {money(order.courier_fee_cents)}
                </p>
                <div className="actions">
                  {order.delivery_type === 'delivery' && (
                    <MapLink order={order} />
                  )}
                  <button
                    disabled={!!final}
                    onClick={() =>
                      setDelivery({
                        delivery_type: order.delivery_type,
                        delivery_address: order.delivery_address,
                        courier: order.courier,
                        courier_name: order.courier_name,
                        price: (order.courier_fee_cents / 100)
                          .toFixed(2)
                          .replace('.', ','),
                      })
                    }
                  >
                    Editar entrega
                  </button>
                </div>
              </>
            )}
          </section>
          <section className="panel" id="whatsapp">
            <h2>
              WhatsApp assistido <HelpTip topic="whatsapp" />
            </h2>
            <label>
              Mensagem
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as MessageKind);
                  setMessage('');
                  setPhone('');
                }}
              >
                <option value="confirmation">Confirmação</option>
                <option value="on_the_way">A caminho</option>
                <option value="delivered">Entregue</option>
                <option value="pickup">Pronto para retirada</option>
                <option value="after_sale">Pós-venda</option>
              </select>
            </label>
            <button
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const preview = await api<{ message: string; phone: string }>(
                    `orders/${id}/message`,
                    'POST',
                    { kind },
                  );
                  setMessage(preview.message);
                  setPhone(preview.phone);
                })
              }
            >
              Preparar mensagem
            </button>
            {message && (
              <>
                <label>
                  Confira e edite antes de abrir
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </label>
                {message.trim() && !/[{}]/.test(message) && (
                  <a
                    className="button"
                    href={`https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={20} aria-hidden="true" /> Abrir
                    WhatsApp para conferir e enviar
                  </a>
                )}
                <p>O aplicativo não envia mensagens sozinho.</p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      await api(
                        `orders/${id}/contact`,
                        'POST',
                        { kind },
                        key.current,
                      );
                      setNotice(
                        'Contato anotado manualmente. Sem comprovação de envio.',
                      );
                    })
                  }
                >
                  Marcar contato realizado
                </button>
              </>
            )}
          </section>
          <details className="panel">
            <summary>Histórico de status</summary>
            {history.data?.length ? (
              <ol>
                {history.data.map((event) => (
                  <li key={event.id}>
                    {statusLabels[event.from_status]} →{' '}
                    {statusLabels[event.to_status]} ·{' '}
                    {dateTime(new Date(event.created_at * 1000).toISOString())}·
                    Usuário {event.user_id.slice(0, 8)}
                    {event.reason && ` · ${event.reason}`}
                    {event.undo_of && ' · Compensação registrada'}
                  </li>
                ))}
              </ol>
            ) : (
              <p>Nenhuma mudança registrada.</p>
            )}
          </details>
          <div className="sticky-actions">
            {next && (
              <button
                className="primary-action"
                disabled={busy}
                onClick={() => void advance(next)}
              >
                {nextLabel[next] || statusLabels[next]}{' '}
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            )}
            {!final && (
              <button
                disabled={busy}
                onClick={() => {
                  const reason = prompt('Motivo do cancelamento:');
                  if (
                    reason?.trim() &&
                    confirm('Cancelar o pedido? O histórico será preservado.')
                  )
                    void advance('cancelled', reason.trim());
                }}
              >
                Cancelar pedido
              </button>
            )}
            <button onClick={() => void view.refresh()}>Atualizar</button>
          </div>
        </>
      ) : (
        !view.error && <p>Carregando pedido…</p>
      )}
    </>
  );
}
