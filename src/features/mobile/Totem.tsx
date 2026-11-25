import { exchangePreview } from '../../../shared/order-exchange';
import {
  ExchangeEditor,
  ExchangeSummary,
} from '../../components/OrderExchange';
import { DeliveryCycleEditor } from '../finance/DeliveryCycleEditor';
import { courierChoices, type Courier } from '../../../shared/courier';
import { AlcoholTag } from '../../components/AlcoholTag';
import { AvatarChip } from '../../components/AvatarChip';
import { SkeletonList } from '../../components/Skeleton';
import { useCallback, useMemo } from 'react';
import { useDraftEditor } from './useOrderDraft';
import { draftRaw, clearDraft } from './order-draft';
import { useConfirm } from '../../components/confirm-context';
import {
  customerType,
  occasionLabel,
  type CustomerType,
  type Occasion,
} from '../../../shared/customer-order';
import { OccasionPicker } from '../../components/OccasionPicker';
import {
  KitItemsEditor,
  LegacyItemsSection,
} from '../../components/KitItemsEditor';
import { useKitCatalog } from '../p1/useKitCatalog';
import {
  kitItemPrice,
  kitCompositionKey,
  kitSnapshotInput,
  type KitItemInput,
  type KitItemSnapshot,
} from '../../../shared/kit-orders';
import { kitLabel } from '../../../shared/kits';
import { containsAlcohol } from '../../../shared/alcohol';
import { DayCalendar } from '../operations/DayCalendar';
import {
  isPastToday,
  deliveryDayLabel,
  scheduleDay,
  windowStart,
} from '../../../shared/order-schedule';
import { fortalezaDay, shiftDay } from '../../../shared/workday';
import { createPortal } from 'react-dom';
import { sortFlavors, readFlavorOrder, type Popularity } from './flavorOrder';
import { Button } from '../../components/Button';
import {
  useField,
  useCourierLabels,
  SiteAvatar,
  CourierAvatars,
} from '../field/FieldContext';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  useLocation,
  useParams,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { api, money, nextWeeklyTime } from '../api';
import {
  Failure,
  useRemote,
  type OperationalOrder,
} from '../operations/common';
import { MoneyInput, QuantityInput } from '../../components/NumericInputs';
import { photoURL } from '../../../shared/flavors';
import { NoPhoto } from '../../components/NoPhoto';
import { deliveryAddress, emptyPlace } from '../../../shared/field';
import {
  emptyTerms,
  paymentModeLabels,
  setTermsCycle,
  setTermsMode,
  termsModeLabel,
  paymentMethods,
  dueDayLabel,
  type B2BProfile,
  type Terms,
} from '../../../shared/finance';
import { Mascot } from '../../components/Mascot';
import { HelpTip } from '../../components/HelpTip';
interface Product {
  id: string;
  name: string;
  description?: string;
  photo_key: string | null;
  variants: {
    id: string;
    label: string;
    active: number;
    price_cents: number;
    units_per_box?: number;
    weight_grams?: number;
    photo_key: string | null;
  }[];
}
interface Mix {
  key: string;
  item_id?: string;
  base: string;
  comp: Record<string, number>;
  qty: number;
}
const mixSig = (comp: Record<string, number>) =>
  JSON.stringify(
    Object.entries(comp)
      .filter(([, u]) => u > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
const mixBase = (comp: Record<string, number>) =>
  Object.entries(comp)
    .filter(([, u]) => u > 0)
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))[0]?.[0] ?? '';
interface Plan {
  kit_items?: KitItemInput[];
  id: string;
  name: string;
  weekday: number;
  time: string;
  notes: string;
  delivery_type: 'pickup' | 'delivery';
  delivery_address: string;
  courier: Courier;
  courier_name: string;
  courier_fee_cents: number;
  valid: boolean;
  items: {
    variant_id: string;
    quantity: number;
    components?: { variant_id: string; units: number }[];
  }[];
}
interface Defaults {
  customer_type?: CustomerType;
  ranking: Popularity;
  product_order: string[];
  mixed?: boolean;
  profile: B2BProfile;
  plans: Plan[];
  last: {
    kit_items?: KitItemInput[];
    valid: boolean;
    items: {
      variant_id: string;
      quantity: number;
      components?: { variant_id: string; units: number }[];
    }[];
    notes: string;
  } | null;
}
interface EditOrder {
  exchange_units?: number;
  occasion?: Occasion;
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
    kit_id?: string;
    variant_id: string;
    quantity: number;
    units_per_box?: number;
    product_name: string;
    variant_label: string;
    unit_price_cents: number;
    id?: string;
    components?: { variant_id: string; units: number }[];
  }[];
}
// Relógio consultado só em inicialização, eventos e temporizadores.
const readTime = () => Date.now();
export function Totem({
  financial = false,
  mixed = false,
  metadata = false,
  kitOrders = false,
  sharedDelivery = false,
  orderExchange = false,
}: {
  financial?: boolean;
  mixed?: boolean;
  metadata?: boolean;
  kitOrders?: boolean;
  sharedDelivery?: boolean;
  orderExchange?: boolean;
}) {
  const {
    scope: draftScope,
    raw: storedRaw,
    draft: resumeDraft,
    claim: claimDraft,
    write: writeDraft,
  } = useDraftEditor();
  const askConfirmation = useConfirm();
  const restoring = useRef(false),
    autoAttempt = useRef(''),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [resumeNotice, setResumeNotice] = useState('');
  const [exchangeUnits, setExchangeUnits] = useState(0);
  const kitCatalog = useKitCatalog(financial && kitOrders);
  const [kitItems, setKitItems] = useState<KitItemInput[]>([]),
    [kitSnapshots, setKitSnapshots] = useState<KitItemSnapshot[]>([]),
    [kitEditing, setKitEditing] = useState(false);
  const field = useField(),
    courierLabels = useCourierLabels();
  const { id } = useParams(),
    navigate = useNavigate(),
    location = useLocation(),
    [search] = useSearchParams(),
    products = useRemote<Product[]>('products'),
    [query, setQuery] = useState(''),
    customers = useRemote<
      {
        id: string;
        name: string;
        frequency: number;
        customer_type?: CustomerType;
      }[]
    >('mobile/customers?q=' + encodeURIComponent(query));
  const [mixes, setMixes] = useState<Mix[]>([]),
    [mixDraft, setMixDraft] = useState<{
      comp: Record<string, number>;
      editing?: string;
      qty: number;
    } | null>(null);
  const [step, setStep] = useState(0),
    [customer, setCustomer] = useState<{
      id: string;
      name: string;
      customer_type?: CustomerType;
    } | null>(null),
    [defaults, setDefaults] = useState<Defaults | null>(null),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [schedule, setSchedule] = useState({ due: '', pastConfirmed: false }),
    [planDue, setPlanDue] = useState(''),
    [notes, setNotes] = useState(''),
    [deliveredAt, setDeliveredAt] = useState<string | null>(null),
    [receiptMethod, setReceiptMethod] = useState<
      keyof typeof paymentMethods | ''
    >(''),
    [receiptAmount, setReceiptAmount] = useState<number | null>(null),
    [receiptDay, setReceiptDay] = useState(''),
    [occasion, setOccasion] = useState<Occasion>(''),
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
  const due = schedule.due;
  const setDue = useCallback(
    (due: string) => setSchedule({ due, pastConfirmed: false }),
    [],
  );
  const [clock, setClock] = useState(readTime);
  useEffect(() => {
    const update = () => setClock(readTime());
    const timer = setInterval(update, 30000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const pastDue = !id && isPastToday(due, new Date(clock));
  const pastBlocks = pastDue && !schedule.pastConfirmed;

  const suppressedDraft = useRef(''),
    editBaseline = useRef<string | null>(null),
    baselineOrder = useRef('');
  const draftPayload = useMemo(
    () =>
      customer
        ? {
            customer_id: customer.id,
            order_id: id ?? null,
            ...(orderExchange && exchangeUnits > 0
              ? { exchange_units: exchangeUnits }
              : {}),
            items: [
              ...Object.entries(counts)
                .filter(([, n]) => n > 0)
                .map(([variant_id, quantity]) => ({ variant_id, quantity })),
              ...mixes.map((m) => ({
                variant_id: m.base,
                quantity: m.qty,
                ...(m.item_id ? { item_id: m.item_id } : {}),
                components: Object.entries(m.comp)
                  .filter(([, n]) => n > 0)
                  .map(([variant_id, units]) => ({ variant_id, units })),
              })),
            ],
            kit_items: kitItems.map((k) => ({
              kit_id: k.kit_id,
              quantity: k.quantity,
              ...(k.item_id ? { item_id: k.item_id } : {}),
              components: k.components.map((c) => ({
                product_id: c.product_id,
                units: c.units,
              })),
            })),
          }
        : null,
    [customer, id, counts, mixes, kitItems, orderExchange, exchangeUnits],
  );
  useEffect(() => {
    if (
      !draftPayload ||
      busy ||
      success ||
      (id ? editing?.id !== id : !defaults) ||
      resumeDraft
    )
      return;
    const signature = JSON.stringify(draftPayload);
    if (id && (editBaseline.current === null || baselineOrder.current !== id)) {
      baselineOrder.current = id;
      editBaseline.current = signature;
      return;
    }
    if (
      signature === suppressedDraft.current ||
      (id && signature === editBaseline.current)
    )
      return;
    // Releitura antes da gravação protege também eventos entre render e efeito.
    // Um rascunho externo nunca é sobrescrito antes de recuperar/descartar.
    writeDraft(draftPayload);
  }, [
    draftPayload,
    busy,
    success,
    id,
    editing,
    defaults,
    resumeDraft,
    draftScope,
    writeDraft,
  ]);
  const root = useRef<HTMLElement>(null);
  const site = customer
      ? field?.data?.sites.find((x) => x.id === customer.id)
      : undefined,
    savedAddress = site
      ? deliveryAddress(site.data)
      : defaults
        ? [
            defaults.profile.address,
            defaults.profile.neighborhood,
            defaults.profile.reference,
          ]
            .filter(Boolean)
            .join(' ')
        : '',
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
  // Aviso de pedido repetido: mesmo cliente, mesmo dia, outro pedido ativo.
  // Não bloqueia (o cliente pode pedir duas vezes), mas exige um toque a mais.
  // Ao editar um pedido existente, não avisa.
  const effectiveDue = deliveredAt ?? due;
  const dupKey =
    step === REVIEW && !id && customer?.id && effectiveDue
      ? customer.id + '|' + effectiveDue.slice(0, 10)
      : '';
  const [dupFound, setDupFound] = useState<{
      key: string;
      orders: OperationalOrder[];
    } | null>(null),
    [dupAckKey, setDupAckKey] = useState('');
  useEffect(() => {
    if (!dupKey) return;
    const [customerId, day] = dupKey.split('|');
    let alive = true;
    api<{ orders: OperationalOrder[] }>('today?date=' + day)
      .then((view) => {
        if (alive)
          setDupFound({
            key: dupKey,
            orders: view.orders.filter(
              (o) =>
                o.customer_id === customerId &&
                o.status !== 'cancelled' &&
                fortalezaDay(new Date(o.due_at)) === day,
            ),
          });
      })
      // Sem a consulta, segue sem aviso: nunca impede o pedido.
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [dupKey]);
  const sameDay = dupKey && dupFound?.key === dupKey ? dupFound.orders : [],
    sameDayAck = !!dupKey && dupAckKey === dupKey,
    sameDayBlocks = sameDay.length > 0 && !sameDayAck;
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
        const savedKits = o.items.filter(
          (i) => i.kit_id,
        ) as unknown as KitItemSnapshot[];
        setKitEditing(false);
        setKitSnapshots(savedKits);
        setKitItems(savedKits.map(kitSnapshotInput));
        o = { ...o, items: o.items.filter((i) => !i.kit_id) };
        setEditing(o);
        setExchangeUnits(o.exchange_units ?? 0);
        setCustomer({ id: o.customer_id, name: o.customer_name });
        setCounts(
          Object.fromEntries(
            o.items
              .filter((i) => !i.components?.length)
              .map((i) => [i.variant_id, i.quantity]),
          ),
        );
        setMixes(
          o.items
            .filter((i) => i.components?.length)
            .map((i) => {
              const comp = Object.fromEntries(
                i.components!.map((c) => [c.variant_id, c.units]),
              );
              return {
                key: mixSig(comp),
                item_id: i.id,
                base: i.variant_id,
                comp,
                qty: i.quantity,
              };
            }),
        );
        setDue(
          new Date(Date.parse(o.due_at) - 10800000).toISOString().slice(0, 16),
        );
        setNotes(o.notes);
        setOccasion(o.occasion ?? '');
        const payer = await api<{ customer_type?: CustomerType }>(
          'customers/' + o.customer_id,
        );
        if (!current) return;
        setCustomer({
          id: o.customer_id,
          name: o.customer_name,
          customer_type: customerType(payer),
        });
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
  }, [id, financial, setDue]);
  function applyPlanItems(items: Plan['items'], kits: KitItemInput[] = []) {
    setExchangeUnits(0);
    setKitItems(
      kits.map((i) => ({
        ...i,
        components: i.components.map((c) => ({ ...c })),
      })),
    );
    setKitSnapshots([]);
    setCounts(
      Object.fromEntries(
        items
          .filter((i) => !i.components?.length)
          .map((i) => [i.variant_id, i.quantity]),
      ),
    );
    setMixes(
      items
        .filter((i) => i.components?.length)
        .map((i) => {
          const comp = Object.fromEntries(
            i.components!.map((c) => [c.variant_id, c.units]),
          );
          return {
            key: mixSig(comp),
            base: i.variant_id,
            comp,
            qty: i.quantity,
          };
        }),
    );
  }
  function plan(p: Plan) {
    applyPlanItems(p.items, p.kit_items);
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
    setKitEditing(false);
    setCustomer(c);
    setExchangeUnits(0);
    setKitItems([]);
    setKitSnapshots([]);
    setCounts({});
    setMixes([]);
    setDefaults(null);
    setDue('');
    setPlanDue('');
    setNotes('');
    setOccasion('');
    setStep(1);
    setBusy(true);
    setError('');
    try {
      const d = await api<Defaults>('mobile/defaults/' + c.id + '?kits=1');
      if (serial !== choice.current || !mounted.current) return false;
      setDefaults(d);
      const currentSite = field?.data?.sites.find((s) => s.id === c.id);
      setAddress(
        currentSite
          ? deliveryAddress(currentSite.data)
          : [d.profile.address, d.profile.neighborhood, d.profile.reference]
              .filter(Boolean)
              .join(' '),
      );
      setCourier(d.profile.courier);
      setCourierName(d.profile.courier_name);
      setFee(d.profile.courier_fee_cents);
      setTerms(
        customerType(d) === 'person' && d.profile.terms.mode === 'credit'
          ? emptyTerms()
          : d.profile.terms,
      );
      const valid = d.plans.filter((p) => p.valid);
      const nearest = [...valid].sort(
        (a, b) =>
          nextWeeklyTime(a.weekday, a.time).localeCompare(
            nextWeeklyTime(b.weekday, b.time),
          ) || a.id.localeCompare(b.id),
      )[0];
      if (nearest) plan(nearest);
      else {
        const hour = windowStart(d.profile.delivery_window);
        if (hour) setDue(fortalezaDay() + 'T' + hour);
      }
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      if (serial === choice.current && mounted.current) setBusy(false);
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
          alcohol: containsAlcohol(
            v.photo_key || p.photo_key,
            p.name,
            p.description,
            v.label,
          ),
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
        units_per_box: i.units_per_box,
        product_name: i.product_name,
        photo_key: null,
        alcohol: containsAlcohol(null, i.product_name, i.variant_label),
      })) ?? [];
  const all = [...options, ...historical],
    selected = all.filter((v) => counts[v.id] > 0),
    price = (v: (typeof all)[number]) =>
      editing?.items.find((i) => i.variant_id === v.id && !i.components?.length)
        ?.unit_price_cents ?? v.price_cents,
    mixPrice = (m: Mix) =>
      editing?.items.find((i) => i.id === m.item_id)?.unit_price_cents ??
      all.find((v) => v.id === m.base)?.price_cents ??
      0,
    // Caixa Mista só junta sabores da mesma embalagem (unidades e peso).
    mixOptions =
      Object.values(
        options.reduce<Record<string, typeof options>>((g, v) => {
          if (!v.units_per_box || v.units_per_box < 2) return g;
          const k = `${v.units_per_box}|${v.weight_grams ?? ''}`;
          (g[k] ??= []).push(v);
          return g;
        }, {}),
      ).sort((a, b) => b.length - a.length)[0] ?? [],
    capacity = mixOptions[0]?.units_per_box ?? 12,
    hasItems = selected.length > 0 || mixes.length > 0 || kitItems.length > 0,
    boxCount =
      selected.reduce((n, v) => n + counts[v.id], 0) +
      mixes.reduce((n, m) => n + m.qty, 0) +
      kitItems.reduce((n, i) => n + i.quantity, 0),
    validDue =
      !!scheduleDay(due.slice(0, 10)) &&
      due.slice(0, 10) >= fortalezaDay() &&
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(due.slice(11, 16)),
    swap = exchangePreview(
      [
        ...selected.map((v) => ({
          id: v.id,
          units:
            counts[v.id] *
            (editing?.items.find(
              (item) => item.variant_id === v.id && !item.components?.length,
            )?.units_per_box ??
              v.units_per_box ??
              1),
          cents: counts[v.id] * price(v),
        })),
        ...mixes.map((m) => ({
          id: m.key,
          units: m.qty * Object.values(m.comp).reduce((sum, n) => sum + n, 0),
          cents: m.qty * mixPrice(m),
        })),
      ],
      orderExchange ? exchangeUnits : 0,
    ),
    deliveredUnits =
      swap.eligible +
      kitItems.reduce(
        (sum, item) =>
          sum +
          item.quantity *
            item.components.reduce((n, component) => n + component.units, 0),
        0,
      ),
    gross =
      selected.reduce((n, v) => n + counts[v.id] * price(v), 0) +
      mixes.reduce((n, m) => n + m.qty * mixPrice(m), 0) +
      kitItems.reduce(
        (n, i) =>
          n +
          i.quantity * (kitItemPrice(i, kitCatalog.kits, kitSnapshots) ?? 0),
        0,
      ),
    total = gross - swap.discount,
    flavorName = (id: string) => {
      const v = all.find((x) => x.id === id);
      if (!v) return 'Sabor';
      const siblings = options.filter((o) => o.product_name === v.product_name);
      return siblings.length > 1 ? v.label : v.product_name;
    },
    mixText = (comp: Record<string, number>) =>
      Object.entries(comp)
        .filter(([, u]) => u > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([id, u]) => `${u} ${flavorName(id)}`)
        .join(' + ');
  function packagingName(id: string, fallback: string) {
    const units = options.find((v) => v.id === id)?.units_per_box;
    return units ? `Caixa ${units} un.` : fallback;
  }
  function saveMix() {
    if (!mixDraft) return;
    const comp = Object.fromEntries(
      Object.entries(mixDraft.comp).filter(([, u]) => u > 0),
    );
    const key = mixSig(comp);
    let next = mixes.filter((m) => m.key !== mixDraft.editing);
    const old = mixes.find((m) => m.key === mixDraft.editing);
    const same = next.find((m) => m.key === key);
    if (same)
      next = next.map((m) =>
        m.key === key
          ? { ...m, qty: Math.min(10000, m.qty + mixDraft.qty) }
          : m,
      );
    else
      next = [
        ...next,
        {
          key,
          item_id: old?.item_id,
          base: old?.item_id ? old.base : mixBase(comp),
          comp,
          qty: mixDraft.qty,
        },
      ];
    setMixes(next);
    setMixDraft(null);
  }
  async function confirmOrder() {
    if (pending.current || !customer || kitEditing || sameDayBlocks) return;
    if (
      deliveredAt === null &&
      !id &&
      isPastToday(due) &&
      !schedule.pastConfirmed
    ) {
      setClock(readTime());
      setStep(WHEN);
      return;
    }
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
      if (deliveredAt === null && !validDue)
        throw Error('Escolha uma data a partir de hoje e um horário válido.');
      const completed =
        deliveredAt === null ? null : new Date(deliveredAt + ':00-03:00');
      if (
        completed &&
        (!Number.isFinite(completed.getTime()) ||
          completed.getTime() > readTime())
      )
        throw Error('Informe uma data e hora de entrega que já passaram.');
      if (
        terms.mode === 'credit' &&
        terms.due_day_of_month != null &&
        (terms.due_day_of_month < 1 || terms.due_day_of_month > 31)
      )
        throw Error('Informe um dia de vencimento de 1 a 31.');
      const data = {
          customer_id: customer.id,
          ...(orderExchange ? { exchange_units: swap.collected } : {}),
          occasion: metadata ? occasion : undefined,
          ...(editing ? { version: editing.version } : {}),
          due_at:
            completed?.toISOString() ??
            new Date(due + ':00-03:00').toISOString(),
          ...(completed ? { delivered_at: completed.toISOString() } : {}),
          ...(completed && receiptMethod
            ? {
                receipt: {
                  amount_cents: receiptAmount ?? 0,
                  method: receiptMethod,
                  paid_on: receiptDay || effectiveDue.slice(0, 10),
                },
              }
            : {}),
          notes,
          items: [
            ...selected.map((v) => ({
              variant_id: v.id,
              quantity: counts[v.id],
            })),
            ...mixes.map((m) => ({
              ...(m.item_id ? { item_id: m.item_id } : {}),
              variant_id: m.base,
              quantity: m.qty,
              components: Object.entries(m.comp).map(([variant_id, units]) => ({
                variant_id,
                units,
              })),
            })),
          ],
          kit_items: kitItems,
          composition_version: 1 as const,
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
              // Endereço novo digitado no pedido: a localização antiga do
              // cadastro deixa de valer, para o mapa não levar a outro lugar.
              data: {
                ...(site?.data ?? emptyPlace()),
                address: address.trim(),
                latitude: null,
                longitude: null,
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
      clearDraft(draftScope);
      setSuccess(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function restoreSelection() {
    const d = resumeDraft;
    if (
      !d ||
      d.order_id !== (id ?? null) ||
      !products.data ||
      kitCatalog.loading ||
      (id && editing?.id !== id) ||
      restoring.current
    )
      return;
    restoring.current = true;
    const sourceRaw = storedRaw;
    setBusy(true);
    setError('');
    try {
      const c = await api<{ id: string; name: string; active: number }>(
        'customers/' + d.customer_id,
      );
      if (!mounted.current || draftRaw(draftScope) !== sourceRaw) return;
      if (!c.active || (editing && editing.customer_id !== c.id))
        throw Error('Cliente indisponível para esta seleção.');
      const variants = new Map(options.map((v) => [v.id, v]));
      const valid = d.items.every((i) => {
        const base = variants.get(i.variant_id);
        if (
          !base ||
          (i.item_id && id && !editing?.items.some((x) => x.id === i.item_id))
        )
          return false;
        if (!i.components) return true;
        return (
          mixed &&
          new Set(i.components.map((c) => c.variant_id)).size ===
            i.components.length &&
          i.components.some((c) => c.variant_id === i.variant_id) &&
          i.components.every((c) => {
            const v = variants.get(c.variant_id);
            return (
              v &&
              v.units_per_box === base.units_per_box &&
              v.weight_grams === base.weight_grams
            );
          }) &&
          i.components.reduce((n, c) => n + c.units, 0) === base.units_per_box
        );
      });
      const validKits = d.kit_items.every((i) => {
        const k = kitCatalog.kits.find((k) => k.id === i.kit_id && k.active);
        return (
          kitOrders &&
          k &&
          (!i.item_id || !id || kitSnapshots.some((x) => x.id === i.item_id)) &&
          new Set(i.components.map((c) => c.product_id)).size ===
            i.components.length &&
          i.components.reduce((n, c) => n + c.units, 0) === k.units_per_kit &&
          (!kitCatalog.limit || i.components.length <= k.max_flavors) &&
          i.components.every((c) =>
            products.data!.some((p) => p.id === c.product_id),
          )
        );
      });
      if (!valid || !validKits)
        throw Error(
          'A seleção contém sabores ou kits indisponíveis. Descarte e monte novamente com o cadastro atual.',
        );
      if (!id && !(await select(c))) {
        return;
      }
      if (!mounted.current || draftRaw(draftScope) !== sourceRaw) return;
      claimDraft(sourceRaw);
      setCounts(
        Object.fromEntries(
          d.items
            .filter((i) => !i.components?.length)
            .map((i) => [i.variant_id, i.quantity]),
        ),
      );
      setMixes(
        d.items
          .filter((i) => i.components?.length)
          .map((i) => {
            const comp = Object.fromEntries(
              i.components!.map((c) => [c.variant_id, c.units]),
            );
            return {
              key: mixSig(comp),
              base: i.variant_id,
              qty: i.quantity,
              comp,
              item_id: i.item_id,
            };
          }),
      );
      setKitItems(d.kit_items);
      setExchangeUnits(d.exchange_units ?? 0);
      // Snapshots do pedido editado foram relidos do servidor; não vêm do storage.
      if (!id) setKitSnapshots([]);
      setDue('');
      setPlanDue('');
      if (!id) {
        setNotes('');
        setOccasion('');
      }
      setDupAckKey('');
      setDupFound(null);
      setStep(1);
      setResumeNotice(
        'Seleção recuperada. Confira quantidades, data, entrega e pagamento. Textos e valores não foram guardados.',
      );
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      restoring.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const restoreReady =
    !!products.data && !kitCatalog.loading && (!id || editing?.id === id);
  const autoResume = search.get('retomar') === '1';
  const restoreAutomatically = useEffectEvent(() => void restoreSelection());
  useEffect(() => {
    if (
      !autoResume ||
      busy ||
      !restoreReady ||
      !resumeDraft ||
      resumeDraft.order_id !== (id ?? null)
    )
      return;
    const attempt = draftScope + ':' + storedRaw;
    if (autoAttempt.current === attempt) return;
    autoAttempt.current = attempt;
    restoreAutomatically();
  }, [autoResume, busy, restoreReady, resumeDraft, id, draftScope, storedRaw]);
  async function removeItem(name: string, update: () => void, last: boolean) {
    if (
      busy ||
      !(await askConfirmation('Remover ' + name + ' do pedido?', 'Remover'))
    )
      return;
    update();
    if (last) setStep(1);
  }
  if (success)
    return (
      <section className="panel order-success">
        <Mascot size={120} className="mascot-wave" />
        <h1>
          {deliveredAt
            ? 'Pedido registrado como entregue'
            : 'Pedido confirmado'}
        </h1>
        <p>
          {customer?.name} · {money(total)}
        </p>
        <p>
          {deliveryDayLabel(effectiveDue.slice(0, 10))} ·{' '}
          {effectiveDue.slice(11, 16)} · {boxCount}{' '}
          {boxCount === 1 ? 'caixa' : 'caixas'}
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
          <Button className="button" to={`/gestao?day=${due.slice(0, 10)}`}>
            Ver na agenda de{' '}
            {deliveryDayLabel(due.slice(0, 10)).toLocaleLowerCase('pt-BR')}
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
      {resumeDraft && resumeDraft.order_id === (id ?? null) && (
        <aside className="panel draft-notice" aria-label="Recuperar seleção">
          <p>
            Uma seleção anterior foi guardada nesta aba. Recupere e revise antes
            de enviar.
          </p>
          <div className="actions">
            <Button
              disabled={
                busy ||
                !products.data ||
                kitCatalog.loading ||
                (!!id && editing?.id !== id)
              }
              onClick={() => void restoreSelection()}
            >
              Recuperar seleção
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                suppressedDraft.current = JSON.stringify(draftPayload);
                claimDraft('');
                clearDraft(draftScope);
              }}
            >
              Descartar seleção
            </Button>
          </div>
        </aside>
      )}
      {resumeNotice && <p role="status">{resumeNotice}</p>}
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
              step === 0
                ? // Volta para onde estava (ex.: Hoje pelo +); aberto direto
                  // pelo endereço, vai para a lista de pedidos.
                  location.key !== 'default'
                  ? navigate(-1)
                  : navigate('/gestao/pedidos')
                : setStep(step - 1)
            }
            disabled={busy || kitEditing}
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
          <h2 className="wizard-question">Escolha o cliente</h2>
          <label>
            Buscar cliente
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Button
            to="/gestao/clientes"
            variant="ghost"
            className="ghost-inline"
          >
            Cadastrar novo cliente
          </Button>
          <h2>Lista de clientes</h2>
          {!customers.data && !customers.error && (
            <SkeletonList label="Carregando clientes…" />
          )}
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
        </>
      )}
      {step === 1 && (
        <>
          <h2 className="totem-customer">{customer?.name}</h2>
          {(!products.data || kitCatalog.loading) &&
            !products.error &&
            !kitCatalog.error && (
              <SkeletonList
                label="Carregando sabores…"
                kind="flavor"
                count={4}
                grid
              />
            )}
          <p className="totem-hint">
            {kitCatalog.kits.length
              ? 'Escolha o kit e os sabores'
              : 'Escolha os sabores'}
          </p>
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
                applyPlanItems(defaults.last!.items, defaults.last!.kit_items);
                setNotes(defaults.last!.notes);
              }}
            >
              Repetir último pedido
            </Button>
          )}
          {(kitCatalog.kits.length > 0 || kitItems.length > 0) && (
            <KitItemsEditor
              key={`${id ?? 'novo'}-${customer?.id ?? ''}`}
              value={kitItems}
              onChange={setKitItems}
              snapshots={kitSnapshots}
              kits={kitCatalog.kits}
              products={sortFlavors(
                products.data ?? [],
                defaults?.ranking,
                readFlavorOrder(),
                defaults?.product_order,
              )}
              limit={kitCatalog.limit}
              mixed={defaults?.mixed ?? mixed}
              quickMode={
                customerType(defaults ?? customer) !== 'person' &&
                selected.length === 0 &&
                mixes.length === 0
              }
              defaultKitId={defaults?.profile.default_kit_id}
              disabled={busy}
              onEditingChange={setKitEditing}
            />
          )}
          {kitCatalog.error && <Failure message={kitCatalog.error} />}
          <LegacyItemsSection
            expanded={selected.length > 0 || mixes.length > 0}
            folded={
              kitCatalog.kits.some((k) => !!k.active) || kitItems.length > 0
            }
          >
            <div className="flavor-grid">
              {defaults?.mixed && mixOptions.length > 1 && (
                <article
                  className={`flavor-card mix-card${mixes.length ? ' is-selected' : ''}`}
                >
                  <Button
                    className="flavor-add"
                    disabled={busy}
                    aria-label="Montar Caixa Mista com sabores variados"
                    onClick={() => setMixDraft({ comp: {}, qty: 1 })}
                  >
                    {mixOptions.some((v) => v.photo_key) ? (
                      <span className="mix-mosaic" aria-hidden="true">
                        {mixOptions
                          .filter((v) => v.photo_key)
                          .slice(0, 4)
                          .map((v) => (
                            <img
                              key={v.id}
                              src={photoURL(v.photo_key!)}
                              alt=""
                            />
                          ))}
                      </span>
                    ) : (
                      <span className="mix-mosaic no-photos" aria-hidden="true">
                        {capacity}
                      </span>
                    )}
                    <strong>Caixa Mista</strong>
                    <span className="mix-card-hint">
                      Escolha os {capacity} sabores
                    </span>
                    {mixes.length > 0 && (
                      <b
                        className="quantity-badge"
                        aria-label="Caixas Mistas adicionadas"
                      >
                        {mixes.reduce((n, m) => n + m.qty, 0)}
                      </b>
                    )}
                  </Button>
                </article>
              )}
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
                        aria-label={`${title}, ${count ? count + (count === 1 ? ' embalagem, ' : ' embalagens, ') : ''}adicionar`}
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
                          <NoPhoto />
                        )}
                        <span className="flavor-name">
                          <strong>{title}</strong>
                          {containsAlcohol(
                            key,
                            p.name,
                            p.description,
                            v.label,
                          ) && <AlcoholTag />}
                        </span>
                        <span>
                          {money(
                            price({
                              ...v,
                              product_name: p.name,
                              photo_key: key,
                              alcohol: false,
                            }),
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
            {mixes.map((m) => (
              <article className="panel mix-line" key={m.key}>
                <div>
                  <h3>Caixa Mista</h3>
                  <p>{mixText(m.comp)}</p>
                </div>
                <div className="flavor-stepper">
                  <Button
                    type="button"
                    aria-label="Menos Caixas Mistas iguais"
                    onClick={() =>
                      setMixes(
                        m.qty > 1
                          ? mixes.map((x) =>
                              x.key === m.key ? { ...x, qty: x.qty - 1 } : x,
                            )
                          : mixes.filter((x) => x.key !== m.key),
                      )
                    }
                  >
                    −
                  </Button>
                  <b>{m.qty} cx</b>
                  <Button
                    type="button"
                    aria-label="Mais Caixas Mistas iguais"
                    onClick={() =>
                      setMixes(
                        mixes.map((x) =>
                          x.key === m.key ? { ...x, qty: x.qty + 1 } : x,
                        ),
                      )
                    }
                  >
                    +
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setMixDraft({
                      comp: { ...m.comp },
                      editing: m.key,
                      qty: m.qty,
                    })
                  }
                >
                  Editar sabores
                </Button>
              </article>
            ))}
            {mixDraft && (
              <div
                className="mix-sheet"
                role="dialog"
                aria-modal="true"
                aria-label="Montar Caixa Mista"
              >
                <div className="mix-sheet-body">
                  <p className="order-section-label">
                    Caixa com {capacity} ·{' '}
                    {money(mixOptions[0]?.price_cents ?? 0)}
                  </p>
                  <h2 className="wizard-question">Montar Caixa Mista</h2>
                  {(() => {
                    const used = Object.values(mixDraft.comp).reduce(
                        (a, b) => a + b,
                        0,
                      ),
                      slots: (string | null)[] = [];
                    for (const [id, u] of Object.entries(mixDraft.comp))
                      for (let k = 0; k < u; k++) slots.push(id);
                    while (slots.length < capacity) slots.push(null);
                    const left = capacity - used;
                    return (
                      <>
                        <div className="box-slots" aria-hidden="true">
                          {slots.map((id, k) => {
                            const key = id
                              ? all.find((v) => v.id === id)?.photo_key
                              : null;
                            return id && key ? (
                              <img key={k} src={photoURL(key)} alt="" />
                            ) : (
                              <i
                                key={k}
                                className={
                                  id
                                    ? `filled tone-${mixOptions.findIndex((v) => v.id === id) % 5}`
                                    : ''
                                }
                              />
                            );
                          })}
                        </div>
                        <p
                          className={`mix-left${left ? '' : ' done'}`}
                          role="status"
                        >
                          {left
                            ? `Faltam ${left} de ${capacity}`
                            : 'Caixa completa ✓'}
                        </p>
                        {mixOptions.map((v) => {
                          const u = mixDraft.comp[v.id] ?? 0;
                          return (
                            <div className="mix-row" key={v.id}>
                              {v.photo_key ? (
                                <img src={photoURL(v.photo_key)} alt="" />
                              ) : (
                                <i
                                  className={`mix-dot tone-${mixOptions.indexOf(v) % 5}`}
                                />
                              )}
                              <span className="flavor-name">
                                {flavorName(v.id)}
                                {v.alcohol && <AlcoholTag />}
                              </span>
                              <div className="flavor-stepper">
                                <Button
                                  type="button"
                                  aria-label={'Menos ' + flavorName(v.id)}
                                  disabled={!u}
                                  onClick={() =>
                                    setMixDraft({
                                      ...mixDraft,
                                      comp: { ...mixDraft.comp, [v.id]: u - 1 },
                                    })
                                  }
                                >
                                  −
                                </Button>
                                <b>{u} un.</b>
                                <Button
                                  type="button"
                                  aria-label={'Mais ' + flavorName(v.id)}
                                  disabled={!left}
                                  onClick={() =>
                                    setMixDraft({
                                      ...mixDraft,
                                      comp: { ...mixDraft.comp, [v.id]: u + 1 },
                                    })
                                  }
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        <div className="mix-draft-actions">
                          <Button
                            variant="chip"
                            onClick={() =>
                              setMixDraft({ ...mixDraft, comp: {} })
                            }
                          >
                            Limpar
                          </Button>
                          <QuantityInput
                            showCommitButton={false}
                            aria-label="Caixas Mistas iguais"
                            value={mixDraft.qty}
                            min={1}
                            max={10000}
                            onValueChange={(qty) =>
                              setMixDraft({ ...mixDraft, qty })
                            }
                          />
                          {used > 0 && left > 0 && (
                            <Button
                              variant="chip"
                              onClick={() => {
                                const first = Object.entries(
                                  mixDraft.comp,
                                ).find(([, x]) => x > 0)![0];
                                setMixDraft({
                                  ...mixDraft,
                                  comp: {
                                    ...mixDraft.comp,
                                    [first]: mixDraft.comp[first] + left,
                                  },
                                });
                              }}
                            >
                              Completar com{' '}
                              {flavorName(
                                Object.entries(mixDraft.comp).find(
                                  ([, x]) => x > 0,
                                )![0],
                              )}
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="primary"
                          className="primary-action"
                          disabled={left !== 0}
                          onClick={saveMix}
                        >
                          {mixDraft.editing
                            ? 'Salvar Caixa Mista'
                            : 'Adicionar Caixa Mista'}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setMixDraft(null)}
                        >
                          Cancelar
                        </Button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
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
          </LegacyItemsSection>
          {orderExchange && hasItems && (
            <ExchangeEditor
              quantity={swap.collected}
              limit={swap.eligible}
              onChange={setExchangeUnits}
            />
          )}
          <ExchangeSummary
            delivered={deliveredUnits}
            collected={swap.collected}
            discount={swap.discount}
            total={total}
          />
        </>
      )}
      {step === WHEN && (
        <>
          <h2 className="wizard-question">Quando entregar?</h2>
          <p className="review-customer">
            <strong>Cliente: {customer?.name}</strong>
          </p>
          <h3 className="order-section-label">Dia</h3>
          <div
            className="chips"
            role="group"
            aria-label="Atalhos de data do pedido"
          >
            {[
              ['Hoje', fortalezaDay()],
              ['Amanhã', shiftDay(fortalezaDay(), 1)],
            ].map(([label, day]) => (
              <Button
                key={label}
                variant="chip"
                aria-pressed={due.slice(0, 10) === day}
                onClick={() =>
                  setDue(
                    day +
                      'T' +
                      (due.slice(11, 16) ||
                        new Date(Date.now() - 10800000)
                          .toISOString()
                          .slice(11, 16)),
                  )
                }
              >
                {label}
              </Button>
            ))}
            <DayCalendar
              day={
                due.slice(0, 10) >= fortalezaDay()
                  ? due.slice(0, 10)
                  : fortalezaDay()
              }
              minimum={fortalezaDay()}
              label={
                due &&
                ![fortalezaDay(), shiftDay(fortalezaDay(), 1)].includes(
                  due.slice(0, 10),
                )
                  ? deliveryDayLabel(due.slice(0, 10))
                  : 'Escolher data'
              }
              pressed={
                !!due &&
                ![fortalezaDay(), shiftDay(fortalezaDay(), 1)].includes(
                  due.slice(0, 10),
                )
              }
              onSelect={(day) =>
                setDue(
                  day +
                    'T' +
                    (due.slice(11, 16) ||
                      new Date(Date.now() - 10800000)
                        .toISOString()
                        .slice(11, 16)),
                )
              }
            />
          </div>
          {planDue && (
            <p className="muted">
              Sugestão do pedido padrão:{' '}
              {deliveryDayLabel(planDue.slice(0, 10))} · {planDue.slice(11, 16)}
              . Você pode alterar.
            </p>
          )}
          {!planDue &&
            defaults &&
            windowStart(defaults.profile.delivery_window) && (
              <p className="muted">
                Horário sugerido pela janela do cliente. Você pode alterar.
              </p>
            )}
          <h3 className="order-section-label">Horário</h3>
          <div className="chips" role="group" aria-label="Atalhos de horário">
            {['09:00', '14:00', '18:00'].map((h) => (
              <Button
                key={h}
                className={
                  !id &&
                  isPastToday(
                    (due.slice(0, 10) || fortalezaDay(new Date(clock))) +
                      'T' +
                      h,
                    new Date(clock),
                  )
                    ? 'past-time-chip'
                    : undefined
                }
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
          <label className="custom-time-chip">
            Outro horário
            <input
              type="time"
              value={due.slice(11, 16)}
              required
              onChange={(e) =>
                setDue(
                  (due.slice(0, 10) || fortalezaDay()) + 'T' + e.target.value,
                )
              }
            />
          </label>
          <details>
            <summary>Digitar data e horário</summary>
            <label>
              Outro dia ou horário
              <input
                type="datetime-local"
                min={fortalezaDay() + 'T00:00'}
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
          </details>
          {pastDue && (
            <section
              className="past-time-notice"
              aria-label="Horário que já passou"
            >
              <p role="alert">
                Esse horário de hoje já passou. É um pedido que já foi entregue?
              </p>
              <Button
                type="button"
                variant="chip"
                aria-pressed={schedule.pastConfirmed}
                onClick={() =>
                  setSchedule((s) => ({ ...s, pastConfirmed: true }))
                }
              >
                Sim, registrar mesmo assim
              </Button>
            </section>
          )}
          {due && !validDue && (
            <p role="alert">
              Escolha uma data a partir de hoje e um horário válido.
            </p>
          )}
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
            {courierChoices(sharedDelivery).map((c) => (
              <AvatarChip
                key={c}
                aria-pressed={courier === c}
                onClick={() => setCourier(c)}
                avatar={
                  c === 'owner' || c === 'partner' || c === 'both' ? (
                    <CourierAvatars courier={c} />
                  ) : c === 'courier' ? (
                    <span className="courier-initials" aria-hidden="true">
                      M
                    </span>
                  ) : null
                }
              >
                {courierLabels[c]}
              </AvatarChip>
            ))}
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
          <div className="order-section-head">
            <h3 className="order-section-label">Pagamento</h3>
            <HelpTip topic="orderPayment" />
          </div>
          <div className="chips" aria-label="Condição de pagamento">
            {(
              [
                'unset',
                'advance',
                'delivery',
                'next_delivery',
                'credit',
              ] as const
            )
              .filter(
                (mode) =>
                  customerType(defaults ?? customer) !== 'person' ||
                  mode === 'advance' ||
                  mode === 'delivery' ||
                  mode === 'next_delivery',
              )
              .map((mode) => (
                <Button
                  key={mode}
                  aria-pressed={terms.mode === mode}
                  onClick={() =>
                    setTerms(
                      mode === 'credit' &&
                        defaults?.profile.terms.mode === 'credit'
                        ? defaults.profile.terms
                        : setTermsMode(terms, mode),
                    )
                  }
                >
                  {paymentModeLabels[mode]}
                </Button>
              ))}
          </div>
          {terms.mode === 'credit' && (
            <>
              <div className="order-section-head">
                <h3 className="order-section-label">Fechamento</h3>
                <HelpTip topic="closing" />
              </div>
              <div className="chips" role="group" aria-label="Fechamento">
                {(
                  [
                    ['weekly', 'Semanal'],
                    ['fixed_days', 'Quinzenal (dia 15 e fim do mês)'],
                    ['monthly', 'Mensal'],
                    ['deliveries', 'A cada X entregas'],
                  ] as const
                ).map(([cycle, label]) => (
                  <Button
                    key={cycle}
                    variant="chip"
                    aria-pressed={terms.cycle === cycle}
                    onClick={() =>
                      setTerms(
                        setTermsCycle(
                          cycle === 'fixed_days'
                            ? { ...terms, fixed_days: [15, 31] }
                            : terms,
                          cycle,
                        ),
                      )
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {terms.cycle === 'deliveries' ? (
                <DeliveryCycleEditor value={terms} onChange={setTerms} />
              ) : (
                <>
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
                        aria-pressed={
                          terms.due_day_of_month == null &&
                          terms.due_days === days
                        }
                        onClick={() =>
                          setTerms({
                            ...terms,
                            due_days: days,
                            due_day_of_month: undefined,
                          })
                        }
                      >
                        {label}
                      </Button>
                    ))}
                    <Button
                      variant="chip"
                      aria-pressed={terms.due_day_of_month != null}
                      onClick={() =>
                        setTerms({
                          ...terms,
                          due_days: null,
                          due_day_of_month: terms.due_day_of_month ?? 10,
                        })
                      }
                    >
                      Dia do mês
                    </Button>
                  </div>
                  {terms.due_day_of_month != null && (
                    <label>
                      Dia de vencimento (31 = último dia)
                      <input
                        type="number"
                        min={1}
                        max={31}
                        required
                        value={terms.due_day_of_month || ''}
                        onChange={(e) =>
                          setTerms({
                            ...terms,
                            due_day_of_month: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                </>
              )}
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
          <p className="review-customer">
            <strong>Cliente: {customer?.name}</strong>
          </p>
          {sameDay.length > 0 && (
            <div className="same-day-warning" role="alert">
              <p>
                <strong>
                  Já existe {sameDay.length === 1 ? 'um pedido' : 'pedidos'}{' '}
                  para {customer?.name} neste dia
                </strong>
              </p>
              <ul>
                {sameDay.map((o) => (
                  <li key={o.id}>
                    {o.number ? '#' + o.number + ' · ' : ''}
                    {new Intl.DateTimeFormat('pt-BR', {
                      timeStyle: 'short',
                      timeZone: 'America/Fortaleza',
                    }).format(new Date(o.due_at))}{' '}
                    · {money(o.total_cents)} ·{' '}
                    <Button to={'/gestao/pedidos/' + o.id} variant="ghost">
                      Ver esse pedido
                    </Button>
                  </li>
                ))}
              </ul>
              {sameDayAck ? (
                <p>Ok, este será um pedido a mais.</p>
              ) : (
                <Button onClick={() => setDupAckKey(dupKey)}>
                  É outro pedido, confirmar mesmo assim
                </Button>
              )}
            </div>
          )}
          {kitItems.map((item, index) => {
            const snapshot = kitSnapshots.find(
                (s) =>
                  s.id === item.item_id &&
                  kitCompositionKey(s) === kitCompositionKey(item),
              ),
              catalog = kitCatalog.kits.find((k) => k.id === item.kit_id),
              display = snapshot ?? catalog;
            const names = item.components
              .map(
                (c) =>
                  `${c.units} ${snapshot?.components.find((p) => p.product_id === c.product_id)?.product_name ?? products.data?.find((p) => p.id === c.product_id)?.name ?? 'Sabor indisponível'}`,
              )
              .join(' + ');
            return (
              <article className="review-line" key={item.item_id ?? index}>
                <div>
                  <h3>{display ? kitLabel(display) : 'Kit indisponível'}</h3>
                  <p>{names}</p>
                  {item.components.some(
                    (c) =>
                      snapshot?.components.find(
                        (x) => x.product_id === c.product_id,
                      )?.contains_alcohol ||
                      containsAlcohol(
                        products.data?.find((p) => p.id === c.product_id)
                          ?.photo_key,
                        products.data?.find((p) => p.id === c.product_id)?.name,
                        products.data?.find((p) => p.id === c.product_id)
                          ?.description,
                      ),
                  ) && <AlcoholTag />}
                  <QuantityInput
                    disabled={busy}
                    showCommitButton={false}
                    label="Quantos kits iguais"
                    aria-label={
                      'Revisar quantidade de ' +
                      (display ? kitLabel(display) : 'kit indisponível')
                    }
                    value={item.quantity}
                    removeLabel={
                      'Remover ' +
                      (display ? kitLabel(display) : 'kit indisponível')
                    }
                    onRemove={() =>
                      void removeItem(
                        display ? kitLabel(display) : 'kit indisponível',
                        () =>
                          setKitItems((current) =>
                            current.filter((_, n) => n !== index),
                          ),
                        selected.length + mixes.length + kitItems.length === 1,
                      )
                    }
                    min={1}
                    max={10000}
                    onValueChange={(quantity) =>
                      setKitItems(
                        kitItems.map((v, n) =>
                          n === index ? { ...v, quantity } : v,
                        ),
                      )
                    }
                  />
                  <p>
                    {money(
                      (kitItemPrice(item, kitCatalog.kits, kitSnapshots) ?? 0) *
                        item.quantity,
                    )}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(1)}
                  >
                    Alterar kit
                  </Button>
                </div>
              </article>
            );
          })}
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
                <h3>{flavorName(v.id)}</h3>
                <small className="review-packaging">
                  {packagingName(v.id, v.label)}
                </small>
                {v.alcohol && <AlcoholTag />}
                <QuantityInput
                  disabled={busy}
                  showCommitButton={false}
                  aria-label={'Revisar quantidade de ' + flavorName(v.id)}
                  value={counts[v.id]}
                  removeLabel={'Remover ' + flavorName(v.id)}
                  onRemove={() =>
                    void removeItem(
                      flavorName(v.id),
                      () =>
                        setCounts((current) => {
                          const next = { ...current };
                          delete next[v.id];
                          return next;
                        }),
                      selected.length + mixes.length + kitItems.length === 1,
                    )
                  }
                  onValueChange={(n) => setCounts({ ...counts, [v.id]: n })}
                />
                <p>{money(price(v) * counts[v.id])}</p>
              </div>
            </article>
          ))}
          {mixes.map((m) => (
            <article className="review-line" key={m.key}>
              <div>
                <h3>Caixa Mista</h3>
                <small className="review-packaging">
                  Caixa {Object.values(m.comp).reduce((n, u) => n + u, 0)} un.
                </small>
                <p>{mixText(m.comp)}</p>
                <QuantityInput
                  disabled={busy}
                  showCommitButton={false}
                  aria-label="Revisar quantidade de Caixa Mista"
                  value={m.qty}
                  removeLabel="Remover Caixa Mista"
                  onRemove={() =>
                    void removeItem(
                      'Caixa Mista',
                      () =>
                        setMixes((current) =>
                          current.filter((x) => x.key !== m.key),
                        ),
                      selected.length + mixes.length + kitItems.length === 1,
                    )
                  }
                  onValueChange={(qty) =>
                    setMixes(
                      mixes.map((x) => (x.key === m.key ? { ...x, qty } : x)),
                    )
                  }
                />
                <p>{money(m.qty * mixPrice(m))}</p>
                {Object.keys(m.comp).some(
                  (id) => all.find((v) => v.id === id)?.alcohol,
                ) && <AlcoholTag />}
              </div>
            </article>
          ))}
          {metadata && (
            <OccasionPicker value={occasion} onChange={setOccasion} />
          )}
          {occasionLabel(occasion) && <p>Ocasião: {occasionLabel(occasion)}</p>}
          <ExchangeSummary
            delivered={deliveredUnits}
            collected={swap.collected}
            discount={swap.discount}
            total={total}
          />
          <ul className="order-summary" aria-label="Resumo do pedido">
            <li>
              <span>
                <small>Quando</small>
                {effectiveDue
                  ? new Intl.DateTimeFormat('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'UTC',
                    }).format(new Date(effectiveDue + ':00Z'))
                  : 'A escolher'}
              </span>
              {deliveredAt === null && (
                <Button variant="ghost" onClick={() => setStep(WHEN)}>
                  Alterar
                </Button>
              )}
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
                  {termsModeLabel(terms)}
                  {terms.mode === 'credit' &&
                    terms.due_day_of_month != null &&
                    ' · vence no ' + dueDayLabel(terms.due_day_of_month)}
                </span>
                <Button variant="ghost" onClick={() => setStep(PAYMENT)}>
                  Alterar
                </Button>
              </li>
            )}
          </ul>
          {!id && (
            <fieldset className="panel data-form">
              <legend>Entrega realizada</legend>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={deliveredAt !== null}
                  onChange={(e) => {
                    const now = new Date();
                    const time = new Intl.DateTimeFormat('en-GB', {
                      timeZone: 'America/Fortaleza',
                      hourCycle: 'h23',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(now);
                    setDeliveredAt(
                      e.target.checked ? fortalezaDay(now) + 'T' + time : null,
                    );
                    setReceiptMethod('');
                    setReceiptDay('');
                  }}
                />
                Já foi entregue
              </label>
              {deliveredAt !== null && (
                <>
                  <label>
                    Data e hora da entrega
                    <input
                      type="datetime-local"
                      value={deliveredAt}
                      required
                      onChange={(e) => setDeliveredAt(e.target.value)}
                    />
                  </label>
                  {financial && (
                    <>
                      <label>
                        Registrar recebimento
                        <select
                          value={receiptMethod}
                          onChange={(e) => {
                            setReceiptMethod(
                              e.target.value as typeof receiptMethod,
                            );
                            setReceiptAmount(total);
                          }}
                        >
                          <option value="">Deixar a receber</option>
                          {Object.entries(paymentMethods).map(
                            ([method, label]) => (
                              <option key={method} value={method}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      {receiptMethod && (
                        <>
                          <MoneyInput
                            label="Valor recebido (R$)"
                            value={receiptAmount}
                            maxCents={total}
                            onValueChange={setReceiptAmount}
                          />
                          <label>
                            Data do recebimento
                            <input
                              type="date"
                              required
                              max={fortalezaDay()}
                              value={receiptDay || deliveredAt.slice(0, 10)}
                              onChange={(e) => setReceiptDay(e.target.value)}
                            />
                          </label>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </fieldset>
          )}
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
            {hasItems
              ? `Total ${money(total)}`
              : 'Toque nos sabores para montar o pedido'}
          </strong>
          {step < REVIEW ? (
            <Button
              className="primary-action"
              disabled={
                busy ||
                kitEditing ||
                !hasItems ||
                (step === WHEN && (!validDue || pastBlocks)) ||
                (step === PAYMENT &&
                  customerType(defaults ?? customer) === 'person' &&
                  !['advance', 'delivery', 'next_delivery'].includes(
                    terms.mode,
                  )) ||
                (step === PAYMENT &&
                  terms.due_day_of_month != null &&
                  (terms.due_day_of_month < 1 || terms.due_day_of_month > 31))
              }
              onClick={() => {
                if (
                  step === WHEN &&
                  !id &&
                  isPastToday(due) &&
                  !schedule.pastConfirmed
                ) {
                  setClock(readTime());
                  return;
                }
                setStep(step + 1);
              }}
              variant="primary"
              loading={busy}
            >
              Continuar
              {step === 1 && hasItems ? ' · ' + money(total) : ''}
            </Button>
          ) : (
            <Button
              className="primary-action"
              disabled={
                busy ||
                sameDayBlocks ||
                (!!id &&
                  (editing?.id !== id || (financial && termsLoaded !== id))) ||
                !hasItems ||
                (deliveredAt === null
                  ? !due
                  : !deliveredAt ||
                    (!!receiptMethod &&
                      (!receiptAmount || receiptAmount > total)))
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
