import { useState } from 'react';
import { DisclosureSummary } from '../../components/DisclosureSummary';
import { Button } from '../../components/Button';
import { ChoiceChips } from '../../components/ChoiceChips';
import { Failure, useRemote } from '../operations/common';
import { money } from '../api';
import { useP1Save } from './useP1Save';
import { WeightRecipeForm, type WeightProfile } from './WeightRecipeForm';
import { CostingSettingsForm } from './CostingSettingsForm';
import { PercentField } from './WeightCostFields';
import { quantityInput, unitName } from './quantity';
import { kitLabel, type Kit } from '../../../shared/kits';
import type {
  CostingSettings,
  WeightSupply,
  calculateWeightKit,
} from '../../../shared/weight-costing';
const amount = (n: number | null) => (n === null ? 'Indisponível' : money(n));
function Calculation({
  profile,
  settings,
  supplies,
}: {
  profile: WeightProfile;
  settings: CostingSettings;
  supplies: WeightSupply[];
}) {
  const [selected, setSelected] = useState<string[]>([]),
    [margin, setMargin] = useState(profile.data.margin_bps);
  const view = useRemote<{
    rows: ReturnType<typeof calculateWeightKit>[];
    rounding: string;
  }>(
    `p1/weight-recipes/${profile.id}/calculate?optional=${selected.join(',')}&margin=${margin}`,
  );
  return (
    <section aria-label="Simulação por peso">
      <h2>Calcular {profile.product_name}</h2>
      <p>
        Consulta de custos atuais. Não modifica preços de kits, pedidos,
        despesas ou estoque.
      </p>
      <details className="panel">
        <DisclosureSummary>
          Ler ficha: quantidades e rendimentos
        </DisclosureSummary>
        <p>
          {profile.data.mass_milli !== null
            ? `Massa total: ${quantityInput(profile.data.mass_milli)} g`
            : `Referência: ${profile.data.reference_yield} doces de ${quantityInput(profile.data.reference_dough_milli)} g de massa · ${profile.data.reference_confirmed ? 'conferida' : 'estimativa'}`}
        </p>
        <ul>
          {profile.data.components.map((c, i) => {
            const supply = supplies.find((s) => s.id === c.supply_id),
              unit = supply ? unitName(supply.unit) : 'unidade pendente';
            return (
              <li key={i}>
                {supply?.name ?? 'Insumo indisponível'} ·{' '}
                {c.group === 'dough'
                  ? 'massa'
                  : c.group === 'batch'
                    ? 'custo por receita'
                    : 'acabamento'}
                :{' '}
                {c.group === 'finish'
                  ? c.sizes
                      .map(
                        (s) =>
                          `${s.weight_grams} g: ${quantityInput(s.quantity_milli)} ${unit}/doce${s.estimated ? ' (estimativa aceita)' : ''}`,
                      )
                      .join('; ')
                  : `${quantityInput(c.quantity_milli)} ${unit} por receita`}
              </li>
            );
          })}
        </ul>
        {profile.data.measured.map((m) => (
          <p key={`${m.weight_grams}/${m.dough_milli}`}>
            Medido: {m.yield_units} doces de {m.weight_grams} g (massa{' '}
            {quantityInput(m.dough_milli)} g por doce).
          </p>
        ))}
      </details>
      <PercentField
        label="Simular margem (%)"
        value={margin}
        onChange={setMargin}
      />
      <fieldset>
        <legend>Usar opcionais nesta simulação</legend>
        {settings.optional_supply_ids.map((id) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={selected.includes(id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, id]
                    : selected.filter((s) => s !== id),
                )
              }
            />
            {supplies.find((s) => s.id === id)?.name ?? 'Opcional indisponível'}{' '}
            — 1 por doce
          </label>
        ))}
        {!settings.optional_supply_ids.length && (
          <p>Nenhum opcional configurado.</p>
        )}
      </fieldset>
      <Button onClick={() => void view.refresh()}>
        Recalcular custos atuais
      </Button>
      <Failure message={view.error} />
      {view.data && (
        <>
          <p>{view.data.rounding}</p>
          <div className="weight-cost-grid">
            {view.data.rows.map((row) => (
              <article className="panel weight-cost-card" key={row.kit.id}>
                <h3>{kitLabel(row.kit)}</h3>
                <p>
                  Rendimento:{' '}
                  {row.yield
                    ? `${row.yield.units} doces${row.yield.estimated ? ' · estimativa' : ' · medido/conferido'}`
                    : 'Indisponível'}{' '}
                  · massa por doce:{' '}
                  {row.kit.dough_weight_grams ?? 'não informada'} g
                </p>
                {row.missing.length > 0 && (
                  <div role="alert">
                    <strong>Custo indisponível</strong>
                    <ul>
                      {row.missing.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {row.suggestions.map((s) => (
                  <p key={s.supply_id}>
                    Sugestão não aplicada: {s.name} para {s.weight_grams} g →{' '}
                    {(s.quantity_milli / 1000).toLocaleString('pt-BR', {
                      maximumFractionDigits: 3,
                    })}{' '}
                    por doce, estimado pela superfície a partir de{' '}
                    {s.from_weight} g. O administrador pode aceitar na ficha.
                  </p>
                ))}
                <dl>
                  <dt>Custo da receita (massa e custos por receita)</dt>
                  <dd>{amount(row.recipe_cents)}</dd>
                  <dt>Custo por doce</dt>
                  <dd>{amount(row.unit_cost_cents)}</dd>
                  <dt>Embalagem do kit</dt>
                  <dd>{amount(row.packaging_cents)}</dd>
                  <dt>Custo calculado</dt>
                  <dd>{amount(row.calculated_cents)}</dd>
                  <dt>Com adicional de {row.overhead_bps / 100}%</dt>
                  <dd>{amount(row.adjusted_cents)}</dd>
                  <dt>Preço da tabela</dt>
                  <dd>{money(row.kit.price_cents)}</dd>
                  <dt>Margem da tabela</dt>
                  <dd>
                    {row.table_margin_bps === null
                      ? 'Indisponível'
                      : (row.table_margin_bps / 100).toLocaleString('pt-BR') +
                        '%'}
                  </dd>
                  <dt>Preço sugerido ({row.margin_bps / 100}% de margem)</dt>
                  <dd>{amount(row.suggested_price_cents)}</dd>
                </dl>
                <p>
                  Custo calculado {amount(row.calculated_cents)} +{' '}
                  {row.overhead_bps / 100}% = {amount(row.adjusted_cents)}.
                </p>
                <details>
                  <DisclosureSummary>
                    Detalhar ingredientes e acabamento
                  </DisclosureSummary>
                  {row.details.map((d, i) => (
                    <p key={i}>
                      {d.name} ·{' '}
                      {d.group === 'dough'
                        ? 'massa/receita'
                        : d.group === 'batch'
                          ? 'custo/receita'
                          : d.group === 'liner'
                            ? 'forminha/doce'
                            : d.group === 'optional'
                              ? 'opcional/doce'
                              : 'acabamento/doce'}
                      : {amount(d.cents)}
                      {d.estimated ? ' · estimativa aceita' : ''}
                    </p>
                  ))}
                </details>
                <h4>Preço no iFood</h4>
                <p>
                  {row.ifood.assumption} O iFood fica com{' '}
                  {row.ifood.fee_bps / 100}%.
                </p>
                <p>
                  Embalagem: {amount(row.ifood.packaging_cents)} · etiqueta:{' '}
                  {amount(row.ifood.label_cents)} · sacola:{' '}
                  {amount(row.ifood.bag_cents)}.
                </p>
                {row.ifood.missing.length > 0 && (
                  <ul>
                    {row.ifood.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
                {(['table', 'suggested'] as const).map((key) => {
                  const line = row.ifood[key],
                    base =
                      key === 'table'
                        ? row.kit.price_cents
                        : row.suggested_price_cents;
                  return (
                    <p key={key}>
                      {key === 'table'
                        ? 'Com preço da tabela'
                        : 'Com preço sugerido'}
                      :{' '}
                      {line
                        ? `(${amount(base)} + ${amount(row.ifood.packaging_cents)} + ${amount(row.ifood.label_cents)} + ${amount(row.ifood.bag_cents)}) ÷ ${(line.divisor_bps / 10000).toLocaleString('pt-BR')} = ${money(line.price_cents)}`
                        : 'Indisponível'}
                    </p>
                  );
                })}
              </article>
            ))}
          </div>
          {!view.data.rows.length && (
            <p>Cadastre kits ativos com peso de massa para calcular.</p>
          )}
        </>
      )}
    </section>
  );
}
export function WeightRecipes() {
  const view = useRemote<{ role: string; items: WeightProfile[] }>(
      'p1/weight-recipes',
    ),
    settings = useRemote<{
      role: string;
      data: CostingSettings;
      version: number;
    }>('p1/costing-settings'),
    supplies = useRemote<{ items: WeightSupply[] }>('p1/supplies'),
    products = useRemote<
      { id: string; name: string; photo_key: string | null }[]
    >('products?active=all'),
    kits = useRemote<Kit[]>('p1/kits');
  const save = useP1Save(view.refresh),
    configSave = useP1Save(settings.refresh),
    [editing, setEditing] = useState<WeightProfile | null | undefined>(
      undefined,
    ),
    [epoch, setEpoch] = useState(0),
    [chosen, setChosen] = useState('');
  const available =
      view.data?.items.filter((r) => r.active && r.product_active !== 0) ?? [],
    selected = available.find((r) => r.id === chosen) ?? available[0];
  const isOwner = view.data?.role === 'owner';
  return (
    <>
      <Button to="/gestao/fichas" variant="ghost" className="ghost-inline">
        Fichas anteriores
      </Button>
      <h1 className="mobile-context-title">Calculadora por peso</h1>
      <Failure
        message={
          view.error ||
          settings.error ||
          supplies.error ||
          products.error ||
          kits.error ||
          save.error ||
          configSave.error
        }
      />
      <p role="status">{save.notice || configSave.notice}</p>
      <p>
        Uma ficha é uma receita (referência: 1 lata de leite condensado).
        Selecione os insumos cadastrados; custos desconhecidos ficam
        indisponíveis. Rendimento calculado e acabamento proporcional são
        estimativas identificadas.
      </p>
      <div className="actions">
        <Button to="/gestao/insumos" variant="ghost">
          Insumos
        </Button>
        <Button to="/gestao/kits" variant="ghost">
          Tamanhos e kits
        </Button>
        {isOwner && (
          <Button
            onClick={() => {
              setEditing(null);
              setEpoch((n) => n + 1);
            }}
            variant="primary"
          >
            Nova ficha por peso
          </Button>
        )}
      </div>
      {editing !== undefined && (
        <WeightRecipeForm
          key={epoch}
          editing={editing}
          products={(products.data ?? []).filter(
            (p) =>
              p.id === editing?.product_id ||
              !view.data?.items.some((r) => r.product_id === p.id),
          )}
          kits={kits.data ?? []}
          supplies={supplies.data?.items ?? []}
          busy={save.busy}
          onCancel={() => setEditing(undefined)}
          onSave={(data) =>
            void save.save(
              'p1/weight-recipes' + (editing ? '/' + editing.id : ''),
              data,
              editing ? 'PUT' : 'POST',
              () => setEditing(undefined),
            )
          }
        />
      )}
      {isOwner && (
        <div className="actions">
          {view.data?.items.map((r) => (
            <Button
              key={r.id}
              onClick={() => {
                setEditing(r);
                setEpoch((n) => n + 1);
              }}
            >
              Editar ficha de {r.product_name}
              {r.active ? '' : ' · Inativa'}
            </Button>
          ))}
        </div>
      )}
      {available.length > 0 ? (
        <>
          <ChoiceChips
            label="Sabor para calcular"
            value={selected?.id ?? ''}
            onChange={setChosen}
            options={available.map((r) => [r.id, r.product_name])}
          />
          {selected && settings.data && (
            <Calculation
              key={`${selected.id}/${selected.version}/${settings.data.version}`}
              profile={selected}
              settings={settings.data.data}
              supplies={supplies.data?.items ?? []}
            />
          )}
        </>
      ) : (
        !view.error && (
          <p>
            Nenhuma ficha por peso cadastrada. As fichas anteriores continuam
            disponíveis.
          </p>
        )
      )}
      {isOwner && settings.data && (
        <details className="panel">
          <DisclosureSummary>
            Forminhas, opcionais e canal iFood
          </DisclosureSummary>
          <CostingSettingsForm
            key={settings.data.version}
            value={settings.data.data}
            version={settings.data.version}
            kits={kits.data ?? []}
            supplies={supplies.data?.items ?? []}
            busy={configSave.busy}
            onSave={(data) =>
              void configSave.save('p1/costing-settings', data, 'PUT')
            }
          />
        </details>
      )}
    </>
  );
}
