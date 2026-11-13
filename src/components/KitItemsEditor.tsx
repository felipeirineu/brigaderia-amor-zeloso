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
}: {
  value: KitItemInput[];
  onChange: (items: KitItemInput[]) => void;
  kits: Kit[];
  products: Flavor[];
  limit?: boolean;
  mixed?: boolean;
  snapshots?: KitItemSnapshot[];
  onEditingChange?: (editing: boolean) => void;
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
  const kit = kits.find((k) => k.id === draft?.kit_id),
    sum = draft?.components.reduce((n, c) => n + c.units, 0) ?? 0;
  const max = kit
    ? !mixed
      ? 1
      : limit
        ? kit.max_flavors
        : kit.units_per_kit
    : 0;
  function start(item?: KitItemInput, i?: number) {
    const selected = item
      ? kits.find((k) => k.id === item.kit_id)
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
              label={`Quantidade de kits ${i + 1}`}
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
              onClick={() => start(item, i)}
            >
              Editar sabores do kit {i + 1}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!!draft}
              onClick={() => onChange(value.filter((_, n) => n !== i))}
            >
              Remover kit {i + 1}
            </Button>
          </article>
        );
      })}
      {!draft && (
        <Button
          type="button"
          disabled={!active.length || value.length >= 50}
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
              <div className="kit-flavors">
                {products.map((p) => {
                  const count =
                      draft.components.find((c) => c.product_id === p.id)
                        ?.units ?? 0,
                    disabled = count === 0 && draft.components.length >= max,
                    remaining = kit.units_per_kit - sum;
                  return (
                    <article className="panel kit-flavor" key={p.id}>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={disabled || remaining <= 0}
                        onClick={() => units(p.id, count + 1)}
                      >
                        {p.photo_key && (
                          <img
                            src={photoURL(p.photo_key)}
                            alt=""
                            width={64}
                            height={64}
                          />
                        )}
                        <strong>{p.name}</strong>
                      </Button>
                      {containsAlcohol(p.photo_key, p.name, p.description) && (
                        <small className="alcohol-tag">{alcoholNotice}</small>
                      )}
                      <QuantityInput
                        label={`Unidades de ${p.name}`}
                        min={0}
                        max={Math.max(count, count + remaining)}
                        value={count}
                        disabled={disabled}
                        onValueChange={(n) => units(p.id, n)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={disabled || remaining <= 0}
                        onClick={() => units(p.id, count + remaining)}
                      >
                        Completar com {p.name}
                      </Button>
                    </article>
                  );
                })}
              </div>
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
  children,
}: {
  folded: boolean;
  children: ReactNode;
}) {
  return folded ? (
    <details className="panel">
      <DisclosureSummary>Embalagens anteriores</DisclosureSummary>
      {children}
    </details>
  ) : (
    <>{children}</>
  );
}
