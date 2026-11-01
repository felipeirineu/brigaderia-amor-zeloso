import { MoneyField, QuantityField } from '../../components/NumericInputs';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { api, parsePrice, money, dateTime } from '../api';
import { HelpTip } from '../../components/HelpTip';
import { useRemote, Failure, localDay, type OperationalOrder } from './common';
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
  courier: 'unassigned' | 'owner' | 'partner' | 'courier';
  courier_name: string;
  courier_fee_cents: number;
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
  const [generated, setGenerated] = useState<OperationalOrder[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const confirmKeys = useRef<Record<string, string>>({});
  const [batchResults, setBatchResults] = useState<
    { id: string; ok: boolean; error?: string }[]
  >([]);
  const [skipped, setSkipped] = useState<
      { id: string; name: string; reason: string }[]
    >([]),
    [editing, setEditing] = useState<Plan | null>(null),
    [name, setName] = useState(''),
    [customer, setCustomer] = useState(''),
    [weekday, setWeekday] = useState(1),
    [time, setTime] = useState('10:00'),
    [type, setType] = useState<'delivery' | 'pickup'>('delivery'),
    [address, setAddress] = useState(''),
    [courier, setCourier] = useState<Plan['courier']>('unassigned'),
    [courierName, setCourierName] = useState(''),
    [courierFee, setCourierFee] = useState('0,00'),
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
    setCourier('unassigned');
    setCourierName('');
    setCourierFee('0,00');
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
          courier,
          courier_name: courierName,
          courier_fee_cents: parsePrice(courierFee),
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
                orders: OperationalOrder[];
                skipped: { id: string; name: string; reason: string }[];
                created: number;
                already_present: number;
              }>('generate-week', 'POST', { week });
              setSkipped(result.skipped);
              setGenerated(result.orders);
              setSelected({});
              setBatchResults([]);
              confirmKeys.current = {};
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
      {generated.length > 0 && (
        <section className="panel">
          <h2>Revise antes de confirmar</h2>
          <p>
            Marque somente os pedidos conferidos. Abra o pedido para ajustar
            quantidades/endereço; depois gere novamente para atualizar a lista.
          </p>
          {generated.map((o) => (
            <article key={o.id}>
              <h3>
                {o.customer_name} · {dateTime(o.due_at)}
              </h3>
              <ul>
                {o.items.map((i) => (
                  <li key={i.variant_id}>
                    {i.quantity} × {i.product_name} — {i.variant_label}
                  </li>
                ))}
              </ul>
              <p>
                {money(o.total_cents)} ·{' '}
                {o.delivery_type === 'pickup'
                  ? 'Retirada'
                  : o.delivery_address || 'Endereço pendente'}
              </p>
              <Link to={`/gestao/pedidos/${o.id}`}>Revisar pedido</Link>
              {['draft', 'awaiting_confirmation'].includes(o.status) && (
                <label>
                  <input
                    type="checkbox"
                    checked={!!selected[o.id]}
                    onChange={(e) =>
                      setSelected({ ...selected, [o.id]: e.target.checked })
                    }
                  />
                  Revisado: {o.customer_name}
                </label>
              )}
            </article>
          ))}
          <button
            disabled={busy || !Object.values(selected).some(Boolean)}
            onClick={() => {
              const chosen = generated.filter((o) => selected[o.id]);
              if (!confirm(`Confirmar ${chosen.length} pedido(s) revisado(s)?`))
                return;
              void run(async () => {
                const results: { id: string; ok: boolean; error?: string }[] =
                  [];
                for (let i = 0; i < chosen.length; i += 3) {
                  const chunk = chosen.slice(i, i + 3).map((o) => ({
                    id: o.id,
                    version: o.version,
                    key:
                      confirmKeys.current[o.id] ??
                      (confirmKeys.current[o.id] = crypto.randomUUID()),
                  }));
                  const response = await api<{ results: typeof results }>(
                    'confirm-reviewed',
                    'POST',
                    { orders: chunk },
                  );
                  results.push(...response.results);
                  setBatchResults([...results]);
                }
                setSelected({});
                setGenerated(
                  generated.filter(
                    (o) => !results.some((r) => r.ok && r.id === o.id),
                  ),
                );
                setNotice(
                  `${results.filter((r) => r.ok).length} pedido(s) confirmado(s). Revise os resultados individuais.`,
                );
              });
            }}
          >
            Confirmar todos os revisados (
            {Object.values(selected).filter(Boolean).length})
          </button>
          {batchResults.map((r) => (
            <p key={r.id} role={r.ok ? 'status' : 'alert'}>
              Pedido {r.id.slice(0, 8)}: {r.ok ? 'confirmado' : r.error}
            </p>
          ))}
        </section>
      )}
      {skipped.length > 0 && (
        <section className="panel" role="alert">
          <h2>Modelos ignorados</h2>
          <ul>
            {skipped.map((s) => (
              <li key={s.id}>
                {s.name}: {s.reason}{' '}
                <a href={`#model-${s.id}`}>Revisar modelo</a>
              </li>
            ))}
          </ul>
        </section>
      )}
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
        <label>
          Entregador padrão
          <select
            value={courier}
            onChange={(e) => setCourier(e.target.value as Plan['courier'])}
          >
            <option value="unassigned">A definir</option>
            <option value="owner">Proprietário</option>
            <option value="partner">Esposa</option>
            <option value="courier">Motoboy</option>
          </select>
        </label>
        {courier === 'courier' && (
          <label>
            Nome do motoboy
            <input
              required
              maxLength={100}
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
            />
          </label>
        )}
        <label>
          Taxa padrão do entregador (R$)
          <MoneyField
            value={courierFee}
            onValueChange={(value) => setCourierFee(value)}
          />
        </label>
        <p>Copiado aos novos pedidos e sempre revisável; não cria despesa.</p>
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
                <QuantityField
                  min="1"
                  max="10000"
                  required
                  value={item.quantity}
                  onValueChange={(value) =>
                    setItems(
                      items.map((v, j) =>
                        j === i ? { ...v, quantity: Number(value) } : v,
                      ),
                    )
                  }
                  steppers={false}
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
        <article className="panel" key={p.id} id={`model-${p.id}`}>
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
                setCourier(p.courier);
                setCourierName(p.courier_name);
                setCourierFee(
                  (p.courier_fee_cents / 100).toFixed(2).replace('.', ','),
                );
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
                    courier: p.courier,
                    courier_name: p.courier_name,
                    courier_fee_cents: p.courier_fee_cents,
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
