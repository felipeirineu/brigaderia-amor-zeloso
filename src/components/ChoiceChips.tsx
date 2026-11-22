import type { ReactNode } from 'react';
import { Button } from './Button';
export function ChoiceChips({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  className?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, ReactNode])[];
}) {
  return (
    <fieldset className={'choice-chips ' + className}>
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
