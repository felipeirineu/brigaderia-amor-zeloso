import { useState } from 'react';
import { Button } from '../../components/Button';
import { ChoiceChips } from '../../components/ChoiceChips';
import {
  emptyWeightRecipe,
  finishSuggestion,
  type WeightRecipeData,
  type WeightSupply,
} from '../../../shared/weight-costing';
import type { Kit } from '../../../shared/kits';
import { DecimalField, PercentField, SupplyPicker } from './WeightCostFields';
import { unitName } from './quantity';
export interface WeightProfile {
  id: string;
  product_id: string;
  product_name: string;
  product_active?: number;
  active: number;
  version: number;
  data: WeightRecipeData;
}
export function WeightRecipeForm({
  editing,
  products,
  supplies,
  kits,
  busy,
  onSave,
  onCancel,
}: {
  editing: WeightProfile | null;
  products: { id: string; name: string; photo_key?: string | null }[];
  supplies: WeightSupply[];
  kits: Kit[];
  busy: boolean;
  onSave: (v: object) => void;
  onCancel: () => void;
}) {
  const [product, setProduct] = useState(editing?.product_id ?? ''),
    [data, setData] = useState<WeightRecipeData>(
      () => editing?.data ?? emptyWeightRecipe(),
    ),
    [active, setActive] = useState(editing ? !!editing.active : true),
    [massMode, setMassMode] = useState(
      editing?.data.mass_milli !== null && !!editing,
    ),
    [error, setError] = useState('');
  const sizes = [
    ...new Set([
      ...kits.map((k) => k.weight_grams),
      ...data.components.flatMap((c) => c.sizes.map((s) => s.weight_grams)),
    ]),
  ].sort((a, b) => a - b);
  const change = (delta: Partial<WeightRecipeData>) =>
    setData({ ...data, ...delta });
  function selectProduct(id: string) {
    setProduct(id);
    if (!editing) {
      const p = products.find((p) => p.id === id),
        key = (p?.photo_key ?? p?.name ?? '').toLowerCase();
      change({
        reference_yield: /beijinho|coco/.test(key)
          ? 17
          : /caipirinha/.test(key)
            ? 15
            : 16,
        reference_confirmed: false,
      });
    }
  }
  return (
    <form
      className="panel data-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (
          !product ||
          !data.components.some((c) => c.group === 'dough') ||
          data.components.some((c) => !c.supply_id)
        ) {
          setError('Escolha o sabor e os insumos da massa.');
          return;
        }
        if (massMode && !data.mass_milli) {
          setError('Informe a massa total.');
          return;
        }
        setError('');
        onSave({
          product_id: product,
          active,
          data,
          ...(editing ? { version: editing.version } : {}),
        });
      }}
    >
      <h2>{editing ? 'Editar ficha por peso' : 'Nova ficha por peso'}</h2>
      {error && <p role="alert">{error}</p>}
      <label>
        Sabor da ficha
        <select
          aria-label="Sabor da ficha"
          value={product}
          onChange={(e) => selectProduct(e.target.value)}
        >
          <option value="">Selecione</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <ChoiceChips
        label="Origem do rendimento"
        value={massMode ? 'mass' : 'yield'}
        options={[
          ['yield', 'Doces por receita'],
          ['mass', 'Massa total da receita'],
        ]}
        onChange={(v) => {
          setMassMode(v === 'mass');
          if (v === 'yield') change({ mass_milli: null });
        }}
      />
      {massMode ? (
        <DecimalField
          label="Massa total da receita (g)"
          required
          value={data.mass_milli}
          onChange={(n) => change({ mass_milli: n })}
        />
      ) : (
        <>
          <label>
            Doces por receita
            <input
              type="number"
              required
              min={1}
              max={1000000}
              value={data.reference_yield}
              onChange={(e) =>
                change({
                  reference_yield: Number(e.target.value),
                  reference_confirmed: false,
                })
              }
            />
          </label>
          <DecimalField
            label="Peso de massa de referência (g)"
            required
            value={data.reference_dough_milli}
            onChange={(n) =>
              change({
                reference_dough_milli: n ?? 0,
                reference_confirmed: false,
              })
            }
          />
          <label>
            <input
              type="checkbox"
              checked={data.reference_confirmed}
              onChange={(e) =>
                change({ reference_confirmed: e.target.checked })
              }
            />
            Rendimento de referência conferido
          </label>
          <p>
            16 doces e 26 g de massa são sugestões editáveis. Beijinho sugere
            17; Caipirinha, 15 provisoriamente. Confira o rendimento da sua
            receita.
          </p>
        </>
      )}
      <PercentField
        label="Margem desejada (%)"
        value={data.margin_bps}
        onChange={(n) => change({ margin_bps: n })}
      />
      {(['dough', 'batch', 'finish'] as const).map((group) => (
        <fieldset key={group}>
          <legend>
            {group === 'dough'
              ? 'Massa por receita'
              : group === 'batch'
                ? 'Gás e outros custos por receita'
                : 'Acabamento por doce e tamanho'}
          </legend>
          {data.components.map((c, i) =>
            c.group !== group ? null : (
              <div className="weight-component" key={i}>
                <SupplyPicker
                  label={`Insumo ${i + 1}`}
                  value={c.supply_id}
                  supplies={supplies}
                  onChange={(id) =>
                    change({
                      components: data.components.map((c, n) =>
                        n === i ? { ...c, supply_id: id ?? '' } : c,
                      ),
                    })
                  }
                />
                {group !== 'finish' ? (
                  <DecimalField
                    label={`Quantidade por receita ${i + 1} (${unitName(supplies.find((s) => s.id === c.supply_id)?.unit ?? 'g')})`}
                    value={c.quantity_milli > 0 ? c.quantity_milli : null}
                    required
                    onChange={(n) =>
                      change({
                        components: data.components.map((c, j) =>
                          i === j ? { ...c, quantity_milli: n ?? 0 } : c,
                        ),
                      })
                    }
                  />
                ) : (
                  sizes.map((weight) => {
                    const exact = c.sizes.find(
                        (s) => s.weight_grams === weight,
                      ),
                      source = c.sizes[0];
                    const set = (quantity_milli: number, estimated: boolean) =>
                      change({
                        components: data.components.map((c, j) =>
                          j === i
                            ? {
                                ...c,
                                sizes: [
                                  ...c.sizes.filter(
                                    (s) => s.weight_grams !== weight,
                                  ),
                                  {
                                    weight_grams: weight,
                                    quantity_milli,
                                    estimated,
                                  },
                                ],
                              }
                            : c,
                        ),
                      });
                    return (
                      <div key={weight}>
                        <DecimalField
                          label={`Acabamento ${i + 1} para ${weight} g (${unitName(supplies.find((s) => s.id === c.supply_id)?.unit ?? 'g')})`}
                          value={exact?.quantity_milli ?? null}
                          onChange={(n) => {
                            if (n === null)
                              change({
                                components: data.components.map((c, j) =>
                                  j === i
                                    ? {
                                        ...c,
                                        sizes: c.sizes.filter(
                                          (s) => s.weight_grams !== weight,
                                        ),
                                      }
                                    : c,
                                ),
                              });
                            else set(n, false);
                          }}
                        />
                        {exact?.estimated && (
                          <small>Estimativa aceita; edite quando medir.</small>
                        )}
                        {!exact && source && (
                          <Button
                            type="button"
                            onClick={() =>
                              set(
                                finishSuggestion(
                                  source.quantity_milli,
                                  source.weight_grams,
                                  weight,
                                ),
                                true,
                              )
                            }
                          >
                            Usar estimativa para {weight} g
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    change({
                      components: data.components.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remover insumo {i + 1}
                </Button>
              </div>
            ),
          )}
          <Button
            type="button"
            onClick={() =>
              change({
                components: [
                  ...data.components,
                  {
                    group,
                    supply_id: '',
                    quantity_milli: 0,
                    sizes: [],
                  },
                ],
              })
            }
            disabled={data.components.length >= 50}
          >
            Adicionar{' '}
            {group === 'dough'
              ? 'insumo da massa'
              : group === 'batch'
                ? 'custo por receita'
                : 'acabamento'}
          </Button>
        </fieldset>
      ))}
      <fieldset>
        <legend>Rendimento medido por tamanho (opcional)</legend>
        {[
          ...new Map(
            kits
              .filter((k) => k.dough_weight_grams)
              .map((k) => [`${k.weight_grams}/${k.dough_weight_grams}`, k]),
          ).values(),
        ].map((k) => {
          const measured = data.measured.find(
            (m) =>
              m.weight_grams === k.weight_grams &&
              m.dough_milli === k.dough_weight_grams! * 1000,
          );
          return (
            <label key={`${k.weight_grams}/${k.dough_weight_grams}`}>
              Rendimento medido {k.weight_grams} g (massa {k.dough_weight_grams}{' '}
              g)
              <input
                type="number"
                min={1}
                max={1000000}
                value={measured?.yield_units ?? ''}
                onChange={(e) =>
                  change({
                    measured: [
                      ...data.measured.filter((m) => m !== measured),
                      ...(e.target.value
                        ? [
                            {
                              weight_grams: k.weight_grams,
                              dough_milli: k.dough_weight_grams! * 1000,
                              yield_units: Number(e.target.value),
                            },
                          ]
                        : []),
                    ],
                  })
                }
              />
            </label>
          );
        })}
      </fieldset>
      <p>
        Forminhas e opcionais são escolhidos na configuração, fora da ficha.
        Estimativas de acabamento só entram ao tocar em Usar estimativa e
        salvar.
      </p>
      <label>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Ficha ativa
      </label>
      <div className="actions">
        <Button disabled={busy} variant="primary">
          Salvar ficha por peso
        </Button>
        <Button type="button" onClick={onCancel}>
          Cancelar edição
        </Button>
      </div>
    </form>
  );
}
