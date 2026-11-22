import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  batchOrderClosed,
  batchOrderLimit,
  batchOrderPath,
  type BatchOrderAction,
  type BatchOrderResult,
} from '../../../shared/batch-orders';
import { statusLabels, type Status } from '../../../shared/order-state';
import { shortDay, fortalezaDay, shiftDay } from '../../../shared/workday';
import { Button } from '../../components/Button';
import { api } from '../api';

interface ListedOrder {
  id: string;
  customer_name: string;
  due_at: string;
  status: Status;
  delivery_type: string;
  total_cents: number;
  version: number;
  items: { product_name?: string; quantity: number }[];
}
interface Entry {
  id: string;
  version: number;
  key: string;
  original_key?: string;
}
interface Job {
  action: BatchOrderAction | 'undo';
  day?: string;
  orders: Entry[];
  results: BatchOrderResult[];
}
const clock = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Fortaleza',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const fullDay = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Fortaleza',
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
});
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const dateLabel = (day: string) => fullDay.format(new Date(day + 'T12:00:00Z'));
const labels: Record<BatchOrderAction, string> = {
  date: 'Mudar data',
  advance: 'Avançar etapa',
  complete: 'Marcar entregue',
};
const orderCount = (n: number) => n + (n === 1 ? ' pedido' : ' pedidos');

export function BatchOrders({
  orders,
  reload,
  children,
}: {
  orders: ListedOrder[];
  reload: () => Promise<void>;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [action, setAction] = useState<BatchOrderAction | null>(null);
  const [day, setDay] = useState('');
  const [otherDay, setOtherDay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<BatchOrderResult[]>([]);
  const [undone, setUndone] = useState(false);
  const [undo, setUndo] = useState<{ orders: Entry[]; expires: number } | null>(
    null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<Job | null>(null);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const consumedPress = useRef(false);
  const today = fortalezaDay();
  const chosen = orders.filter((o) => selected?.has(o.id));
  const eligible = chosen.filter((o) => !batchOrderClosed(o.status));
  const days = new Map<string, ListedOrder[]>();
  for (const order of orders) {
    const date = fortalezaDay(new Date(order.due_at));
    const group = days.get(date);
    if (group) group.push(order);
    else days.set(date, [order]);
  }
  const names = new Map(orders.map((o) => [o.id, o.customer_name]));

  useEffect(() => {
    if (action && dialog.current && !dialog.current.open)
      dialog.current.showModal();
    if (!action && dialog.current?.open) dialog.current.close();
  }, [action]);
  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(
      () => setUndo(null),
      Math.max(0, undo.expires * 1000 - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [undo]);

  function cancelPress() {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  }
  useEffect(() => cancelPress, []);
  function beginPress(event: PointerEvent) {
    consumedPress.current = false;
    if (selected || busy || pending.current || event.pointerType !== 'touch')
      return;
    const element = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-batch-order]',
    );
    const id = element?.dataset.batchOrder;
    if (!id) return;
    cancelPress();
    press.current = {
      x: event.clientX,
      y: event.clientY,
      timer: window.setTimeout(() => {
        consumedPress.current = true;
        setSelected(new Set([id]));
      }, 550),
    };
  }
  function toggle(ids: string[], checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous ?? []);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }
  function review(next: BatchOrderAction) {
    setDay('');
    setOtherDay(false);
    setAction(next);
  }
  function finish(job: Job) {
    pending.current = null;
    setSelected(null);
    setError('');
    setProgress('');
    setResults(job.results);
    setUndone(job.action === 'undo');
    const applied = new Map(
      job.results.filter((r) => r.ok).map((r) => [r.id, r]),
    );
    const undoable = job.orders.flatMap((entry) => {
      const result = applied.get(entry.id);
      return result?.version &&
        result.expires_at &&
        result.expires_at * 1000 > Date.now()
        ? [
            {
              id: entry.id,
              version: result.version,
              key: crypto.randomUUID(),
              original_key: entry.key,
            },
          ]
        : [];
    });
    setUndo(
      undoable.length
        ? {
            orders: undoable,
            expires: Math.min(
              ...undoable.map(({ id }) => applied.get(id)!.expires_at!),
            ),
          }
        : null,
    );
    void reload();
  }
  async function run(job: Job) {
    if (busy) return;
    pending.current = job;
    setAction(null);
    setBusy(true);
    setError('');
    setUndo(null);
    try {
      while (job.results.length < job.orders.length) {
        const entries = job.orders.slice(
          job.results.length,
          job.results.length + batchOrderLimit,
        );
        setProgress(
          `Processando ${job.results.length} de ${job.orders.length} pedidos…`,
        );
        const { results: part } = await api<{ results: BatchOrderResult[] }>(
          'orders-batch',
          'POST',
          { action: job.action, day: job.day, orders: entries },
          entries[0].key,
        );
        job.results.push(...part);
      }
      finish(job);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir o lote.',
      );
      void reload();
    } finally {
      setBusy(false);
    }
  }

  const skipped = results.filter((item) => !item.ok);
  const appliedCount = results.length - skipped.length;
  const actionTitle =
    action === 'date'
      ? 'Mudar a data de ' + orderCount(eligible.length)
      : action === 'advance'
        ? 'Avançar etapa de ' + orderCount(eligible.length) + '?'
        : 'Marcar ' + orderCount(eligible.length) + ' como entregues?';
  const pickups = eligible.filter(
    (order) => order.delivery_type === 'pickup',
  ).length;
  const availableDays = Array.from({ length: 4 }, (_, index) =>
    shiftDay(today, index),
  );
  return (
    <div className="batch-order-list">
      <div className="batch-order-heading">
        {selected && <h2>Pedidos</h2>}
        <Button
          disabled={busy || !!error}
          onClick={() => setSelected(selected ? null : new Set())}
          variant="tonal"
        >
          {selected ? 'Cancelar seleção' : 'Selecionar'}
        </Button>
      </div>
      <div
        onPointerDown={beginPress}
        onPointerMove={(e) => {
          if (
            press.current &&
            Math.hypot(
              e.clientX - press.current.x,
              e.clientY - press.current.y,
            ) > 9
          )
            cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(event) => {
          if (press.current || consumedPress.current) event.preventDefault();
        }}
        onClickCapture={(event) => {
          if (!consumedPress.current) return;
          consumedPress.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {!selected ? (
          children
        ) : (
          <div className="batch-order-groups">
            {Array.from(days, ([date, entries]) => {
              const ids = entries.map(({ id }) => id);
              const all = ids.every((id) => selected.has(id));
              return (
                <section
                  key={date}
                  className="batch-order-group"
                  aria-label={dateLabel(date)}
                >
                  <header>
                    <h3>{dateLabel(date)}</h3>
                    <label>
                      <input
                        type="checkbox"
                        checked={all}
                        ref={(input) => {
                          if (input)
                            input.indeterminate =
                              !all && ids.some((id) => selected.has(id));
                        }}
                        disabled={busy || !!error}
                        onChange={(e) => toggle(ids, e.target.checked)}
                      />
                      Todos do dia
                    </label>
                  </header>
                  {entries.map((o) => (
                    <label key={o.id} className="batch-order-card">
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        disabled={busy || !!error}
                        aria-label={`Selecionar pedido de ${o.customer_name}, ${clock.format(new Date(o.due_at))}`}
                        onChange={(e) => toggle([o.id], e.target.checked)}
                      />
                      <span>
                        <strong>{o.customer_name}</strong>
                        <small>
                          {clock.format(new Date(o.due_at))}
                          {o.items[0]?.product_name &&
                            ` · ${o.items[0].quantity}× ${o.items[0].product_name}`}
                          {o.items.length > 1 && ` + ${o.items.length - 1}`}
                          {' · ' + currency.format(o.total_cents / 100)}
                        </small>
                      </span>
                      <span className="batch-order-state">
                        {statusLabels[o.status]}
                      </span>
                    </label>
                  ))}
                </section>
              );
            })}
            {!orders.length && <p>Nenhum pedido encontrado.</p>}
          </div>
        )}
      </div>
      {(selected || undo || busy || error) && (
        <aside
          className="batch-order-bar"
          data-selecting={!!selected}
          aria-label="Ações em lote"
        >
          {busy || error ? (
            <>
              <p role={error ? 'alert' : 'status'}>{error || progress}</p>
              {error && (
                <div className="actions">
                  <Button
                    onClick={() => {
                      if (pending.current) void run(pending.current);
                    }}
                  >
                    Tentar novamente
                  </Button>
                  <Button
                    onClick={() => {
                      if (pending.current) finish(pending.current);
                    }}
                  >
                    Encerrar lote
                  </Button>
                </div>
              )}
            </>
          ) : selected ? (
            <>
              <strong aria-live="polite">
                {orderCount(chosen.length)}{' '}
                {chosen.length === 1 ? 'selecionado' : 'selecionados'}
              </strong>
              <div className="batch-order-actions">
                {(Object.keys(labels) as BatchOrderAction[]).map((item) => (
                  <Button
                    key={item}
                    disabled={!chosen.length}
                    onClick={() => review(item)}
                  >
                    {labels[item]}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            undo && (
              <div className="actions">
                <strong>
                  {orderCount(appliedCount)}{' '}
                  {appliedCount === 1 ? 'atualizado' : 'atualizados'}
                </strong>
                <Button
                  onClick={() =>
                    void run({
                      action: 'undo',
                      orders: undo.orders,
                      results: [],
                    })
                  }
                >
                  Desfazer
                </Button>
              </div>
            )
          )}
        </aside>
      )}
      {!!results.length && (
        <div className="batch-order-result" aria-live="polite">
          <p>
            {orderCount(appliedCount)} {undone ? 'restaurados' : 'atualizados'}
            {skipped.length ? ` · ${skipped.length} pulados` : ''}.
          </p>
          {!!skipped.length && (
            <ul>
              {skipped.map((item) => (
                <li key={item.id}>
                  {names.get(item.id) ?? 'Pedido'} · {item.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <dialog
        ref={dialog}
        className="help-sheet batch-order-sheet"
        aria-labelledby="batch-order-title"
        onClose={() => setAction(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setAction(null);
        }}
      >
        {action && (
          <div className="sheet-body">
            <h2 id="batch-order-title">{actionTitle}</h2>
            {action === 'date' ? (
              <>
                <p>Cada pedido mantém o seu horário. Só muda o dia.</p>
                <div className="chips" aria-label="Escolher dia">
                  {availableDays.map((option) => (
                    <Button
                      key={option}
                      variant="chip"
                      aria-pressed={!otherDay && day === option}
                      onClick={() => {
                        setOtherDay(false);
                        setDay(option);
                      }}
                    >
                      {shortDay(option, today)}
                    </Button>
                  ))}
                  <Button
                    variant="chip"
                    aria-pressed={otherDay}
                    onClick={() => {
                      setOtherDay(true);
                      setDay('');
                    }}
                  >
                    Outra data
                  </Button>
                </div>
                {otherDay && (
                  <label>
                    Nova data
                    <input
                      type="date"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                    />
                  </label>
                )}
              </>
            ) : action === 'complete' ? (
              <>
                <p>
                  O app registra cada etapa no histórico, da produção à entrega
                  ou retirada.
                </p>
                {pickups > 0 && (
                  <p className="batch-order-warning">
                    {orderCount(pickups)}{' '}
                    {pickups === 1
                      ? 'é retirada e ficará como Retirado.'
                      : 'são retiradas e ficarão como Retirado.'}
                  </p>
                )}
              </>
            ) : (
              <p>Cada pedido passa para a próxima etapa permitida.</p>
            )}
            {chosen.length > eligible.length && (
              <p className="batch-order-warning">
                {orderCount(chosen.length - eligible.length)} já encerrados
                ficarão de fora.
              </p>
            )}
            <ul>
              {eligible.map((o) => {
                const target =
                  action === 'date'
                    ? undefined
                    : batchOrderPath(o.status, o.delivery_type, action).at(-1);
                return (
                  <li key={o.id}>
                    {o.customer_name} ·{' '}
                    {target
                      ? statusLabels[o.status] + ' → ' + statusLabels[target]
                      : clock.format(new Date(o.due_at))}
                  </li>
                );
              })}
            </ul>
            <Button
              variant="primary"
              disabled={!eligible.length || (action === 'date' && !day)}
              onClick={() =>
                void run({
                  action,
                  day: action === 'date' ? day : undefined,
                  orders: chosen.map(({ id, version }) => ({
                    id,
                    version,
                    key: crypto.randomUUID(),
                  })),
                  results: [],
                })
              }
            >
              {action === 'date' && day
                ? `Mudar ${orderCount(eligible.length)} para ${dateLabel(day)}`
                : action === 'complete'
                  ? `Marcar ${eligible.length} como entregues`
                  : labels[action]}
            </Button>
            <Button onClick={() => setAction(null)}>Voltar</Button>
          </div>
        )}
      </dialog>
    </div>
  );
}
