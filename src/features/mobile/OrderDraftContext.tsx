import { useContext, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../../components/Button';
import { clearDraft, draftRaw, parseDraft } from './order-draft';
import { OrderDraftScope } from './order-draft-scope';
const subscribe = (fn: () => void) => {
  window.addEventListener('order-draft-changed', fn);
  return () => window.removeEventListener('order-draft-changed', fn);
};
export function DraftNotice() {
  const scope = useContext(OrderDraftScope),
    location = useLocation();
  const raw = useSyncExternalStore(subscribe, () => draftRaw(scope));
  const draft = parseDraft(raw);
  if (
    !draft ||
    location.pathname.includes('editar-simples') ||
    (location.pathname === '/gestao/pedidos' &&
      new URLSearchParams(location.search).has('novo'))
  )
    return null;
  return (
    <aside
      className="panel draft-notice"
      aria-label="Seleção de pedido guardada"
    >
      <p>
        Há uma seleção de pedido guardada nesta aba. Retome e confira os dados
        antes de enviar.
      </p>
      <div className="actions">
        <Button
          to={
            draft.order_id
              ? `/gestao/pedidos/${draft.order_id}/editar-simples`
              : '/gestao/pedidos?novo=1'
          }
        >
          Retomar seleção
        </Button>
        <Button variant="ghost" onClick={() => clearDraft(scope)}>
          Descartar seleção
        </Button>
      </div>
    </aside>
  );
}
