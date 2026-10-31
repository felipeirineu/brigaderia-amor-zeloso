import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { api, dateTime, money, parsePrice } from './api';

interface Session {
  user_id: string;
  organization_id: string;
  role: 'owner' | 'operator';
}
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  active: number;
  version: number;
}
interface Variant {
  id?: string;
  label: string;
  weight_grams: number;
  units_per_box: number;
  price_cents: number;
  active: number | boolean;
}
interface Product {
  id: string;
  name: string;
  description: string;
  active: number;
  version: number;
  variants: Variant[];
}
interface Item {
  variant_id: string;
  quantity: number;
  product_name?: string;
  variant_label?: string;
  unit_price_cents?: number;
}
interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  due_at: string;
  notes: string;
  total_cents: number;
  version: number;
  active: number;
  items: Item[];
}
function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
function useList<T>(path: string) {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      setData(await api<T[]>(path));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    let current = true;
    api<T[]>(path)
      .then((d) => {
        if (current) {
          setData(d);
          setError('');
          setLoading(false);
        }
      })
      .catch((e) => {
        if (current) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [path]);
  return { data, error, loading, reload };
}
function useSave(reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const save = async (fn: () => Promise<unknown>, done?: () => void) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      done?.();
      await reload();
      setNotice('Alteração salva no servidor.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return { save, busy, error, notice };
}
export function Login() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<{
    configured: boolean;
    login_url: string | null;
  } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ configured: boolean; login_url: string | null }>('auth/config')
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, []);
  async function enter() {
    setBusy(true);
    setError('');
    try {
      await api('access/login', 'POST', {});
      navigate('/gestao');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel auth-panel">
      <p className="eyebrow">ACESSO RESTRITO</p>
      <h1>Entrar na gestão</h1>
      <p>
        Use a identidade autorizada pelos proprietários. Não há cadastro
        público.
      </p>
      <ErrorMessage message={error} />
      {config?.configured ? (
        <>
          <a className="button" href={config.login_url!}>
            1. Verificar identidade
          </a>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void enter()}
          >
            {busy ? 'Entrando…' : '2. Entrar após a verificação'}
          </button>
          <p>
            Após validar a identidade no Cloudflare Access, volte a esta página
            e selecione “Entrar”. A sessão expira em até 8 horas.
          </p>
        </>
      ) : (
        <p role="status">
          {config
            ? 'O acesso seguro e o banco ainda precisam ser configurados no Cloudflare. A demonstração continua disponível.'
            : 'Verificando configuração…'}
        </p>
      )}
      <Link to="/app">Voltar à demonstração</Link>
    </section>
  );
}
function Customers() {
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const list = useList<Customer>(
    `customers?q=${encodeURIComponent(query)}${all ? '&active=all' : ''}`,
  );
  const save = useSave(list.reload);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    active: true,
  });
  const key = useRef(crypto.randomUUID());
  function reset() {
    setEditing(null);
    setForm({ name: '', phone: '', email: '', notes: '', active: true });
    key.current = crypto.randomUUID();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void save.save(
      () =>
        api(
          `customers${editing ? `/${editing.id}` : ''}`,
          editing ? 'PUT' : 'POST',
          { ...form, ...(editing ? { version: editing.version } : {}) },
          key.current,
        ),
      reset,
    );
  }
  return (
    <>
      <h1>Clientes</h1>
      <p>
        Contatos privados da sua organização. Telefone com DDD; endereço não é
        obrigatório.
      </p>
      <ErrorMessage message={list.error || save.error} />
      <p role="status">{save.notice}</p>
      <form className="data-form panel" onSubmit={submit}>
        <h2>{editing ? 'Editar cliente' : 'Novo cliente'}</h2>
        <label>
          Nome
          <input
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          Telefone
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <label>
          E-mail (opcional)
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Notas operacionais
          <textarea
            maxLength={1000}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />{' '}
          Ativo
        </label>
        <div className="actions">
          <button disabled={save.busy}>Salvar cliente</button>
          <button type="button" onClick={reset}>
            Limpar edição
          </button>
        </div>
      </form>
      <label>
        Buscar por nome
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={all}
          onChange={(e) => setAll(e.target.checked)}
        />{' '}
        Incluir arquivados
      </label>
      <button onClick={() => void list.reload()}>Atualizar lista</button>
      {list.loading ? (
        <p role="status">Carregando…</p>
      ) : list.data.length === 0 ? (
        <p>Nenhum cliente encontrado.</p>
      ) : (
        <div className="record-list">
          {list.data.map((c) => (
            <article className="panel" key={c.id}>
              <h2>{c.name}</h2>
              <p>
                {c.phone} · {c.active ? 'Ativo' : 'Arquivado'}
              </p>
              <button
                onClick={() => {
                  setEditing(c);
                  setForm({
                    name: c.name,
                    phone: c.phone,
                    email: c.email,
                    notes: c.notes,
                    active: !!c.active,
                  });
                }}
              >
                Editar {c.name}
              </button>
              {!!c.active && (
                <button
                  disabled={save.busy}
                  onClick={() => {
                    if (
                      confirm(
                        'Arquivar este cliente? O histórico será preservado.',
                      )
                    )
                      void save.save(() =>
                        api(`customers/${c.id}`, 'DELETE', {
                          version: c.version,
                        }),
                      );
                  }}
                >
                  Arquivar {c.name}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
const emptyVariant = (): Variant => ({
  label: '',
  weight_grams: 1,
  units_per_box: 1,
  price_cents: 0,
  active: true,
});
function Products() {
  const [query, setQuery] = useState('');
  const list = useList<Product>(
    `products?active=all&q=${encodeURIComponent(query)}`,
  );
  const save = useSave(list.reload);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([emptyVariant()]);
  const [prices, setPrices] = useState(['0,00']);
  const key = useRef(crypto.randomUUID());
  function reset() {
    setEditing(null);
    setName('');
    setDescription('');
    setActive(true);
    setVariants([emptyVariant()]);
    setPrices(['0,00']);
    key.current = crypto.randomUUID();
  }
  function variant(index: number, changes: Partial<Variant>) {
    setVariants(
      variants.map((v, i) => (i === index ? { ...v, ...changes } : v)),
    );
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void save.save(async () => {
      const payload = {
        name,
        description,
        active,
        variants: variants.map((v, i) => ({
          ...v,
          price_cents: parsePrice(prices[i]),
          active: !!v.active,
        })),
        ...(editing ? { version: editing.version } : {}),
      };
      return api(
        `products${editing ? `/${editing.id}` : ''}`,
        editing ? 'PUT' : 'POST',
        payload,
        key.current,
      );
    }, reset);
  }
  return (
    <>
      <h1>Produtos</h1>
      <p>
        Preço por unidade de venda (por exemplo, uma caixa). Dados publicados
        somente após autorização; catálogo desligado.
      </p>
      <ErrorMessage message={list.error || save.error} />
      <p role="status">{save.notice}</p>
      <form className="data-form panel" onSubmit={submit}>
        <h2>{editing ? 'Editar produto' : 'Novo produto'}</h2>
        <label>
          Nome do produto
          <input
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Descrição
          <textarea
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />{' '}
          Produto ativo
        </label>
        {variants.map((v, i) => (
          <fieldset key={i}>
            <legend>Variante {i + 1}</legend>
            <label>
              Nome da variante
              <input
                required
                maxLength={100}
                value={v.label}
                onChange={(e) => variant(i, { label: e.target.value })}
              />
            </label>
            <label>
              Peso por unidade (g)
              <input
                required
                type="number"
                min="1"
                max="100000"
                value={v.weight_grams}
                onChange={(e) =>
                  variant(i, { weight_grams: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Unidades por embalagem
              <input
                required
                type="number"
                min="1"
                max="10000"
                value={v.units_per_box}
                onChange={(e) =>
                  variant(i, { units_per_box: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Preço da embalagem (R$)
              <input
                required
                inputMode="decimal"
                pattern="[0-9]+(,[0-9]{1,2})?"
                value={prices[i]}
                onChange={(e) =>
                  setPrices(
                    prices.map((p, j) => (j === i ? e.target.value : p)),
                  )
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!v.active}
                onChange={(e) => variant(i, { active: e.target.checked })}
              />{' '}
              Variante ativa
            </label>
          </fieldset>
        ))}
        <div className="actions">
          <button
            type="button"
            disabled={variants.length >= 30}
            onClick={() => {
              setVariants([...variants, emptyVariant()]);
              setPrices([...prices, '0,00']);
            }}
          >
            Adicionar variante
          </button>
          <button disabled={save.busy}>Salvar produto</button>
          <button type="button" onClick={reset}>
            Limpar edição
          </button>
        </div>
      </form>
      <label>
        Buscar produtos
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {list.loading ? (
        <p>Carregando…</p>
      ) : !list.data.length ? (
        <p>Nenhum produto cadastrado.</p>
      ) : (
        <div className="record-list">
          {list.data.map((p) => (
            <article className="panel" key={p.id}>
              <h2>{p.name}</h2>
              <p>{p.active ? 'Ativo' : 'Arquivado'}</p>
              <ul>
                {p.variants.map((v) => (
                  <li key={v.id}>
                    {v.label} · {v.weight_grams} g · {v.units_per_box} unidades
                    · {money(v.price_cents)} · {v.active ? 'Ativa' : 'Inativa'}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setEditing(p);
                  setName(p.name);
                  setDescription(p.description);
                  setActive(!!p.active);
                  setVariants(
                    p.variants.map((v) => ({
                      id: v.id,
                      label: v.label,
                      weight_grams: v.weight_grams,
                      units_per_box: v.units_per_box,
                      price_cents: v.price_cents,
                      active: !!v.active,
                    })),
                  );
                  setPrices(
                    p.variants.map((v) =>
                      (v.price_cents / 100).toFixed(2).replace('.', ','),
                    ),
                  );
                }}
              >
                Editar {p.name}
              </button>
              {!!p.active && (
                <button
                  disabled={save.busy}
                  onClick={() => {
                    if (
                      confirm(
                        'Arquivar produto? Pedidos anteriores serão preservados.',
                      )
                    )
                      void save.save(() =>
                        api(`products/${p.id}`, 'DELETE', {
                          version: p.version,
                        }),
                      );
                  }}
                >
                  Arquivar {p.name}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
function Orders() {
  const [query, setQuery] = useState('');
  const orders = useList<Order>(`orders?q=${encodeURIComponent(query)}`);
  const customers = useList<Customer>('customers');
  const products = useList<Product>('products');
  const save = useSave(orders.reload);
  const [editing, setEditing] = useState<Order | null>(null);
  const [customer, setCustomer] = useState('');
  const [due, setDue] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Item[]>([{ variant_id: '', quantity: 1 }]);
  const key = useRef(crypto.randomUUID());
  const options = products.data.flatMap((p) =>
    p.variants
      .filter((v) => v.active)
      .map((v) => ({
        id: v.id!,
        label: `${p.name} — ${v.label} (${money(v.price_cents)})`,
        price: v.price_cents,
      })),
  );
  function reset() {
    setEditing(null);
    setCustomer('');
    setDue('');
    setNotes('');
    setItems([{ variant_id: '', quantity: 1 }]);
    key.current = crypto.randomUUID();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void save.save(
      () =>
        api(
          `orders${editing ? `/${editing.id}` : ''}`,
          editing ? 'PUT' : 'POST',
          {
            customer_id: customer,
            due_at: new Date(`${due}:00-03:00`).toISOString(),
            notes,
            items: items.map((i) => ({
              variant_id: i.variant_id,
              quantity: i.quantity,
            })),
            ...(editing ? { version: editing.version } : {}),
          },
          key.current,
        ),
      reset,
    );
  }
  const estimate = items.reduce(
    (sum, i) =>
      sum +
      i.quantity *
        (editing?.items.find((o) => o.variant_id === i.variant_id)
          ?.unit_price_cents ??
          options.find((o) => o.id === i.variant_id)?.price ??
          0),
    0,
  );
  return (
    <>
      <h1>Pedidos</h1>
      <p>
        Rascunhos. Quantidade se refere à embalagem/caixa cadastrada. Status e
        entrega ficam para a Fase 2.
      </p>
      <ErrorMessage
        message={
          orders.error || customers.error || products.error || save.error
        }
      />
      <p role="status">{save.notice}</p>
      <form className="data-form panel" onSubmit={submit}>
        <h2>{editing ? 'Editar rascunho' : 'Novo pedido'}</h2>
        <label>
          Cliente
          <select
            required
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          >
            <option value="">Selecione</option>
            {customers.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Data e hora combinadas (João Pessoa)
          <input
            required
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        {items.map((i, index) => (
          <fieldset key={index}>
            <legend>Item {index + 1}</legend>
            <label>
              Variante
              <select
                required
                value={i.variant_id}
                onChange={(e) =>
                  setItems(
                    items.map((v, j) =>
                      j === index ? { ...v, variant_id: e.target.value } : v,
                    ),
                  )
                }
              >
                <option value="">Selecione</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
                {editing?.items
                  .filter((o) => !options.some((v) => v.id === o.variant_id))
                  .map((o) => (
                    <option key={o.variant_id} value={o.variant_id}>
                      {o.product_name} — {o.variant_label} (histórico)
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Quantidade de embalagens
              <input
                required
                type="number"
                min="1"
                max="10000"
                value={i.quantity}
                onChange={(e) =>
                  setItems(
                    items.map((v, j) =>
                      j === index
                        ? { ...v, quantity: Number(e.target.value) }
                        : v,
                    ),
                  )
                }
              />
            </label>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems(items.filter((_, j) => j !== index))}
              >
                Remover item {index + 1}
              </button>
            )}
          </fieldset>
        ))}
        <button
          type="button"
          disabled={items.length >= 50}
          onClick={() => setItems([...items, { variant_id: '', quantity: 1 }])}
        >
          Adicionar item
        </button>
        <label>
          Observações
          <textarea
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <p>Prévia: {money(estimate)}. O servidor confere o total ao salvar.</p>
        <div className="actions">
          <button disabled={save.busy}>Salvar pedido</button>
          <button type="button" onClick={reset}>
            Limpar edição
          </button>
        </div>
      </form>
      <label>
        Buscar pedidos por cliente
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <button onClick={() => void orders.reload()}>Atualizar pedidos</button>
      {orders.loading ? (
        <p>Carregando…</p>
      ) : !orders.data.length ? (
        <p>Nenhum pedido encontrado.</p>
      ) : (
        <div className="record-list">
          {orders.data.map((o) => (
            <article className="panel" key={o.id}>
              <h2>{o.customer_name}</h2>
              <p>
                Rascunho · {dateTime(o.due_at)} · {money(o.total_cents)}
              </p>
              <ul>
                {o.items.map((i) => (
                  <li key={i.variant_id}>
                    {i.quantity} × {i.product_name} — {i.variant_label} ·{' '}
                    {money(i.unit_price_cents!)}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setEditing(o);
                  setCustomer(o.customer_id);
                  setDue(
                    new Date(new Date(o.due_at).getTime() - 3 * 3600000)
                      .toISOString()
                      .slice(0, 16),
                  );
                  setNotes(o.notes);
                  setItems(o.items);
                }}
              >
                Editar pedido de {o.customer_name}
              </button>
              <button
                disabled={save.busy}
                onClick={() => {
                  if (
                    confirm(
                      'Arquivar rascunho? O registro e os itens serão preservados.',
                    )
                  )
                    void save.save(() =>
                      api(`orders/${o.id}`, 'DELETE', { version: o.version }),
                    );
                }}
              >
                Arquivar pedido de {o.customer_name}
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
function Overview() {
  const [data, setData] = useState<{
    summary: { orders_count: number; total_cents: number };
    upcoming: Order[];
  } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<typeof data>('dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <h1>Visão geral</h1>
      <ErrorMessage message={error} />
      {data ? (
        <>
          <section className="panel">
            <h2>{data.summary.orders_count} pedidos em rascunho</h2>
            <p>
              Total dos rascunhos: {money(data.summary.total_cents)}. Este valor
              não é faturamento ou recebimento.
            </p>
          </section>
          <h2>Próximos pedidos</h2>
          {data.upcoming.length ? (
            data.upcoming.map((o) => (
              <article key={o.id} className="panel">
                <strong>{o.customer_name}</strong>
                <p>
                  {dateTime(o.due_at)} · {money(o.total_cents)}
                </p>
              </article>
            ))
          ) : (
            <p>Nenhum próximo pedido.</p>
          )}
        </>
      ) : (
        !error && <p>Carregando…</p>
      )}
    </>
  );
}
function Accesses() {
  const list = useList<{ email: string; role: string }>('members');
  const save = useSave(list.reload);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('operator');
  return (
    <>
      <h1>Acessos autorizados</h1>
      <p>
        Somente o administrador autoriza novos acessos. O e-mail também deve ser
        permitido pela política do Cloudflare Access.
      </p>
      <ErrorMessage message={list.error || save.error} />
      <p role="status">{save.notice}</p>
      <form
        className="panel data-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save.save(
            () => api('members', 'POST', { email, role }),
            () => setEmail(''),
          );
        }}
      >
        <label>
          E-mail autorizado
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Papel
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="operator">Operador</option>
            <option value="owner">Administrador</option>
          </select>
        </label>
        <button disabled={save.busy}>Autorizar acesso</button>
      </form>
      <ul>
        {list.data.map((m) => (
          <li key={m.email}>
            {m.email} · {m.role === 'owner' ? 'Administrador' : 'Operador'}
          </li>
        ))}
      </ul>
      <p>
        Revogação e mudança de papel: procedimento administrativo documentado.
        Não excluir o último administrador.
      </p>
    </>
  );
}
export function Management() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    const check = () => {
      api<Session>('session')
        .then((s) => {
          if (active) setSession(s);
        })
        .catch((e) => {
          if (active) {
            setSession(null);
            setError(e.message);
          }
        });
    };
    check();
    const timer = setInterval(check, 60000);
    const expired = () => {
      setSession(null);
      setError('Sua sessão expirou. Entre novamente.');
    };
    const offline = () => {
      setOnline(false);
    };
    const connected = () => {
      setOnline(true);
      check();
    };
    window.addEventListener('session-expired', expired);
    window.addEventListener('offline', offline);
    window.addEventListener('online', connected);
    window.addEventListener('focus', check);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('session-expired', expired);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', connected);
      window.removeEventListener('focus', check);
    };
  }, []);
  async function logout() {
    try {
      await api('auth/logout', 'POST', {});
      setSession(null);
      navigate('/login');
      window.location.assign('/cdn-cgi/access/logout');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!session)
    return (
      <section className="panel">
        <h1>Gestão restrita</h1>
        <ErrorMessage message={error} />
        {error ? (
          <Link className="button" to="/login">
            Entrar na gestão
          </Link>
        ) : (
          <p role="status">Verificando sessão…</p>
        )}
      </section>
    );
  return (
    <section className="management">
      <header className="management-header">
        <p>
          Área privada ·{' '}
          {session.role === 'owner' ? 'Administrador' : 'Operador'}
        </p>
        <button disabled={!online} onClick={() => void logout()}>
          Sair
        </button>
      </header>
      <ErrorMessage message={error} />
      <nav className="management-nav" aria-label="Gestão privada">
        {[
          ['', 'Visão geral'],
          ['clientes', 'Clientes'],
          ['produtos', 'Produtos'],
          ['pedidos', 'Pedidos'],
          ...(session.role === 'owner' ? [['acessos', 'Acessos']] : []),
        ].map(([path, title]) => (
          <NavLink key={path} to={`/gestao/${path}`} end>
            {title}
          </NavLink>
        ))}
      </nav>
      {!online ? (
        <section className="panel" role="status">
          <h1>Sem conexão</h1>
          <p>
            Os dados privados foram ocultados. Nenhuma alteração offline é
            aceita. Reconecte para continuar.
          </p>
        </section>
      ) : (
        <Routes key={`${session.user_id}:${session.organization_id}`}>
          <Route index element={<Overview />} />
          <Route path="clientes" element={<Customers />} />
          <Route path="produtos" element={<Products />} />
          <Route path="pedidos" element={<Orders />} />
          {session.role === 'owner' && (
            <Route path="acessos" element={<Accesses />} />
          )}
          <Route path="*" element={<p>Área não encontrada.</p>} />
        </Routes>
      )}
    </section>
  );
}
