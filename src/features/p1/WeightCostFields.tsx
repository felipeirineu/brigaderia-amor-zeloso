import { useId, useState } from 'react';
import type { WeightSupply } from '../../../shared/weight-costing';
import { parseMilli, quantityInput, unitName } from './quantity';
/** Texto incompleto não troca quantidade salva; validação nativa impede submit inválido. */
export function DecimalField({
  label,
  value,
  onChange,
  required = false,
  places = 3,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  required?: boolean;
  places?: 2 | 3;
}) {
  const [draft, setDraft] = useState<{
    value: number | null;
    text: string;
  } | null>(null);
  const text =
    draft?.value === value
      ? draft.text
      : value === null
        ? ''
        : quantityInput(value);
  const valid =
    text === '' || new RegExp(`^[0-9]{1,9}(,[0-9]{1,${places}})?$`).test(text);
  return (
    <label>
      {label}
      <input
        type="text"
        inputMode="decimal"
        required={required}
        pattern={`[0-9]{1,9}(,[0-9]{1,${places}})?`}
        value={text}
        aria-invalid={!valid}
        onChange={(e) => {
          const text = e.target.value;
          if (text === '') {
            setDraft({ value: null, text });
            onChange(null);
            return;
          }
          try {
            const n = parseMilli(text);
            setDraft({ value: n, text });
            onChange(n);
          } catch {
            setDraft({ value, text });
          }
        }}
      />
      {!valid && (
        <small role="alert">
          Informe quantidade com até {places} casas decimais e vírgula.
        </small>
      )}
    </label>
  );
}
export function PercentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <DecimalField
      label={label}
      places={2}
      value={value * 10}
      required
      onChange={(n) => {
        if (n !== null && n % 10 === 0) onChange(n / 10);
      }}
    />
  );
}
export function SupplyPicker({
  label,
  value,
  onChange,
  supplies,
  unitOnly = false,
}: {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  supplies: WeightSupply[];
  unitOnly?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Não configurado</option>
        {supplies
          .filter(
            (s) =>
              (s.active || s.id === value) && (!unitOnly || s.unit === 'unit'),
          )
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {unitName(s.unit)}
              {!s.active ? ' · Inativo' : ''}
            </option>
          ))}
      </select>
    </div>
  );
}
