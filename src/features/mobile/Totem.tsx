import { useContext, useMemo } from 'react';
import { OrderDraftScope } from './order-draft-scope';
import { readDraft, storeDraft, clearDraft } from './order-draft';
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
import { alcoholNotice, containsAlcohol } from '../../../shared/alcohol';
import { DayCalendar } from '../operations/DayCalendar';
import {
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
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api, money, nextWeeklyTime } from '../api';
import {
  Failure,
  useRemote,
  type OperationalOrder,
} from '../operations/common';
import { MoneyInput, QuantityInput } from '../../components/NumericInputs';
import { photoURL } from '../../../shared/flavors';
import { deliveryAddress, emptyPlace } from '../../../shared/field';
import {
  emptyTerms,
  type B2BProfile,
  type Terms,
} from '../../../shared/finance';
import { Mascot } from '../../components/Mascot';
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
  courier: 'unassigned' | 'owner' | 'partner' | 'courier';
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
    product_name: string;
    variant_label: string;
    unit_price_cents: number;
    id?: string;
    components?: { variant_id: string; units: number }[];
  }[];
}
export function Totem({
  financial = false,
  mixed = false,
  metadata = false,
  kitOrders = false,
}: {
  financial?: boolean;
  mixed?: boolean;
  metadata?: boolean;
  kitOrders?: boolean;
}) {
  const draftScope = useContext(OrderDraftScope);
  const [resumeDraft, setResumeDraft] = useState(() => readDraft(draftScope));
  const [resumeNotice, setResumeNotice] = useState('');
  const kitCatalog = useKitCatalog(financial && kitOrders);
  const [kitItems, setKitItems] = useState<KitItemInput[]>([]),
    [kitSnapshots, setKitSnapshots] = useState<KitItemSnapshot[]>([]),
    [kitEditing, setKitEditing] = useState(false);
  const field = useField(),
    courierLabels = useCourierLabels();
  const { id } = useParams(),
    navigate = useNavigate(),
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
    } | null>(null);
  const [step, setStep] = useState(0),
    [customer, setCustomer] = useState<{
      id: string;
      name: string;
      customer_type?: CustomerType;
    } | null>(null),
    [defaults, setDefaults] = useState<Defaults | null>(null),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [due, setDue] = useState(''),
    [planDue, setPlanDue] = useState(''),
    [notes, setNotes] = useState(''),
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
  const suppressedDraft = useRef(''),
    editBaseline = useRef<string | null>(null),
    baselineOrder = useRef('');
  const draftPayload = useMemo(
    () =>
      customer
        ? {
            customer_id: customer.id,
            order_id: id ?? null,
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
    [customer, id, counts, mixes, kitItems],
  );
  useEffect(() => {
    if (
      !draftPayload ||
      busy ||
      success ||
      (id ? editing?.id !== id : !defaults) ||
      (resumeDraft && resumeDraft.order_id === (id ?? null))
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
    storeDraft(draftScope, draftPayload);
  }, [
    draftPayload,
    busy,
    success,
    id,
    editing,
    defaults,
    resumeDraft,
    draftScope,
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
  const dupKey =
    step === REVIEW && !id && customer?.id && due
      ? customer.id + '|' + due.slice(0, 10)
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
  }, [id, financial]);
  function applyPlanItems(items: Plan['items'], kits: KitItemInput[] = []) {
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
    setResumeDraft(null);
    const serial = ++choice.current;
    setKitEditing(false);
    setCustomer(c);
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
      if (serial !== choice.current) return false;
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
        product_name: i.product_name,
        photo_key: null,
        alcohol: containsAlcohol(null, i.product_name, i.variant_label),
      })) ?? [];
  const all = [...options, ...historical],
    selected = all.filter((v) => counts[v.id] > 0),
    price = (v: (typeof all)[number]) =>
      editing?.items.find((i) => i.variant_id === v.id)?.unit_price_cents ??
      v.price_cents,
    mixPrice = (m: Mix) =>
      editing?.items.find((i) => i.id === m.item_id)?.unit_price_cents ??
      all.find((v) => v.id === m.base)?.price_cents ??
      0,
    // Caixa mista só junta sabores da mesma embalagem (unidades e peso).
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
    total =
      selected.reduce((n, v) => n + counts[v.id] * price(v), 0) +
      mixes.reduce((n, m) => n + m.qty * mixPrice(m), 0) +
      kitItems.reduce(
        (n, i) =>
          n +
          i.quantity * (kitItemPrice(i, kitCatalog.kits, kitSnapshots) ?? 0),
        0,
      ),
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
        m.key === key ? { ...m, qty: m.qty + (old?.qty ?? 1) } : m,
      );
    else
      next = [
        ...next,
        {
          key,
          item_id: old?.item_id,
          base: old?.item_id ? old.base : mixBase(comp),
          comp,
          qty: old?.qty ?? 1,
        },
      ];
    setMixes(next);
    setMixDraft(null);
  }
  async function confirmOrder() {
    if (pending.current || !customer || kitEditing || sameDayBlocks) return;
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
      if (!validDue)
        throw Error('Escolha uma data a partir de hoje e um horário válido.');
      const data = {
          customer_id: customer.id,
          occasion: metadata ? occasion : undefined,
          ...(editing ? { version: editing.version } : {}),
          due_at: new Date(due + ':00-03:00').toISOString(),
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
      (id && editing?.id !== id)
    )
      return;
    setBusy(true);
    setError('');
    try {
      const c = await api<{ id: string; name: string; active: number }>(
        'customers/' + d.customer_id,
      );
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
        setResumeDraft(d);
        return;
      }
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
      setResumeDraft(null);
      setResumeNotice(
        'Seleção recuperada. Confira quantidades, data, entrega e pagamento. Textos e valores não foram guardados.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <section className="panel order-success">
        <Mascot size={120} className="mascot-wave" />
        <h1>Pedido confirmado</h1>
        <p>
          {customer?.name} · {money(total)}
        </p>
        <p>
          {deliveryDayLabel(due.slice(0, 10))} · {due.slice(11, 16)} ·{' '}
          {boxCount} {boxCount === 1 ? 'caixa' : 'caixas'}
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
                clearDraft(draftScope);
                setResumeDraft(null);
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
              step === 0 ? navigate('/gestao/pedidos') : setStep(step - 1)
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
          <h2>Escolha o cliente</h2>
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
                <article className="flavor-card mix-card">
                  <Button
                    className="flavor-add"
                    disabled={busy}
                    aria-label="Montar caixa mista com sabores variados"
                    onClick={() => setMixDraft({ comp: {} })}
                  >
                    <span className="mix-mosaic" aria-hidden="true">
                      {mixOptions
                        .filter((v) => v.photo_key)
                        .slice(0, 4)
                        .map((v) => (
                          <img key={v.id} src={photoURL(v.photo_key!)} alt="" />
                        ))}
                    </span>
                    <strong>Caixa mista</strong>
                    <span>Escolha os {capacity} sabores</span>
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
                          <span
                            className="flavor-placeholder"
                            aria-hidden="true"
                          >
                            {title.charAt(0)}
                          </span>
                        )}
                        <strong>{title}</strong>
                        {containsAlcohol(
                          key,
                          p.name,
                          p.description,
                          v.label,
                        ) && (
                          <small className="alcohol-tag">{alcoholNotice}</small>
                        )}
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
                  <h3>Caixa mista</h3>
                  <p>{mixText(m.comp)}</p>
                </div>
                <div className="flavor-stepper">
                  <Button
                    type="button"
                    aria-label="Menos caixas mistas iguais"
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
                    aria-label="Mais caixas mistas iguais"
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
                    setMixDraft({ comp: { ...m.comp }, editing: m.key })
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
                aria-label="Montar caixa mista"
              >
                <div className="mix-sheet-body">
                  <p className="order-section-label">
                    Caixa com {capacity} ·{' '}
                    {money(mixOptions[0]?.price_cents ?? 0)}
                  </p>
                  <h2 className="wizard-question">Montar caixa mista</h2>
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
                              <span>
                                {flavorName(v.id)}
                                {v.alcohol && (
                                  <small className="alcohol-tag">
                                    {alcoholNotice}
                                  </small>
                                )}
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
                        <div className="chips">
                          <Button
                            variant="chip"
                            onClick={() =>
                              setMixDraft({ ...mixDraft, comp: {} })
                            }
                          >
                            Limpar
                          </Button>
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
                            ? 'Salvar caixa mista'
                            : 'Adicionar caixa mista'}
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
            {(['unassigned', 'owner', 'partner', 'courier'] as const).map(
              (c) => (
                <Button
                  key={c}
                  aria-pressed={courier === c}
                  onClick={() => setCourier(c)}
                >
                  {c === 'owner' || c === 'partner' ? (
                    <CourierAvatars courier={c} />
                  ) : c === 'courier' ? (
                    <span className="courier-initials" aria-hidden="true">
                      M
                    </span>
                  ) : null}
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
            {(['unset', 'advance', 'delivery', 'credit'] as const)
              .filter(
                (mode) =>
                  customerType(defaults ?? customer) !== 'person' ||
                  mode === 'advance' ||
                  mode === 'delivery',
              )
              .map((mode) => (
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
              ))}
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
                  ) && <small className="alcohol-tag">{alcoholNotice}</small>}
                  <QuantityInput
                    label="Quantos kits iguais"
                    aria-label={
                      'Revisar quantidade de ' +
                      (display ? kitLabel(display) : 'kit indisponível')
                    }
                    value={item.quantity}
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
                <h3>
                  {v.product_name} · {v.label}
                </h3>
                {v.alcohol && (
                  <small className="alcohol-tag">{alcoholNotice}</small>
                )}
                <QuantityInput
                  aria-label={'Revisar quantidade de ' + v.product_name}
                  value={counts[v.id]}
                  onValueChange={(n) => setCounts({ ...counts, [v.id]: n })}
                />
                <p>{money(price(v) * counts[v.id])}</p>
              </div>
            </article>
          ))}
          {mixes.map((m) => (
            <article className="review-line" key={m.key}>
              <div>
                <h3>
                  {m.qty} cx Caixa mista · {money(m.qty * mixPrice(m))}
                </h3>
                <p>{mixText(m.comp)}</p>
                {Object.keys(m.comp).some(
                  (id) => all.find((v) => v.id === id)?.alcohol,
                ) && <small className="alcohol-tag">{alcoholNotice}</small>}
              </div>
            </article>
          ))}
          {metadata && (
            <OccasionPicker value={occasion} onChange={setOccasion} />
          )}
          {occasionLabel(occasion) && <p>Ocasião: {occasionLabel(occasion)}</p>}
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
                (step === WHEN && !validDue) ||
                (step === PAYMENT &&
                  customerType(defaults ?? customer) === 'person' &&
                  !['advance', 'delivery'].includes(terms.mode))
              }
              onClick={() => setStep(step + 1)}
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
