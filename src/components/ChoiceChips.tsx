import { Button } from './Button';
export function ChoiceChips({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <fieldset className="choice-chips">
      <legend>{label}</legend>
      <div className="chips">
        {options.map(([id, text]) => (
          <Button
            key={id}
            type="button"
            variant="chip"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            {text}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
