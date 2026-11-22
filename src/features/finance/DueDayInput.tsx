import type { Terms } from '../../../shared/finance';

export function DueDayInput({
  value,
  onChange,
}: {
  value: Terms;
  onChange: (v: Terms) => void;
}) {
  const fixed = value.due_day_of_month != null;
  return (
    <>
      <label>
        Pagar
        <select
          value={fixed ? 'fixed' : 'offset'}
          onChange={(event) =>
            onChange(
              event.target.value === 'fixed'
                ? { ...value, due_days: null, due_day_of_month: 10 }
                : { ...value, due_days: 0, due_day_of_month: undefined },
            )
          }
        >
          <option value="offset">Dias após o fechamento</option>
          <option value="fixed">Dia do mês</option>
        </select>
      </label>
      <label>
        {fixed
          ? 'Dia de vencimento (31 = último dia)'
          : 'Prazo após fechamento (dias)'}
        <input
          type="number"
          required
          min={fixed ? 1 : 0}
          max={fixed ? 31 : 365}
          value={(fixed ? value.due_day_of_month : value.due_days) ?? ''}
          onChange={(event) => {
            const days = event.target.valueAsNumber;
            onChange(
              fixed
                ? { ...value, due_day_of_month: Number.isNaN(days) ? 0 : days }
                : { ...value, due_days: Number.isNaN(days) ? null : days },
            );
          }}
        />
      </label>
    </>
  );
}
