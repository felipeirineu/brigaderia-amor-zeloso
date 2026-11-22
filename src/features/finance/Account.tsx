import type { DeliveryCycle } from '../../../shared/delivery-cycle';
import {
  deliveryCycleSize,
  dueDayLabel,
  termsModeLabel,
  type B2BProfile,
} from '../../../shared/finance';
import { WhatsAppLink } from '../../components/TestEnvironment';
import { useConfirm, usePrompt } from '../../components/confirm-context';
import { SkeletonList } from '../../components/Skeleton';
import type { CustomerType } from '../../../shared/customer-order';
import { StaffIdentity } from '../field/FieldContext';
import { Button } from '../../components/Button';
import { MoneyField } from '../../components/NumericInputs';
import { CreditTools } from './CreditTools';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api, money, parsePrice, dateTime, civilDate } from '../api';
import { useRemote, Failure, localDay } from '../operations/common';
import { paymentMethods, type Terms } from '../../../shared/finance';
import { TermsEditor } from './TermsEditor';
interface LedgerOrder {
  id: string;
  customer_name: string;
  status: string;
  version: number;
  number?: number;
  total_cents: number;
  paid_cents: number;
  balance_cents: number;
  receivable_cents: number;
  due_on: string | null;
  business_date: string;
  terms: Terms;
  closing_id: string | null;
}
export interface View {
  actor: { user_id: string; role: string };
  available_credit_cents: number;
  credits: {
    event_id: string;
    amount_cents: number;
    allocated_cents: number;
    refunded_cents: number;
    available_cents: number;
    can_refund: boolean;
  }[];
  credit_allocations: {
    event_id: string;
    order_id: string;
    amount_cents: number;
  }[];
  annulments: { closing_id: string; reason: string }[];
  customer: { id: string; name: string; customer_type?: CustomerType };
  version: number;
  received_cents: number;
  receivable_cents: number;
  overdue_days: number;
  credit_cents: number;
  orders: LedgerOrder[];
  events: {
    id: string;
    kind: string;
    amount_cents: number;
    method: keyof typeof paymentMethods;
    paid_on: string;
    reason: string;
    reversal_of: string | null;
    user_id: string;
    created_at: string;
    can_reverse: boolean;
  }[];
  profile: B2BProfile;
  delivery_cycle_progress: DeliveryCycle | null;
  delivery_cycles?: (DeliveryCycle & {
    id: string;
    balance_cents: number;
    total_cents: number;
  })[];
  closings: {
    id: string;
    status: string;
    period_start: string;
    period_end: string;
    due_on: string;
    total_cents: number;
    balance_cents: number;
  }[];
}
export function Account() {
  const askConfirmation = useConfirm();
  const askPrompt = usePrompt();

  const { id } = useParams(),
    [search] = useSearchParams(),
    view = useRemote<View>(`finance/customers/${id}`);
  const [target, setTarget] = useState(
      search.get('order') ? `order:${search.get('order')}` : '',
    ),
    [amount, setAmount] = useState(''),
    [kind, setKind] = useState<'payment' | 'deposit'>('payment'),
    [method, setMethod] = useState<keyof typeof paymentMethods>('pix'),
    [paidOn, setPaidOn] = useState(localDay),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<{
      message: string;
      phone: string;
      pix_code: string | null;
    } | null>(null),
    [termsEdit, setTermsEdit] = useState<{
      id: string;
      version: number;
      terms: Terms;
    } | null>(null);
  const key = useRef(crypto.randomUUID()),
    pending = useRef(false);
  async function run(fn: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await fn();
      key.current = crypto.randomUUID();
      setPreview(null);
      await view.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (view.data && search.get('order'))
      document
        .getElementById('receive-payment')
        ?.scrollIntoView({ block: 'start' });
  }, [view.data, search]);
  const root = `finance/customers/${id}`,
    data = view.data;
  const progress = data?.delivery_cycle_progress;
  const preferredSize =
    data &&
    deliveryCycleSize(data.profile?.terms ?? ({ mode: 'unset' } as Terms));
  const cycleSize = preferredSize || progress?.size;
  const cycleCount =
    progress?.size === cycleSize ? (progress?.orders.length ?? 0) : 0;

  async function charge(closing_id?: string, delivery_cycle_id?: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      setPreview(
        await api(root + '/charge', 'POST', { closing_id, delivery_cycle_id }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Button to="/gestao/financeiro" variant="ghost">
        Financeiro
      </Button>
      <h1>Conta do cliente</h1>
      <Failure message={error || view.error} />
      <p role="status">{notice}</p>
      {!view.data && !view.error && <SkeletonList label="Carregando conta…" />}
      {data && (
        <>
          <h2>{data.customer.name}</h2>
          <Button to={`/gestao/clientes/${id}/b2b`} variant="ghost">
            Editar condições do cliente
          </Button>
          <section className="panel">
            <h2>A receber: {money(data.receivable_cents)}</h2>
            {cycleSize && (
              <div className="delivery-cycle-account">
                <p>Condição: A prazo · a cada {cycleSize} entregas</p>
                <p>
                  Entregas neste ciclo: {cycleCount} de {cycleSize}
                </p>
              </div>
            )}
            <p>
              Recebimentos líquidos registrados: {money(data.received_cents)}
            </p>
            {data.overdue_days > 0 && (
              <p role="alert">
                Cliente com saldo vencido há {data.overdue_days} dias. Isso não
                bloqueia novos pedidos.
              </p>
            )}
            {data.credit_cents > 0 && (
              <p role="alert">
                Crédito a conciliar/estornar: {money(data.credit_cents)}.
              </p>
            )}
            <Button
              disabled={busy || data.receivable_cents <= 0}
              onClick={() => void charge()}
              loading={busy}
            >
              Cobrar no WhatsApp
            </Button>
          </section>
          <form
            id="receive-payment"
            className="panel data-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !(await askConfirmation(
                  'Registrar este recebimento informado? Isso não consulta o banco nem confirma Pix automaticamente.',
                  'Registrar recebimento',
                ))
              )
                return;
              void run(async () => {
                const [type, record] = target.split(':');
                await api(
                  root + '/payments',
                  'POST',
                  {
                    version: data.version,
                    ...(type === 'order'
                      ? { order_id: record }
                      : type === 'cycle'
                        ? { delivery_cycle_id: record }
                        : { closing_id: record }),
                    kind,
                    amount_cents: parsePrice(amount),
                    method,
                    paid_on: paidOn,
                  },
                  key.current,
                );
                setAmount('');
                setNotice('Recebimento registrado com histórico.');
              });
            }}
          >
            <h2>Recebi R$</h2>
            <label>
              Vincular a
              <select
                required
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  key.current = crypto.randomUUID();
                }}
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
                    <option key={o.id} value={`order:${o.id}`}>
                      Pedido {o.number ? 'nº ' + o.number : o.id.slice(0, 8)} ·{' '}
                      {civilDate(o.business_date)} · saldo{' '}
                      {money(o.balance_cents)}
                    </option>
                  ))}
                {(data.delivery_cycles ?? [])
                  .filter((c) => c.balance_cents > 0)
                  .map((c) => (
                    <option key={c.id} value={`cycle:${c.id}`}>
                      Ciclo · {c.orders.length}{' '}
                      {c.orders.length === 1 ? 'entrega' : 'entregas'} ·{' '}
                      {civilDate(c.due_on!)} · {money(c.balance_cents)}
                    </option>
                  ))}
                {data.closings
                  .filter((c) => c.balance_cents > 0)
                  .map((c) => (
                    <option key={c.id} value={`closing:${c.id}`}>
                      Fechamento {civilDate(c.period_start)} a{' '}
                      {civilDate(c.period_end)} · {money(c.balance_cents)}
                    </option>
                  ))}
              </select>
            </label>
            <MoneyField
              label="Valor recebido (R$)"
              required
              value={amount}
              onValueChange={(value) => {
                setAmount(value);
                key.current = crypto.randomUUID();
              }}
            />
            <label>
              Tipo
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as typeof kind);
                  key.current = crypto.randomUUID();
                }}
              >
                <option value="payment">Pagamento</option>
                <option value="deposit">Sinal de um pedido</option>
              </select>
            </label>
            <label>
              Forma de pagamento
              <select
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value as typeof method);
                  key.current = crypto.randomUUID();
                }}
              >
                {Object.entries(paymentMethods).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dia do recebimento
              <input
                required
                type="date"
                max={localDay()}
                value={paidOn}
                onChange={(e) => {
                  setPaidOn(e.target.value);
                  key.current = crypto.randomUUID();
                }}
              />
            </label>
            <Button disabled={busy || !target} variant="primary" loading={busy}>
              Registrar recebimento
            </Button>
            <p>
              Pagamento pode ser parcial. Sinal é um recebimento antecipado
              vinculado ao pedido. Não registra despesa ou transferência
              bancária.
            </p>
          </form>
          {preview && (
            <section className="panel">
              <h2>Conferir cobrança</h2>
              <label>
                Texto para WhatsApp
                <textarea
                  value={preview.message}
                  onChange={(e) =>
                    setPreview({ ...preview, message: e.target.value })
                  }
                />
              </label>
              {preview.message.trim() && !/[{}]/.test(preview.message) && (
                <WhatsAppLink
                  className="button"
                  href={`https://wa.me/${preview.phone.replace(/^\+/, '')}?text=${encodeURIComponent(preview.message)}`}
                >
                  Abrir WhatsApp para conferir e enviar
                </WhatsAppLink>
              )}
              {preview.pix_code && (
                <label>
                  Pix copia e cola
                  <input readOnly value={preview.pix_code} />
                </label>
              )}
              <p>
                Confira o recebedor no aplicativo do banco. O sistema não envia
                a cobrança, movimenta dinheiro ou comprova pagamento.
              </p>
            </section>
          )}
          <CreditTools data={data} root={root} onSaved={view.refresh} />
          <section className="panel">
            <h2>Extrato de pedidos</h2>
            {data.orders.map((o) => (
              <article key={o.id}>
                <h3>
                  <Button to={`/gestao/pedidos/${o.id}`} variant="ghost">
                    Pedido {o.number ? 'nº ' + o.number : o.id.slice(0, 8)}
                  </Button>{' '}
                  · {civilDate(o.business_date)}
                </h3>
                <p>
                  Total {money(o.total_cents)} · recebido {money(o.paid_cents)}{' '}
                  · saldo do pedido {money(o.balance_cents)}.
                </p>
                <p>
                  {o.due_on
                    ? `Vencimento: ${civilDate(o.due_on)}`
                    : o.terms.mode === 'next_delivery'
                      ? 'Vencimento na próxima entrega.'
                      : 'Condição/vencimento a definir.'}{' '}
                  {o.terms.mode !== 'unset' && ' · ' + termsModeLabel(o.terms)}
                  {o.terms.mode === 'credit' &&
                    o.terms.due_day_of_month != null &&
                    ' · ' + dueDayLabel(o.terms.due_day_of_month)}
                  {o.status === 'draft' || o.status === 'awaiting_confirmation'
                    ? 'Rascunho: não compõe a receber.'
                    : ''}
                </p>
                {['draft', 'awaiting_confirmation'].includes(o.status) && (
                  <Button
                    onClick={() =>
                      setTermsEdit({
                        id: o.id,
                        version: o.version,
                        terms: o.terms,
                      })
                    }
                  >
                    Condição do pedido{' '}
                    {o.number ? 'nº ' + o.number : o.id.slice(0, 8)}
                  </Button>
                )}
                {['delivered', 'picked_up'].includes(o.status) &&
                  o.terms.mode === 'credit' &&
                  o.terms.cycle !== 'deliveries' &&
                  !o.closing_id && (
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await askConfirmation(
                            'Gerar fechamento das entregas deste período com a mesma condição? O extrato será preservado.',
                            'Gerar fechamento',
                          )
                        )
                          void run(async () => {
                            await api(
                              root + '/close',
                              'POST',
                              { version: data.version, order_id: o.id },
                              key.current,
                            );
                            setNotice(
                              'Fechamento gerado; confira total, saldo e vencimento.',
                            );
                          });
                      }}
                      loading={busy}
                    >
                      Fechar período desta entrega
                    </Button>
                  )}
              </article>
            ))}
          </section>
          {termsEdit && (
            <form
              className="panel data-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api(`finance/orders/${termsEdit.id}/terms`, 'PUT', {
                    version: termsEdit.version,
                    terms: termsEdit.terms,
                  });
                  setTermsEdit(null);
                  setNotice('Condição do pedido atualizada.');
                });
              }}
            >
              <TermsEditor
                person={view.data?.customer.customer_type === 'person'}
                value={termsEdit.terms}
                onChange={(terms) => setTermsEdit({ ...termsEdit, terms })}
              />
              <Button disabled={busy} variant="primary" loading={busy}>
                Salvar condição do pedido
              </Button>
              <Button type="button" onClick={() => setTermsEdit(null)}>
                Cancelar edição
              </Button>
            </form>
          )}
          <section className="panel">
            <h2>Fechamentos</h2>
            {(data.delivery_cycles ?? []).map((c) => (
              <article className="panel" key={c.id}>
                <h3>
                  {c.closed_on_change
                    ? 'Ciclo encerrado na troca'
                    : `Ciclo de ${c.size} entregas`}
                </h3>
                <p>{c.days.map(civilDate).join(', ')}</p>
                <p>
                  Total: {money(c.total_cents)} · saldo {money(c.balance_cents)}{' '}
                  · vence {civilDate(c.due_on!)}
                </p>
                {c.balance_cents > 0 && (
                  <>
                    <Button
                      disabled={busy}
                      onClick={() => void charge(undefined, c.id)}
                    >
                      Cobrar no WhatsApp
                    </Button>
                    <Button
                      onClick={() => {
                        setTarget('cycle:' + c.id);
                        setKind('payment');
                        setAmount(
                          (c.balance_cents / 100).toFixed(2).replace('.', ','),
                        );
                        key.current = crypto.randomUUID();
                        document
                          .getElementById('receive-payment')
                          ?.scrollIntoView({ block: 'start' });
                      }}
                    >
                      Registrar recebimento
                    </Button>
                  </>
                )}
              </article>
            ))}
            {data.closings.length === 0 && !data.delivery_cycles?.length && (
              <p>Nenhum fechamento.</p>
            )}
            {data.closings.map((c) => (
              <article key={c.id}>
                <h3>
                  {c.status === 'annulled' && 'Anulado · '}
                  {civilDate(c.period_start)} a {civilDate(c.period_end)}
                </h3>
                <p>
                  Total {money(c.total_cents)} · recebido{' '}
                  {money(c.total_cents - c.balance_cents)} · saldo{' '}
                  {money(c.balance_cents)} · vence {civilDate(c.due_on)}
                </p>
                <Button
                  disabled={busy || c.balance_cents <= 0}
                  onClick={() => void charge(c.id)}
                  loading={busy}
                >
                  Cobrar fechamento no WhatsApp
                </Button>
                {c.status === 'annulled' && (
                  <p>
                    Motivo:{' '}
                    {data.annulments.find((x) => x.closing_id === c.id)?.reason}
                  </p>
                )}
                {data.actor.role === 'owner' && c.status === 'active' && (
                  <Button
                    disabled={busy}
                    onClick={async () => {
                      const reason = await askPrompt(
                        'Motivo para anular este fechamento:',
                      );
                      if (
                        reason?.trim() &&
                        (await askConfirmation(
                          'Anular e liberar os pedidos para novo fechamento? O extrato será preservado.',
                          'Anular fechamento',
                        ))
                      )
                        void run(async () => {
                          await api(
                            root + '/annul-closing',
                            'POST',
                            { version: data.version, closing_id: c.id, reason },
                            key.current,
                          );
                          setNotice('Fechamento anulado com histórico.');
                        });
                    }}
                    variant="danger"
                    loading={busy}
                  >
                    Anular fechamento
                  </Button>
                )}
              </article>
            ))}
          </section>
          <section className="panel">
            <h2>Histórico de recebimentos</h2>
            {!data.events.length && <p>Nenhum recebimento registrado.</p>}
            {data.events.map((e) => (
              <article key={e.id}>
                <h3>
                  {e.kind === 'reversal'
                    ? 'Estorno'
                    : e.kind === 'deposit'
                      ? 'Sinal'
                      : 'Pagamento'}{' '}
                  · {money(e.amount_cents)}
                </h3>
                <p>
                  {civilDate(e.paid_on)} · {paymentMethods[e.method]} · registro{' '}
                  {dateTime(e.created_at)} · <StaffIdentity id={e.user_id} />
                </p>
                {e.reason && <p>{e.reason}</p>}
                {e.can_reverse &&
                  e.kind !== 'reversal' &&
                  !data.events.some((x) => x.reversal_of === e.id) && (
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        const reason = await askPrompt(
                          'Motivo do estorno integral deste recebimento:',
                        );
                        if (
                          reason?.trim() &&
                          (await askConfirmation(
                            'Registrar estorno? O histórico original será mantido.',
                            'Estornar',
                          ))
                        )
                          void run(async () => {
                            await api(
                              root + '/reverse',
                              'POST',
                              { version: data.version, event_id: e.id, reason },
                              key.current,
                            );
                            setNotice('Estorno registrado; saldo recalculado.');
                          });
                      }}
                      variant="danger"
                      loading={busy}
                    >
                      Estornar recebimento {e.id.slice(0, 8)}
                    </Button>
                  )}
              </article>
            ))}
          </section>
        </>
      )}
    </>
  );
}
