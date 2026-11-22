import { createPortal } from 'react-dom';
import { paymentModeLabels, type Terms } from '../../../shared/finance';
import { BackupReminderCard } from '../p1/BackupReminderCard';
import { VisitCard } from '../prospects/Visits';
import type { ProspectVisit } from '../../../shared/visits';
import { SkeletonToday } from '../../components/Skeleton';
import { occasionLabel } from '../../../shared/customer-order';
import { useSearchParams } from 'react-router-dom';
import { scheduleDay } from '../../../shared/order-schedule';
import { RouteInfo } from '../field/RouteInfo';
import { PendingConfirmations } from './PendingConfirmations';
import { DisclosureSummary } from '../../components/DisclosureSummary';
import { DayCalendar } from './DayCalendar';
import { greeting, dayChip, shiftDay } from '../../../shared/workday';
import { Button } from '../../components/Button';
import { DeliveryActions } from '../field/DeliveryActions';
import { photoURL } from '../../../shared/flavors';
import { TravelSheet } from '../field/TravelSheet';
import { distance } from '../../../shared/field';
import { useCourierLabels, useField, SiteAvatar } from '../field/FieldContext';
import { TodayReminders } from '../p1/Reminders';
import { QuickReceipt, type ReceiptResult } from '../finance/QuickReceipt';
import { FinanceSummary } from '../finance/Finance';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Clock3,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import { api, money } from '../api';
import { HelpTip } from '../../components/HelpTip';
import {
  statusLabels,
  UNDO_SECONDS,
  type Status,
} from '../../../shared/order-state';
import { useRemote, Failure, localDay, type OperationalOrder } from './common';
import { Mascot } from '../../components/Mascot';
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
  followup = false,
  financial = false,
  p1 = false,
  backupOrganizationId,
  calendarSlot,
}: {
  role: string;
  backupOrganizationId?: string;
  calendarSlot?: HTMLSpanElement | null;
  followup?: boolean;
  financial?: boolean;
  p1?: boolean;
}) {
  const courierLabels = useCourierLabels(),
    field = useField();
  const [trip, setTrip] = useState<OperationalOrder | null>(null),
    [near, setNear] = useState(false),
    [nameLater, setNameLater] = useState(() => {
      try {
        return sessionStorage.getItem('az-name-later') === '1';
      } catch {
        return false;
      }
    });
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
  const [search, setSearch] = useSearchParams();
  const requestedDay = scheduleDay(search.get('day'));
  const [dayValue, setDayValue] = useState(localDay),
    [now, setNow] = useState(() => new Date());
  const day = requestedDay ?? dayValue;
  const setDay = useCallback(
    (nextDay: string) => {
      setDayValue(nextDay);
      if (requestedDay) {
        const next = new URLSearchParams(search);
        next.set('day', nextDay);
        setSearch(next, { replace: true });
      }
    },
    [requestedDay, search, setSearch],
  );
  useEffect(() => {
    const reset = () => {
      setDayValue(localDay());
      if (search.has('day')) {
        const next = new URLSearchParams(search);
        next.delete('day');
        setSearch(next, { replace: true });
      }
    };
    const wake = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date());
        setDay(requestedDay ?? localDay());
      }
    };
    window.addEventListener('reset-workday', reset);
    document.addEventListener('visibilitychange', wake);
    return () => {
      window.removeEventListener('reset-workday', reset);
      document.removeEventListener('visibilitychange', wake);
      window.dispatchEvent(
        new CustomEvent('workday-change', { detail: localDay() }),
      );
    };
  }, [requestedDay, search, setSearch, setDay]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('workday-change', { detail: day }));
  }, [day]);

  const view = useRemote<{
    visits?: ProspectVisit[];
    sample_production?: {
      day: string;
      name: string;
      weight_grams: number | null;
      units: number;
      photo_key: string | null;
    }[];
    day: string;
    orders: OperationalOrder[];
    pending_orders: OperationalOrder[];
    pending_truncated: boolean;
    travel_week_cents: number | null;
    production: {
      photo_key: string | null;
      name: string;
      label: string;
      day: string;
      boxes: number;
      units: number;
      weight_grams: number;
      units_per_box: number;
    }[];
    totals: { expected_cents: number; delivered_cents: number };
    received_available: boolean;
    truncated: boolean;
  }>(`today?date=${day}`);
  const visitRefresh = view.refresh;
  useEffect(() => {
    const update = () => void visitRefresh();
    window.addEventListener('visits-changed', update);
    return () => window.removeEventListener('visits-changed', update);
  }, [visitRefresh]);
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
      if (to === 'delivered' && field) setTrip(order);
      await view.refresh();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const [reminders, setReminders] = useState<{
    day: string;
    count: number;
  } | null>(null);
  const calendar = <DayCalendar day={day} onSelect={setDay} />;
  const ownProfile = field?.data?.staff.find(
    (s) => s.id === field.data!.user_id,
  );
  const salutation =
    greeting(now) + (ownProfile?.version ? ', ' + ownProfile.display_name : '');
  const dayOrders = (view.data?.orders ?? [])
    .filter(
      (o) =>
        (role !== 'owner' ||
          !['draft', 'awaiting_confirmation'].includes(o.status)) &&
        (day >= localDay() || ['delivered', 'picked_up'].includes(o.status)) &&
        new Date(Date.parse(o.due_at) - 10800000).toISOString().slice(0, 10) ===
          day,
    )
    .sort((a, b) => {
      if (!near || !field?.data)
        return calendarSlot ? a.due_at.localeCompare(b.due_at) : 0;
      const km = (o: OperationalOrder) => {
        const p = field.data!.order_places.find(
          (p) => p.order_id === o.id,
        )?.data;
        return p
          ? (distance(field.data!.company.data, p) ?? Infinity)
          : Infinity;
      };
      const route = (o: OperationalOrder) =>
        field.data!.order_routes?.find((r) => r.id === o.id)?.route_minutes;
      const ar = route(a),
        br = route(b);
      return ar !== undefined && br !== undefined
        ? ar - br
        : ar !== undefined
          ? -1
          : br !== undefined
            ? 1
            : km(a) - km(b);
    });
  const deliveryCount = dayOrders.length;
  const reminderCount = reminders?.day === day ? reminders.count : null;
  return (
    <div
      className={
        role === 'operator' ? 'today-page operator-today' : 'today-page'
      }
    >
      {trip && (
        <TravelSheet
          orders={[trip]}
          onClose={() => setTrip(null)}
          onSaved={() => setNotice('Despesa de deslocamento registrada.')}
        />
      )}
      <div className="today-greeting">
        <div>
          <p className="eyebrow">
            {new Intl.DateTimeFormat('pt-BR', {
              timeZone: 'America/Fortaleza',
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }).format(new Date(day + 'T12:00Z'))}
          </p>
          <p className="desktop-today-summary">
            {salutation}.
            {view.data?.day === day
              ? ` ${deliveryCount} ${deliveryCount === 1 ? 'entrega' : 'entregas'} ${day === localDay() ? 'hoje' : 'no dia'}`
              : ''}
            {p1 && reminderCount !== null
              ? ` · ${reminderCount} ${reminderCount === 1 ? 'lembrete' : 'lembretes'}`
              : ''}
          </p>
          <div className="today-identity">
            <h2>
              {day === localDay()
                ? salutation
                : role === 'owner'
                  ? 'Planejamento'
                  : 'Entregas'}
            </h2>
          </div>
        </div>
        {calendarSlot ? (
          <>
            {createPortal(calendar, calendarSlot)}
            <Button
              className="desktop-today-refresh"
              variant="ghost"
              onClick={() => void view.refresh()}
              aria-label="Atualizar Hoje"
              icon={<RefreshCw size={18} aria-hidden="true" />}
            />
          </>
        ) : (
          calendar
        )}
      </div>
      {day === localDay() &&
        field?.data &&
        !field.data.staff.find((s) => s.id === field.data!.user_id)?.version &&
        !nameLater && (
          <section
            className="panel name-reminder"
            aria-label="Nome de exibição"
          >
            <Mascot size={64} />
            <div>
              <h2>Como a equipe te chama?</h2>
              <p>
                Escolha seu nome de exibição. Ele aparece nas entregas e assina
                as mensagens.
              </p>
            </div>
            <div className="name-reminder-actions">
              <Button to="/gestao/preferencias#nome" variant="primary">
                Escolher meu nome
              </Button>
              <Button
                onClick={() => {
                  // Some até a próxima abertura do app.
                  try {
                    sessionStorage.setItem('az-name-later', '1');
                  } catch {
                    /* Sem armazenamento: some só nesta tela. */
                  }
                  setNameLater(true);
                }}
              >
                Agora não
              </Button>
            </div>
          </section>
        )}
      {role === 'owner' && day === localDay() && backupOrganizationId && (
        <BackupReminderCard organizationId={backupOrganizationId} />
      )}
      {role === 'owner' &&
        day === localDay() &&
        field?.data &&
        (!field.data.company.data.address.trim() ||
          field.data.company.data.latitude === null ||
          field.data.company.data.longitude === null) && (
          <aside className="base-warning" aria-label="Configurar base">
            <p>Cadastre o endereço da base para ver distâncias e rotas.</p>
            <Button to="/gestao/empresa" variant="tonal">
              Cadastrar a base
            </Button>
          </aside>
        )}
      {day !== localDay() && (
        <Button variant="ghost" onClick={() => setDay(localDay())}>
          Voltar para hoje
        </Button>
      )}
      <div className="page-heading today-heading">
        <div>
          <p className="eyebrow">SUA ROTINA</p>
          <h1>{day === localDay() ? 'Hoje' : 'Agenda'}</h1>
          <p>
            {role === 'owner'
              ? 'Produção e pedidos em um só lugar.'
              : 'Entregas e contatos ao alcance da mão.'}
          </p>
        </div>
        <Button onClick={() => void view.refresh()} aria-label="Atualizar Hoje">
          <RefreshCw size={20} aria-hidden="true" />
        </Button>
      </div>
      <label className="workday-inline">
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
            if (result.undo_id && receipt.delivery_type === 'delivery' && field)
              setTrip(receipt);
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
        <Button
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
          loading={busy}
        >
          Desfazer entrega e recebimento
        </Button>
      )}

      {undo && (
        <Button
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
          loading={busy}
        >
          <Undo2 size={20} aria-hidden="true" /> Desfazer entrega
        </Button>
      )}
      {view.data && view.data.day === day ? (
        <>
          {view.data.truncated && (
            <p role="alert">
              Mais de 200 pedidos no período. A lista abaixo está limitada; use
              a busca em Pedidos para conferir os demais.
            </p>
          )}
          {financial && role === 'owner' && (
            <FinanceSummary
              compact
              dashboard
              tripsCents={view.data.travel_week_cents}
            />
          )}
          <div className="desktop-today-grid">
            <div className="desktop-today-sidebar">
              {role === 'owner' && (
                <section className="panel production-dashboard">
                  <div className="production-heading">
                    <h2>
                      Produzir{' '}
                      {day === localDay()
                        ? 'hoje e amanhã'
                        : `${dayChip(day)} e ${dayChip(shiftDay(day, 1))}`}{' '}
                      <HelpTip topic="production" />
                    </h2>
                    <Button
                      className="desktop-production-link"
                      to="/gestao/recorrentes"
                      variant="ghost"
                      size="compact"
                    >
                      Gerar pedidos da semana
                    </Button>
                  </div>
                  {view.data.production.length ? (
                    <ul className="production-list">
                      {view.data.production.map((line, i) => (
                        <li key={i}>
                          {line.photo_key && (
                            <img
                              src={photoURL(line.photo_key)}
                              alt=""
                              width={40}
                              height={40}
                            />
                          )}
                          <div>
                            <strong>
                              {line.name}
                              {(!line.label ||
                                new Set(
                                  view
                                    .data!.production.filter(
                                      (p) => p.name === line.name,
                                    )
                                    .map(
                                      (p) =>
                                        p.label +
                                        '|' +
                                        p.weight_grams +
                                        '|' +
                                        p.units_per_box,
                                    ),
                                ).size > 1) && (
                                <small className="production-variant">
                                  {line.label || 'Kit ' + line.units_per_box} ·{' '}
                                  {line.weight_grams} g/un.
                                </small>
                              )}
                            </strong>
                            <progress
                              className="production-bar"
                              aria-hidden="true"
                              value={line.units}
                              max={Math.max(
                                1,
                                ...view.data!.production.map((p) => p.units),
                              )}
                            />
                          </div>
                          <div
                            className="production-counts"
                            aria-label={`${line.boxes.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${line.boxes === 1 ? 'caixa' : 'caixas'} · ${line.units} ${line.units === 1 ? 'unidade' : 'unidades'}`}
                          >
                            <strong
                              className="production-boxes"
                              title="Caixas equivalentes: unidades divididas pela capacidade"
                            >
                              {line.boxes.toLocaleString('pt-BR', {
                                maximumFractionDigits: 4,
                              })}{' '}
                              {Number.isInteger(line.boxes) ? 'cx' : 'cx eq.'}
                            </strong>
                            <small>{line.units} un.</small>
                          </div>
                          <small>{dayChip(line.day)}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      Nada confirmado para produzir.{' '}
                      <Button
                        to="/gestao/recorrentes"
                        variant="ghost"
                        className="ghost-inline"
                      >
                        Gerar pedidos da semana?
                      </Button>
                    </p>
                  )}
                </section>
              )}
              {role === 'owner' && !!view.data.sample_production?.length && (
                <section className="panel">
                  <h2>
                    Amostras para visitas ·{' '}
                    {day === localDay()
                      ? 'hoje e amanhã'
                      : `${dayChip(day)} e ${dayChip(shiftDay(day, 1))}`}
                  </h2>
                  <p>Unidades avulsas, separadas das caixas vendidas.</p>
                  <ul className="production-list">
                    {view.data.sample_production.map((s, i) => (
                      <li key={i}>
                        {s.photo_key && (
                          <img
                            src={photoURL(s.photo_key)}
                            width={40}
                            height={40}
                            alt=""
                          />
                        )}
                        <strong>
                          {s.name}
                          {s.weight_grams
                            ? ' · ' + s.weight_grams + ' g'
                            : ' · Peso a definir'}
                        </strong>
                        <span>
                          + {s.units} un. para amostras · {dayChip(s.day)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {role === 'owner' && (
                <PendingConfirmations
                  orders={view.data.pending_orders ?? []}
                  truncated={view.data.pending_truncated}
                  onChanged={view.refresh}
                />
              )}
              {calendarSlot && p1 && (
                <TodayReminders day={day} onCount={setReminders} />
              )}
            </div>
            <section
              className="desktop-deliveries"
              aria-label="Entregas do dia"
            >
              <div className="deliveries-heading">
                <h2>Entregas do dia</h2>
                <Button
                  className="desktop-delivery-link"
                  to="/gestao/pedidos"
                  variant="ghost"
                  size="compact"
                >
                  Ver pedidos
                </Button>
                {field && (
                  <Button
                    variant="chip"
                    aria-label="Ordenar por proximidade da base (rota, quando calculada)"
                    aria-pressed={near}
                    onClick={() => setNear(!near)}
                  >
                    Proximidade
                  </Button>
                )}
              </div>
              <div className="record-list">
                {dayOrders.map((order) => {
                  const actions = (
                    <>
                      <div className="delivery-payment">
                        {financial && (order.paid_cents ?? 0) > 0 ? (
                          <span
                            className={`status-tag ${(order.paid_cents ?? 0) >= order.total_cents ? 'status-delivered' : ''}`}
                          >
                            {(order.paid_cents ?? 0) >= order.total_cents
                              ? 'Pago · ' + money(order.paid_cents ?? 0)
                              : 'Recebido ' +
                                money(order.paid_cents ?? 0) +
                                ' · falta ' +
                                money(
                                  order.total_cents - (order.paid_cents ?? 0),
                                )}
                          </span>
                        ) : (
                          <span className="status-tag">
                            {order.payment_mode &&
                            order.payment_mode !== 'unset'
                              ? (paymentModeLabels[
                                  order.payment_mode as Terms['mode']
                                ] ?? 'Pagamento a definir')
                              : 'Pagamento a definir'}
                          </span>
                        )}
                        <strong>{money(order.total_cents)}</strong>
                      </div>
                      {order.courier !== 'unassigned' &&
                        order.courier !==
                          (role === 'owner' ? 'owner' : 'partner') && (
                          <span className="status-tag">
                            {order.courier === 'courier'
                              ? order.courier_name || 'Motoboy'
                              : courierLabels[order.courier]}
                          </span>
                        )}
                      <DeliveryActions order={order} />
                      <div className="actions">
                        {day === localDay() &&
                          (order.status === 'out_for_delivery' ||
                            (order.status === 'ready' &&
                              order.delivery_type === 'pickup')) && (
                            <Button
                              className="delivery-complete"
                              variant="success"
                              icon={
                                <CheckCircle2 size={20} aria-hidden="true" />
                              }
                              size="large"
                              disabled={busy}
                              onClick={() =>
                                financial && order.payment_mode === 'delivery'
                                  ? setReceipt(order)
                                  : void quick(
                                      order,
                                      order.delivery_type === 'pickup'
                                        ? 'picked_up'
                                        : 'delivered',
                                    )
                              }
                              loading={busy}
                            >
                              {order.delivery_type === 'pickup'
                                ? 'Marcar retirado'
                                : financial && order.payment_mode === 'delivery'
                                  ? 'Entregue e recebido'
                                  : 'Marcar entregue'}
                            </Button>
                          )}
                        <details className="delivery-more">
                          <DisclosureSummary>
                            Mais ações do pedido
                          </DisclosureSummary>
                          {financial &&
                            ![
                              'draft',
                              'awaiting_confirmation',
                              'cancelled',
                            ].includes(order.status) &&
                            (order.paid_cents ?? 0) < order.total_cents && (
                              <Button
                                disabled={busy}
                                onClick={() => setReceipt(order)}
                                loading={busy}
                              >
                                Recebi R$
                              </Button>
                            )}
                          {financial && (order.paid_cents ?? 0) > 0 && (
                            <Button
                              className="button"
                              to={`/gestao/financeiro/${order.customer_id}`}
                              variant="ghost"
                            >
                              Corrigir recebimento
                            </Button>
                          )}
                          <Button
                            className="button"
                            to={`/gestao/pedidos/${order.id}`}
                            variant="ghost"
                          >
                            Abrir pedido{' '}
                            <ChevronRight size={20} aria-hidden="true" />
                          </Button>
                        </details>
                      </div>
                    </>
                  );
                  return (
                    <article className="panel order-card" key={order.id}>
                      <div className="delivery-identity">
                        <SiteAvatar
                          id={order.customer_id}
                          name={order.customer_name}
                        />
                        <div>
                          <h3 title={order.customer_name}>
                            {calendarSlot ? (
                              <Button
                                className="desktop-delivery-name"
                                to={`/gestao/pedidos/${order.id}`}
                                variant="ghost"
                              >
                                {order.customer_name}
                              </Button>
                            ) : (
                              order.customer_name
                            )}
                          </h3>
                          {occasionLabel(order.occasion) && (
                            <p>Ocasião: {occasionLabel(order.occasion)}</p>
                          )}
                          <p className="delivery-address">
                            <Clock3 size={14} aria-hidden="true" />{' '}
                            {new Intl.DateTimeFormat('pt-BR', {
                              timeZone: 'America/Fortaleza',
                              ...(day === localDay()
                                ? {}
                                : {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: '2-digit',
                                  }),
                              hour: '2-digit',
                              minute: '2-digit',
                            }).format(new Date(order.due_at))}{' '}
                            ·{' '}
                            {order.delivery_type === 'pickup'
                              ? 'Retirada'
                              : order.delivery_address ||
                                'Endereço a preencher'}
                          </p>
                          <RouteInfo
                            id={order.id}
                            compact
                            order
                            place={
                              field?.data?.order_places.find(
                                (p) => p.order_id === order.id,
                              )?.data
                            }
                          />
                        </div>
                        <span
                          className={`status-tag status-${order.status} delivery-status`}
                        >
                          {day > localDay()
                            ? 'Agendada'
                            : statusLabels[order.status]}
                        </span>
                      </div>
                      <div className="delivery-flavors">
                        {order.items.map((i) =>
                          i.components?.length ? (
                            // Caixa Mista/kit: só o nome no cartão; os sabores
                            // abrem num toque, para não estourar o cartão.
                            <details
                              className="delivery-flavor delivery-mix"
                              key={String(i.id ?? i.variant_id) + '-mix'}
                            >
                              <summary>
                                {i.quantity}×{' '}
                                {i.kit_id ? i.product_name : 'Caixa Mista'}
                                <span className="delivery-mix-toggle">
                                  {' '}
                                  · ver sabores
                                </span>
                              </summary>
                              <ul>
                                {i.components.map((c, k, all) => (
                                  <li key={k}>
                                    {c.units}{' '}
                                    {all.every(
                                      (x) => x.product_name === c.product_name,
                                    ) && c.variant_label
                                      ? c.variant_label
                                      : c.product_name}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : (
                            <span
                              className="delivery-flavor"
                              key={i.variant_id}
                            >
                              {i.photo_key && (
                                <img
                                  src={photoURL(i.photo_key)}
                                  alt=""
                                  width={26}
                                  height={26}
                                />
                              )}
                              {i.quantity}× {i.product_name}
                            </span>
                          ),
                        )}
                      </div>
                      {calendarSlot ? (
                        <details className="desktop-delivery-actions">
                          <DisclosureSummary>
                            Ações da entrega
                          </DisclosureSummary>
                          {actions}
                        </details>
                      ) : (
                        actions
                      )}
                    </article>
                  );
                })}
              </div>
              {!view.data.orders.some(
                (o) =>
                  new Date(Date.parse(o.due_at) - 10800000)
                    .toISOString()
                    .slice(0, 10) === day &&
                  (day >= localDay() ||
                    ['delivered', 'picked_up'].includes(o.status)),
              ) && (
                <section className="empty-state">
                  <Mascot size={88} />
                  <h2>Nenhuma entrega neste período.</h2>
                  <Button to="/gestao/pedidos?novo=1" variant="primary">
                    Novo pedido
                  </Button>
                </section>
              )}
            </section>
            {!!view.data.visits?.length && (
              <section
                className="desktop-today-visits"
                aria-label="Visitas do dia"
              >
                <h2>Visitas de apresentação</h2>
                {view.data.visits.map((v) => (
                  <VisitCard
                    key={v.id + ':' + v.version}
                    visit={v}
                    followup={followup}
                    onChanged={() => void view.refresh()}
                  />
                ))}
              </section>
            )}
            {!calendarSlot && p1 && <TodayReminders day={day} />}
          </div>
          {financial && role !== 'owner' && <FinanceSummary compact />}
          {role !== 'owner' && (
            <DayTotals totals={view.data.totals} financial={financial} />
          )}
        </>
      ) : (
        !view.error && <SkeletonToday owner={role === 'owner'} />
      )}
    </div>
  );
}
