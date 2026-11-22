import { DeliveryCycleEditor } from './DeliveryCycleEditor';
import { DueDayInput } from './DueDayInput';
import { HelpTip } from '../../components/HelpTip';
import {
  setTermsCycle,
  setTermsMode,
  type Terms,
} from '../../../shared/finance';
export function TermsEditor({
  value,
  onChange,
  person = false,
}: {
  value: Terms;
  person?: boolean;
  onChange: (v: Terms) => void;
}) {
  return (
    <fieldset>
      <legend>Condição de pagamento</legend>
      <p className="terms-closing-help">
        Entenda as opções <HelpTip topic="payment" />
      </p>
      <label>
        Quando cobrar
        <select
          value={value.mode}
          onChange={(e) =>
            onChange(setTermsMode(value, e.target.value as Terms['mode']))
          }
        >
          <option value="unset">A definir</option>
          <option value="advance">Adiantado</option>
          <option value="delivery">Na entrega</option>
          <option value="next_delivery">Na próxima entrega</option>
          {!person && <option value="credit">A prazo com fechamento</option>}
          {person && value.mode === 'credit' && (
            <option value="credit" disabled>
              A prazo (condição anterior; altere)
            </option>
          )}
        </select>
      </label>
      {person && (
        <p>
          Para pessoa, escolha adiantado, na entrega ou na próxima entrega antes
          de confirmar o pedido.
        </p>
      )}
      {!person && value.mode === 'credit' && (
        <>
          <p className="terms-closing-help">
            Como funciona o fechamento <HelpTip topic="closing" />
          </p>
          <label>
            Periodicidade
            <select
              value={value.cycle}
              onChange={(e) =>
                onChange(setTermsCycle(value, e.target.value as Terms['cycle']))
              }
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="fixed_days">Dias fixos do mês</option>
              <option value="fourteen_days">A cada 14 dias</option>
              <option value="deliveries">A cada X entregas</option>
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
          {value.cycle === 'deliveries' ? (
            <DeliveryCycleEditor value={value} onChange={onChange} />
          ) : (
            <DueDayInput value={value} onChange={onChange} />
          )}
        </>
      )}
      <p>
        Condição não registra pagamento. Novos pedidos guardam uma cópia;
        mudanças no cliente não alteram pedidos anteriores.
      </p>
    </fieldset>
  );
}
