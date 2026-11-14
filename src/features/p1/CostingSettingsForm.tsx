import { useState } from 'react';
import { Button } from '../../components/Button';
import type {
  CostingSettings,
  WeightSupply,
} from '../../../shared/weight-costing';
import type { Kit } from '../../../shared/kits';
import { PercentField, SupplyPicker } from './WeightCostFields';
export function CostingSettingsForm({
  value,
  version,
  supplies,
  kits,
  busy,
  onSave,
}: {
  value: CostingSettings;
  version: number;
  supplies: WeightSupply[];
  kits: Kit[];
  busy: boolean;
  onSave: (v: object) => void;
}) {
  const [data, setData] = useState(value),
    change = (d: Partial<CostingSettings>) => setData({ ...data, ...d });
  const sizes = [
    ...new Set([
      ...kits.map((k) => k.weight_grams),
      ...data.liners.map((s) => s.weight_grams),
    ]),
  ].sort((a, b) => a - b);
  return (
    <form
      className="panel data-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ version, data });
      }}
    >
      <h2>Configuração da calculadora</h2>
      <PercentField
        label="Custos incalculáveis (%)"
        value={data.overhead_bps}
        onChange={(n) => change({ overhead_bps: n })}
      />
      <p>
        O adicional é aplicado ao total, incluindo a embalagem, antes da margem.
      </p>
      <fieldset>
        <legend>Forminhas por tamanho</legend>
        {sizes.map((weight) => (
          <SupplyPicker
            key={weight}
            label={`Forminha para ${weight} g${weight === 30 ? ' — nº 4 sugerida' : weight === 15 || weight === 23 ? ' — nº 5 sugerida' : ''}`}
            value={
              data.liners.find((s) => s.weight_grams === weight)?.supply_id ??
              null
            }
            unitOnly
            supplies={supplies}
            onChange={(supply_id) =>
              change({
                liners: [
                  ...data.liners.filter((s) => s.weight_grams !== weight),
                  { weight_grams: weight, supply_id },
                ],
              })
            }
          />
        ))}
      </fieldset>
      <fieldset>
        <legend>Opcionais por doce</legend>
        <p>
          Marque os insumos em unidades que podem ser usados como fundo rendado,
          pétala ou outro opcional. Ficam fora da ficha e do cálculo padrão.
        </p>
        {supplies
          .filter(
            (s) =>
              s.unit === 'unit' &&
              (s.active || data.optional_supply_ids.includes(s.id)),
          )
          .map((s) => (
            <label key={s.id}>
              <input
                type="checkbox"
                checked={data.optional_supply_ids.includes(s.id)}
                onChange={(e) =>
                  change({
                    optional_supply_ids: e.target.checked
                      ? [...data.optional_supply_ids, s.id]
                      : data.optional_supply_ids.filter((id) => id !== s.id),
                  })
                }
              />
              {s.name}
            </label>
          ))}
      </fieldset>
      <fieldset>
        <legend>Canal iFood</legend>
        <PercentField
          label="Repasse do iFood (%)"
          value={data.ifood_divisor_bps}
          onChange={(n) => change({ ifood_divisor_bps: n })}
        />
        <p>
          O iFood fica com{' '}
          {((10000 - data.ifood_divisor_bps) / 100).toLocaleString('pt-BR')}%.
        </p>
        <SupplyPicker
          label="Embalagem iFood (vazio usa a do kit)"
          value={data.ifood_packaging_supply_id}
          supplies={supplies}
          unitOnly
          onChange={(id) => change({ ifood_packaging_supply_id: id })}
        />
        <SupplyPicker
          label="Etiqueta iFood"
          value={data.ifood_label_supply_id}
          supplies={supplies}
          unitOnly
          onChange={(id) => change({ ifood_label_supply_id: id })}
        />
        <SupplyPicker
          label="Sacola de envio iFood"
          value={data.ifood_bag_supply_id}
          supplies={supplies}
          unitOnly
          onChange={(id) => change({ ifood_bag_supply_id: id })}
        />
        <p>
          1 kit por pedido e 1 sacola de envio por pedido. Cadastre embalagens e
          etiquetas nos Insumos; preço não informado deixa o resultado
          indisponível.
        </p>
      </fieldset>
      <Button disabled={busy} variant="primary">
        Salvar configuração de custos
      </Button>
    </form>
  );
}
