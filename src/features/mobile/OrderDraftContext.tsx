import { useLocation } from 'react-router-dom';
import { Button } from '../../components/Button';
import { clearDraft } from './order-draft';
import { useOrderDraft } from './useOrderDraft';
export function DraftNotice() {
  const { scope, draft } = useOrderDraft(),
    location = useLocation();
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
        Há uma seleção de pedido em andamento. Retome e confira os dados para
        confirmar o pedido.
      </p>
      <div className="actions">
        <Button
          variant="primary"
          to={
            draft.order_id
              ? `/gestao/pedidos/${draft.order_id}/editar-simples?retomar=1`
              : '/gestao/pedidos?novo=1&retomar=1'
          }
        >
          Retomar seleção
        </Button>
        <Button variant="tonal" onClick={() => clearDraft(scope)}>
          Descartar seleção
        </Button>
      </div>
    </aside>
  );
}
