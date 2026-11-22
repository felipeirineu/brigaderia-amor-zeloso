import { BatchOrders } from './operations/BatchOrders';
import { paymentModeLabels } from '../../shared/finance';
import {
  FeedbackCount,
  FeedbackForm,
  FeedbackInbox,
} from './feedback/Feedback';
import { ManagementRoutes } from './feedback/ManagementError';
import { roleLabel } from '../role-label';
import { ConfirmProvider } from '../components/ConfirmSheet';
import {
  EnvironmentScope,
  TestEnvironmentBanner,
} from '../components/TestEnvironment';
import { useConfirm } from '../components/confirm-context';
import { AppOpening } from '../components/AppOpening';
import { useTabHistory } from './mobile/useTabHistory';
import {
  ReleaseAnnouncement,
  ReleaseHistory,
} from '../components/ReleaseNotes';
import { releasesEnabled } from '../release-notes';
import { ProspectReportPage } from './prospects/Followup';
import { VisitsPage, VisitSheet } from './prospects/Visits';
import { ProspectFields, ProspectPanel } from './prospects/ProspectPanel';
import { emptyProspect, type ProspectData } from '../../shared/prospects';

import { SkeletonList } from '../components/Skeleton';
import { useRemote } from './operations/common';
import { formatPhone } from '../../shared/phone';
import { DraftNotice } from './mobile/OrderDraftContext';
import { OrderDraftScope } from './mobile/order-draft-scope';
import { clearDraft } from './mobile/order-draft';
import { WeightRecipes } from './p1/WeightRecipes';
import {
  customerType,
  customerTypeLabels,
  customerTypes,
  occasionLabel,
  type CustomerType,
  type Occasion,
} from '../../shared/customer-order';
import { ChoiceChips } from '../components/ChoiceChips';
import { OccasionPicker } from '../components/OccasionPicker';
import { KitItemsEditor } from '../components/KitItemsEditor';
import { useKitCatalog } from './p1/useKitCatalog';
import {
  kitItemPrice,
  kitSnapshotInput,
  type KitItemInput,
  type KitItemSnapshot,
} from '../../shared/kit-orders';
import { Kits } from './p1/Kits';
import { NavigationScroll } from './mobile/NavigationScroll';
import { reconcilePushSession, unsubscribeLocalPush } from './p1/push-device';
import { compositionValid } from '../components/composition';
import { CompositionEditor } from '../components/CompositionEditor';
import type { ComponentInput } from '../../shared/mixed';
import { RouteInfo } from './field/RouteInfo';
import { DisclosureSummary } from '../components/DisclosureSummary';
import { FlavorOrder } from './mobile/FlavorOrder';
import { Button } from '../components/Button';
import { CompactHeader } from './mobile/CompactHeader';
import { Backup } from './p1/Backup';
import { ImportCustomers } from './p1/ImportCustomers';
import { ImportCatalog } from './p1/ImportCatalog';
import { Stock } from './p1/Stock';
import { FieldProvider, SiteAvatar, useField } from './field/FieldContext';
import { SiteEditor, CompanyEditor, SiteInfo } from './field/SiteEditor';
import { CustomerCapture } from './field/CustomerCapture';
import { PlaceFields } from './field/PlaceFields';
import {
  locatedNotice,
  mergeLocated,
  reverseLookup,
  missingNumberNotice,
} from './field/locate';
import { Travel } from './field/Travel';
import { emptyPlace, type Place } from '../../shared/field';
import { Preferences } from './mobile/Preferences';
import { Totem } from './mobile/Totem';
import { useOrderMode } from './mobile/useOrderMode';
import {
  photoChoices,
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
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  NavLink,
  Route,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { HelpTip } from '../components/HelpTip';
import { useDesktopLayout } from '../components/useDesktopLayout';
import { Icon, type IconName } from '../components/Icon';
import { HelpCenter, Tour } from './help/HelpCenter';
import { Today, OrderDetail, Recurring, MessageTemplates } from './Operations';
import { statusLabels, type Status } from '../../shared/order-state';
import {
  ApiError,
  api,
  dateTime,
  money,
  parsePrice,
  nextWeeklyTime,
} from './api';
import { Mascot } from '../components/Mascot';

interface Session {
  feedback?: boolean;
  shared_delivery?: boolean;
  developer?: boolean;
  environment?: 'teste' | 'producao';
  prospect_followup?: boolean;
  visits?: boolean;
  prospects?: boolean;
  weight_costing?: boolean;
  customer_orders?: boolean;
  kit_orders?: boolean;
  kit_recurring?: boolean;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'operator';
  operations?: boolean;
  finance?: boolean;
  p1?: boolean;
  mobile?: boolean;
  field?: boolean;
  tools?: boolean;
  mixed?: boolean;
  recurring_mixed?: boolean;
}
interface Customer {
  kind?: string;
  prospect?: ProspectData;
  customer_type?: CustomerType;
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
  kit_id?: string;
  id?: string;
  item_id?: string;
  components?: (ComponentInput & {
    product_name?: string;
    variant_label?: string;
  })[];
  variant_id: string;
  quantity: number;
  product_name?: string;
  variant_label?: string;
  unit_price_cents?: number;
}
interface Order {
  occasion?: Occasion;
  status: Status;
  id: string;
  customer_id: string;
  customer_name: string;
  delivery_type: string;
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
  const view = useRemote<T[]>(path);
  return {
    data: view.data ?? [],
    error: view.error,
    loading: view.data === null && !view.error,
    reload: view.refresh,
  };
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
      // Avisa assim que o servidor confirma; a recarga da lista vem depois
      // (com internet lenta, o aviso não fica esperando a lista).
      setNotice('Alteração salva no servidor.');
      await reload();
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
      <Mascot size={120} className="mascot-wave" />
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
            diretamente na gestão. A sessão dura até 30 dias neste aparelho; use
            Sair em aparelho compartilhado.
          </p>
        </>
      ) : (
        <p role="status">
          {config
            ? 'O acesso seguro e o banco ainda precisam ser configurados no Cloudflare. Os dados privados permanecem indisponíveis.'
            : 'Verificando configuração…'}
        </p>
      )}
      <Button to="/gestao" variant="ghost">
        Voltar ao início
      </Button>
    </section>
  );
}
function Customers({
  financial = false,
  metadata = false,
  visits = false,
  prospects = false,
}: {
  financial?: boolean;
  metadata?: boolean;
  prospects?: boolean;
  visits?: boolean;
}) {
  const askConfirmation = useConfirm();

  const [kind, setKind] = useState<'customer' | 'prospect'>('customer');
  const [prospect, setProspect] = useState<ProspectData>(emptyProspect);
  const field = useField(),
    [site, setSite] = useState<Place | null>(null),
    [siteVersion, setSiteVersion] = useState(0),
    [addressOpen, setAddressOpen] = useState(false);
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
    `customers?q=${encodeURIComponent(query)}${all ? '&active=all' : ''}${prospects ? '&kind=' + kind : ''}`,
  );
  const save = useSave(list.reload);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    customer_type: 'establishment' as CustomerType,
    name: '',
    phone: '',
    email: '',
    notes: '',
    active: true,
  });
  const key = useRef(crypto.randomUUID());
  const sheet = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useSearchParams();
  const [photo, setPhoto] = useState<string | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [photoNotice, setPhotoNotice] = useState('');
  const [draft, setDraft] = useState(0);
  const [numberFocusRequest, setNumberFocusRequest] = useState(0);
  useEffect(() => {
    if (search.get('novo') === '1') sheet.current?.showModal();
  }, [search]);
  function close() {
    sheet.current?.close();
    if (search.has('novo')) {
      const next = new URLSearchParams(search);
      next.delete('novo');
      setSearch(next, { replace: true });
    }
    reset();
  }
  const isContact =
    prospects && (editing ? editing.kind === 'prospect' : kind === 'prospect');
  const formTitle = isContact
    ? editing
      ? 'Editar contato'
      : 'Novo contato'
    : editing
      ? 'Editar cliente'
      : 'Novo cliente';
  function reset() {
    setProspect(emptyProspect());
    setPhoto(null);
    setCaptureBusy(false);
    setNumberFocusRequest(0);
    setDraft((d) => d + 1);
    setEditing(null);
    setForm({
      customer_type: 'establishment',
      name: '',
      phone: '',
      email: '',
      notes: '',
      active: true,
    });
    setSite(null);
    setSiteVersion(0);
    setAddressOpen(false);
    key.current = crypto.randomUUID();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (save.busy || captureBusy) return;
    void save.save(
      async () => {
        const result = await api<{ id: string }>(
          `${isContact ? 'prospects' : 'customers'}${editing ? `/${editing.id}` : ''}`,
          editing ? 'PUT' : 'POST',
          {
            ...form,
            ...(isContact ? { prospect } : {}),
            customer_type: metadata ? form.customer_type : undefined,
            ...(editing ? { version: editing.version } : {}),
            ...(field && (site || photo)
              ? {
                  site: {
                    data: { ...(site ?? emptyPlace()), name: form.name },
                    version: siteVersion,
                  },
                }
              : {}),
          },
          key.current,
        );
        if (field && photo) {
          try {
            await api(
              `field/customers/${editing?.id ?? result.id}/photo`,
              'PUT',
              {
                version: siteVersion + 1,
                base64: photo,
              },
            );
            setPhotoNotice(
              isContact ? 'Contato e foto salvos.' : 'Cliente e foto salvos.',
            );
          } catch {
            setPhotoNotice(
              'Cliente salvo. Não foi possível confirmar a foto. Confira em “Localização, foto e Instagram” antes de tentar novamente.',
            );
          }
        }
      },
      () => {
        close();
        void field?.refresh();
      },
    );
  }
  return (
    <>
      {prospects && (
        <ChoiceChips
          className="customer-filter"
          label="Clientes ou contatos"
          value={kind}
          options={[
            ['customer', 'Clientes'],
            ['prospect', 'Contatos'],
          ]}
          onChange={(value) => setKind(value as 'customer' | 'prospect')}
        />
      )}
      <div className="page-heading customer-heading">
        <h1 className="mobile-context-title">Clientes</h1>
        {prospects && kind === 'prospect' && <HelpTip topic="visits" />}
        <div className="customer-create-row">
          <Button
            variant="primary"
            onClick={() => {
              reset();
              setPhotoNotice('');
              sheet.current?.showModal();
            }}
          >
            <Icon name="novo" size={18} />{' '}
            {kind === 'prospect' ? 'Novo contato' : 'Novo cliente'}
          </Button>
        </div>
      </div>
      <ErrorMessage message={list.error || save.error} />
      <p role="status">{save.notice}</p>
      <p role="status">{photoNotice}</p>
      <dialog
        ref={sheet}
        className="help-sheet customer-sheet"
        aria-label={formTitle}
        onCancel={(e) => {
          e.preventDefault();
          if (!save.busy) close();
        }}
      >
        <form className="data-form sheet-body" onSubmit={submit}>
          <div className="customer-sheet-heading">
            <h2>{formTitle}</h2>
            <Button
              type="button"
              variant="ghost"
              disabled={save.busy}
              onClick={close}
            >
              Fechar
            </Button>
          </div>
          <fieldset disabled={save.busy} className="customer-form-fields">
            <ErrorMessage message={save.error} />
            {field && form.customer_type === 'establishment' && (
              <CustomerCapture
                key={draft}
                onLocate={async (coordinates) => {
                  const { found, status } = await reverseLookup(coordinates);
                  setSite((s) =>
                    mergeLocated(s ?? emptyPlace(), coordinates, found),
                  );
                  setAddressOpen(true);
                  if (status !== 'error' && !found?.number?.trim()) {
                    setNumberFocusRequest((n) => n + 1);
                    return missingNumberNotice;
                  }
                  return locatedNotice(status);
                }}
                onPhoto={setPhoto}
                onBusy={setCaptureBusy}
              />
            )}

            {metadata && (
              <ChoiceChips
                label="Tipo de cliente"
                value={form.customer_type}
                onChange={(v) =>
                  setForm({ ...form, customer_type: v as CustomerType })
                }
                options={customerTypes.map(
                  (v) => [v, customerTypeLabels[v]] as const,
                )}
              />
            )}
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
              Telefone (opcional)
              <input
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
            {isContact && (
              <ProspectFields value={prospect} onChange={setProspect} />
            )}
            <label>
              Notas operacionais
              <textarea
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            <div className="active-field">
              <label>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />{' '}
                Ativo
              </label>
              <HelpTip topic="customerActive" />
            </div>
            {field && (
              <details
                open={addressOpen}
                onToggle={(e) => setAddressOpen(e.currentTarget.open)}
              >
                <DisclosureSummary>
                  {form.customer_type === 'person'
                    ? 'Endereço (opcional)'
                    : 'Endereço e Instagram'}
                </DisclosureSummary>
                <PlaceFields
                  key={draft}
                  numberFocusRequest={numberFocusRequest}
                  hideLocation
                  value={site ?? emptyPlace()}
                  onChange={setSite}
                  onName={(name) =>
                    // Só sugere o nome se ainda estiver vazio: não troca o
                    // nome do cliente pelo do estabelecimento escolhido.
                    setForm((f) => ({
                      ...f,
                      name: f.name.trim() ? f.name : name,
                    }))
                  }
                />
                {form.customer_type === 'establishment' && (
                  <label>
                    Instagram (opcional)
                    <input
                      value={site?.instagram ?? ''}
                      onChange={(e) =>
                        setSite({
                          ...(site ?? emptyPlace()),
                          instagram: e.target.value,
                        })
                      }
                    />
                  </label>
                )}
              </details>
            )}
            <div className="actions">
              <Button
                disabled={save.busy || captureBusy}
                variant="primary"
                loading={save.busy}
              >
                {isContact ? 'Salvar contato' : 'Salvar cliente'}
              </Button>
              <Button type="button" disabled={save.busy} onClick={close}>
                Cancelar
              </Button>
            </div>
          </fieldset>
        </form>
      </dialog>
      <label className="customer-search">
        Buscar por nome
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <details className="customer-list-options">
        <DisclosureSummary>Opções da lista</DisclosureSummary>
        <label>
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
          />{' '}
          Incluir arquivados
        </label>
        <Button onClick={() => void list.reload()}>Atualizar lista</Button>
      </details>
      {list.loading ? (
        <SkeletonList
          label={
            kind === 'prospect'
              ? 'Carregando contatos…'
              : 'Carregando clientes…'
          }
        />
      ) : list.data.length === 0 ? (
        <div className="mascot-empty">
          <Mascot size={72} />
          <p>
            {kind === 'prospect'
              ? 'Nenhum contato encontrado.'
              : 'Nenhum cliente encontrado.'}
          </p>
        </div>
      ) : (
        <div className="customer-tiles customer-records">
          {list.data.map((c) => (
            <article className="panel" key={c.id}>
              <Button
                variant="card"
                className="customer-tile customer-edit"
                aria-label={`Editar ${c.name}`}
                onClick={() => {
                  reset();
                  setEditing(c);
                  setProspect(c.prospect ?? emptyProspect());
                  const existing = field?.data?.sites.find(
                    (s) => s.id === c.id,
                  );
                  setSite(existing?.data ?? null);
                  setSiteVersion(existing?.version ?? 0);
                  setForm({
                    customer_type: customerType(c),
                    name: c.name,
                    phone: c.phone,
                    email: c.email,
                    notes: c.notes,
                    active: !!c.active,
                  });
                  sheet.current?.showModal();
                }}
              >
                <SiteAvatar id={c.id} name={c.name} />
                <span>
                  <span role="heading" aria-level={2}>
                    {c.name}
                  </span>
                  <small>
                    {formatPhone(c.phone) || 'Sem telefone'} ·{' '}
                    {c.active ? 'Ativo' : 'Arquivado'}
                  </small>
                </span>
              </Button>
              {prospects && c.prospect && (
                <ProspectPanel
                  key={`${c.id}:${c.version}`}
                  customer={c}
                  financial={financial}
                  visits={visits}
                  onChanged={list.reload}
                />
              )}
              <RouteInfo id={c.id} />
              <details>
                <DisclosureSummary>Conta e localização</DisclosureSummary>
                <SiteInfo id={c.id} name={c.name} />
                {financial && c.kind !== 'prospect' && (
                  <>
                    <Button
                      className="button"
                      to={`/gestao/clientes/${c.id}/b2b`}
                      variant="ghost"
                    >
                      {customerType(c) === 'person'
                        ? 'Dados da pessoa e condições'
                        : 'Dados do estabelecimento'}
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
                  {formatPhone(c.phone) || 'Sem telefone'} ·{' '}
                  {c.active ? 'Ativo' : 'Arquivado'}
                </p>
                {!!c.active && (
                  <Button
                    disabled={save.busy}
                    onClick={async () => {
                      if (
                        await askConfirmation(
                          c.kind === 'prospect'
                            ? 'Arquivar este contato? O histórico será preservado.'
                            : 'Arquivar este cliente? O histórico será preservado.',
                          'Arquivar',
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
              </details>
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
function Products({
  mobile = false,
  flavorOnly = false,
  desktopKits = false,
  role,
}: {
  mobile?: boolean;
  flavorOnly?: boolean;
  desktopKits?: boolean;
  role: 'owner' | 'operator';
}) {
  const askConfirmation = useConfirm();

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
      <h1 className="mobile-context-title">Produtos</h1>
      {desktopKits && (
        <Button to="/gestao/kits" variant="tonal">
          Ver kits
        </Button>
      )}
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
        <div className="active-field">
          <label>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />{' '}
            Produto ativo
          </label>
          <HelpTip topic="productActive" />
        </div>
        {mobile && (
          <fieldset className="product-photo-picker">
            <legend>Foto do produto</legend>
            <div className="actions action-pair">
              <Button
                type="button"
                onClick={() => setPhoto(suggestPhoto(name))}
              >
                Sugerir foto pelo nome
              </Button>
              <Button
                type="button"
                aria-pressed={photo === null}
                onClick={() => setPhoto(null)}
              >
                Sem foto
              </Button>
            </div>
            <div className="photo-grid">
              {photoChoices(photo).map((key) => (
                <Button
                  type="button"
                  variant="card"
                  className="photo-choice"
                  key={key}
                  aria-pressed={photo === key}
                  onClick={() => setPhoto(key)}
                >
                  <img src={photoURL(key)} alt="" width={48} height={48} />
                  <span className="photo-name">{flavorNames[key]}</span>
                  {photo === key && (
                    <span className="photo-selected" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </Button>
              ))}
            </div>
            <small>A foto só é salva quando você salvar o produto.</small>
          </fieldset>
        )}
        {!editing && flavorOnly && variants.length > 0 && (
          <Button
            type="button"
            variant="tonal"
            onClick={() => {
              setVariants([]);
              setPrices([]);
            }}
          >
            Somente sabor (para kits)
          </Button>
        )}
        {variants.length === 0 && (
          <p>
            Somente sabor: tamanho, quantidade e preço vêm do kit. Não é preciso
            cadastrar uma embalagem anterior.
          </p>
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
                  {photoChoices(v.photo_key).map((k) => (
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
            {variants.length
              ? 'Adicionar variante'
              : 'Adicionar embalagem anterior'}
          </Button>
          <Button disabled={save.busy} variant="primary" loading={save.busy}>
            Salvar produto
          </Button>
          <Button type="button" onClick={reset}>
            {editing ? 'Cancelar edição' : 'Limpar campos'}
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
        <SkeletonList label="Carregando produtos…" />
      ) : !list.data.length ? (
        <p>Nenhum produto cadastrado.</p>
      ) : (
        <div className="record-list">
          {list.data.map((p) => (
            <article className="panel" key={p.id}>
              <h2>{p.name}</h2>
              {!p.variants.length && (
                <p>Somente sabor · tamanhos e preços nos kits</p>
              )}
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
              {!!p.active && role === 'owner' && (
                <Button
                  disabled={save.busy}
                  onClick={async () => {
                    if (
                      await askConfirmation(
                        'Arquivar produto? Pedidos anteriores serão preservados.',
                        'Arquivar',
                      )
                    )
                      void save.save(() =>
                        api(`products/${p.id}`, 'DELETE', {
                          version: p.version,
                        }),
                      );
                  }}
                  className="desktop-product-archive"
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
type OrderDetailPane = (onChanged: () => Promise<void>) => ReactNode;

function Orders({
  mobile = false,
  role = 'owner',
  sharedDelivery,
  detail,
  ...props
}: {
  detail?: OrderDetailPane;
  sharedDelivery?: boolean;
  mobile?: boolean;
  role?: string;
  operational?: boolean;
  financial?: boolean;
  mixed?: boolean;
  metadata?: boolean;
  kitOrders?: boolean;
}) {
  const [search] = useSearchParams(),
    mode = useOrderMode(role);
  if (
    mobile &&
    search.get('novo') &&
    (mode.simple || search.get('retomar') === '1')
  )
    return (
      <Totem
        financial={props.financial}
        sharedDelivery={sharedDelivery}
        mixed={props.mixed}
        metadata={props.metadata}
        kitOrders={props.kitOrders}
      />
    );
  return (
    <>
      <div className="chips order-mode-switch">
        {mobile && (
          <>
            <Button
              aria-pressed={mode.simple}
              onClick={() => mode.setPreference('simple')}
            >
              Modo simples
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
      <FullOrders {...props} simple={mobile && mode.simple} detail={detail} />
    </>
  );
}
function FullOrders({
  simple = false,
  detail,
  metadata = false,
  kitOrders = false,
  operational = false,
  financial = false,
  mixed = false,
}: {
  detail?: OrderDetailPane;
  operational?: boolean;
  financial?: boolean;
  mixed?: boolean;
  simple?: boolean;
  metadata?: boolean;
  kitOrders?: boolean;
}) {
  const askConfirmation = useConfirm();

  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const orders = useList<Order>(`orders?q=${encodeURIComponent(query)}`);
  const kitCatalog = useKitCatalog(financial && kitOrders);
  const [kitItems, setKitItems] = useState<KitItemInput[]>([]),
    [kitSnapshots, setKitSnapshots] = useState<KitItemSnapshot[]>([]),
    [kitEditing, setKitEditing] = useState(false),
    [kitEditorEpoch, setKitEditorEpoch] = useState(0);
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
      kit_items?: KitItemInput[];
    }[];
  } | null>(null);
  const [template, setTemplate] = useState('');
  const choice = useRef(0);
  async function chooseCustomer(id: string) {
    const serial = ++choice.current;
    setCustomer(id);
    setDefaults(null);
    setTemplate('');
    setKitEditing(false);
    if (!editing) {
      setKitItems([]);
      setKitSnapshots([]);
    }
    if (!financial || !id || editing) return;
    setItems([{ variant_id: '', quantity: 1 }]);
    setDue('');
    setNotes('');
    setOccasion('');
    try {
      const d = await api<NonNullable<typeof defaults>>(
        `finance/customers/${id}/defaults?kits=1`,
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
    setKitItems(plan.kit_items ?? []);
    setKitSnapshots([]);
    setTemplate(plan.id);
    setItems(
      plan.items.map((i) => ({
        variant_id: i.variant_id,
        quantity: i.quantity,
        components: i.components,
      })),
    );
    setNotes(plan.notes);
    setDue(nextWeeklyTime(plan.weekday, plan.time));
  }
  const [due, setDue] = useState('');
  const [notes, setNotes] = useState('');
  const [occasion, setOccasion] = useState<Occasion>('');
  const [items, setItems] = useState<Item[]>([{ variant_id: '', quantity: 1 }]);
  const key = useRef(crypto.randomUUID());
  const options = products.data.flatMap((p) =>
    p.variants
      .filter((v) => v.active)
      .map((v) => ({
        id: v.id!,
        label: `${p.name} — ${v.label} (${money(v.price_cents)})`,
        price: v.price_cents,
        name: p.name + ' — ' + v.label,
        units_per_box: v.units_per_box,
        weight_grams: v.weight_grams,
      })),
  );
  function reset() {
    setEditing(null);
    setKitItems([]);
    setKitSnapshots([]);
    setKitEditing(false);
    setKitEditorEpoch((n) => n + 1);
    setCustomer('');
    setDefaults(null);
    setTemplate('');
    choice.current++;
    setDue('');
    setNotes('');
    setOccasion('');
    setItems([{ variant_id: '', quantity: 1 }]);
    key.current = crypto.randomUUID();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (
      kitEditing ||
      (!items.length && !kitItems.length) ||
      items.some((i) => !compositionValid(i, options))
    )
      return;
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
            occasion: metadata ? occasion : undefined,
            kit_items: kitItems,
            composition_version: 1,
            items: items.map((i) => ({
              item_id: i.id ?? i.item_id,
              ...(i.components
                ? {
                    components: i.components.map(({ variant_id, units }) => ({
                      variant_id,
                      units,
                    })),
                  }
                : {}),
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
        (editing?.items.find((o) =>
          i.id || i.item_id
            ? o.id === (i.id ?? i.item_id)
            : o.variant_id === i.variant_id &&
              !o.components?.length &&
              !i.components?.length,
        )?.unit_price_cents ??
          options.find((o) => o.id === i.variant_id)?.price ??
          0),
    0,
  );
  const orderRecords = orders.loading ? (
    <SkeletonList label="Carregando pedidos…" />
  ) : !orders.data.length ? (
    <div className="mascot-empty">
      <Mascot size={72} />
      <p>Nenhum pedido encontrado.</p>
    </div>
  ) : (
    <div className="record-list">
      {orders.data.map((o) => (
        <article className="panel" key={o.id} data-batch-order={o.id}>
          <h2>{o.customer_name}</h2>
          {occasionLabel(o.occasion) && (
            <p>Ocasião: {occasionLabel(o.occasion)}</p>
          )}
          <p>
            {statusLabels[o.status] || 'Rascunho'} · {dateTime(o.due_at)} ·{' '}
            {money(o.total_cents)}
          </p>
          <ul>
            {o.items.map((i, index) => (
              <li key={i.id ?? index}>
                {i.quantity} ×{' '}
                {i.kit_id
                  ? `${i.product_name} (${i.components?.map((c) => `${c.units} ${c.product_name}`).join(' + ')})`
                  : i.components?.length
                    ? `Caixa Mista (${i.components.map((c) => `${c.units} ${c.product_name ?? options.find((v) => v.id === c.variant_id)?.name ?? 'Sabor indisponível'}`).join(' + ')})`
                    : `${i.product_name} — ${i.variant_label}`}{' '}
                · {money(i.unit_price_cents!)}
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
                  setOccasion((o.occasion ?? '') as Occasion);
                  setKitEditing(false);
                  const savedKits = o.items.filter(
                    (i) => i.kit_id,
                  ) as unknown as KitItemSnapshot[];
                  setKitSnapshots(savedKits);
                  setKitItems(savedKits.map(kitSnapshotInput));
                  setItems(o.items.filter((i) => !i.kit_id));
                }}
              >
                Editar pedido de {o.customer_name}
              </Button>
              <Button
                disabled={save.busy}
                onClick={async () => {
                  if (
                    await askConfirmation(
                      'Arquivar rascunho? O registro e os itens serão preservados.',
                      'Arquivar',
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
  );
  return (
    <>
      <h1 className="orders-page-title">Pedidos</h1>
      <p className="orders-page-description">
        Pedidos. Quantidade se refere à embalagem/caixa cadastrada. Status e
        entrega ficam no detalhe do pedido quando a operação está ativa.
      </p>
      <ErrorMessage
        message={
          orders.error ||
          customers.error ||
          products.error ||
          kitCatalog.error ||
          save.error
        }
      />
      <p role="status">{save.notice}</p>
      <div className="desktop-order-layout">
        {detail ? (
          <section
            className="desktop-order-detail"
            aria-label="Detalhe do pedido"
          >
            {detail(orders.reload)}
          </section>
        ) : simple ? (
          <Button
            className="button primary-action order-list-new"
            to="/gestao/pedidos?novo=1"
            variant="primary"
          >
            Novo pedido
          </Button>
        ) : (
          <form
            className="data-form panel desktop-order-editor"
            onSubmit={submit}
          >
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
                  {paymentModeLabels[
                    defaults.profile.terms.mode
                  ].toLocaleLowerCase('pt-BR')}
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
            {(kitCatalog.kits.length > 0 || kitItems.length > 0) && (
              <KitItemsEditor
                key={`${kitEditorEpoch}-${editing?.id ?? 'novo'}-${customer}`}
                value={kitItems}
                onChange={(value) => {
                  setKitItems(value);
                  if (value.length && items.every((i) => !i.variant_id))
                    setItems([]);
                }}
                kits={kitCatalog.kits}
                snapshots={kitSnapshots}
                products={products.data}
                limit={kitCatalog.limit}
                mixed={mixed}
                onEditingChange={setKitEditing}
              />
            )}
            {items.map((i, index) => (
              <fieldset key={index}>
                <legend>Item {index + 1}</legend>
                <label>
                  Sabor
                  <select
                    required
                    value={i.variant_id}
                    disabled={!!i.components}
                    onChange={(e) =>
                      setItems(
                        items.map((v, j) =>
                          j === index
                            ? {
                                variant_id: e.target.value,
                                quantity: v.quantity,
                              }
                            : v,
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
                      .filter(
                        (o) => !options.some((v) => v.id === o.variant_id),
                      )
                      .map((o) => (
                        <option key={o.variant_id} value={o.variant_id}>
                          {o.product_name} — {o.variant_label} (histórico)
                        </option>
                      ))}
                  </select>
                </label>
                <CompositionEditor
                  item={i}
                  options={options}
                  enabled={mixed}
                  onChange={(value) =>
                    setItems(items.map((v, j) => (j === index ? value : v)))
                  }
                />
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
                {(items.length > 1 || i.components || kitItems.length > 0) && (
                  <Button
                    type="button"
                    onClick={() =>
                      setItems(
                        items.length === 1
                          ? [{ variant_id: '', quantity: 1 }]
                          : items.filter((_, j) => j !== index),
                      )
                    }
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
            {metadata && (
              <OccasionPicker value={occasion} onChange={setOccasion} />
            )}
            <label>
              Observações
              <textarea
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <p>
              Prévia:{' '}
              {money(
                estimate +
                  kitItems.reduce(
                    (n, i) =>
                      n +
                      i.quantity *
                        (kitItemPrice(i, kitCatalog.kits, kitSnapshots) ?? 0),
                    0,
                  ),
              )}
              . O servidor confere o total ao salvar.
            </p>
            <div className="actions">
              <Button
                disabled={
                  save.busy ||
                  kitEditing ||
                  (!items.length && !kitItems.length) ||
                  items.some((i) => !compositionValid(i, options))
                }
                variant="primary"
                loading={save.busy}
              >
                Salvar pedido
              </Button>
              <Button type="button" onClick={reset}>
                {editing ? 'Cancelar edição' : 'Limpar campos'}
              </Button>
            </div>
          </form>
        )}
        <div className="desktop-order-list">
          <label className="order-list-search">
            Buscar pedidos por cliente
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Button
            className="order-list-refresh"
            onClick={() => void orders.reload()}
          >
            Atualizar pedidos
          </Button>
          {operational ? (
            <BatchOrders orders={orders.data} reload={orders.reload}>
              {orderRecords}
            </BatchOrders>
          ) : (
            orderRecords
          )}
        </div>
      </div>
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
        !error && <SkeletonList />
      )}
    </>
  );
}
function Accesses() {
  const list = useList<{ email: string; role: string; developer?: boolean }>(
    'members',
  );
  const save = useSave(list.reload);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('operator');
  return (
    <>
      <h1 className="mobile-context-title">Acessos autorizados</h1>
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
            {m.email} ·{' '}
            {m.developer
              ? 'Desenvolvedor (suporte técnico)'
              : roleLabel(m.role)}
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
  const [newVisit, setNewVisit] = useState(false);
  const desktop = useDesktopLayout();
  const { pathname } = useLocation();
  const [desktopCalendar, setDesktopCalendar] =
    useState<HTMLSpanElement | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [connectionError, setConnectionError] = useState(false);
  const navigate = useNavigate();
  const goTab = useTabHistory();
  const quick = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let active = true;
    const check = () => {
      api<Session>('session')
        .then((s) => {
          if (active) {
            setSession(s);
            setConnectionError(false);
            if (s.p1) void reconcilePushSession().catch(() => {});
          }
        })
        .catch((e) => {
          if (!active) return;
          // Falha só de rede (ex.: Android "acordando" a internet ao voltar
          // ao app): mantém a gestão aberta e tenta de novo em instantes.
          // Só sai da gestão quando o servidor recusa a sessão.
          if (e instanceof ApiError && e.status === 0) {
            setConnectionError(true);
            if (retry) clearTimeout(retry);
            retry = setTimeout(check, 4000);
            setSession((current) => {
              if (!current) setError(e.message);
              return current;
            });
            return;
          }
          setSession(null);
          setConnectionError(false);
          setError(e.message);
        });
    };
    let retry: ReturnType<typeof setTimeout> | undefined;
    check();
    const timer = setInterval(check, 60000);
    const expired = () => {
      setSession(null);
      setConnectionError(false);
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
      if (retry) clearTimeout(retry);
      window.removeEventListener('session-expired', expired);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', connected);
      window.removeEventListener('focus', check);
    };
  }, []);
  async function logout() {
    try {
      await api('auth/logout', 'POST', {});
      if (session) clearDraft(session.organization_id + ':' + session.user_id);
      await Promise.race([
        unsubscribeLocalPush(),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
      setSession(null);
      navigate('/login');
      window.location.assign('/cdn-cgi/access/logout');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!session && !error) return <AppOpening />;
  if (!session)
    return (
      <section className="panel">
        <h1>Gestão restrita</h1>
        <ErrorMessage message={error} />
        {connectionError ? (
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        ) : (
          <Button className="button" to="/login" variant="ghost">
            Entrar na gestão
          </Button>
        )}
      </section>
    );
  const orders = (detail?: OrderDetailPane) => (
    <Orders
      metadata={session.customer_orders}
      kitOrders={session.kit_orders}
      mixed={session.mixed}
      operational={session.operations}
      financial={session.finance}
      mobile={session.mobile}
      role={session.role}
      detail={detail}
      sharedDelivery={session.shared_delivery}
    />
  );
  const orderDetail = (onChanged?: () => Promise<void>) => (
    <OrderDetail
      key={pathname}
      p1={session.p1}
      onChanged={onChanged}
      sharedDelivery={session.shared_delivery}
      financial={session.finance}
      mobile={session.mobile}
    />
  );
  const management = (
    <ConfirmProvider enabled={online}>
      <TestEnvironmentBanner />
      <FieldProvider
        enabled={!!session.field && online}
        key={session.organization_id + session.user_id + online}
      >
        <OrderDraftScope
          value={session.organization_id + ':' + session.user_id}
        >
          <NavigationScroll />
          {online && <ReleaseAnnouncement />}
          <section
            className={`management ${session.operations ? 'operations-active' : ''}`}
          >
            {desktop && session.operations && (
              <aside className="desktop-sidebar">
                <NavLink to="/gestao" className="private-brand">
                  <img src="/brand/logo.webp" alt="" width={44} height={44} />
                  <span>
                    Amor Zeloso <small>Gestão</small>
                  </span>
                </NavLink>
                <nav aria-label="Gestão privada">
                  {(
                    [
                      ['', 'Hoje', 'inicio', 'today'],
                      ['pedidos', 'Pedidos', 'pedidos', 'orders'],
                      ['clientes', 'Clientes', 'clientes', 'customers'],
                      ['produtos', 'Produtos e kits', 'produtos', 'products'],
                      [
                        'recorrentes',
                        'Pedidos padrão',
                        'recorrentes',
                        'recurring',
                      ],
                      ...(session.p1
                        ? [
                            [
                              'relatorios',
                              'Relatórios',
                              'financeiro',
                              'reports',
                            ],
                          ]
                        : []),
                      ['mais', 'Mais', 'mais', 'more'],
                    ] as [string, string, IconName, string][]
                  ).map(([path, title, icon, tour]) => (
                    <NavLink
                      key={path}
                      to={
                        path
                          ? `/gestao/${path}`
                          : pathname === '/gestao/'
                            ? pathname
                            : '/gestao'
                      }
                      end={!path}
                      data-tour={tour}
                      onClick={
                        !path
                          ? () =>
                              window.dispatchEvent(new Event('reset-workday'))
                          : undefined
                      }
                    >
                      <Icon name={icon} size={20} />
                      {title}
                    </NavLink>
                  ))}
                </nav>
                <Button
                  className="desktop-new"
                  variant="primary"
                  aria-label="Novo cadastro"
                  disabled={!online}
                  data-tour="new"
                  onClick={() => quick.current?.showModal()}
                  icon={<Icon name="novo" size={18} />}
                >
                  Novo
                </Button>
              </aside>
            )}
            <CompactHeader
              role={session.role}
              developer={!!session.developer}
              online={online}
              operations={!!session.operations}
              desktop={desktop && !!session.operations}
              calendarSlot={setDesktopCalendar}
              ownerAccess={session.role === 'owner'}
              onLogout={() => void logout()}
            />
            <header className="management-header">
              <p>
                Área privada · {roleLabel(session.role, !!session.developer)}
              </p>
              <Button disabled={!online} onClick={() => void logout()}>
                Sair
              </Button>
            </header>
            <ErrorMessage message={error} />
            <DraftNotice />
            <nav
              className={`management-nav ${session.operations ? 'ops-nav' : ''}`}
              aria-label="Gestão privada"
            >
              {(session.operations
                ? [
                    ['', 'Hoje', 'inicio', 'today'],
                    ['pedidos', 'Pedidos', 'pedidos', 'orders'],
                    ['clientes', 'Clientes', 'clientes', 'customers'],
                    [
                      'recorrentes',
                      'Pedidos padrão',
                      'recorrentes',
                      'recurring',
                    ],
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
                <Tour role={session.role} visits={session.visits} />
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
              <ManagementRoutes
                key={`${session.user_id}:${session.organization_id}`}
                available={!!session.feedback}
              >
                {session.feedback && (
                  <Route path="sugestoes" element={<FeedbackForm />} />
                )}
                {session.feedback && session.role === 'owner' && (
                  <Route path="recebidas" element={<FeedbackInbox />} />
                )}
                {releasesEnabled(__APP_VERSION__) && (
                  <Route path="novidades" element={<ReleaseHistory />} />
                )}
                <Route
                  index
                  element={
                    session.operations ? (
                      <Today
                        sharedDelivery={session.shared_delivery}
                        followup={session.prospect_followup}
                        role={session.role}
                        calendarSlot={desktop ? desktopCalendar : null}
                        financial={session.finance}
                        p1={session.p1}
                        backupOrganizationId={
                          session.tools ? session.organization_id : undefined
                        }
                      />
                    ) : (
                      <Overview />
                    )
                  }
                />
                <Route
                  path="clientes"
                  element={
                    <Customers
                      financial={session.finance}
                      metadata={session.customer_orders}
                      prospects={session.prospects}
                      visits={session.visits}
                    />
                  }
                />
                <Route
                  path="produtos"
                  element={
                    <Products
                      role={session.role}
                      mobile={session.mobile}
                      flavorOnly={session.customer_orders && session.p1}
                      desktopKits={
                        desktop && !!session.operations && !!session.p1
                      }
                    />
                  }
                />
                <Route path="pedidos" element={orders()} />
                {session.prospect_followup && (
                  <Route path="prospeccao" element={<ProspectReportPage />} />
                )}
                {session.visits && (
                  <>
                    <Route
                      path="visitas"
                      element={
                        <VisitsPage followup={session.prospect_followup} />
                      }
                    />
                    <Route
                      path="visitas/:id"
                      element={
                        <VisitsPage followup={session.prospect_followup} />
                      }
                    />
                  </>
                )}
                {session.mobile && (
                  <Route
                    path="preferencias"
                    element={
                      <Preferences
                        role={session.role}
                        p1={session.p1}
                        feedback={session.feedback}
                      />
                    }
                  />
                )}
                {session.mobile && (
                  <Route
                    path="pedidos/:id/editar-simples"
                    element={
                      <Totem
                        sharedDelivery={session.shared_delivery}
                        kitOrders={session.kit_orders}
                        financial={session.finance}
                        mixed={session.mixed}
                        metadata={session.customer_orders}
                      />
                    }
                  />
                )}
                {session.tools && session.role === 'owner' && (
                  <Route
                    path="backup"
                    element={
                      <Backup
                        organizationId={session.organization_id}
                        userId={session.user_id}
                      />
                    }
                  />
                )}
                {session.tools && session.role === 'owner' && (
                  <Route
                    path="importar-clientes"
                    element={<ImportCustomers />}
                  />
                )}
                {session.tools && session.p1 && session.role === 'owner' && (
                  <Route path="importar-cadastro" element={<ImportCatalog />} />
                )}
                {session.tools && (
                  <Route
                    path="estoque"
                    element={<Stock role={session.role} />}
                  />
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
                    <Route
                      path="agenda"
                      element={<Agenda visits={session.visits} />}
                    />
                    <Route
                      path="relatorios"
                      element={<Reports followup={session.prospect_followup} />}
                    />
                    <Route path="despesas" element={<Expenses />} />
                    <Route
                      path="fichas"
                      element={
                        <Recipes weightCosting={session.weight_costing} />
                      }
                    />
                    <Route path="fichas/peso" element={<WeightRecipes />} />
                    <Route path="insumos" element={<Supplies />} />
                    <Route path="kits" element={<Kits role={session.role} />} />
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
                    <Route
                      path="clientes/:id/b2b"
                      element={<CustomerProfile />}
                    />
                    {session.role === 'owner' && (
                      <Route path="financeiro/pix" element={<PixSettings />} />
                    )}
                  </>
                )}
                {session.operations && (
                  <>
                    <Route
                      path="pedidos/:id"
                      element={desktop ? orders(orderDetail) : orderDetail()}
                    />
                    <Route
                      path="recorrentes"
                      element={
                        <Recurring
                          sharedDelivery={session.shared_delivery}
                          mixed={session.recurring_mixed}
                          kitModels={session.kit_recurring}
                        />
                      }
                    />
                    <Route path="mensagens" element={<MessageTemplates />} />
                    <Route
                      path="ajuda"
                      element={
                        <HelpCenter
                          feedback={session.feedback}
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
                          feedback={session.feedback}
                          role={session.role}
                          financial={session.finance}
                          p1={session.p1}
                          field={session.field}
                          tools={session.tools}
                          mobile={session.mobile}
                          visits={session.visits}
                          followup={session.prospect_followup}
                        />
                      }
                    />
                  </>
                )}
                {session.role === 'owner' && (
                  <Route path="acessos" element={<Accesses />} />
                )}
                <Route path="*" element={<p>Área não encontrada.</p>} />
              </ManagementRoutes>
            )}
            {session.operations && (
              <>
                <nav
                  className="private-bottom-nav"
                  aria-label="Atalhos do celular"
                >
                  <NavLink
                    to="/gestao/"
                    end
                    data-tour="today"
                    onClick={(e) => {
                      window.dispatchEvent(new Event('reset-workday'));
                      goTab('/gestao/', e);
                    }}
                  >
                    <Icon name="inicio" />
                    Hoje
                  </NavLink>
                  <NavLink
                    to="/gestao/pedidos"
                    data-tour="orders"
                    onClick={(e) => goTab('/gestao/pedidos', e)}
                  >
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
                  <NavLink
                    to="/gestao/clientes"
                    data-tour="customers"
                    onClick={(e) => goTab('/gestao/clientes', e)}
                  >
                    <Icon name="clientes" />
                    Clientes
                  </NavLink>
                  <NavLink
                    to="/gestao/mais"
                    data-tour="more"
                    onClick={(e) => goTab('/gestao/mais', e)}
                  >
                    <Icon name="mais" />
                    Mais
                  </NavLink>
                </nav>
                {newVisit && session.visits && (
                  <VisitSheet
                    compact
                    onClose={() => setNewVisit(false)}
                    onSaved={() => {
                      window.dispatchEvent(new Event('visits-changed'));
                    }}
                  />
                )}
                <dialog
                  ref={quick}
                  className="help-sheet"
                  onClick={(e) => {
                    // Tocar fora da folha fecha.
                    if (e.target === e.currentTarget) e.currentTarget.close();
                  }}
                  aria-label="Novo cadastro"
                >
                  <div className="sheet-body">
                    <h2>O que vamos preparar?</h2>
                    <div className="quick-links">
                      {session.visits && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            quick.current?.close();
                            setNewVisit(true);
                          }}
                        >
                          Nova visita
                        </Button>
                      )}
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
                        to="/gestao/clientes?novo=1"
                        onClick={() => quick.current?.close()}
                        variant="ghost"
                      >
                        Novo cliente
                      </Button>
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
                    </div>
                    <p>
                      {session.finance
                        ? 'Recebimentos rápidos ficam no Hoje, no cartão do pedido.'
                        : 'Recebimentos dependem da ativação financeira.'}
                    </p>
                    <Button
                      className="sheet-close"
                      onClick={() => quick.current?.close()}
                    >
                      Fechar
                    </Button>
                  </div>
                </dialog>
              </>
            )}
          </section>
        </OrderDraftScope>
      </FieldProvider>
    </ConfirmProvider>
  );
  return (
    <EnvironmentScope test={session.environment === 'teste'}>
      {management}
    </EnvironmentScope>
  );
}

function More({
  role,
  feedback = false,
  followup = false,
  visits = false,
  financial = false,
  p1 = false,
  field = false,
  tools = false,
  mobile = false,
}: {
  role: string;
  feedback?: boolean;
  followup?: boolean;
  visits?: boolean;
  financial?: boolean;
  p1?: boolean;
  field?: boolean;
  tools?: boolean;
  mobile?: boolean;
}) {
  return (
    <>
      <h1 className="mobile-context-title">Mais</h1>
      <div className="more-grid">
        {[
          ...(followup ? [['prospeccao', 'Prospecção', 'financeiro']] : []),
          ...(visits ? [['visitas', 'Visitas e amostras', 'clientes']] : []),
          ...(tools
            ? [
                ['estoque', 'Estoque', 'produtos'],
                ...(role === 'owner'
                  ? [
                      ['importar-clientes', 'Importar clientes', 'clientes'],
                      // "Importar cadastro inicial" já foi usado (20/11); a rota
                      // /gestao/importar-cadastro continua, sem atalho no menu.
                      ['backup', 'Backup privado', 'configuracoes'],
                    ]
                  : []),
              ]
            : []),
          ...(field ? [['deslocamentos', 'Corridas', 'entregas']] : []),
          ...(p1
            ? [
                ['agenda', 'Agenda', 'agenda'],
                ['lembretes', 'Lembretes', 'agenda'],
                ['relatorios', 'Relatórios', 'financeiro'],
                ['despesas', 'Despesas e fluxo', 'financeiro'],
                ['fichas', 'Fichas e preço sugerido', 'producao'],
                ['insumos', 'Insumos e embalagens', 'produtos'],
                ['kits', 'Kits', 'produtos'],
                ['compras', 'Lista de compras', 'produtos'],
              ]
            : []),
          ...(financial ? [['financeiro', 'Financeiro', 'financeiro']] : []),
          ['recorrentes', 'Pedidos padrão', 'recorrentes'],
          ['produtos', 'Produtos', 'produtos'],
          ['mensagens', 'Modelos de WhatsApp', 'pedidos'],
          ...(releasesEnabled(__APP_VERSION__)
            ? [['novidades', 'Novidades', 'ajuda']]
            : []),
          ['ajuda', 'Ajuda e tutorial', 'ajuda'],
          ...(feedback
            ? [
                ['sugestoes', 'Sugestões e problemas', 'ajuda'],
                ...(role === 'owner'
                  ? [['recebidas', 'Recebidas', 'ajuda']]
                  : []),
              ]
            : []),
          ...(mobile
            ? [['preferencias', 'Preferências', 'configuracoes']]
            : []),
          ...(role === 'owner'
            ? [['acessos', 'Acessos', 'configuracoes']]
            : []),
        ].map(([path, title, icon]) => (
          <Button
            className="panel more-link"
            key={path}
            to={`/gestao/${path}`}
            state={path === 'sugestoes' ? { page: 'mais' } : undefined}
          >
            <Icon name={icon as IconName} />
            {title}
            {path === 'recebidas' && <FeedbackCount />}
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
      <p className="place-credit">
        Versão {__APP_VERSION__} · {__APP_BUILD__}
      </p>
    </>
  );
}
