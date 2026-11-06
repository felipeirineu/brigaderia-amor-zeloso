import { fortalezaDay, shiftDay } from '../../../shared/workday';
import { createPortal } from 'react-dom';
import { sortFlavors, readFlavorOrder, type Popularity } from './flavorOrder';
import { Button } from '../../components/Button';
import { useField, useCourierLabels, SiteAvatar } from '../field/FieldContext';
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api, money, nextWeeklyTime } from '../api';
import { Failure, useRemote } from '../operations/common';
import { MoneyInput, QuantityInput } from '../../components/NumericInputs';
import { photoURL } from '../../../shared/flavors';
import { emptyPlace } from '../../../shared/field';
import {
  emptyTerms,
  type B2BProfile,
  type Terms,
} from '../../../shared/finance';
interface Product {
  id: string;
  name: string;
  photo_key: string | null;
  variants: {
    id: string;
    label: string;
    active: number;
    price_cents: number;
    photo_key: string | null;
  }[];
}
interface Plan {
  id: string;
  name: string;
  weekday: number;
  time: string;
  notes: string;
  delivery_type: 'pickup' | 'delivery';
  delivery_address: string;
  courier: 'unassigned' | 'owner' | 'partner' | 'courier';
  courier_name: string;
  courier_fee_cents: number;
  valid: boolean;
  items: { variant_id: string; quantity: number }[];
}
interface Defaults {
  ranking: Popularity;
  product_order: string[];
  profile: B2BProfile;
  plans: Plan[];
  last: {
    valid: boolean;
    items: { variant_id: string; quantity: number }[];
    notes: string;
  } | null;
}
interface EditOrder {
  id: string;
  customer_id: string;
  customer_name: string;
  version: number;
  status: string;
  due_at: string;
  notes: string;
  delivery_type: 'pickup' | 'delivery';
  delivery_address: string;
  courier: Plan['courier'];
  courier_name: string;
  courier_fee_cents: number;
  items: {
    variant_id: string;
    quantity: number;
    product_name: string;
    variant_label: string;
    unit_price_cents: number;
  }[];
}
export function Totem({ financial = false }: { financial?: boolean }) {
  const field = useField(),
    courierLabels = useCourierLabels();
  const { id } = useParams(),
    navigate = useNavigate(),
    [search] = useSearchParams(),
    products = useRemote<Product[]>('products'),
    [query, setQuery] = useState(''),
    customers = useRemote<{ id: string; name: string; frequency: number }[]>(
      'mobile/customers?q=' + encodeURIComponent(query),
    );
  const [step, setStep] = useState(0),
    [customer, setCustomer] = useState<{ id: string; name: string } | null>(
      null,
    ),
    [defaults, setDefaults] = useState<Defaults | null>(null),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [due, setDue] = useState(''),
    [planDue, setPlanDue] = useState(''),
    [notes, setNotes] = useState(''),
    [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>(
      'delivery',
    ),
    [address, setAddress] = useState(''),
    [courier, setCourier] = useState<Plan['courier']>('unassigned'),
    [courierName, setCourierName] = useState(''),
    [fee, setFee] = useState<number | null>(null),
    [terms, setTerms] = useState<Terms>(emptyTerms),
    [editing, setEditing] = useState<EditOrder | null>(null),
    [termsLoaded, setTermsLoaded] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState('');
  const root = useRef<HTMLElement>(null);
  const site = customer
      ? field?.data?.sites.find((x) => x.id === customer.id)
      : undefined,
    savedAddress =
      site?.data.address ||
      (defaults
        ? [
            defaults.profile.address,
            defaults.profile.neighborhood,
            defaults.profile.reference,
          ]
            .filter(Boolean)
            .join(' ')
        : ''),
    [saveAddress, setSaveAddress] = useState(true),
    [addressNotice, setAddressNotice] = useState('');
  const flow = financial
      ? ['Cliente', 'Sabores', 'Quando', 'Entrega', 'Pagamento', 'Revisar']
      : ['Cliente', 'Sabores', 'Quando', 'Entrega', 'Revisar'],
    WHEN = 2,
    DELIVERY = 3,
    PAYMENT = financial ? 4 : -1,
    REVIEW = flow.length - 1;
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [step]);
  const focusBack =
    typeof document !== 'undefined'
      ? document.getElementById('mobile-header-actions')
      : null;
  const choice = useRef(0),
    pending = useRef(false),
    request = useRef({ body: '', key: crypto.randomUUID() });
  useEffect(() => {
    if (!id) return;
    let current = true;
    api<EditOrder>('orders/' + id)
      .then(async (o) => {
        if (!current) return;
        if (!['draft', 'awaiting_confirmation'].includes(o.status))
          throw Error('Reabra o pedido antes da produção para ajustar.');
        setEditing(o);
        setCustomer({ id: o.customer_id, name: o.customer_name });
        setCounts(
          Object.fromEntries(o.items.map((i) => [i.variant_id, i.quantity])),
        );
        setDue(
          new Date(Date.parse(o.due_at) - 10800000).toISOString().slice(0, 16),
        );
        setNotes(o.notes);
        setDeliveryType(o.delivery_type);
        setAddress(o.delivery_address);
        setCourier(o.courier);
        setCourierName(o.courier_name);
        setFee(o.courier_fee_cents);
        setStep(1);
        if (financial) {
          const account = await api<{ orders: { id: string; terms: Terms }[] }>(
            'finance/customers/' + o.customer_id,
          );
          if (current) {
            setTerms(
              account.orders.find((p) => p.id === o.id)?.terms ?? emptyTerms(),
            );
            setTermsLoaded(o.id);
          }
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [id, financial]);
  function plan(p: Plan) {
    setCounts(
      Object.fromEntries(p.items.map((i) => [i.variant_id, i.quantity])),
    );
    const planned = nextWeeklyTime(p.weekday, p.time);
    setDue(planned);
    setPlanDue(planned);
    setNotes(p.notes);
    setDeliveryType(p.delivery_type);
    setAddress(p.delivery_address);
    setCourier(p.courier);
    setCourierName(p.courier_name);
    setFee(p.courier_fee_cents);
  }
  async function select(c: { id: string; name: string }) {
    const serial = ++choice.current;
    setCustomer(c);
    setCounts({});
    setDefaults(null);
    setDue('');
    setPlanDue('');
    setNotes('');
    setStep(1);
    setBusy(true);
    setError('');
    try {
      const d = await api<Defaults>('mobile/defaults/' + c.id);
      if (serial !== choice.current) return;
      setDefaults(d);
      setAddress(
        field?.data?.sites.find((s) => s.id === c.id)?.data.address ||
          [d.profile.address, d.profile.neighborhood, d.profile.reference]
            .filter(Boolean)
            .join(' '),
      );
      setCourier(d.profile.courier);
      setCourierName(d.profile.courier_name);
      setFee(d.profile.courier_fee_cents);
      setTerms(d.profile.terms);
      const valid = d.plans.filter((p) => p.valid);
      if (valid.length === 1) plan(valid[0]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (serial === choice.current) setBusy(false);
    }
  }
  const options =
    products.data?.flatMap((p) =>
      p.variants
        .filter((v) => v.active)
        .map((v) => ({
          ...v,
          product_name: p.name,
          photo_key: v.photo_key || p.photo_key,
        })),
    ) ?? [];
  const historical =
    editing?.items
      .filter((i) => !options.some((o) => o.id === i.variant_id))
      .map((i) => ({
        id: i.variant_id,
        label: i.variant_label,
        active: 1,
        price_cents: i.unit_price_cents,
        product_name: i.product_name,
        photo_key: null,
      })) ?? [];
  const all = [...options, ...historical],
    selected = all.filter((v) => counts[v.id] > 0),
    price = (v: (typeof all)[number]) =>
      editing?.items.find((i) => i.variant_id === v.id)?.unit_price_cents ??
      v.price_cents,
    total = selected.reduce((n, v) => n + counts[v.id] * price(v), 0);
  async function confirmOrder() {
    if (pending.current || !customer) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const invalid =
        root.current?.querySelector<HTMLInputElement>('input:invalid');
      if (invalid) {
        invalid.reportValidity();
        throw Error('Confira o campo indicado antes de confirmar.');
      }
      if (!due) throw Error('Escolha data e hora para confirmar.');
      const data = {
          customer_id: customer.id,
          ...(editing ? { version: editing.version } : {}),
          due_at: new Date(due + ':00-03:00').toISOString(),
          notes,
          items: selected.map((v) => ({
            variant_id: v.id,
            quantity: counts[v.id],
          })),
          delivery: {
            delivery_type: deliveryType,
            delivery_address: address,
            courier,
            courier_name: courierName,
            courier_fee_cents: courier === 'courier' ? (fee ?? 0) : 0,
          },
          terms: financial ? terms : null,
        },
        signature = JSON.stringify(data);
      if (request.current.body !== signature)
        request.current = { body: signature, key: crypto.randomUUID() };
      const result = await api<{ id: string }>(
        `mobile/orders${editing ? '/' + editing.id : ''}`,
        editing ? 'PUT' : 'POST',
        data,
        request.current.key,
      );
      if (
        field &&
        customer &&
        deliveryType === 'delivery' &&
        !savedAddress &&
        saveAddress &&
        address.trim()
      )
        try {
          await api(
            'field/customers/' + customer.id,
            'PUT',
            {
              data: {
                ...(site?.data ?? emptyPlace()),
                address: address.trim(),
              },
              version: site?.version ?? 0,
            },
            crypto.randomUUID(),
          );
          await field.refresh();
          setAddressNotice('Endereço salvo no cadastro do cliente.');
        } catch {
          setAddressNotice(
            'Pedido salvo, mas o endereço não foi gravado no cadastro. Edite em Clientes.',
          );
        }
      setSuccess(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (success)
    return (
      <section className="panel order-success">
        <span className="success-check" aria-hidden="true">
          ✓
        </span>
        <h1>Pedido confirmado</h1>
        <p>
          {customer?.name} · {money(total)}
        </p>
        {addressNotice && <p role="status">{addressNotice}</p>}
        <div className="stacked-actions">
          <Button
            className="button primary-action"
            to={`/gestao/pedidos/${success}#whatsapp`}
            variant="primary"
          >
            Avisar no WhatsApp
          </Button>
          <Button className="button" to="/gestao">
            Ver no Hoje
          </Button>
          <Button
            className="button"
            variant="ghost"
            onClick={() => window.location.assign('/gestao/pedidos?novo=1')}
          >
            Fazer outro pedido
          </Button>
        </div>
      </section>
    );
  return (
    <section className="totem order-focus" ref={root}>
      <div className="section-heading totem-heading">
        <h1>{id ? 'Ajustar pedido' : 'Novo pedido'}</h1>
        <Button to="/gestao/pedidos" variant="ghost">
          Ver lista
        </Button>
      </div>
      {focusBack &&
        (!editing || step > 1) &&
        createPortal(
          <Button
            variant="ghost"
            type="button"
            onClick={() =>
              step === 0 ? navigate('/gestao/pedidos') : setStep(step - 1)
            }
            disabled={busy}
            aria-label="Voltar uma etapa"
          >
            Voltar
          </Button>,
          focusBack,
        )}
      <ol className="step-indicator" aria-label="Etapas do pedido">
        {flow.map((s, i) => (
          <li key={s} aria-current={step === i ? 'step' : undefined}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      <Failure message={error || products.error || customers.error} />
      {step > 0 && (!editing || step > 1) && (
        <Button
          className="totem-back"
          disabled={busy}
          onClick={() => setStep(step - 1)}
          loading={busy}
        >
          Voltar
        </Button>
      )}
      {step === 0 && (
        <>
          <h2>Escolha o cliente</h2>
          <div className="customer-tiles">
            {customers.data?.map((c) => (
              <Button
                key={c.id}
                className="customer-tile"
                onClick={() => void select(c)}
              >
                <span className="initial-avatar" aria-hidden="true">
                  <SiteAvatar id={c.id} name={c.name} />
                </span>
                {c.name}
              </Button>
            ))}
          </div>
          <label>
            Buscar cliente
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Button to="/gestao/clientes" variant="ghost">
            Cadastrar cliente
          </Button>
        </>
      )}
      {step === 1 && (
        <>
          <h2 className="totem-customer">{customer?.name}</h2>
          <p className="totem-hint">Toque para adicionar caixas</p>
          {busy && <p role="status">Preenchendo o pedido…</p>}
          {defaults && defaults.plans.filter((p) => p.valid).length > 1 && (
            <div className="chips" aria-label="Pedidos padrão">
              {defaults.plans
                .filter((p) => p.valid)
                .map((p) => (
                  <Button key={p.id} onClick={() => plan(p)}>
                    {p.name}
                  </Button>
                ))}
            </div>
          )}
          {!defaults?.plans.some((p) => p.valid) && defaults?.last?.valid && (
            <Button
              className="repeat-order"
              variant="ghost"
              onClick={() => {
                setCounts(
                  Object.fromEntries(
                    defaults.last!.items.map((i) => [i.variant_id, i.quantity]),
                  ),
                );
                setNotes(defaults.last!.notes);
              }}
            >
              Repetir último pedido
            </Button>
          )}
          <div className="flavor-grid">
            {sortFlavors(
              products.data ?? [],
              defaults?.ranking,
              readFlavorOrder(),
              defaults?.product_order,
            ).flatMap((p) => {
              const active = p.variants.filter((v) => v.active);
              return active.map((v) => {
                const count = counts[v.id] ?? 0,
                  key = v.photo_key || p.photo_key,
                  title = active.length > 1 ? v.label : p.name;
                return (
                  <article
                    className={`flavor-card${count ? ' is-selected' : ''}`}
                    key={v.id}
                  >
                    <Button
                      className="flavor-add"
                      disabled={busy || count >= 10000}
                      aria-label={`${title}, ${count ? count + ' embalagens, ' : ''}adicionar`}
                      onClick={() =>
                        setCounts({
                          ...counts,
                          [v.id]: Math.min(10000, count + 1),
                        })
                      }
                    >
                      {key ? (
                        <img
                          src={photoURL(key)}
                          alt=""
                          width={120}
                          height={120}
                        />
                      ) : (
                        <span className="flavor-placeholder" aria-hidden="true">
                          {title.charAt(0)}
                        </span>
                      )}
                      <strong>{title}</strong>
                      <span>
                        {money(
                          price({ ...v, product_name: p.name, photo_key: key }),
                        )}
                      </span>
                      {count > 0 && <b className="quantity-badge">{count}</b>}
                    </Button>
                    {count > 0 && (
                      <div className="flavor-stepper">
                        <Button
                          className="flavor-step"
                          type="button"
                          aria-label={'Diminuir quantidade de ' + title}
                          onClick={() => {
                            const next = { ...counts };
                            if (count === 1) delete next[v.id];
                            else next[v.id] = count - 1;
                            setCounts(next);
                          }}
                        >
                          −
                        </Button>
                        <b>{count} cx</b>
                        <Button
                          type="button"
                          aria-label={'Aumentar quantidade de ' + title}
                          disabled={busy || count >= 10000}
                          onClick={() =>
                            setCounts({
                              ...counts,
                              [v.id]: Math.min(10000, count + 1),
                            })
                          }
                        >
                          +
                        </Button>
                      </div>
                    )}
                  </article>
                );
              });
            })}
          </div>
          {historical
            .filter((v) => counts[v.id] > 0)
            .map((v) => (
              <article className="panel" key={v.id}>
                <h3>
                  {v.product_name} · {v.label} (histórico)
                </h3>
                <QuantityInput
                  aria-label={'Quantidade de ' + v.product_name}
                  value={counts[v.id]}
                  onValueChange={(n) => setCounts({ ...counts, [v.id]: n })}
                />
                <Button
                  onClick={() => {
                    const copy = { ...counts };
                    delete copy[v.id];
                    setCounts(copy);
                  }}
                >
                  Remover {v.product_name}
                </Button>
              </article>
            ))}
        </>
      )}
      {step === WHEN && (
        <>
          <h2 className="wizard-question">Quando entregar?</h2>
          <p className="wizard-hint">{customer?.name}</p>
          <h3 className="order-section-label">Dia</h3>
          <div
            className="chips"
            role="group"
            aria-label="Atalhos de data do pedido"
          >
            {[
              ['Hoje', fortalezaDay()],
              ['Amanhã', shiftDay(fortalezaDay(), 1)],
              ...(planDue
                ? [['Dia do pedido padrão', planDue.slice(0, 10)]]
                : []),
            ].map(([label, day]) => (
              <Button
                key={label}
                variant="chip"
                aria-pressed={due.slice(0, 10) === day}
                onClick={() =>
                  setDue(
                    day +
                      'T' +
                      (label === 'Dia do pedido padrão'
                        ? planDue.slice(11, 16)
                        : due.slice(11, 16) ||
                          new Date(Date.now() - 10800000)
                            .toISOString()
                            .slice(11, 16)),
                  )
                }
              >
                {label}
              </Button>
            ))}
          </div>
          <h3 className="order-section-label">Horário</h3>
          <div className="chips" role="group" aria-label="Atalhos de horário">
            {['09:00', '14:00', '18:00'].map((h) => (
              <Button
                key={h}
                variant="chip"
                aria-pressed={due.slice(11, 16) === h}
                onClick={() =>
                  setDue((due.slice(0, 10) || fortalezaDay()) + 'T' + h)
                }
              >
                {h}
              </Button>
            ))}
          </div>
          <label>
            Outro dia ou horário
            <input
              type="datetime-local"
              value={due}
              required
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
        </>
      )}
      {step === DELIVERY && (
        <>
          <h2 className="wizard-question">Como vai chegar?</h2>
          <h3 className="order-section-label">Como</h3>
          <div className="chips" aria-label="Entrega ou retirada">
            <Button
              aria-pressed={deliveryType === 'delivery'}
              onClick={() => setDeliveryType('delivery')}
            >
              Entrega
            </Button>
            <Button
              aria-pressed={deliveryType === 'pickup'}
              onClick={() => setDeliveryType('pickup')}
            >
              Retirada
            </Button>
          </div>
          {deliveryType === 'delivery' && (
            <>
              <h3 className="order-section-label">Endereço</h3>
              {savedAddress ? (
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={address === savedAddress}
                    onChange={(e) =>
                      setAddress(e.target.checked ? savedAddress : '')
                    }
                  />
                  <span>
                    Usar o endereço do cliente
                    <small>{savedAddress}</small>
                  </span>
                </label>
              ) : (
                <p className="wizard-hint">
                  Este cliente ainda não tem endereço salvo.
                </p>
              )}
              {address !== savedAddress || !savedAddress ? (
                <>
                  <label>
                    Endereço desta entrega
                    <textarea
                      value={address}
                      placeholder="Rua, número, bairro e referência"
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </label>
                  {field && !savedAddress && (
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={saveAddress}
                        onChange={(e) => setSaveAddress(e.target.checked)}
                      />
                      <span>Salvar no cadastro do cliente</span>
                    </label>
                  )}
                </>
              ) : null}
            </>
          )}
          <h3 className="order-section-label">Quem leva</h3>
          <div
            className="chips courier-choices"
            role="group"
            aria-label="Quem leva"
          >
            {(['unassigned', 'owner', 'partner', 'courier'] as const).map(
              (c) => (
                <Button
                  key={c}
                  aria-pressed={courier === c}
                  onClick={() => setCourier(c)}
                >
                  {c !== 'unassigned' && (
                    <span className="courier-initials" aria-hidden="true">
                      {courierLabels[c]
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toLocaleUpperCase('pt-BR')}
                    </span>
                  )}
                  {courierLabels[c]}
                </Button>
              ),
            )}
          </div>
          {courier === 'courier' && (
            <label>
              Nome do motoboy
              <input
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
              />
            </label>
          )}
          {courier === 'courier' && (
            <MoneyInput
              label="Valor combinado com o motoboy (R$)"
              value={fee}
              onValueChange={setFee}
            />
          )}
        </>
      )}
      {step === PAYMENT && (
        <>
          <h2 className="wizard-question">Como vai pagar?</h2>
          <h3 className="order-section-label">Pagamento</h3>
          <div className="chips" aria-label="Condição de pagamento">
            {(['unset', 'advance', 'delivery', 'credit'] as const).map(
              (mode) => (
                <Button
                  key={mode}
                  aria-pressed={terms.mode === mode}
                  onClick={() =>
                    setTerms(
                      mode === 'credit'
                        ? defaults?.profile.terms.mode === 'credit'
                          ? defaults.profile.terms
                          : {
                              ...terms,
                              mode,
                              cycle:
                                terms.cycle === 'fourteen_days'
                                  ? 'fixed_days'
                                  : terms.cycle,
                              due_days: terms.due_days ?? 0,
                            }
                        : { ...terms, mode },
                    )
                  }
                >
                  {mode === 'unset'
                    ? 'A definir'
                    : mode === 'advance'
                      ? 'Adiantado'
                      : mode === 'delivery'
                        ? 'Na entrega'
                        : 'A prazo'}
                </Button>
              ),
            )}
          </div>
          {terms.mode === 'credit' && (
            <>
              <h3 className="order-section-label">Fechamento</h3>
              <div className="chips" role="group" aria-label="Fechamento">
                {(
                  [
                    ['weekly', 'Semanal'],
                    ['fixed_days', 'Quinzenal (dia 15 e fim do mês)'],
                    ['monthly', 'Mensal'],
                  ] as const
                ).map(([cycle, label]) => (
                  <Button
                    key={cycle}
                    variant="chip"
                    aria-pressed={terms.cycle === cycle}
                    onClick={() =>
                      setTerms({
                        ...terms,
                        cycle,
                        fixed_days:
                          cycle === 'fixed_days' ? [15, 31] : terms.fixed_days,
                      })
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <h3 className="order-section-label">Pagar</h3>
              <div
                className="chips"
                role="group"
                aria-label="Prazo após o fechamento"
              >
                {(
                  [
                    [0, 'No fechamento'],
                    [7, '7 dias depois'],
                    [15, '15 dias depois'],
                  ] as const
                ).map(([days, label]) => (
                  <Button
                    key={days}
                    variant="chip"
                    aria-pressed={terms.due_days === days}
                    onClick={() => setTerms({ ...terms, due_days: days })}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <p className="wizard-hint">
                Vale para este pedido. Para mudar o padrão do cliente, use a
                conta dele no Financeiro.
              </p>
            </>
          )}
        </>
      )}
      {step === REVIEW && (
        <>
          <h2 className="wizard-question">Revise e confirme</h2>
          <p className="wizard-hint">{customer?.name}</p>
          {selected.map((v) => (
            <article className="review-line" key={v.id}>
              {v.photo_key && (
                <img
                  src={photoURL(v.photo_key)}
                  alt=""
                  width={64}
                  height={64}
                />
              )}
              <div>
                <h3>
                  {v.product_name} · {v.label}
                </h3>
                <QuantityInput
                  aria-label={'Revisar quantidade de ' + v.product_name}
                  value={counts[v.id]}
                  onValueChange={(n) => setCounts({ ...counts, [v.id]: n })}
                />
                <p>{money(price(v) * counts[v.id])}</p>
              </div>
            </article>
          ))}
          <ul className="order-summary" aria-label="Resumo do pedido">
            <li>
              <span>
                <small>Quando</small>
                {due
                  ? new Intl.DateTimeFormat('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'UTC',
                    }).format(new Date(due + ':00Z'))
                  : 'A escolher'}
              </span>
              <Button variant="ghost" onClick={() => setStep(WHEN)}>
                Alterar
              </Button>
            </li>
            <li>
              <span>
                <small>Como</small>
                {deliveryType === 'pickup'
                  ? 'Retirada'
                  : 'Entrega' + (address ? ' · ' + address : '')}
                {deliveryType === 'delivery' && ' · ' + courierLabels[courier]}
              </span>
              <Button variant="ghost" onClick={() => setStep(DELIVERY)}>
                Alterar
              </Button>
            </li>
            {financial && (
              <li>
                <span>
                  <small>Pagamento</small>
                  {terms.mode === 'advance'
                    ? 'Adiantado'
                    : terms.mode === 'delivery'
                      ? 'Na entrega'
                      : terms.mode === 'credit'
                        ? 'A prazo · ' +
                          (terms.cycle === 'weekly'
                            ? 'semanal'
                            : terms.cycle === 'monthly'
                              ? 'mensal'
                              : 'quinzenal')
                        : 'A definir'}
                </span>
                <Button variant="ghost" onClick={() => setStep(PAYMENT)}>
                  Alterar
                </Button>
              </li>
            )}
          </ul>
          <label>
            Observações
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <p>
            O total e as permissões são conferidos ao confirmar. O preço
            histórico é preservado nos ajustes.
          </p>
        </>
      )}
      {step > 0 && (
        <div className="totem-bar">
          <strong>
            {selected.length
              ? `Total ${money(total)}`
              : 'Toque nos sabores para montar o pedido'}
          </strong>
          {step < REVIEW ? (
            <Button
              className="primary-action"
              disabled={busy || !selected.length || (step === WHEN && !due)}
              onClick={() => setStep(step + 1)}
              variant="primary"
              loading={busy}
            >
              Continuar
              {step === 1 && selected.length ? ' · ' + money(total) : ''}
            </Button>
          ) : (
            <Button
              className="primary-action"
              disabled={
                busy ||
                (!!id &&
                  (editing?.id !== id || (financial && termsLoaded !== id))) ||
                !selected.length ||
                !due
              }
              onClick={() => void confirmOrder()}
              variant="primary"
              loading={busy}
            >
              Confirmar pedido
            </Button>
          )}
        </div>
      )}
      {search.get('treino') && (
        <p>Use a ajuda para treinar com exemplos em memória.</p>
      )}
    </section>
  );
}
