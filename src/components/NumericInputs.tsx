import { useId, useRef, useState, type InputHTMLAttributes } from 'react';
import { centsFromDigits, displayCents, MAX_MONEY, readCents } from './numeric';
type Base = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'inputMode' | 'min' | 'max' | 'pattern'
> & { label?: string };
export function MoneyInput({
  value,
  label,
  onValueChange,
  maxCents = MAX_MONEY,
  ...props
}: Base & {
  value: number | null;
  onValueChange: (v: number | null) => void;
  maxCents?: number;
}) {
  const [editing, setEditing] = useState(false),
    [digits, setDigits] = useState(''),
    [error, setError] = useState(''),
    [explicit, setExplicit] = useState(false),
    [before, setBefore] = useState<number | null>(value),
    input = useRef<HTMLInputElement>(null),
    id = useId();
  function change(raw: string) {
    const text = raw.replace(/\D/g, '');
    setDigits(text);
    try {
      const n = centsFromDigits(text, maxCents);
      setError('');
      input.current?.setCustomValidity('');
      if (n !== null) {
        onValueChange(n);
        setExplicit(true);
      }
    } catch (e) {
      setError((e as Error).message);
      input.current?.setCustomValidity((e as Error).message);
    }
  }
  function finish() {
    if (error) return;
    if (!digits) onValueChange(before);
    setEditing(false);
  }
  return (
    <span className="numeric-field">
      {label && <label htmlFor={id + '-input'}>{label}</label>}
      <span className="numeric-control">
        <input
          {...props}
          id={props.id ?? id + '-input'}
          ref={input}
          type="text"
          inputMode="numeric"
          required={!!props.required && value === null}
          aria-invalid={!!error}
          aria-describedby={error ? id : props['aria-describedby']}
          value={
            editing
              ? digits
                ? (() => {
                    try {
                      return displayCents(centsFromDigits(digits, maxCents)!);
                    } catch {
                      return digits;
                    }
                  })()
                : ''
              : value !== null && (value !== 0 || explicit)
                ? displayCents(value)
                : ''
          }
          placeholder={
            editing && before !== null && before !== 0
              ? displayCents(before)
              : props.placeholder || 'Informe valor'
          }
          onFocus={() => {
            input.current?.setCustomValidity('');
            setBefore(value);
            setDigits('');
            setError('');
            setEditing(true);
          }}
          onChange={(e) => change(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            change(e.clipboardData.getData('text'));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!error) input.current?.blur();
            }
          }}
          onBlur={finish}
        />
        {editing && (
          <button
            type="button"
            disabled={!!error}
            onClick={() => input.current?.blur()}
          >
            OK
          </button>
        )}
        {error && (
          <small id={id} role="alert">
            {error}
          </small>
        )}
      </span>
    </span>
  );
}
/** Adaptador dos formulários existentes; a máscara e a edição usam apenas centavos inteiros. */
export function MoneyField({
  value,
  onValueChange,
  ...props
}: Base & {
  value: string | number | null;
  onValueChange: (v: string) => void;
}) {
  return (
    <MoneyInput
      {...props}
      value={readCents(value)}
      onValueChange={(v) => onValueChange(v === null ? '' : displayCents(v))}
    />
  );
}
export function QuantityInput({
  value,
  label,
  onValueChange,
  min = 1,
  max = 10000,
  steppers = true,
  ...props
}: Base & {
  value: number | null;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  steppers?: boolean;
}) {
  const [editing, setEditing] = useState(false),
    [digits, setDigits] = useState(''),
    [error, setError] = useState(''),
    [before, setBefore] = useState(value),
    input = useRef<HTMLInputElement>(null),
    id = useId();
  function change(raw: string) {
    const text = raw.replace(/\D/g, '');
    setDigits(text);
    input.current?.setCustomValidity('');
    if (!text) {
      setError('');
      return;
    }
    const n = Number(text);
    if (!Number.isSafeInteger(n) || n < min || n > max) {
      setError(`Informe de ${min} a ${max}.`);
      input.current?.setCustomValidity(`Informe de ${min} a ${max}.`);
      return;
    }
    setError('');
    onValueChange(n);
  }
  function finish() {
    if (error) return;
    if (!digits && before !== null) onValueChange(before);
    setEditing(false);
  }
  const name = props['aria-label'] || 'quantidade';
  return (
    <span className="numeric-field">
      {label && <label htmlFor={id + '-input'}>{label}</label>}
      <span className="numeric-control quantity-control">
        <input
          {...props}
          id={props.id ?? id + '-input'}
          ref={input}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required={!!props.required && value === null}
          value={editing ? digits : (value ?? '')}
          placeholder={
            editing && before !== null
              ? String(before)
              : props.placeholder || 'Quantidade'
          }
          aria-invalid={!!error}
          onFocus={() => {
            input.current?.setCustomValidity('');
            setBefore(value);
            setEditing(true);
            setDigits('');
            setError('');
          }}
          onChange={(e) => change(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            change(e.clipboardData.getData('text'));
          }}
          onBlur={finish}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!error) input.current?.blur();
            }
          }}
        />
        {steppers && (
          <button
            className="quantity-minus"
            type="button"
            aria-label={`Diminuir ${name}`}
            disabled={value === null || value <= min || props.disabled}
            onClick={() => onValueChange(Math.max(min, (value ?? min) - 1))}
          >
            −
          </button>
        )}
        {editing && (
          <button
            type="button"
            disabled={!!error}
            onClick={() => input.current?.blur()}
          >
            OK
          </button>
        )}
        {steppers && (
          <button
            type="button"
            aria-label={`Aumentar ${name}`}
            disabled={(value !== null && value >= max) || props.disabled}
            onClick={() => onValueChange(Math.min(max, (value ?? 0) + 1))}
          >
            +
          </button>
        )}
        {error && <small role="alert">{error}</small>}
      </span>
    </span>
  );
}
export function QuantityField({
  value,
  onValueChange,
  ...props
}: Base & {
  value: string | number;
  onValueChange: (v: string) => void;
  min?: number | string;
  max?: number | string;
  steppers?: boolean;
}) {
  const n = value === '' ? null : Number(value);
  return (
    <QuantityInput
      {...props}
      min={Number(props.min ?? 1)}
      max={Number(props.max ?? 1000000)}
      value={n}
      onValueChange={(v) => onValueChange(String(v))}
    />
  );
}
