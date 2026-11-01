import { useId, useRef } from 'react';
import { CircleHelp, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { helpTexts, type HelpTopic } from '../features/help/texts';
export function HelpTip({ topic }: { topic: HelpTopic }) {
  const trigger = useRef<HTMLButtonElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    id = useId();
  const text = helpTexts[topic];
  return (
    <>
      <button
        type="button"
        className="help-trigger"
        ref={trigger}
        aria-label={`Ajuda: ${text.title}`}
        onClick={() => dialog.current?.showModal()}
      >
        <CircleHelp size={20} aria-hidden="true" />
      </button>
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
          <button
            className="sheet-close"
            aria-label="Fechar ajuda"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
          <h2 id={id}>{text.title}</h2>
          <p>{text.text}</p>
          <Link to="/gestao/ajuda" onClick={() => dialog.current?.close()}>
            Ver no tutorial
          </Link>
        </div>
      </dialog>
    </>
  );
}
