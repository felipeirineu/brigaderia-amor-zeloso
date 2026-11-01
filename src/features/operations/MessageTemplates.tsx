import { Button } from '../../components/Button';
import { useState } from 'react';
import { api } from '../api';
import { HelpTip } from '../../components/HelpTip';
import type { MessageKind } from '../../../shared/order-state';
import { useRemote, Failure } from './common';
const messageLabels: Record<MessageKind, string> = {
  confirmation: 'Confirmação',
  on_the_way: 'A caminho',
  delivered: 'Entregue',
  pickup: 'Retirada',
  after_sale: 'Pós-venda',
};
export function MessageTemplates() {
  const view =
    useRemote<{ kind: MessageKind; content: string }[]>('message-templates');
  const [selected, setSelected] = useState<MessageKind>('confirmation'),
    [content, setContent] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  return (
    <>
      <h1>
        Modelos de mensagem <HelpTip topic="whatsapp" />
      </h1>
      <Failure message={error || view.error} />
      <p role="status">{notice}</p>
      <p>
        Campos permitidos: cliente, numero_pedido, itens, total, data, hora,
        endereco, entre chaves. Não há saldo/fechamento antes da etapa
        financeira.
      </p>
      {view.data?.map((t) => (
        <section className="panel" key={t.kind}>
          <h2>
            {t.kind === 'confirmation'
              ? 'Confirmação'
              : t.kind === 'on_the_way'
                ? 'A caminho'
                : t.kind === 'delivered'
                  ? 'Entregue'
                  : t.kind === 'pickup'
                    ? 'Retirada'
                    : 'Pós-venda'}
          </h2>
          <p>{t.content}</p>
          <Button
            onClick={() => {
              setSelected(t.kind);
              setContent(t.content);
            }}
          >
            Editar modelo {messageLabels[t.kind]}
          </Button>
        </section>
      ))}
      {content && (
        <form
          className="panel data-form"
          onSubmit={(e) => {
            e.preventDefault();
            void api('message-templates', 'PUT', { kind: selected, content })
              .then(() => {
                setNotice('Modelo salvo.');
                setContent('');
                void view.refresh();
              })
              .catch((e) => setError(e.message));
          }}
        >
          <label>
            Texto do modelo
            <textarea
              required
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <Button variant="primary">Salvar modelo</Button>
        </form>
      )}
    </>
  );
}
