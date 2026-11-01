import type { Terms } from '../../../shared/finance';
export function TermsEditor({
  value,
  onChange,
}: {
  value: Terms;
  onChange: (v: Terms) => void;
}) {
  return (
    <fieldset>
      <legend>Condição de pagamento</legend>
      <label>
        Quando cobrar
        <select
          value={value.mode}
          onChange={(e) =>
            onChange({ ...value, mode: e.target.value as Terms['mode'] })
          }
        >
          <option value="unset">A definir</option>
          <option value="advance">Adiantado</option>
          <option value="delivery">Na entrega</option>
          <option value="credit">A prazo com fechamento</option>
        </select>
      </label>
      {value.mode === 'credit' && (
        <>
          <label>
            Periodicidade
            <select
              value={value.cycle}
              onChange={(e) =>
                onChange({ ...value, cycle: e.target.value as Terms['cycle'] })
              }
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="fixed_days">Dias fixos do mês</option>
              <option value="fourteen_days">A cada 14 dias</option>
            </select>
          </label>
          {value.cycle === 'fixed_days' && (
            <label>
              Dias de fechamento (separados por vírgula; 31 significa fim do
              mês)
              <input
                defaultValue={value.fixed_days.join(',')}
                onChange={(e) =>
                  onChange({
                    ...value,
                    fixed_days: e.target.value
                      .split(',')
                      .filter((v) => v.trim())
                      .map(Number),
                  })
                }
              />
            </label>
          )}
          {value.cycle === 'fourteen_days' && (
            <label>
              Data-base
              <input
                type="date"
                required
                value={value.base_date}
                onChange={(e) =>
                  onChange({ ...value, base_date: e.target.value })
                }
              />
            </label>
          )}
          {value.cycle === 'weekly' && (
            <label>
              Dia de encerramento
              <select
                value={value.week_end}
                onChange={(e) =>
                  onChange({ ...value, week_end: Number(e.target.value) })
                }
              >
                {[
                  'Segunda',
                  'Terça',
                  'Quarta',
                  'Quinta',
                  'Sexta',
                  'Sábado',
                  'Domingo',
                ].map((d, i) => (
                  <option key={d} value={i + 1}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Prazo após fechamento (dias)
            <input
              type="number"
              required
              min={0}
              max={365}
              value={value.due_days ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  due_days:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </label>
        </>
      )}
      <p>
        Condição não registra pagamento. Novos pedidos guardam uma cópia;
        mudanças no cliente não alteram pedidos anteriores.
      </p>
    </fieldset>
  );
}
