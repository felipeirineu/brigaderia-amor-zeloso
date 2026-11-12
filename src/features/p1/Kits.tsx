import { ChoiceChips } from '../../components/ChoiceChips';
import { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { MoneyInput, QuantityInput } from '../../components/NumericInputs';
import {
  kitLabel,
  kitWeights,
  kitCapacities,
  type Kit,
  type KitSettings,
} from '../../../shared/kits';
import { api, money } from '../api';
import { Failure, useRemote } from '../operations/common';
interface Draft {
  weight_grams: number;
  units_per_kit: number;
  dough_weight_grams: string;
  price_cents: number | null;
  max_flavors: number;
  packaging_supply_id: string;
  active: boolean;
}
const blank = (): Draft => ({
  weight_grams: 30,
  units_per_kit: 12,
  dough_weight_grams: '',
  price_cents: null,
  max_flavors: 3,
  packaging_supply_id: '',
  active: true,
});
export function Kits({ role }: { role: string }) {
  const view = useRemote<Kit[]>('p1/kits'),
    settings = useRemote<KitSettings>('p1/kit-settings'),
    supplies = useRemote<{
      items: { id: string; name: string; unit: string; active: number }[];
    }>('p1/supplies');
  const [draft, setDraft] = useState(blank),
    [editing, setEditing] = useState<Kit | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const pending = useRef(false),
    request = useRef({ body: '', key: crypto.randomUUID() });
  const owner = role === 'owner';
  async function save(
    path: string,
    data: object,
    method: string,
    done?: () => void,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const body = path + JSON.stringify(data);
    if (request.current.body !== body)
      request.current = { body, key: crypto.randomUUID() };
    try {
      await api(path, method, data, request.current.key);
      done?.();
      await Promise.all([view.refresh(), settings.refresh()]);
      setNotice('Cadastro salvo.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function reset() {
    setEditing(null);
    setDraft(blank());
  }
  return (
    <>
      <h1 className="mobile-context-title">Kits</h1>
      <p>
        Cadastre o preço do kit inteiro e sua embalagem. A seleção de kits nos
        pedidos será disponibilizada na próxima etapa.
      </p>
      <Failure
        message={error || view.error || settings.error || supplies.error}
      />
      <p role="status">{notice}</p>
      {settings.data && (
        <section className="panel">
          <h2>Limite de sabores</h2>
          <p>
            A regra vale para pedidos com kits; não altera composições já
            registradas.
          </p>
          <label>
            <input
              type="checkbox"
              checked={settings.data.limit_flavors}
              disabled={!owner || busy}
              onChange={(e) =>
                void save(
                  'p1/kit-settings',
                  {
                    limit_flavors: e.target.checked,
                    version: settings.data!.version,
                  },
                  'PUT',
                )
              }
            />
            Limitar sabores por kit
          </label>
          {!owner && <p>Somente o administrador altera esta regra.</p>}
        </section>
      )}
      {owner && view.data && (
        <form
          className="panel data-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save(
              'p1/kits' + (editing ? '/' + editing.id : ''),
              {
                ...draft,
                dough_weight_grams: draft.dough_weight_grams
                  ? Number(draft.dough_weight_grams)
                  : null,
                packaging_supply_id: draft.packaging_supply_id || null,
                ...(editing ? { version: editing.version } : {}),
              },
              editing ? 'PUT' : 'POST',
              reset,
            );
          }}
        >
          <h2>{editing ? 'Editar kit' : 'Novo kit'}</h2>
          <fieldset disabled={busy} className="customer-form-fields">
            <ChoiceChips
              label="Tamanho do doce"
              value={String(draft.weight_grams)}
              onChange={(value) =>
                setDraft({ ...draft, weight_grams: Number(value) })
              }
              options={kitWeights.map((w) => [String(w), `${w} g`])}
            />
            <ChoiceChips
              label="Doces por kit"
              value={String(draft.units_per_kit)}
              onChange={(value) => {
                const units = Number(value);
                setDraft({
                  ...draft,
                  units_per_kit: units,
                  max_flavors: units === 12 ? 3 : 5,
                });
              }}
              options={kitCapacities.map((u) => [String(u), `${u} doces`])}
            />
            <MoneyInput
              label="Preço do kit"
              required
              value={draft.price_cents}
              onValueChange={(price_cents) =>
                setDraft({ ...draft, price_cents })
              }
            />
            <QuantityInput
              label="Máximo de sabores diferentes"
              required
              value={draft.max_flavors}
              min={1}
              max={draft.units_per_kit}
              onValueChange={(max_flavors) =>
                setDraft({ ...draft, max_flavors })
              }
            />
            <QuantityInput
              label="Peso da massa por doce (g, opcional)"
              value={
                draft.dough_weight_grams
                  ? Number(draft.dough_weight_grams)
                  : null
              }
              min={1}
              max={draft.weight_grams}
              steppers={false}
              onValueChange={(weight) =>
                setDraft({ ...draft, dough_weight_grams: String(weight) })
              }
            />
            {draft.dough_weight_grams && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDraft({ ...draft, dough_weight_grams: '' })}
              >
                Não informar peso da massa
              </Button>
            )}
            <ChoiceChips
              label="Embalagem por kit"
              value={draft.packaging_supply_id}
              onChange={(packaging_supply_id) =>
                setDraft({ ...draft, packaging_supply_id })
              }
              options={[
                ['', 'Embalagem não informada'],
                ...(supplies.data?.items
                  .filter(
                    (s) =>
                      s.unit === 'unit' &&
                      (s.active || s.id === draft.packaging_supply_id),
                  )
                  .map(
                    (s) =>
                      [s.id, s.name + (s.active ? '' : ' (inativa)')] as [
                        string,
                        string,
                      ],
                  ) ?? []),
              ]}
            />
            <label>
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) =>
                  setDraft({ ...draft, active: e.target.checked })
                }
              />
              Kit ativo
            </label>
            <Button
              variant="primary"
              disabled={draft.price_cents === null}
              loading={busy}
            >
              Salvar kit
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={reset}>
                Cancelar edição
              </Button>
            )}
          </fieldset>
        </form>
      )}
      {view.data?.length === 0 && <p>Nenhum kit cadastrado.</p>}
      {view.data?.map((k) => (
        <article className="panel" key={k.id}>
          <h2>
            {kitLabel(k)}
            {k.active ? '' : ' · Inativo'}
          </h2>
          <p>
            {money(k.price_cents)} · até{' '}
            {settings.data?.limit_flavors === false
              ? k.units_per_kit
              : k.max_flavors}{' '}
            sabores
            {settings.data?.limit_flavors === false
              ? ' (limite desligado)'
              : ''}
          </p>
          <p>
            {k.dough_weight_grams === null
              ? 'Peso da massa não informado'
              : `Massa: ${k.dough_weight_grams} g por doce`}
          </p>
          <p>
            {k.packaging_supply_id
              ? (supplies.data?.items.find(
                  (s) => s.id === k.packaging_supply_id,
                )?.name ?? 'Embalagem cadastrada')
              : 'Embalagem não informada'}
          </p>
          {owner && (
            <Button
              disabled={busy}
              onClick={() => {
                setEditing(k);
                setDraft({
                  weight_grams: k.weight_grams,
                  units_per_kit: k.units_per_kit,
                  max_flavors: k.max_flavors,
                  price_cents: k.price_cents,
                  dough_weight_grams:
                    k.dough_weight_grams === null
                      ? ''
                      : String(k.dough_weight_grams),
                  packaging_supply_id: k.packaging_supply_id ?? '',
                  active: !!k.active,
                });
              }}
            >
              Editar {kitLabel(k)}
            </Button>
          )}
        </article>
      ))}
    </>
  );
}
