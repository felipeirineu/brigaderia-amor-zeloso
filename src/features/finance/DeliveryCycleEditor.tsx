import { QuantityField } from '../../components/NumericInputs';
import {
  deliveryCycleDefault,
  deliveryCycleMax,
  deliveryCycleMin,
} from '../../../shared/delivery-cycle';
import type { Terms } from '../../../shared/finance';

export function DeliveryCycleEditor({
  value,
  onChange,
}: {
  value: Terms;
  onChange: (terms: Terms) => void;
}) {
  const count = value.every_deliveries ?? deliveryCycleDefault;
  return (
    <div className="delivery-cycle-editor">
      <QuantityField
        label="Quantas entregas"
        value={count}
        min={deliveryCycleMin}
        max={deliveryCycleMax}
        steppers
        onValueChange={(number) =>
          onChange({ ...value, every_deliveries: Number(number) })
        }
      />
      <p className="wizard-hint">
        Cobra na {count}ª entrega, somando as {count}. O Hoje avisa no dia.
      </p>
      <label>
        Pagar
        <input readOnly value={`Na ${count}ª entrega (no dia dela)`} />
      </label>
    </div>
  );
}
