import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { Mascot } from './Mascot';
import {
  compareVersions,
  releaseNotes,
  releasesEnabled,
  shouldAnnounce,
} from '../release-notes';
const key = 'az-release-seen',
  memory = new Set<string>();
const current = __APP_VERSION__;
export function ReleaseAnnouncement() {
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null),
    acknowledged = useRef(false);
  const [open, setOpen] = useState(false);
  const note = releaseNotes.find(
    (n) => compareVersions(n.version, current) === 0,
  );
  useEffect(() => {
    if (!note || !releasesEnabled(current) || memory.has(current)) return;
    let seen = null;
    try {
      seen = localStorage.getItem(key);
    } catch {
      /* Funciona nesta abertura. */
    }
    if (!shouldAnnounce(current, seen)) return;
    const show = () => {
      if (acknowledged.current || memory.has(current) || dialog.current?.open) {
        clearInterval(timer);
        return;
      }
      if (document.querySelector('dialog[open]')) return;
      trigger.current = document.activeElement as HTMLElement;
      setOpen(true);
      if (dialog.current && !dialog.current.open) dialog.current.showModal();
      clearInterval(timer);
    };
    const timer = window.setInterval(show, 200);
    show();
    return () => clearInterval(timer);
  }, [note]);
  function finish() {
    if (acknowledged.current) return;
    acknowledged.current = true;
    memory.add(current);
    try {
      localStorage.setItem(key, current);
    } catch {
      /* Não bloqueia o uso sem armazenamento. */
    }
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }
  if (!note || !releasesEnabled(current)) return null;
  return (
    <dialog
      ref={dialog}
      className="help-sheet"
      aria-label={'Novidades da versão ' + current}
      onClose={finish}
      onCancel={(e) => {
        e.preventDefault();
        finish();
      }}
    >
      <div className="sheet-body">
        {open && (
          <>
            {'title' in note ? (
              // Primeiro acesso (1.0.0): boas-vindas com convite ao passeio.
              <>
                <Mascot size={96} className="mascot-wave" />
                <h2 className="welcome-title">{note.title}</h2>
              </>
            ) : (
              <h2>Novidades da versão {current}</h2>
            )}
            <ul>
              {note.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {'title' in note ? (
              <div className="welcome-actions">
                <Button
                  variant="primary"
                  onClick={() => {
                    finish();
                    window.dispatchEvent(new Event('start-tour'));
                  }}
                >
                  Fazer o passeio (1 min)
                </Button>
                <Button onClick={finish}>Agora não</Button>
                <p className="welcome-hint">
                  O passeio fica no seu avatar e na Ajuda.
                </p>
              </div>
            ) : (
              <Button variant="primary" onClick={finish}>
                Entendi
              </Button>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
export function ReleaseHistory() {
  return (
    <>
      <h1>Novidades</h1>
      {releaseNotes
        .filter((note) => (compareVersions(note.version, current) ?? 1) <= 0)
        .map((note) => (
          <section key={note.version} className="panel">
            <h2>Versão {note.version}</h2>
            {'title' in note && <h3>{note.title}</h3>}
            <ul>
              {note.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
    </>
  );
}
