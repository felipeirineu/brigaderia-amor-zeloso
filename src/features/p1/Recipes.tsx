import { priceForMargin } from '../../../shared/costing';
import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  estimate: {
    missing: string[];
    total_cents: number | null;
    unit_cost_cents: number | null;
    box_cost_cents: number | null;
    suggested_price_cents: number | null;
  };
}
const empty = () => ({
  name: '',
  variant: '',
  yield: '',
  packaging: '',
  labor: '',
  overhead: '',
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
      <h1>Insumos e embalagens</h1>
      <Link to="/gestao/fichas">Fichas técnicas</Link>
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
          <label>
            Preço da embalagem (R$, vazio se desconhecido)
            <input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Ativo
          </label>
          <button disabled={save.busy}>Salvar insumo</button>
          <button type="button" onClick={reset}>
            Limpar insumo
          </button>
        </form>
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
            <button
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
            </button>
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
export function Recipes() {
  const view = useRemote<{ role: string; items: Recipe[] }>('p1/recipes'),
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
      <h1>Fichas técnicas e preço sugerido</h1>
      <div className="actions">
        <Link className="button" to="/gestao/insumos">
          Insumos e embalagens
        </Link>
        <Link className="button" to="/gestao/compras">
          Lista de compras
        </Link>
      </div>
      <Failure
        message={save.error || view.error || supplies.error || products.error}
      />
      <p role="status">{save.notice}</p>
      {view.data?.role === 'owner' && (
        <form
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
          <label>
            Rendimento do lote (unidades produzidas)
            <input
              type="number"
              min={1}
              max={1000000}
              required
              value={form.yield}
              onChange={(e) => setForm({ ...form, yield: e.target.value })}
            />
          </label>
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
                <button
                  type="button"
                  onClick={() =>
                    setComponents(components.filter((_, j) => j !== i))
                  }
                >
                  Remover componente {i + 1}
                </button>
              )}
            </fieldset>
          ))}
          <button
            type="button"
            disabled={components.length >= 50}
            onClick={() =>
              setComponents([...components, { supply_id: '', quantity: '' }])
            }
          >
            Adicionar componente
          </button>
          {(
            [
              ['packaging', 'Embalagens por lote (R$)'],
              ['labor', 'Mão de obra por lote (R$)'],
              ['overhead', 'Outros custos por lote (R$)'],
              ['margin', 'Margem desejada (%)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                required
                inputMode="decimal"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
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
          <button disabled={save.busy}>Salvar ficha</button>
          <button type="button" onClick={reset}>
            Limpar ficha
          </button>
        </form>
      )}
      <section className="panel">
        <h2>Simulador de margem</h2>
        <label>
          Simular margem (%)
          <input
            inputMode="decimal"
            value={simulation}
            onChange={(e) => setSimulation(e.target.value)}
          />
        </label>
        <p>
          De 0 a 95%. Simulação local sobre o custo estimado da embalagem; não
          salva ficha nem muda preço comercial.
        </p>
      </section>
      {view.data?.items.map((r) => (
        <article className="panel" key={r.id}>
          <h2>
            {r.name} · {r.active ? 'Ativa' : 'Inativa'}
          </h2>
          <p>
            Rende {r.yield_units} unidades; margem alvo{' '}
            {(r.margin_bps / 100).toLocaleString('pt-BR')}%.
          </p>
          <ul>
            {r.components.map((c) => (
              <li key={c.supply_id}>
                {c.name}: {quantityInput(c.quantity_milli)} {unitName(c.unit)}
              </li>
            ))}
          </ul>
          {r.estimate.missing.length > 0 ? (
            <p role="alert">
              Custo pendente: {r.estimate.missing.join(', ')}. Não há sugestão
              de preço.
            </p>
          ) : (
            <>
              <p>
                Custo estimado do lote: {money(r.estimate.total_cents!)} · por
                unidade: {money(r.estimate.unit_cost_cents!)}
              </p>
              {r.estimate.suggested_price_cents !== null ? (
                <p>
                  Custo por embalagem vendida:{' '}
                  {money(r.estimate.box_cost_cents!)} · preço sugerido:{' '}
                  {money(r.estimate.suggested_price_cents)}
                </p>
              ) : (
                <p>Vincule uma variante para estimar o preço da embalagem.</p>
              )}
            </>
          )}
          {view.data!.role === 'owner' && (
            <button
              onClick={() => {
                setEditing(r);
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
            </button>
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
            Estimativa com arredondamento para cima; não altera preços, pedidos
            ou caixa automaticamente.
          </p>
        </article>
      ))}
    </>
  );
}
