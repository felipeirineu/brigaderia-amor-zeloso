import { Button } from './Button';
import { useId, useRef } from 'react';
import { CircleHelp, X } from 'lucide-react';

import { helpTexts, type HelpTopic } from '../features/help/texts';
export function HelpTip({ topic }: { topic: HelpTopic }) {
  const trigger = useRef<HTMLButtonElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    id = useId();
  const text = helpTexts[topic];
  return (
    <>
      <Button
        type="button"
        className="help-trigger"
        ref={trigger}
        aria-label={`Ajuda: ${text.title}`}
        onClick={() => dialog.current?.showModal()}
      >
        <CircleHelp size={20} aria-hidden="true" />
      </Button>
      <dialog
        className="help-sheet"
        ref={dialog}
        aria-labelledby={id}
        onClose={() => trigger.current?.focus()}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="sheet-body">
          <Button
            className="sheet-close"
            aria-label="Fechar ajuda"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </Button>
          <h2 id={id}>{text.title}</h2>
          <p>{text.text}</p>
          <Button
            to="/gestao/ajuda"
            onClick={() => dialog.current?.close()}
            variant="ghost"
          >
            Ver no tutorial
          </Button>
        </div>
      </dialog>
    </>
  );
}
