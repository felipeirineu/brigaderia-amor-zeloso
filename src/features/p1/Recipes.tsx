import type { RecipeEstimate } from '../../../worker/recipe-domain';
import { SkeletonList } from '../../components/Skeleton';
import { Button } from '../../components/Button';
import { MoneyField, QuantityField } from '../../components/NumericInputs';
import { priceForMargin } from '../../../shared/costing';
import { useRef, useState } from 'react';

import { Failure, useRemote } from '../operations/common';
import { money, parsePrice } from '../api';
import { useP1Save } from './useP1Save';
import { parseMilli, quantityInput, unitName } from './quantity';
interface Supply {
  id: string;
  name: string;
  unit: string;
  pack_quantity_milli: number;
  pack_cost_cents: number | null;
  active: number;
  version: number;
}
interface Recipe {
  id: string;
  name: string;
  variant_id: string | null;
  yield_units: number;
  packaging_cents: number;
  labor_cents: number;
  overhead_cents: number;
  margin_bps: number;
  active: number;
  version: number;
  components: {
    supply_id: string;
    name: string;
    unit: string;
    quantity_milli: number;
  }[];
  unmeasured_bps: number | null;
  units_per_box: number | null;
  estimate: RecipeEstimate;
}
const empty = () => ({
  name: '',
  variant: '',
  yield: '',
  packaging: '',
  labor: '',
  overhead: '',
  unmeasured: '20',
  margin: '',
  active: true,
});
export function Supplies() {
  const view = useRemote<{ role: string; items: Supply[] }>('p1/supplies'),
    save = useP1Save(view.refresh),
    [editing, setEditing] = useState<Supply | null>(null),
    [name, setName] = useState(''),
    [unit, setUnit] = useState('g'),
    [quantity, setQuantity] = useState(''),
    [price, setPrice] = useState(''),
    [active, setActive] = useState(true);
  function reset() {
    setEditing(null);
    setName('');
    setUnit('g');
    setQuantity('');
    setPrice('');
    setActive(true);
  }
  return (
    <>
      <h1 className="mobile-context-title">Insumos e embalagens</h1>
      <Button to="/gestao/fichas" variant="ghost" className="ghost-inline">
        Fichas técnicas
      </Button>
      <Failure message={save.error || view.error} />
      <p role="status">{save.notice}</p>
      <p>
        Cadastre a quantidade da embalagem em g, mL ou unidades. Receita usa a
        mesma unidade do insumo; sem conversão de densidade inventada. Preço
        desconhecido pode ficar vazio.
      </p>
      {view.data?.role === 'owner' && (
        <form
          className="panel data-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              void save.save(
                'p1/supplies' + (editing ? '/' + editing.id : ''),
                {
                  name,
                  unit,
                  pack_quantity_milli: parseMilli(quantity),
                  pack_cost_cents: price.trim() ? parsePrice(price) : null,
                  active,
                  ...(editing ? { version: editing.version } : {}),
                },
                editing ? 'PUT' : 'POST',
                reset,
              );
            } catch (e) {
              save.setError((e as Error).message);
            }
          }}
        >
          <h2>{editing ? 'Editar insumo' : 'Novo insumo'}</h2>
          <label>
            Nome do insumo
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Unidade de referência
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="g">Gramas (g)</option>
              <option value="ml">Mililitros (mL)</option>
              <option value="unit">Unidades</option>
            </select>
          </label>
          <label>
            Quantidade por embalagem
            <input
              required
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <MoneyField
            label="Preço da embalagem (R$, vazio se desconhecido)"
            value={price}
            onValueChange={(value) => setPrice(value)}
          />
          <label>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Ativo
          </label>
          <div className="actions action-pair">
            <Button disabled={save.busy} variant="primary" loading={save.busy}>
              Salvar insumo
            </Button>
            <Button type="button" onClick={reset}>
              {editing ? 'Cancelar edição' : 'Limpar campos'}
            </Button>
          </div>
        </form>
      )}
      {!view.data && !view.error && (
        <SkeletonList label="Carregando insumos…" />
      )}
      {view.data?.items.map((s) => (
        <article className="panel" key={s.id}>
          <h2>{s.name}</h2>
          <p>
            {quantityInput(s.pack_quantity_milli)} {unitName(s.unit)} por
            embalagem ·{' '}
            {s.pack_cost_cents === null
              ? 'Preço a informar'
              : money(s.pack_cost_cents)}{' '}
            · {s.active ? 'Ativo' : 'Inativo'}
          </p>
          {view.data!.role === 'owner' && (
            <Button
              onClick={() => {
                setEditing(s);
                setName(s.name);
                setUnit(s.unit);
                setQuantity(quantityInput(s.pack_quantity_milli));
                setPrice(
                  s.pack_cost_cents === null
                    ? ''
                    : (s.pack_cost_cents / 100).toFixed(2).replace('.', ','),
                );
                setActive(!!s.active);
              }}
            >
              Editar insumo {s.name}
            </Button>
          )}
        </article>
      ))}
    </>
  );
}
function simulatedPrice(cost: number | null, margin: string) {
  if (cost === null || !margin.trim()) return null;
  try {
    return priceForMargin(cost, parsePrice(margin));
  } catch {
    return null;
  }
}
export function Recipes({
  weightCosting = false,
}: { weightCosting?: boolean } = {}) {
  const view = useRemote<{
      role: string;
      items: Recipe[];
      unmeasured_supported: boolean;
    }>('p1/recipes'),
    supplies = useRemote<{ items: Supply[] }>('p1/supplies'),
    products = useRemote<
      {
        id: string;
        name: string;
        variants: { id: string; label: string; active: number }[];
      }[]
    >('products'),
    save = useP1Save(view.refresh),
    [editing, setEditing] = useState<Recipe | null>(null),
    [form, setForm] = useState(empty),
    [simulation, setSimulation] = useState(''),
    [components, setComponents] = useState([{ supply_id: '', quantity: '' }]);
  const formRef = useRef<HTMLFormElement>(null);
  const options =
    products.data?.flatMap((p) =>
      p.variants
        .filter((v) => v.active)
        .map((v) => ({ id: v.id, name: p.name + ' — ' + v.label })),
    ) ?? [];
  function reset() {
    setEditing(null);
    setForm(empty());
    setComponents([{ supply_id: '', quantity: '' }]);
  }
  return (
    <>
      <h1 className="mobile-context-title">Fichas técnicas e preço sugerido</h1>
      {weightCosting && (
        <Button to="/gestao/fichas/peso" variant="primary">
          Calculadora por peso
        </Button>
      )}
      <div className="actions action-pair">
        <Button className="button" to="/gestao/insumos" variant="ghost">
          Insumos e embalagens
        </Button>
        <Button className="button" to="/gestao/compras" variant="ghost">
          Lista de compras
        </Button>
      </div>
      <Failure
        message={save.error || view.error || supplies.error || products.error}
      />
      <p role="status">{save.notice}</p>
      {view.data?.role === 'owner' && (
        <form
          ref={formRef}
          className="panel data-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              void save.save(
                'p1/recipes' + (editing ? '/' + editing.id : ''),
                {
                  name: form.name,
                  variant_id: form.variant || null,
                  yield_units: Number(form.yield),
                  packaging_cents: parsePrice(form.packaging),
                  labor_cents: parsePrice(form.labor),
                  overhead_cents: parsePrice(form.overhead),
                  ...(view.data?.unmeasured_supported
                    ? {
                        unmeasured_bps: Math.round(
                          Number(form.unmeasured) * 100,
                        ),
                      }
                    : {}),
                  margin_bps: parsePrice(form.margin),
                  active: form.active,
                  components: components.map((c) => ({
                    supply_id: c.supply_id,
                    quantity_milli: parseMilli(c.quantity),
                  })),
                  ...(editing ? { version: editing.version } : {}),
                },
                editing ? 'PUT' : 'POST',
                reset,
              );
            } catch (e) {
              save.setError((e as Error).message);
            }
          }}
        >
          <h2>{editing ? 'Editar ficha' : 'Nova ficha'}</h2>
          <label>
            Nome da ficha
            <input
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Variante vendida (opcional)
            <select
              value={form.variant}
              onChange={(e) => setForm({ ...form, variant: e.target.value })}
            >
              <option value="">Sem vínculo comercial</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
              {form.variant && !options.some((o) => o.id === form.variant) && (
                <option value={form.variant}>
                  Variante histórica / inativa
                </option>
              )}
            </select>
          </label>
          <QuantityField
            label="Rendimento do lote (unidades produzidas)"
            min={1}
            max={1000000}
            required
            value={form.yield}
            onValueChange={(value) => setForm({ ...form, yield: value })}
          />
          {components.map((c, i) => (
            <fieldset key={i}>
              <legend>Componente {i + 1}</legend>
              <label>
                Insumo
                <select
                  required
                  value={c.supply_id}
                  onChange={(e) =>
                    setComponents(
                      components.map((c, j) =>
                        j === i ? { ...c, supply_id: e.target.value } : c,
                      ),
                    )
                  }
                >
                  <option value="">Selecione</option>
                  {supplies.data?.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({unitName(s.unit)})
                      {s.active ? '' : ' — inativo'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantidade no lote (
                {unitName(
                  supplies.data?.items.find((s) => s.id === c.supply_id)
                    ?.unit || 'unit',
                )}
                )
                <input
                  required
                  inputMode="decimal"
                  value={c.quantity}
                  onChange={(e) =>
                    setComponents(
                      components.map((c, j) =>
                        j === i ? { ...c, quantity: e.target.value } : c,
                      ),
                    )
                  }
                />
              </label>
              {components.length > 1 && (
                <Button
                  type="button"
                  onClick={() =>
                    setComponents(components.filter((_, j) => j !== i))
                  }
                >
                  Remover componente {i + 1}
                </Button>
              )}
            </fieldset>
          ))}
          <Button
            type="button"
            disabled={components.length >= 50}
            onClick={() =>
              setComponents([...components, { supply_id: '', quantity: '' }])
            }
          >
            Adicionar componente
          </Button>
          {(
            [
              ['packaging', 'Embalagens por lote (R$)'],
              ['labor', 'Mão de obra por lote (R$)'],
              ['overhead', 'Outros custos por lote (R$)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <MoneyField
                required
                value={form[key]}
                onValueChange={(value) => setForm({ ...form, [key]: value })}
              />
            </label>
          ))}
          {view.data?.unmeasured_supported && (
            <label>
              Custos não calculados (%)
              <input
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.unmeasured}
                aria-describedby="recipe-unmeasured-help"
                onChange={(e) =>
                  setForm({ ...form, unmeasured: e.target.value })
                }
              />
              <small id="recipe-unmeasured-help">
                Gás, energia, água, perdas e pequenos gastos difíceis de medir.
                Somado ao custo de produção antes da margem. Padrão de 20%.
              </small>
            </label>
          )}
          <label>
            Margem desejada (%)
            <MoneyField
              required
              value={form.margin}
              onValueChange={(value) => setForm({ ...form, margin: value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Ficha ativa
          </label>
          <p>
            Informe zero somente quando esse custo for realmente considerado
            zero. Evite contar a mesma embalagem no componente e no custo
            adicional. Margem de 0 a 95%, aplicada sobre o preço, não markup.
          </p>
          <div className="actions action-pair">
            <Button disabled={save.busy} variant="primary" loading={save.busy}>
              Salvar ficha
            </Button>
            <Button type="button" onClick={reset}>
              {editing ? 'Cancelar edição' : 'Limpar campos'}
            </Button>
          </div>
        </form>
      )}
      <section className="panel">
        <h2>Simulador de margem</h2>
        <MoneyField
          label="Simular margem (%)"
          value={simulation}
          onValueChange={(value) => setSimulation(value)}
        />
        <p>
          De 0 a 95%. Simulação local sobre o custo estimado da embalagem; não
          salva ficha nem muda preço comercial.
        </p>
      </section>
      {!view.data && !view.error && <SkeletonList label="Carregando fichas…" />}
      {view.data?.unmeasured_supported && (
        <p className="recipe-unmeasured-notice">
          O cálculo das fichas agora inclui custos não calculados. Fichas já
          cadastradas começam com 20%, que pode ser ajustado em cada ficha.
        </p>
      )}
      {view.data?.items.map((r) => (
        <article className="panel recipe-cost-card" key={r.id}>
          <h2>
            {r.name}
            {!r.active && ' · Inativa'}
          </h2>
          <p>
            Rende {r.yield_units} doces · margem{' '}
            {(r.margin_bps / 100).toLocaleString('pt-BR')}%.
          </p>
          <RecipeCostTable recipe={r} />
          {view.data!.role === 'owner' && (
            <Button
              onClick={() => {
                setEditing(r);
                formRef.current?.scrollIntoView({ block: 'start' });
                setForm({
                  name: r.name,
                  variant: r.variant_id || '',
                  yield: String(r.yield_units),
                  packaging: (r.packaging_cents / 100)
                    .toFixed(2)
                    .replace('.', ','),
                  labor: (r.labor_cents / 100).toFixed(2).replace('.', ','),
                  overhead: (r.overhead_cents / 100)
                    .toFixed(2)
                    .replace('.', ','),
                  unmeasured: String((r.unmeasured_bps ?? 2000) / 100),
                  margin: (r.margin_bps / 100).toFixed(2).replace('.', ','),
                  active: !!r.active,
                });
                setComponents(
                  r.components.map((c) => ({
                    supply_id: c.supply_id,
                    quantity: quantityInput(c.quantity_milli),
                  })),
                );
              }}
            >
              Editar ficha {r.name}
            </Button>
          )}
          {simulation.trim() && (
            <p>
              Preço na margem simulada:{' '}
              {simulatedPrice(r.estimate.box_cost_cents, simulation) === null
                ? 'informe margem válida e custos completos'
                : money(simulatedPrice(r.estimate.box_cost_cents, simulation)!)}
            </p>
          )}
          <p>
            {r.unmeasured_bps === null
              ? 'O custo por doce do esquema anterior é arredondado para cima.'
              : 'Custo por doce é o valor do lote dividido pelo rendimento, arredondado ao centavo.'}{' '}
            Os preços sugeridos são estimativas.
          </p>
        </article>
      ))}
    </>
  );
}

function RecipeCostTable({ recipe: r }: { recipe: Recipe }) {
  const estimate = r.estimate;
  const amount = (cents: number | null) =>
    cents === null ? '—' : money(cents);
  const perUnit = r.unmeasured_bps === null ? Math.ceil : Math.round;
  const fixedRows = [
    ['Embalagens', r.packaging_cents],
    ['Mão de obra', r.labor_cents],
    ['Outros custos', r.overhead_cents],
  ] as const;
  return (
    <>
      <table className="recipe-cost-table" aria-label="Custos por ingrediente">
        <thead>
          <tr>
            <th scope="col">Ingrediente</th>
            <th scope="col">Lote</th>
            <th scope="col">Por doce</th>
          </tr>
        </thead>
        <tbody>
          {r.components.map((c) => {
            const cost = estimate.ingredient_costs.find(
              (line) => line.supply_id === c.supply_id,
            );
            return (
              <tr key={c.supply_id}>
                <th scope="row">
                  {c.name}
                  <small>
                    {quantityInput(c.quantity_milli)} {unitName(c.unit)}
                  </small>
                </th>
                <td>{amount(cost?.batch_cents ?? null)}</td>
                <td>{amount(cost?.unit_cents ?? null)}</td>
              </tr>
            );
          })}
          {fixedRows.map(([name, cost]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>{money(cost)}</td>
              <td>{money(perUnit(cost / r.yield_units))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Custo de produção</th>
            <td>{amount(estimate.production_cents)}</td>
            <td>{amount(estimate.production_unit_cents)}</td>
          </tr>
          {r.unmeasured_bps !== null && (
            <tr>
              <th scope="row">
                Custos não calculados (
                {(r.unmeasured_bps / 100).toLocaleString('pt-BR')}%)
              </th>
              <td>{amount(estimate.unmeasured_cents)}</td>
              <td>{amount(estimate.unmeasured_unit_cents)}</td>
            </tr>
          )}
          <tr>
            <th scope="row">Custo total</th>
            <td>{amount(estimate.total_cents)}</td>
            <td>{amount(estimate.unit_cost_cents)}</td>
          </tr>
        </tfoot>
      </table>
      {estimate.missing.length ? (
        <p role="alert">
          Custo pendente: {estimate.missing.join(', ')}. A sugestão ficará
          disponível após completar os custos.
        </p>
      ) : (
        <>
          <dl className="recipe-suggested-prices">
            <div>
              <dt>Preço sugerido do lote</dt>
              <dd>{amount(estimate.suggested_batch_cents)}</dd>
            </div>
            <div>
              <dt>Preço sugerido por doce</dt>
              <dd>{amount(estimate.suggested_unit_cents)}</dd>
            </div>
          </dl>
          {estimate.suggested_price_cents !== null ? (
            <p>
              Na caixa de {r.units_per_box}:{' '}
              {money(estimate.suggested_price_cents)} sugerido · custo{' '}
              {amount(estimate.box_cost_cents)}.
            </p>
          ) : (
            <p>Vincule uma variante para estimar o preço da embalagem.</p>
          )}
        </>
      )}
    </>
  );
}
