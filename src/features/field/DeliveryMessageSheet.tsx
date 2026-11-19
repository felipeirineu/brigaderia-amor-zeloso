import { WhatsAppLink } from '../../components/TestEnvironment';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { HelpTip } from '../../components/HelpTip';
import { api } from '../api';
import { Failure, type OperationalOrder } from '../operations/common';
import { useField } from './FieldContext';
const kinds = [
  ['on_the_way', 'A caminho'],
  ['arriving', 'Chegando'],
  ['delivered', 'Entregue'],
  ['charge', 'Cobrança'],
] as const;
type Kind = (typeof kinds)[number][0];
export function DeliveryMessageSheet({
  order,
  onClose,
}: {
  order: OperationalOrder;
  onClose: () => void;
}) {
  const field = useField(),
    dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null),
    sequence = useRef(0),
    contactKey = useRef(crypto.randomUUID());
  const [kind, setKind] = useState<Kind>('on_the_way'),
    [message, setMessage] = useState(''),
    [phone, setPhone] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const signature =
    field?.data?.staff
      .find((s) => s.id === field.data?.user_id)
      ?.display_name?.trim() ?? '';
  const hasName = !!field?.data?.staff.find((s) => s.id === field.data?.user_id)
    ?.version;
  useEffect(() => {
    trigger.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => trigger.current?.focus();
  }, []);
  useEffect(() => {
    let active = true;
    const ticket = ++sequence.current;
    const path =
      kind === 'charge'
        ? `finance/customers/${order.customer_id}/charge`
        : `orders/${order.id}/message`;
    void api<{ message: string; phone: string }>(
      path,
      'POST',
      kind === 'charge' ? { order_id: order.id } : { kind },
    )
      .then((r) => {
        if (active && ticket === sequence.current) {
          setMessage(
            r.message + (hasName && signature ? '\n\n' + signature : ''),
          );
          setPhone(r.phone);
          setError('');
          setNotice('');
          contactKey.current = crypto.randomUUID();
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [kind, order.customer_id, order.id, signature, hasName]);
  return (
    <dialog
      ref={dialog}
      className="help-sheet"
      aria-label={`WhatsApp · ${order.customer_name}`}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="sheet-body">
        <h2>
          WhatsApp <HelpTip topic="whatsapp" />
        </h2>
        <p>
          {order.customer_name} · Pedido{' '}
          {order.number ? 'nº ' + order.number : order.id.slice(0, 8)}
        </p>
        <div className="actions" role="group" aria-label="Modelo da mensagem">
          {kinds.map(([value, label]) => (
            <Button
              key={value}
              variant="chip"
              disabled={
                busy || (value === 'charge' && order.payment_mode === undefined)
              }
              aria-pressed={kind === value}
              onClick={() => {
                if (value !== kind) {
                  setMessage('');
                  setPhone('');
                  setError('');
                  setNotice('');
                  setKind(value);
                }
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        <Failure message={error} />
        <p role="status">{notice}</p>
        {kind === 'charge' && (
          <p>Saldo deste pedido. Confira o valor antes de abrir.</p>
        )}
        {!hasName && (
          <p>
            Defina seu nome de exibição para assinar a mensagem.{' '}
            <Button to="/gestao/preferencias" onClick={onClose} variant="ghost">
              Definir meu nome
            </Button>
          </p>
        )}
        <label>
          Confira e edite antes de abrir
          <textarea
            value={message}
            maxLength={8000}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <p>
          {hasName
            ? 'Assinatura: ' + signature
            : 'Sem nome de exibição cadastrado.'}{' '}
          O envio será feito por você no WhatsApp.
        </p>
        {hasName && message.trim() && !/[{}]/.test(message) && (
          <WhatsAppLink
            variant="primary"
            href={`https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`}
          >
            {phone
              ? 'Abrir no WhatsApp'
              : 'Abrir no WhatsApp e escolher o contato'}
          </WhatsAppLink>
        )}
        <Button
          variant="ghost"
          disabled={busy || !message.trim()}
          onClick={() => {
            setBusy(true);
            setError('');
            void api(
              `orders/${order.id}/contact`,
              'POST',
              { kind },
              contactKey.current,
            )
              .then(() =>
                setNotice(
                  'Contato anotado manualmente. Sem comprovação de envio.',
                ),
              )
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          Marcar contato realizado (opcional)
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Fechar WhatsApp
        </Button>
      </div>
    </dialog>
  );
}
