import { useEffect, useId, useRef, useState } from 'react';
import { Button } from './Button';
import { promptError, type PromptOptions } from './prompt-value';
export interface PromptQuestion extends PromptOptions {
  message: string;
}
/** Cada solicitação monta um formulário novo; motivos/valores ficam somente em memória. */
export function PromptSheet({
  question,
  onResult,
}: {
  question: PromptQuestion;
  onResult: (value: string | null) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    id = useId();
  const [value, setValue] = useState(question.initialValue ?? ''),
    [touched, setTouched] = useState(false);
  const result = useRef<string | null>(null);
  const error = promptError(value, question);
  useEffect(() => {
    const sheet = dialog.current;
    sheet?.showModal();
    return () => sheet?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="help-sheet prompt-sheet"
      aria-labelledby={id + '-title'}
      onClose={() =>
        onResult(
          dialog.current?.returnValue === 'confirmed' ? result.current : null,
        )
      }
      onClick={(e) => {
        if (e.target === e.currentTarget) dialog.current?.close('cancel');
      }}
    >
      <form
        className="sheet-body"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (error) return;
          result.current = value.trim();
          dialog.current?.close('confirmed');
        }}
      >
        <h2 id={id + '-title'}>{question.title ?? 'Informe o motivo'}</h2>
        <label htmlFor={id + '-input'}>{question.message}</label>
        {question.kind === 'money' ? (
          <input
            id={id + '-input'}
            autoFocus
            inputMode="decimal"
            value={value}
            required
            aria-invalid={touched && !!error}
            aria-describedby={touched && error ? id + '-error' : undefined}
            onChange={(e) => {
              setValue(e.target.value);
              setTouched(true);
            }}
          />
        ) : (
          <textarea
            id={id + '-input'}
            autoFocus
            value={value}
            required
            maxLength={500}
            aria-invalid={touched && !!error}
            aria-describedby={touched && error ? id + '-error' : undefined}
            onChange={(e) => {
              setValue(e.target.value);
              setTouched(true);
            }}
          />
        )}
        {touched && error && (
          <p id={id + '-error'} role="alert">
            {error}
          </p>
        )}
        <div className="actions action-pair">
          <Button type="button" onClick={() => dialog.current?.close('cancel')}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" disabled={!!error}>
            {question.action ?? 'Continuar'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
