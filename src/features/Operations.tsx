import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Truck,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Minus,
  Plus,
  Undo2,
} from 'lucide-react';
import { api, dateTime, money, parsePrice } from './api';
import { HelpTip } from '../components/HelpTip';
import {
  nextStatuses,
  statusLabels,
  type Status,
  type MessageKind,
} from '../../shared/order-state';
interface Item {
  variant_id: string;
  quantity: number;
  product_name?: string;
  variant_label?: string;
  units_per_box: number;
  unit_price_cents: number;
}
export interface OperationalOrder {
  id: string;
  customer_id: string;
  customer_name: string;
  notes: string;
  due_at: string;
  status: Status;
  version: number;
  delivery_type: 'delivery' | 'pickup';
  delivery_address: string;
  courier: 'unassigned' | 'owner' | 'partner' | 'courier';
  courier_name: string;
  courier_fee_cents: number;
  total_cents: number;
  items: Item[];
}
function useRemote<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setData(await api<T>(path));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [path]);
  useEffect(() => {
    let current = true;
    api<T>(path)
      .then((d) => {
        if (current) {
          setData(d);
          setError('');
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [path]);
  return { data, error, refresh };
}
function Failure({ message }: { message: string }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
const localDay = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
function MapLink({ order }: { order: OperationalOrder }) {
  return order.delivery_address ? (
    <a
      className="button secondary"
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`}
      target="_blank"
      rel="noreferrer"
    >
      <MapPin size={20} aria-hidden="true" /> Mapa
    </a>
  ) : (
    <span>Endereço a preencher</span>
  );
}
const nextLabel: Partial<Record<Status, string>> = {
  confirmed: 'Confirmar',
  in_production: 'Iniciar produção',
  ready: 'Marcar pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Marcar entregue',
  picked_up: 'Marcar retirado',
};
function DayTotals({
  totals,
}: {
  totals: { expected_cents: number; delivered_cents: number };
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
      <p>
        A receber e recebimentos: disponíveis na próxima etapa financeira.{' '}
        <HelpTip topic="balance" />
      </p>
    </>
  );
}
export function Today({ role }: { role: string }) {
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
    const timer = setTimeout(() => setUndo(null), 10000);
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
          {role === 'owner' && <DayTotals totals={view.data.totals} />}
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
          {role !== 'owner' && <DayTotals totals={view.data.totals} />}
        </>
      ) : (
        !view.error && <p role="status">Carregando seu dia…</p>
      )}
    </>
  );
}
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
interface Plan {
  id: string;
  customer_id: string;
  customer_name: string;
  name: string;
  weekday: number;
  time: string;
  notes: string;
  delivery_type: 'delivery' | 'pickup';
  delivery_address: string;
  active: number;
  version: number;
  items: { variant_id: string; quantity: number }[];
}
interface ProductOption {
  id: string;
  name: string;
  variants: { id: string; label: string; active: number }[];
}
const weekDayNames = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
];
function monday() {
  const date = new Date(localDay() + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
export function Recurring() {
  const plans = useRemote<Plan[]>('recurring'),
    customers = useRemote<{ id: string; name: string }[]>('customers'),
    products = useRemote<ProductOption[]>('products');
  const [editing, setEditing] = useState<Plan | null>(null),
    [name, setName] = useState(''),
    [customer, setCustomer] = useState(''),
    [weekday, setWeekday] = useState(1),
    [time, setTime] = useState('10:00'),
    [type, setType] = useState<'delivery' | 'pickup'>('delivery'),
    [address, setAddress] = useState(''),
    [items, setItems] = useState([{ variant_id: '', quantity: 1 }]),
    [week, setWeek] = useState(monday),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const options =
    products.data?.flatMap((p) =>
      p.variants
        .filter((v) => v.active)
        .map((v) => ({ id: v.id, name: `${p.name} — ${v.label}` })),
    ) ?? [];
  function reset() {
    setEditing(null);
    setName('');
    setCustomer('');
    setWeekday(1);
    setType('delivery');
    setAddress('');
    setItems([{ variant_id: '', quantity: 1 }]);
    key.current = crypto.randomUUID();
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
      await plans.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      await api(
        `recurring${editing ? `/${editing.id}` : ''}`,
        editing ? 'PUT' : 'POST',
        {
          name,
          customer_id: customer,
          weekday,
          time,
          delivery_type: type,
          delivery_address: address,
          notes: editing?.notes ?? '',
          items,
          ...(editing
            ? { version: editing.version, active: !!editing.active }
            : {}),
        },
        key.current,
      );
      reset();
      setNotice('Pedido padrão salvo. Nenhum pedido foi confirmado.');
    });
  }
  return (
    <>
      <h1>
        Pedidos padrão <HelpTip topic="recurring" />
      </h1>
      <Failure
        message={error || plans.error || customers.error || products.error}
      />
      <p role="status">{notice}</p>
      <section className="panel">
        <h2>
          Gerar pedidos da semana <HelpTip topic="generate" />
        </h2>
        <label>
          Segunda-feira da semana
          <input
            type="date"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
          />
        </label>
        <button
          className="primary-action"
          disabled={busy || !plans.data?.some((p) => p.active)}
          onClick={() =>
            void run(async () => {
              const result = await api<{
                created: number;
                already_present: number;
              }>('generate-week', 'POST', { week });
              setNotice(
                `${result.created} rascunho(s) criado(s); ${result.already_present} já existente(s). Revise e confirme em Pedidos.`,
              );
            })
          }
        >
          Gerar pedidos da semana
        </button>
        <p>
          Gera rascunhos. Não duplica a mesma semana e não confirma
          automaticamente.
        </p>
        <Link to="/gestao/pedidos">Revisar pedidos gerados</Link>
      </section>
      <form className="panel data-form" onSubmit={save}>
        <h2>{editing ? 'Editar modelo' : 'Novo pedido padrão'}</h2>
        <label>
          Nome do modelo
          <input
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Cliente
          <select
            required
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          >
            <option value="">Selecione</option>
            {customers.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="chips" role="group" aria-label="Dia habitual">
          {weekDayNames.map((label, i) => (
            <button
              type="button"
              key={label}
              aria-pressed={weekday === i + 1}
              onClick={() => setWeekday(i + 1)}
            >
              {label}
            </button>
          ))}
        </div>
        <label>
          Horário de João Pessoa
          <input
            required
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <div className="chips" role="group" aria-label="Tipo de entrega">
          {(['delivery', 'pickup'] as const).map((v) => (
            <button
              type="button"
              key={v}
              aria-pressed={type === v}
              onClick={() => setType(v)}
            >
              {v === 'delivery' ? 'Entrega' : 'Retirada'}
            </button>
          ))}
        </div>
        <label>
          Endereço para copiar aos novos pedidos
          <textarea
            maxLength={1000}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        {items.map((item, i) => (
          <fieldset key={i}>
            <legend>Item {i + 1}</legend>
            <label>
              Variante
              <select
                required
                value={item.variant_id}
                onChange={(e) =>
                  setItems(
                    items.map((v, j) =>
                      j === i ? { ...v, variant_id: e.target.value } : v,
                    ),
                  )
                }
              >
                <option value="">Selecione</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="stepper">
              <button
                type="button"
                aria-label={`Diminuir quantidade do item ${i + 1}`}
                disabled={item.quantity <= 1}
                onClick={() =>
                  setItems(
                    items.map((v, j) =>
                      j === i ? { ...v, quantity: v.quantity - 1 } : v,
                    ),
                  )
                }
              >
                <Minus size={20} />
              </button>
              <label>
                Embalagens
                <input
                  inputMode="numeric"
                  type="number"
                  min="1"
                  max="10000"
                  required
                  value={item.quantity}
                  onChange={(e) =>
                    setItems(
                      items.map((v, j) =>
                        j === i
                          ? { ...v, quantity: Number(e.target.value) }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                aria-label={`Aumentar quantidade do item ${i + 1}`}
                onClick={() =>
                  setItems(
                    items.map((v, j) =>
                      j === i
                        ? { ...v, quantity: Math.min(v.quantity + 1, 10000) }
                        : v,
                    ),
                  )
                }
              >
                <Plus size={20} />
              </button>
            </div>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems(items.filter((_, j) => j !== i))}
              >
                Remover item {i + 1}
              </button>
            )}
          </fieldset>
        ))}
        <div className="actions">
          <button
            type="button"
            disabled={items.length >= 30}
            onClick={() =>
              setItems([...items, { variant_id: '', quantity: 1 }])
            }
          >
            Adicionar item
          </button>
          <button disabled={busy}>Salvar pedido padrão</button>
          <button type="button" onClick={reset}>
            Limpar edição
          </button>
        </div>
      </form>
      {plans.data?.map((p) => (
        <article className="panel" key={p.id}>
          <h2>{p.name}</h2>
          <p>
            {p.customer_name} · {weekDayNames[p.weekday - 1]} · {p.time} ·{' '}
            {p.active ? 'Ativo' : 'Pausado'}
          </p>
          <div className="actions">
            <button
              onClick={() => {
                setEditing(p);
                setName(p.name);
                setCustomer(p.customer_id);
                setWeekday(p.weekday);
                setTime(p.time);
                setType(p.delivery_type);
                setAddress(p.delivery_address);
                setItems(
                  p.items.map((i) => ({
                    variant_id: i.variant_id,
                    quantity: i.quantity,
                  })),
                );
              }}
            >
              Editar {p.name}
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api(`recurring/${p.id}`, 'PUT', {
                    name: p.name,
                    customer_id: p.customer_id,
                    weekday: p.weekday,
                    time: p.time,
                    notes: p.notes,
                    delivery_type: p.delivery_type,
                    delivery_address: p.delivery_address,
                    items: p.items.map((i) => ({
                      variant_id: i.variant_id,
                      quantity: i.quantity,
                    })),
                    active: !p.active,
                    version: p.version,
                  });
                  setNotice(p.active ? 'Modelo pausado.' : 'Modelo reativado.');
                })
              }
            >
              {p.active ? 'Pausar' : 'Reativar'} {p.name}
            </button>
          </div>
        </article>
      ))}
    </>
  );
}
const messageLabels: Record<MessageKind, string> = {
  confirmation: 'Confirmação',
  on_the_way: 'A caminho',
  delivered: 'Entregue',
  pickup: 'Retirada',
  after_sale: 'Pós-venda',
};
export function MessageTemplates() {
  const view =
    useRemote<{ kind: MessageKind; content: string }[]>('message-templates');
  const [selected, setSelected] = useState<MessageKind>('confirmation'),
    [content, setContent] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  return (
    <>
      <h1>
        Modelos de mensagem <HelpTip topic="whatsapp" />
      </h1>
      <Failure message={error || view.error} />
      <p role="status">{notice}</p>
      <p>
        Campos permitidos: cliente, numero_pedido, itens, total, data, hora,
        endereco, entre chaves. Não há saldo/fechamento antes da etapa
        financeira.
      </p>
      {view.data?.map((t) => (
        <section className="panel" key={t.kind}>
          <h2>
            {t.kind === 'confirmation'
              ? 'Confirmação'
              : t.kind === 'on_the_way'
                ? 'A caminho'
                : t.kind === 'delivered'
                  ? 'Entregue'
                  : t.kind === 'pickup'
                    ? 'Retirada'
                    : 'Pós-venda'}
          </h2>
          <p>{t.content}</p>
          <button
            onClick={() => {
              setSelected(t.kind);
              setContent(t.content);
            }}
          >
            Editar modelo {messageLabels[t.kind]}
          </button>
        </section>
      ))}
      {content && (
        <form
          className="panel data-form"
          onSubmit={(e) => {
            e.preventDefault();
            void api('message-templates', 'PUT', { kind: selected, content })
              .then(() => {
                setNotice('Modelo salvo.');
                setContent('');
                void view.refresh();
              })
              .catch((e) => setError(e.message));
          }}
        >
          <label>
            Texto do modelo
            <textarea
              required
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <button>Salvar modelo</button>
        </form>
      )}
    </>
  );
}
