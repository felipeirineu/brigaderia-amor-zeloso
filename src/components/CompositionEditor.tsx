import { QuantityField } from './NumericInputs';
import type { ItemInput } from '../../shared/mixed';
import { compositionValid, type CompositionOption } from './composition';
/** A quantidade da linha continua sendo caixas; estes controles são unidades por caixa. */
export function CompositionEditor({
  item,
  options,
  onChange,
  enabled,
}: {
  item: ItemInput & { id?: string };
  options: CompositionOption[];
  onChange: (item: ItemInput & { id?: string }) => void;
  enabled: boolean;
}) {
  const base = options.find((v) => v.id === item.variant_id),
    mixed = !!item.components;
  const compatible = options.filter(
    (v) =>
      v.units_per_box === base?.units_per_box &&
      v.weight_grams === base?.weight_grams,
  );
  const sum = item.components?.reduce((n, c) => n + c.units, 0) ?? 0;
  return (
    <div className="composition-editor">
      <label>
        <input
          type="checkbox"
          checked={mixed}
          disabled={!enabled || !base}
          onChange={(e) =>
            onChange({
              ...item,
              components: e.target.checked
                ? [{ variant_id: item.variant_id, units: base!.units_per_box }]
                : undefined,
            })
          }
        />{' '}
        Caixa Mista
      </label>
      {mixed && (
        <>
          <p role="status">
            {sum} de {base?.units_per_box ?? '?'} unidades por caixa.{' '}
            {!base
              ? 'Embalagem indisponível; remova este item para selecionar novos sabores.'
              : compositionValid(item, options)
                ? 'Composição completa.'
                : 'Ajuste a soma antes de salvar.'}
          </p>
          {compatible.map((v) => (
            <QuantityField
              key={v.id}
              label={'Unidades de ' + v.name}
              min="0"
              max={base?.units_per_box ?? 10000}
              value={
                item.components?.find((c) => c.variant_id === v.id)?.units ?? 0
              }
              onValueChange={(value) => {
                const parts = [
                  ...(item.components ?? []).filter(
                    (c) => c.variant_id !== v.id,
                  ),
                  { variant_id: v.id, units: Number(value) },
                ].filter((c) => c.units > 0);
                const dominant = [...parts].sort(
                  (a, b) =>
                    b.units - a.units ||
                    a.variant_id.localeCompare(b.variant_id),
                )[0];
                onChange({
                  ...item,
                  item_id:
                    dominant && dominant.variant_id !== item.variant_id
                      ? undefined
                      : item.item_id,
                  id:
                    dominant && dominant.variant_id !== item.variant_id
                      ? undefined
                      : item.id,
                  variant_id: dominant?.variant_id ?? item.variant_id,
                  components: parts,
                });
              }}
            />
          ))}
          <p>
            O sabor com mais unidades define a embalagem e o preço. Confira a
            prévia do pedido.
          </p>
        </>
      )}
    </div>
  );
}
