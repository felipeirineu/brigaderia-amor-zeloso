import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from './Button';
import { ConfirmContext, type AskConfirmation } from './confirm-context';
interface Question {
  message: string;
  action: string;
}
export function ConfirmSheet({
  question,
  onResult,
}: {
  question: Question | null;
  onResult: (confirmed: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const sheet = dialog.current;
    if (!sheet) return;
    if (question && !sheet.open) {
      sheet.returnValue = '';
      sheet.showModal();
    }
    if (!question && sheet.open) sheet.close('cancel');
  }, [question]);
  return (
    <dialog
      ref={dialog}
      className="help-sheet confirm-sheet"
      aria-labelledby={id}
      aria-describedby={id + '-message'}
      onClose={() => onResult(dialog.current?.returnValue === 'confirmed')}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialog.current?.close('cancel');
      }}
    >
      <div className="sheet-body">
        <h2 id={id}>Tem certeza?</h2>
        <p id={id + '-message'}>{question?.message}</p>
        <div className="actions action-pair">
          <Button
            type="button"
            autoFocus
            onClick={() => dialog.current?.close('cancel')}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => dialog.current?.close('confirmed')}
          >
            {question?.action ?? 'Confirmar'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
export function ConfirmProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const [question, setQuestion] = useState<Question | null>(null);
  const pending = useRef<{
    resolve: (yes: boolean) => void;
    trigger: HTMLElement | null;
  } | null>(null);
  const location = useLocation();
  const finish = useCallback((yes: boolean) => {
    const current = pending.current;
    if (!current) return;
    pending.current = null;
    setQuestion(null);
    if (current.trigger?.isConnected) current.trigger.focus();
    current.resolve(yes);
  }, []);
  const ask = useCallback<AskConfirmation>(
    (message, action = 'Confirmar') => {
      if (!enabled || pending.current) return Promise.resolve(false);
      return new Promise((resolve) => {
        pending.current = {
          resolve,
          trigger:
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null,
        };
        setQuestion({ message, action });
      });
    },
    [enabled],
  );
  // Voltar/trocar de tela ou perder conexão nunca confirma uma operação pendente.
  useEffect(() => {
    finish(false);
  }, [location.key, enabled, finish]);
  useEffect(() => {
    const hide = () => finish(false);
    window.addEventListener('pagehide', hide);
    return () => window.removeEventListener('pagehide', hide);
  }, [finish]);
  useEffect(
    () => () => {
      pending.current?.resolve(false);
      pending.current = null;
    },
    [],
  );
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <ConfirmSheet question={question} onResult={finish} />
    </ConfirmContext.Provider>
  );
}
