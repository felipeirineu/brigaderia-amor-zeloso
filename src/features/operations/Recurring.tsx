import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { api } from '../api';
import { HelpTip } from '../../components/HelpTip';
import { useRemote, Failure, localDay } from './common';
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
                skipped: { id: string; name: string; reason: string }[];
                created: number;
                already_present: number;
              }>('generate-week', 'POST', { week });
              setSkipped(result.skipped);
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
