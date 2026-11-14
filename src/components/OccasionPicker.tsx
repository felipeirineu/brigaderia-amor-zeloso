import {
  occasionValues,
  occasionLabels,
  type Occasion,
} from '../../shared/customer-order';
import { ChoiceChips } from './ChoiceChips';
export function OccasionPicker({
  value,
  onChange,
}: {
  value: Occasion;
  onChange: (value: Occasion) => void;
}) {
  return (
    <ChoiceChips
      label="Ocasião (opcional)"
      value={value}
      onChange={(v) => onChange(v as Occasion)}
      options={occasionValues.map((v) => [v, occasionLabels[v]] as const)}
    />
  );
}
