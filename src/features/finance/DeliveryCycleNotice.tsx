import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { WhatsAppLink } from '../../components/TestEnvironment';
import type { DeliveryCycleCard } from '../../../shared/delivery-cycle';
import { api, civilDate, money } from '../api';
import { Failure, localDay } from '../operations/common';

export function DeliveryCycleNotice({
  cycle,
  onReceive,
}: {
  cycle: DeliveryCycleCard;
  onReceive: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<{ message: string; phone: string } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (draft !== null && !dialog.current?.open) dialog.current?.showModal();
  }, [draft]);
  const { position, size, projected } = cycle;
  if (position !== size && !cycle.closed_on_change)
    return (
      <p className="delivery-cycle-progress">
        {position}ª de {size} entregas · cobra na {size}ª
      </p>
    );
  async function charge() {
    setBusy(true);
    setError('');
    try {
      setDraft(
        await api(`finance/customers/${cycle.customer_id}/charge`, 'POST', {
          delivery_cycle_id: cycle.order_id,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="delivery-cycle-notice">
      <strong>
        {projected || cycle.due_on === localDay()
          ? 'Cobrar hoje'
          : 'Fechamento'}{' '}
        ·{' '}
        {cycle.closed_on_change
          ? 'ciclo encerrado na troca'
          : `${position}ª de ${size} entregas`}
      </strong>
      <p>
        Total de {cycle.days.length}{' '}
        {cycle.days.length === 1 ? 'entrega' : 'entregas'}:{' '}
        {money(cycle.total_cents)} ({cycle.days.map(civilDate).join(', ')})
      </p>
      {cycle.balance_cents !== cycle.total_cents && (
        <p>Saldo: {money(cycle.balance_cents)}</p>
      )}
      {projected && <p>Previsão. Registre a entrega para fechar o ciclo.</p>}
      {cycle.balance_cents > 0 && (
        <div className="delivery-cycle-actions">
          <Button
            ref={trigger}
            variant="primary"
            disabled={busy}
            loading={busy}
            onClick={() => void charge()}
          >
            Cobrar no WhatsApp
          </Button>
          <Button variant="tonal" disabled={projected} onClick={onReceive}>
            Registrar recebimento
          </Button>
        </div>
      )}
      <Failure message={error} />
      <dialog
        ref={dialog}
        className="help-sheet"
        aria-label="Conferir cobrança"
        onClose={() => {
          setDraft(null);
          trigger.current?.focus();
        }}
      >
        {draft && (
          <div className="sheet-body">
            <h2>Conferir cobrança</h2>
            <label>
              Texto para WhatsApp
              <textarea
                rows={8}
                value={draft.message}
                onChange={(event) =>
                  setDraft({ ...draft, message: event.target.value })
                }
              />
            </label>
            {draft.message.trim() && (
              <WhatsAppLink
                href={`https://wa.me/${draft.phone.replace(/^\+/, '')}?text=${encodeURIComponent(draft.message)}`}
              >
                Abrir WhatsApp para conferir e enviar
              </WhatsAppLink>
            )}
            <Button onClick={() => dialog.current?.close()}>Fechar</Button>
          </div>
        )}
      </dialog>
    </div>
  );
}
