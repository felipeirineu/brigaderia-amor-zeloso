import { useState, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { DisclosureSummary } from './DisclosureSummary';
import { ChoiceChips } from './ChoiceChips';
import { QuantityInput } from './NumericInputs';
import { money } from '../features/api';
import { kitLabel, type Kit } from '../../shared/kits';
import {
  kitCompositionKey,
  kitItemPrice,
  type KitItemInput,
  type KitItemSnapshot,
} from '../../shared/kit-orders';
import { alcoholNotice, containsAlcohol } from '../../shared/alcohol';
import { photoURL } from '../../shared/flavors';
interface Flavor {
  id: string;
  name: string;
  description?: string;
  photo_key?: string | null;
  variants?: { active: number | boolean }[];
}
export function KitItemsEditor({
  value,
  onChange,
  kits,
  products,
  limit = true,
  mixed = true,
  snapshots = [],
  onEditingChange,
  quickMode = false,
  defaultKitId,
  disabled = false,
}: {
  value: KitItemInput[];
  onChange: (items: KitItemInput[]) => void;
  kits: Kit[];
  products: Flavor[];
  limit?: boolean;
  mixed?: boolean;
  snapshots?: KitItemSnapshot[];
  onEditingChange?: (editing: boolean) => void;
  quickMode?: boolean;
  defaultKitId?: string | null;
  disabled?: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const active = kits.filter((k) => k.active),
    initial =
      active.find((k) => k.weight_grams === 30 && k.units_per_kit === 12) ??
      active[0];
  const [draft, setDraft] = useState<KitItemInput | null>(null),
    [index, setIndex] = useState<number | null>(null),
    [weight, setWeight] = useState(initial?.weight_grams ?? 30),
    [error, setError] = useState('');
  const [completeId, setCompleteId] = useState(products[0]?.id ?? ''),
    [quickChoice, setQuickChoice] = useState<string | null>(null),
    [changingQuickKit, setChangingQuickKit] = useState(false);
  const quickKit =
    active.find((k) => k.id === (quickChoice ?? defaultKitId)) ??
    (!quickChoice && !defaultKitId
      ? active.find((k) => k.weight_grams === 30 && k.units_per_kit === 12)
      : undefined);
  const completer = products.find((p) => p.id === completeId) ?? products[0];
  const kit = kits.find((k) => k.id === draft?.kit_id),
    sum = draft?.components.reduce((n, c) => n + c.units, 0) ?? 0;
  const max = kit
    ? !mixed
      ? 1
      : limit
        ? kit.max_flavors
        : kit.units_per_kit
    : 0;
  function addFlavor(product: Flavor) {
    if (!quickKit || disabled) return;
    const item: KitItemInput = {
      kit_id: quickKit.id,
      quantity: 1,
      components: [{ product_id: product.id, units: quickKit.units_per_kit }],
    };
    const existing = value.findIndex(
      (i) => kitCompositionKey(i) === kitCompositionKey(item),
    );
    if (existing >= 0) {
      if (value[existing].quantity >= 10000) {
        setError('Quantidade de kits iguais excede o limite.');
        return;
      }
      onChange(
        value.map((i, n) =>
          n === existing ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    } else if (value.length < 50) onChange([...value, item]);
  }
  function start(item?: KitItemInput, i?: number) {
    const selected = item
      ? kits.find((k) => k.id === item.kit_id)
      : quickMode && quickKit
        ? quickKit
        : (active.find((k) => k.weight_grams === weight) ?? initial);
    setDraft(
      item
        ? { ...item, components: item.components.map((c) => ({ ...c })) }
        : { kit_id: selected?.id ?? '', quantity: 1, components: [] },
    );
    setIndex(i ?? null);
    setWeight(selected?.weight_grams ?? weight);
    setError('');
    onEditingChange?.(true);
  }
  function close() {
    setDraft(null);
    setError('');
    onEditingChange?.(false);
  }
  function units(id: string, n: number) {
    if (!draft) return;
    setDraft({
      ...draft,
      components: [
        ...draft.components.filter((c) => c.product_id !== id),
        ...(n > 0 ? [{ product_id: id, units: n }] : []),
      ],
    });
  }
  function apply() {
    const invalid =
      root.current?.querySelector<HTMLInputElement>('input:invalid');
    if (invalid) {
      invalid.reportValidity();
      setError('Confira o campo indicado antes de salvar os sabores.');
      return;
    }
    if (
      !draft ||
      !kit ||
      !kit.active ||
      sum !== kit.units_per_kit ||
      draft.components.length > max
    )
      return;
    const rest = value.filter((_, i) => i !== index),
      duplicate = rest.findIndex(
        (i) => kitCompositionKey(i) === kitCompositionKey(draft),
      );
    if (duplicate >= 0) {
      if (rest[duplicate].quantity + draft.quantity > 10000) {
        setError('Quantidade de kits iguais excede o limite.');
        return;
      }
      rest[duplicate] = {
        ...rest[duplicate],
        quantity: rest[duplicate].quantity + draft.quantity,
      };
    } else rest.push(draft);
    onChange(rest);
    close();
  }
  const name = (id: string, item?: KitItemInput) =>
    snapshots
      .find(
        (s) =>
          s.id === item?.item_id &&
          !!item &&
          kitCompositionKey(s) === kitCompositionKey(item),
      )
      ?.components.find((c) => c.product_id === id)?.product_name ??
    products.find((p) => p.id === id)?.name ??
    'Sabor indisponível';
  return (
    <section aria-label="Kits do pedido" ref={root}>
      <h3>Kits por tamanho</h3>
      {value.map((item, i) => {
        const prior = snapshots.find(
            (s) =>
              s.id === item.item_id &&
              kitCompositionKey(s) === kitCompositionKey(item),
          ),
          catalog = kits.find((k) => k.id === item.kit_id),
          display = prior ?? catalog,
          price = kitItemPrice(item, kits, snapshots);
        return (
          <article
            className="panel"
            key={item.item_id ?? kitCompositionKey(item)}
          >
            <h4>{display ? kitLabel(display) : 'Kit indisponível'}</h4>
            <p>
              {item.components
                .map((c) => `${c.units} ${name(c.product_id, item)}`)
                .join(' + ')}
            </p>
            {item.components.some(
              (c) =>
                prior?.components.find((s) => s.product_id === c.product_id)
                  ?.contains_alcohol ||
                containsAlcohol(
                  products.find((p) => p.id === c.product_id)?.photo_key,
                  name(c.product_id, item),
                  products.find((p) => p.id === c.product_id)?.description,
                ),
            ) && <p className="alcohol-tag">{alcoholNotice}</p>}
            <QuantityInput
              label="Quantos kits iguais"
              aria-label={`Quantos kits iguais de ${display ? kitLabel(display) : 'kit indisponível'}`}
              value={item.quantity}
              min={1}
              max={10000}
              onValueChange={(quantity) =>
                onChange(
                  value.map((v, n) => (n === i ? { ...v, quantity } : v)),
                )
              }
            />
            <p>
              {price === null
                ? 'Preço indisponível'
                : money(price * item.quantity)}
            </p>
            <Button
              type="button"
              disabled={!!draft || !catalog?.active}
              aria-label={`Editar sabores de ${display ? kitLabel(display) : 'kit indisponível'}`}
              onClick={() => start(item, i)}
            >
              Editar sabores
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!!draft}
              aria-label={`Remover ${display ? kitLabel(display) : 'kit indisponível'}`}
              onClick={() => onChange(value.filter((_, n) => n !== i))}
            >
              Remover
            </Button>
          </article>
        );
      })}
      <KitFlavorNotice products={products} />
      {quickMode && !draft && (
        <section aria-label="Adicionar sabor ao kit padrão">
          <div className="kit-quick-choice">
            <ChoiceChips
              label="Kit deste pedido"
              value={quickKit?.id ?? ''}
              options={(changingQuickKit || !quickKit
                ? active
                : [quickKit]
              ).map((k) => [k.id, `${kitLabel(k)} · ${money(k.price_cents)}`])}
              onChange={(id) => {
                setQuickChoice(id);
                setChangingQuickKit(false);
              }}
            />
            {quickKit && active.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setChangingQuickKit((v) => !v)}
              >
                {changingQuickKit ? 'Manter kit selecionado' : 'Trocar kit'}
              </Button>
            )}
          </div>
          {!quickKit && (
            <p>Escolha um kit ativo para adicionar sabores em um toque.</p>
          )}
          {quickKit && <p>Toque no sabor para somar 1 kit.</p>}
          {quickKit && (
            <div className="flavor-grid">
              {products.map((p) => {
                const count = value
                  .filter(
                    (i) =>
                      i.kit_id === quickKit.id &&
                      i.components.length === 1 &&
                      i.components[0].product_id === p.id,
                  )
                  .reduce((n, i) => n + i.quantity, 0);
                return (
                  <article className="flavor-card" key={p.id}>
                    <Button
                      type="button"
                      className="flavor-add"
                      aria-label={`Adicionar kit de ${p.name}`}
                      disabled={
                        disabled ||
                        count >= 10000 ||
                        (!count && value.length >= 50)
                      }
                      onClick={() => addFlavor(p)}
                    >
                      {p.photo_key && (
                        <img
                          src={photoURL(p.photo_key)}
                          alt=""
                          width={120}
                          height={120}
                        />
                      )}
                      <strong>{p.name}</strong>
                      {containsAlcohol(p.photo_key, p.name, p.description) && (
                        <small className="alcohol-tag">{alcoholNotice}</small>
                      )}
                      <span>
                        {count} {count === 1 ? 'kit' : 'kits'}
                      </span>
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
      {!draft && (
        <Button
          type="button"
          disabled={disabled || !active.length || value.length >= 50}
          onClick={() => start()}
        >
          Montar kit
        </Button>
      )}
      {draft && (
        <div className="panel" aria-label="Montagem do kit">
          <h4>Escolha tamanho e quantidade</h4>
          {draft.item_id && (
            <p>
              Ao mudar só a quantidade, o preço histórico é mantido. Outra
              composição usa o preço atual do kit.
            </p>
          )}
          <ChoiceChips
            label="Tamanho do kit"
            value={String(weight)}
            options={[...new Set(active.map((k) => k.weight_grams))]
              .sort((a, b) => a - b)
              .map((w) => [String(w), `${w} g`])}
            onChange={(v) => {
              const next = active.find((k) => k.weight_grams === Number(v));
              setWeight(Number(v));
              setDraft({ ...draft, kit_id: next?.id ?? '', components: [] });
            }}
          />
          <ChoiceChips
            label="Quantidade por kit"
            value={draft.kit_id}
            options={active
              .filter((k) => k.weight_grams === weight)
              .map((k) => [
                k.id,
                `${k.units_per_kit} doces · ${money(k.price_cents)}`,
              ])}
            onChange={(kit_id) =>
              setDraft({ ...draft, kit_id, components: [] })
            }
          />
          <p>
            {weight === 15
              ? 'Festa infantil'
              : weight === 23
                ? 'Festas e brindes'
                : weight === 30
                  ? 'Revenda e presentes'
                  : ''}
          </p>
          {kit && (
            <>
              <p role="status">
                {sum === kit.units_per_kit
                  ? 'Kit completo'
                  : sum > kit.units_per_kit
                    ? `Retire ${sum - kit.units_per_kit} unidades`
                    : `Faltam ${kit.units_per_kit - sum} de ${kit.units_per_kit}`}{' '}
                · Até {max} sabores ({draft.components.length} escolhidos)
              </p>
              {kit.units_per_kit <= 12 && (
                <div className="kit-slots" aria-hidden="true">
                  {Array.from({ length: kit.units_per_kit }, (_, i) => (
                    <span
                      className={i < sum ? 'kit-slot filled' : 'kit-slot'}
                      key={i}
                    />
                  ))}
                </div>
              )}
              <div className="kit-composition">
                {products.map((p) => {
                  const count =
                      draft.components.find((c) => c.product_id === p.id)
                        ?.units ?? 0,
                    blocked = count === 0 && draft.components.length >= max,
                    remaining = kit.units_per_kit - sum;
                  return (
                    <div className="mix-row" key={p.id}>
                      {p.photo_key ? (
                        <img
                          src={photoURL(p.photo_key)}
                          alt=""
                          width={44}
                          height={44}
                        />
                      ) : (
                        <span
                          className="flavor-placeholder"
                          aria-hidden="true"
                        />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        className="kit-flavor-name"
                        aria-label={`Escolher ${p.name} para completar`}
                        aria-pressed={completer?.id === p.id}
                        disabled={blocked}
                        onClick={() => setCompleteId(p.id)}
                      >
                        <strong>{p.name}</strong>
                        {containsAlcohol(
                          p.photo_key,
                          p.name,
                          p.description,
                        ) && (
                          <small className="alcohol-tag">{alcoholNotice}</small>
                        )}
                      </Button>
                      <div className="flavor-stepper">
                        <Button
                          type="button"
                          aria-label={`Menos ${p.name}`}
                          disabled={count <= 0}
                          onClick={() => {
                            setCompleteId(p.id);
                            units(p.id, count - 1);
                          }}
                        >
                          −
                        </Button>
                        <output aria-label={`Unidades de ${p.name}`}>
                          {count}
                        </output>
                        <Button
                          type="button"
                          aria-label={`Mais ${p.name}`}
                          disabled={blocked || remaining <= 0}
                          onClick={() => {
                            setCompleteId(p.id);
                            units(p.id, count + 1);
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={
                  !completer ||
                  sum >= kit.units_per_kit ||
                  (!draft.components.some(
                    (c) => c.product_id === completer.id,
                  ) &&
                    draft.components.length >= max)
                }
                onClick={() => {
                  if (completer)
                    units(
                      completer.id,
                      (draft.components.find(
                        (c) => c.product_id === completer.id,
                      )?.units ?? 0) +
                        kit.units_per_kit -
                        sum,
                    );
                }}
              >
                Completar com {completer?.name ?? 'sabor escolhido'}
              </Button>
              {error && <p role="alert">{error}</p>}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDraft({ ...draft, components: [] })}
              >
                Limpar sabores
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={
                  !kit.active ||
                  sum !== kit.units_per_kit ||
                  !sum ||
                  draft.components.length > max
                }
                onClick={apply}
              >
                {index === null
                  ? 'Adicionar kit ao pedido'
                  : 'Salvar sabores do kit'}
              </Button>
            </>
          )}
          <Button type="button" variant="ghost" onClick={close}>
            Cancelar montagem
          </Button>
        </div>
      )}
    </section>
  );
}

export function LegacyItemsSection({
  folded,
  expanded = false,
  children,
}: {
  folded: boolean;
  expanded?: boolean;
  children: ReactNode;
}) {
  return folded ? (
    <details className="panel" open={expanded || undefined}>
      <DisclosureSummary>Embalagens anteriores</DisclosureSummary>
      {children}
    </details>
  ) : (
    <>{children}</>
  );
}

export function KitFlavorNotice({ products }: { products: Flavor[] }) {
  const ambiguous = products.filter(
    (p) => (p.variants?.filter((v) => v.active).length ?? 0) > 1,
  );
  return ambiguous.length ? (
    <aside className="kit-variant-notice" role="note">
      <details>
        <DisclosureSummary>
          Para kits, cadastre um produto por sabor.
        </DisclosureSummary>
        <p>
          As variantes não viram sabores na composição. Confira:{' '}
          {ambiguous.map((p) => p.name).join(', ')}.
        </p>
      </details>
    </aside>
  ) : null;
}
