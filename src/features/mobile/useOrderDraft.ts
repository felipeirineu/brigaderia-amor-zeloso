import { useContext, useMemo, useRef, useSyncExternalStore } from 'react';
import {
  draftRaw,
  parseDraft,
  storeDraft,
  type OrderDraft,
} from './order-draft';
import { OrderDraftScope } from './order-draft-scope';
const subscribe = (fn: () => void) => {
  window.addEventListener('order-draft-changed', fn);
  return () => window.removeEventListener('order-draft-changed', fn);
};
/** Snapshot estável (string), compartilhado pelo aviso e pelo editor. */
export function useOrderDraft() {
  const scope = useContext(OrderDraftScope);
  const raw = useSyncExternalStore(
    subscribe,
    () => draftRaw(scope),
    () => '',
  );
  const draft = useMemo(() => parseDraft(raw), [raw]);
  return { scope, raw, draft };
}

/** A posse é só memória do editor; não amplia o conteúdo guardado no navegador. */
export function useDraftEditor() {
  const scope = useContext(OrderDraftScope),
    owned = useRef('');
  const snapshot = useSyncExternalStore(
    subscribe,
    () => JSON.stringify([draftRaw(scope), owned.current]),
    () => '["",""]',
  );
  const [raw, claimed] = useMemo(
    () => JSON.parse(snapshot) as [string, string],
    [snapshot],
  );
  const draft = useMemo(
    () => (raw !== claimed ? parseDraft(raw) : null),
    [raw, claimed],
  );
  function claim(raw: string) {
    owned.current = raw;
    window.dispatchEvent(new Event('order-draft-changed'));
  }
  function mayWrite() {
    const raw = draftRaw(scope);
    return !raw || raw === owned.current;
  }
  function write(draft: OrderDraft) {
    if (!mayWrite()) return;
    const signature = JSON.stringify(draft);
    if (draftRaw(scope) === signature && owned.current === signature) return;
    owned.current = signature;
    storeDraft(scope, draft);
  }
  return { scope, raw, draft, claim, write };
}
