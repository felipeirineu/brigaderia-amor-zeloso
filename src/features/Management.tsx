import { FlavorOrder } from './mobile/FlavorOrder';
import { Button } from '../components/Button';
import { CompactHeader } from './mobile/CompactHeader';
import { Backup } from './p1/Backup';
import { ImportCustomers } from './p1/ImportCustomers';
import { Stock } from './p1/Stock';
import { FieldProvider, useField } from './field/FieldContext';
import { SiteEditor, CompanyEditor, SiteInfo } from './field/SiteEditor';
import { PlaceFields } from './field/PlaceFields';
import { Travel } from './field/Travel';
import { emptyPlace, type Place } from '../../shared/field';
import { Preferences } from './mobile/Preferences';
import { Totem } from './mobile/Totem';
import { useOrderMode } from './mobile/useOrderMode';
import {
  flavorPhotos,
  flavorNames,
  suggestPhoto,
  photoURL,
} from '../../shared/flavors';
import { QuantityField, MoneyField } from '../components/NumericInputs';
import { Recipes, Supplies } from './p1/Recipes';
import { Shopping } from './p1/Shopping';
import { Expenses } from './p1/Expenses';
import { Reports } from './p1/Reports';
import { Reminders } from './p1/Reminders';
import { Agenda } from './p1/Agenda';
import { Finance, PixSettings, type Summary } from './finance/Finance';
import { Account } from './finance/Account';
import { CustomerProfile } from './finance/Profile';
import { type B2BProfile } from '../../shared/finance';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  NavLink,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { HelpTip } from '../components/HelpTip';
import { Icon, type IconName } from '../components/Icon';
import { HelpCenter, Tour } from './help/HelpCenter';
import { Today, OrderDetail, Recurring, MessageTemplates } from './Operations';
import { statusLabels, type Status } from '../../shared/order-state';
import { api, dateTime, money, parsePrice, nextWeeklyTime } from './api';

interface Session {
  user_id: string;
  organization_id: string;
  role: 'owner' | 'operator';
  operations?: boolean;
  finance?: boolean;
  p1?: boolean;
  mobile?: boolean;
  field?: boolean;
  tools?: boolean;
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
  photo_key?: string | null;
  id?: string;
  label: string;
  weight_grams: number;
  units_per_box: number;
  price_cents: number;
  active: number | boolean;
}
interface Product {
  photo_key?: string | null;
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
  status: Status;
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
  const [config, setConfig] = useState<{
    configured: boolean;
    login_url: string | null;
  } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<{ configured: boolean; login_url: string | null }>('auth/config')
      .then(setConfig)
      .catch(() =>
        setError(
          'Não foi possível verificar o acesso. Confira sua conexão e recarregue a página.',
        ),
      );
  }, []);
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
          <Button className="button" href={config.login_url!}>
            Entrar com acesso seguro
          </Button>
          <p>
            Após verificar sua identidade no Cloudflare Access, você entra
            diretamente na gestão. A sessão expira em até 8 horas.
          </p>
        </>
      ) : (
        <p role="status">
          {config
            ? 'O acesso seguro e o banco ainda precisam ser configurados no Cloudflare. A demonstração continua disponível.'
            : 'Verificando configuração…'}
        </p>
      )}
      <Button to="/app" variant="ghost">
        Voltar à demonstração
      </Button>
    </section>
  );
}
function Customers({ financial = false }: { financial?: boolean }) {
  const field = useField(),
    [site, setSite] = useState<Place | null>(null),
    [siteVersion, setSiteVersion] = useState(0);
  const [balances, setBalances] = useState<Summary | null>(null);
  useEffect(() => {
    if (financial)
      void api<Summary>('finance/summary')
        .then(setBalances)
        .catch(() => setBalances(null));
  }, [financial]);
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
    setSite(null);
    setSiteVersion(0);
    key.current = crypto.randomUUID();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void save.save(
      () =>
        api(
          `customers${editing ? `/${editing.id}` : ''}`,
          editing ? 'PUT' : 'POST',
          {
            ...form,
            ...(editing ? { version: editing.version } : {}),
            ...(field && site
              ? {
                  site: {
                    data: { ...site, name: form.name },
                    version: siteVersion,
                  },
                }
              : {}),
          },
          key.current,
        ),
      () => {
        reset();
        void field?.refresh();
      },
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
        {field && (
          <PlaceFields
            value={site ?? emptyPlace()}
            onChange={setSite}
            onName={(name) => setForm({ ...form, name: name || form.name })}
          />
        )}
        <div className="actions">
          <Button disabled={save.busy} variant="primary" loading={save.busy}>
            Salvar cliente
          </Button>
          <Button type="button" onClick={reset}>
            Limpar edição
          </Button>
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
      <Button onClick={() => void list.reload()}>Atualizar lista</Button>
      {list.loading ? (
        <p role="status">Carregando…</p>
      ) : list.data.length === 0 ? (
        <p>Nenhum cliente encontrado.</p>
      ) : (
        <div className="record-list">
          {list.data.map((c) => (
            <article className="panel" key={c.id}>
              <h2>{c.name}</h2>
              <SiteInfo id={c.id} name={c.name} />
              {financial && (
                <>
                  <Button
                    className="button"
                    to={`/gestao/clientes/${c.id}/b2b`}
                    variant="ghost"
                  >
                    Dados B2B e padrões
                  </Button>{' '}
                  <Button
                    className="button"
                    to={`/gestao/financeiro/${c.id}`}
                    variant="ghost"
                  >
                    Conta e recebimentos
                  </Button>
                  {(balances?.customers.find((b) => b.id === c.id)
                    ?.overdue_days ?? 0) > 0 && (
                    <p role="alert">
                      Saldo vencido há{' '}
                      {
                        balances?.customers.find((b) => b.id === c.id)
                          ?.overdue_days
                      }{' '}
                      dias. Novos pedidos continuam permitidos.
                    </p>
                  )}
                </>
              )}
              <p>
                {c.phone} · {c.active ? 'Ativo' : 'Arquivado'}
              </p>
              <Button
                onClick={() => {
                  setEditing(c);
                  const existing = field?.data?.sites.find(
                    (s) => s.id === c.id,
                  );
                  setSite(existing?.data ?? null);
                  setSiteVersion(existing?.version ?? 0);
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
              </Button>
              {!!c.active && (
                <Button
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
                  variant="danger"
                  loading={save.busy}
                >
                  Arquivar {c.name}
                </Button>
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
function Products({ mobile = false }: { mobile?: boolean }) {
  const [photo, setPhoto] = useState<string | null>(null);
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
  const [prices, setPrices] = useState(['']);
  const key = useRef(crypto.randomUUID());
  function reset() {
    setEditing(null);
    setName('');
    setDescription('');
    setActive(true);
    setVariants([emptyVariant()]);
    setPrices(['']);
    setPhoto(null);
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
        ...(mobile ? { photo_key: photo } : {}),
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
      {mobile && <FlavorOrder products={list.data} />}
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
        {mobile && (
          <fieldset>
            <legend>Foto do produto</legend>
            <Button type="button" onClick={() => setPhoto(suggestPhoto(name))}>
              Sugerir foto pelo nome
            </Button>
            <div className="photo-choices">
              <Button
                type="button"
                aria-pressed={photo === null}
                onClick={() => setPhoto(null)}
              >
                Sem foto
              </Button>
              {flavorPhotos.map((key) => (
                <Button
                  type="button"
                  key={key}
                  aria-pressed={photo === key}
                  onClick={() => setPhoto(key)}
                >
                  <img src={photoURL(key)} alt="" width={80} height={80} />
                  {flavorNames[key]}
                </Button>
              ))}
            </div>
            <p>Escolha editável; só é salva ao salvar o produto.</p>
          </fieldset>
        )}
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
            <QuantityField
              label="Peso por unidade (g)"
              required
              min="1"
              max="100000"
              value={v.weight_grams}
              onValueChange={(value) =>
                variant(i, { weight_grams: Number(value) })
              }
            />
            <QuantityField
              label="Unidades por embalagem"
              required
              min="1"
              max="10000"
              value={v.units_per_box}
              onValueChange={(value) =>
                variant(i, { units_per_box: Number(value) })
              }
            />
            {mobile && (
              <label>
                Foto da variante (herda a do produto se vazia)
                <select
                  value={v.photo_key ?? ''}
                  onChange={(e) =>
                    variant(i, { photo_key: e.target.value || null })
                  }
                >
                  <option value="">Usar foto do produto</option>
                  {flavorPhotos.map((k) => (
                    <option key={k} value={k}>
                      {flavorNames[k]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <MoneyField
              label="Preço da embalagem (R$)"
              required
              value={prices[i]}
              onValueChange={(value) =>
                setPrices(prices.map((p, j) => (j === i ? value : p)))
              }
            />
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
          <Button
            type="button"
            disabled={variants.length >= 30}
            onClick={() => {
              setVariants([...variants, emptyVariant()]);
              setPrices([...prices, '']);
            }}
          >
            Adicionar variante
          </Button>
          <Button disabled={save.busy} variant="primary" loading={save.busy}>
            Salvar produto
          </Button>
          <Button type="button" onClick={reset}>
            Limpar edição
          </Button>
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
              <Button
                onClick={() => {
                  setEditing(p);
                  setPhoto(p.photo_key ?? null);
                  setName(p.name);
                  setDescription(p.description);
                  setActive(!!p.active);
                  setVariants(
                    p.variants.map((v) => ({
                      id: v.id,
                      ...(mobile ? { photo_key: v.photo_key ?? null } : {}),
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
              </Button>
              {!!p.active && (
                <Button
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
                  variant="danger"
                  loading={save.busy}
                >
                  Arquivar {p.name}
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
function Orders({
  mobile = false,
  role = 'owner',
  ...props
}: {
  mobile?: boolean;
  role?: string;
  operational?: boolean;
  financial?: boolean;
}) {
  const [search] = useSearchParams(),
    mode = useOrderMode(role);
  if (mobile && search.get('novo') && mode.simple)
    return <Totem financial={props.financial} />;
  return (
    <>
      <div className="chips">
        {mobile && (
          <>
            <Button
              aria-pressed={mode.simple}
              onClick={() => mode.setPreference('simple')}
            >
              Pedido por fotos
            </Button>
            <Button
              aria-pressed={!mode.simple}
              onClick={() => mode.setPreference('full')}
            >
              Lista completa
            </Button>
          </>
        )}
      </div>
      <FullOrders {...props} simple={mobile && mode.simple} />
    </>
  );
}
function FullOrders({
  simple = false,
  operational = false,
  financial = false,
}: {
  operational?: boolean;
  financial?: boolean;
  simple?: boolean;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const orders = useList<Order>(`orders?q=${encodeURIComponent(query)}`);
  const customers = useList<Customer>('customers');
  const products = useList<Product>('products');
  const save = useSave(orders.reload);
  const [editing, setEditing] = useState<Order | null>(null);
  const [customer, setCustomer] = useState('');
  const [defaults, setDefaults] = useState<{
    profile: B2BProfile;
    plans: {
      id: string;
      name: string;
      weekday: number;
      time: string;
      notes: string;
      valid: boolean;
      items: Item[];
    }[];
  } | null>(null);
  const [template, setTemplate] = useState('');
  const choice = useRef(0);
  async function chooseCustomer(id: string) {
    const serial = ++choice.current;
    setCustomer(id);
    setDefaults(null);
    setTemplate('');
    if (!financial || !id || editing) return;
    setItems([{ variant_id: '', quantity: 1 }]);
    setDue('');
    setNotes('');
    try {
      const d = await api<NonNullable<typeof defaults>>(
        `finance/customers/${id}/defaults`,
      );
      if (serial !== choice.current) return;
      setDefaults(d);
      const valid = d.plans.filter((p) => p.valid);
      if (valid.length === 1) applyTemplate(valid[0]);
    } catch {
      if (serial === choice.current) setDefaults(null);
    }
  }
  function applyTemplate(plan: NonNullable<typeof defaults>['plans'][number]) {
    setTemplate(plan.id);
    setItems(
      plan.items.map((i) => ({
        variant_id: i.variant_id,
        quantity: i.quantity,
      })),
    );
    setNotes(plan.notes);
    setDue(nextWeeklyTime(plan.weekday, plan.time));
  }
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
    setDefaults(null);
    setTemplate('');
    choice.current++;
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
            ...(!editing && template ? { template_id: template } : {}),
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
        Pedidos. Quantidade se refere à embalagem/caixa cadastrada. Status e
        entrega ficam no detalhe do pedido quando a operação está ativa.
      </p>
      <ErrorMessage
        message={
          orders.error || customers.error || products.error || save.error
        }
      />
      <p role="status">{save.notice}</p>
      {simple ? (
        <Button
          className="button primary-action"
          to="/gestao/pedidos?novo=1"
          variant="primary"
        >
          Novo pedido por fotos
        </Button>
      ) : (
        <form className="data-form panel" onSubmit={submit}>
          <h2>{editing ? 'Editar rascunho' : 'Novo pedido'}</h2>
          <label>
            Cliente
            <select
              required
              value={customer}
              onChange={(e) => void chooseCustomer(e.target.value)}
            >
              <option value="">Selecione</option>
              {customers.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {defaults && !editing && (
            <section>
              <p>
                Padrões do cliente:{' '}
                {defaults.profile.address || 'Endereço a definir'} · janela{' '}
                {defaults.profile.delivery_window || 'a definir'} · condição{' '}
                {defaults.profile.terms.mode === 'unset'
                  ? 'a definir'
                  : defaults.profile.terms.mode === 'credit'
                    ? 'a prazo'
                    : defaults.profile.terms.mode === 'advance'
                      ? 'adiantado'
                      : 'na entrega'}
                . Tudo pode ser revisado.
              </p>
              {defaults.plans.length > 0 && (
                <label>
                  Pedido padrão para preencher
                  <select
                    value={template}
                    onChange={(e) => {
                      const p = defaults.plans.find(
                        (p) => p.id === e.target.value,
                      );
                      if (p?.valid) applyTemplate(p);
                    }}
                  >
                    <option value="">Escolha um modelo</option>
                    {defaults.plans.map((p) => (
                      <option key={p.id} value={p.id} disabled={!p.valid}>
                        {p.name}
                        {p.valid ? '' : ' — revisar itens inativos'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>
          )}
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
              <QuantityField
                label="Quantidade de embalagens"
                required
                min="1"
                max="10000"
                value={i.quantity}
                onValueChange={(value) =>
                  setItems(
                    items.map((v, j) =>
                      j === index ? { ...v, quantity: Number(value) } : v,
                    ),
                  )
                }
              />
              {items.length > 1 && (
                <Button
                  type="button"
                  onClick={() => setItems(items.filter((_, j) => j !== index))}
                >
                  Remover item {index + 1}
                </Button>
              )}
            </fieldset>
          ))}
          <Button
            type="button"
            disabled={items.length >= 50}
            onClick={() =>
              setItems([...items, { variant_id: '', quantity: 1 }])
            }
          >
            Adicionar item
          </Button>
          <label>
            Observações
            <textarea
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <p>
            Prévia: {money(estimate)}. O servidor confere o total ao salvar.
          </p>
          <div className="actions">
            <Button disabled={save.busy} variant="primary" loading={save.busy}>
              Salvar pedido
            </Button>
            <Button type="button" onClick={reset}>
              Limpar edição
            </Button>
          </div>
        </form>
      )}
      <label>
        Buscar pedidos por cliente
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <Button onClick={() => void orders.reload()}>Atualizar pedidos</Button>
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
                {statusLabels[o.status] || 'Rascunho'} · {dateTime(o.due_at)} ·{' '}
                {money(o.total_cents)}
              </p>
              <ul>
                {o.items.map((i) => (
                  <li key={i.variant_id}>
                    {i.quantity} × {i.product_name} — {i.variant_label} ·{' '}
                    {money(i.unit_price_cents!)}
                  </li>
                ))}
              </ul>
              {operational && (
                <Button
                  className="button"
                  to={`/gestao/pedidos/${o.id}`}
                  variant="ghost"
                >
                  Abrir pedido
                </Button>
              )}
              {['draft', 'awaiting_confirmation'].includes(o.status) && (
                <>
                  <Button
                    onClick={() => {
                      if (simple) {
                        navigate(`/gestao/pedidos/${o.id}/editar-simples`);
                        return;
                      }
                      choice.current++;
                      setDefaults(null);
                      setTemplate('');
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
                  </Button>
                  <Button
                    disabled={save.busy}
                    onClick={() => {
                      if (
                        confirm(
                          'Arquivar rascunho? O registro e os itens serão preservados.',
                        )
                      )
                        void save.save(() =>
                          api(`orders/${o.id}`, 'DELETE', {
                            version: o.version,
                          }),
                        );
                    }}
                    variant="danger"
                    loading={save.busy}
                  >
                    Arquivar pedido de {o.customer_name}
                  </Button>
                </>
              )}
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
        <Button disabled={save.busy} loading={save.busy}>
          Autorizar acesso
        </Button>
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
  const quick = useRef<HTMLDialogElement>(null);
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
          <Button className="button" to="/login" variant="ghost">
            Entrar na gestão
          </Button>
        ) : (
          <p role="status">Verificando sessão…</p>
        )}
      </section>
    );
  return (
    <FieldProvider
      enabled={!!session.field && online}
      key={session.organization_id + session.user_id + online}
    >
      <section
        className={`management ${session.operations ? 'operations-active' : ''}`}
      >
        <CompactHeader
          role={session.role}
          online={online}
          operations={!!session.operations}
          onLogout={() => void logout()}
        />
        <header className="management-header">
          <p>
            Área privada ·{' '}
            {session.role === 'owner' ? 'Administrador' : 'Operador'}
          </p>
          <Button disabled={!online} onClick={() => void logout()}>
            Sair
          </Button>
        </header>
        <ErrorMessage message={error} />
        <nav
          className={`management-nav ${session.operations ? 'ops-nav' : ''}`}
          aria-label="Gestão privada"
        >
          {(session.operations
            ? [
                ['', 'Hoje', 'inicio', 'today'],
                ['pedidos', 'Pedidos', 'pedidos', 'orders'],
                ['clientes', 'Clientes', 'clientes', 'customers'],
                ['recorrentes', 'Pedidos padrão', 'recorrentes', 'recurring'],
                ['produtos', 'Produtos', 'produtos', 'products'],
                ['mais', 'Mais', 'mais', 'more'],
                ['ajuda', 'Ajuda', 'ajuda', 'help'],
                ...(session.role === 'owner'
                  ? [['acessos', 'Acessos', 'configuracoes', 'access']]
                  : []),
              ]
            : [
                ['', 'Visão geral', 'inicio', 'today'],
                ['clientes', 'Clientes', 'clientes', 'customers'],
                ['produtos', 'Produtos', 'produtos', 'products'],
                ['pedidos', 'Pedidos', 'pedidos', 'orders'],
                ...(session.role === 'owner'
                  ? [['acessos', 'Acessos', 'configuracoes', 'access']]
                  : []),
              ]
          ).map(([path, title, icon, tour]) => (
            <NavLink key={path} to={`/gestao/${path}`} end data-tour={tour}>
              <Icon name={icon as IconName} />
              {title}
            </NavLink>
          ))}
        </nav>
        {session.operations && online && (
          <>
            <div className="private-tools">
              <Button
                data-tour="new"
                onClick={() => quick.current?.showModal()}
              >
                <Icon name="novo" /> Novo
              </Button>
              <HelpTip topic="roles" />
            </div>
            <Tour role={session.role} />
          </>
        )}
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
            <Route
              index
              element={
                session.operations ? (
                  <Today
                    role={session.role}
                    financial={session.finance}
                    p1={session.p1}
                  />
                ) : (
                  <Overview />
                )
              }
            />
            <Route
              path="clientes"
              element={<Customers financial={session.finance} />}
            />
            <Route
              path="produtos"
              element={<Products mobile={session.mobile} />}
            />
            <Route
              path="pedidos"
              element={
                <Orders
                  operational={session.operations}
                  financial={session.finance}
                  mobile={session.mobile}
                  role={session.role}
                />
              }
            />
            {session.mobile && (
              <Route
                path="preferencias"
                element={<Preferences role={session.role} />}
              />
            )}
            {session.mobile && (
              <Route
                path="pedidos/:id/editar-simples"
                element={<Totem financial={session.finance} />}
              />
            )}
            {session.tools && session.role === 'owner' && (
              <Route path="backup" element={<Backup />} />
            )}
            {session.tools && session.role === 'owner' && (
              <Route path="importar-clientes" element={<ImportCustomers />} />
            )}
            {session.tools && (
              <Route path="estoque" element={<Stock role={session.role} />} />
            )}
            {session.field && (
              <>
                <Route path="clientes/:id/local" element={<SiteEditor />} />
                <Route path="empresa" element={<CompanyEditor />} />
                <Route path="deslocamentos" element={<Travel />} />
              </>
            )}
            {session.p1 && (
              <>
                <Route path="agenda" element={<Agenda />} />
                <Route path="relatorios" element={<Reports />} />
                <Route path="despesas" element={<Expenses />} />
                <Route path="fichas" element={<Recipes />} />
                <Route path="insumos" element={<Supplies />} />
                <Route path="compras" element={<Shopping />} />
                <Route path="lembretes" element={<Reminders />} />
              </>
            )}
            {session.finance && (
              <>
                <Route
                  path="financeiro"
                  element={<Finance role={session.role} />}
                />
                <Route path="financeiro/:id" element={<Account />} />
                <Route path="clientes/:id/b2b" element={<CustomerProfile />} />
                {session.role === 'owner' && (
                  <Route path="financeiro/pix" element={<PixSettings />} />
                )}
              </>
            )}
            {session.operations && (
              <>
                <Route
                  path="pedidos/:id"
                  element={
                    <OrderDetail
                      financial={session.finance}
                      mobile={session.mobile}
                    />
                  }
                />
                <Route path="recorrentes" element={<Recurring />} />
                <Route path="mensagens" element={<MessageTemplates />} />
                <Route
                  path="ajuda"
                  element={
                    <HelpCenter
                      financial={session.finance}
                      p1={session.p1}
                      tools={session.tools}
                    />
                  }
                />
                <Route
                  path="mais"
                  element={
                    <More
                      role={session.role}
                      financial={session.finance}
                      p1={session.p1}
                      field={session.field}
                      tools={session.tools}
                      mobile={session.mobile}
                    />
                  }
                />
              </>
            )}
            {session.role === 'owner' && (
              <Route path="acessos" element={<Accesses />} />
            )}
            <Route path="*" element={<p>Área não encontrada.</p>} />
          </Routes>
        )}
        {session.operations && (
          <>
            <nav className="private-bottom-nav" aria-label="Atalhos do celular">
              <NavLink to="/gestao/" end data-tour="today">
                <Icon name="inicio" />
                Hoje
              </NavLink>
              <NavLink to="/gestao/pedidos" data-tour="orders">
                <Icon name="pedidos" />
                Pedidos
              </NavLink>
              <Button
                aria-label="Novo cadastro"
                data-tour="new"
                onClick={() => quick.current?.showModal()}
              >
                <Icon name="novo" />
              </Button>
              <NavLink to="/gestao/clientes" data-tour="customers">
                <Icon name="clientes" />
                Clientes
              </NavLink>
              <NavLink to="/gestao/mais" data-tour="more">
                <Icon name="mais" />
                Mais
              </NavLink>
            </nav>
            <dialog
              ref={quick}
              className="help-sheet"
              aria-label="Novo cadastro"
            >
              <div className="sheet-body">
                <h2>O que vamos preparar?</h2>
                <div className="quick-links">
                  <Button
                    className="button"
                    to={
                      session.mobile
                        ? '/gestao/pedidos?novo=1'
                        : '/gestao/pedidos'
                    }
                    onClick={() => quick.current?.close()}
                    variant="ghost"
                  >
                    Novo pedido
                  </Button>
                  <Button
                    className="button"
                    to="/gestao/clientes"
                    onClick={() => quick.current?.close()}
                    variant="ghost"
                  >
                    Novo cliente
                  </Button>
                </div>
                {session.p1 && (
                  <Button
                    className="button"
                    to="/gestao/lembretes"
                    onClick={() => quick.current?.close()}
                    variant="ghost"
                  >
                    Novo lembrete
                  </Button>
                )}
                <p>
                  {session.finance
                    ? 'Recebimentos rápidos ficam no Hoje, no cartão do pedido.'
                    : 'Recebimentos dependem da ativação financeira.'}
                </p>
                <Button onClick={() => quick.current?.close()}>Fechar</Button>
              </div>
            </dialog>
          </>
        )}
      </section>
    </FieldProvider>
  );
}

function More({
  role,
  financial = false,
  p1 = false,
  field = false,
  tools = false,
  mobile = false,
}: {
  role: string;
  financial?: boolean;
  p1?: boolean;
  field?: boolean;
  tools?: boolean;
  mobile?: boolean;
}) {
  return (
    <>
      <h1>Mais</h1>
      <div className="more-grid">
        {[
          ...(tools
            ? [
                ['estoque', 'Estoque', 'produtos'],
                ...(role === 'owner'
                  ? [
                      ['importar-clientes', 'Importar clientes', 'clientes'],
                      ['backup', 'Backup privado', 'configuracoes'],
                    ]
                  : []),
              ]
            : []),
          ...(field ? [['deslocamentos', 'Deslocamentos', 'entregas']] : []),
          ...(p1
            ? [
                ['agenda', 'Agenda', 'agenda'],
                ['lembretes', 'Lembretes', 'agenda'],
                ['relatorios', 'Relatórios', 'financeiro'],
                ['despesas', 'Despesas e fluxo', 'financeiro'],
                ['fichas', 'Fichas e preço sugerido', 'producao'],
                ['insumos', 'Insumos e embalagens', 'produtos'],
                ['compras', 'Lista de compras', 'produtos'],
              ]
            : []),
          ...(financial ? [['financeiro', 'Financeiro', 'financeiro']] : []),
          ['recorrentes', 'Pedidos padrão', 'recorrentes'],
          ['produtos', 'Produtos', 'produtos'],
          ['mensagens', 'Modelos de WhatsApp', 'pedidos'],
          ['ajuda', 'Ajuda e tutorial', 'ajuda'],
          ...(mobile
            ? [['preferencias', 'Preferências', 'configuracoes']]
            : []),
          ...(role === 'owner'
            ? [['acessos', 'Acessos', 'configuracoes']]
            : []),
        ].map(([path, title, icon]) => (
          <Button className="panel more-link" key={path} to={`/gestao/${path}`}>
            <Icon name={icon as IconName} />
            {title}
          </Button>
        ))}
      </div>
      <p>
        {p1
          ? 'Escolha uma rotina acima.'
          : financial
            ? 'Agenda, receitas e estoque dependem da próxima ativação.'
            : 'Financeiro, agenda, receitas e estoque serão entregues em etapas próprias.'}
      </p>
    </>
  );
}
