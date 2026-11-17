import { Button } from '../../components/Button';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { HelpTip } from '../../components/HelpTip';
import type { MessageKind } from '../../../shared/order-state';
import { useRemote, Failure } from './common';
const messageLabels: Record<MessageKind, string> = {
  confirmation: 'Confirmação',
  on_the_way: 'A caminho',
  arriving: 'Chegando',
  delivered: 'Entregue',
  pickup: 'Retirada',
  after_sale: 'Pós-venda',
};
export function MessageTemplates() {
  const view =
    useRemote<{ kind: MessageKind; content: string }[]>('message-templates');
  const [selected, setSelected] = useState<MessageKind>('confirmation'),
    [editing, setEditing] = useState(false),
    [content, setContent] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (editing) textarea.current?.focus();
    else if (wasEditing.current)
      document.getElementById('edit-message-' + selected)?.focus();
    wasEditing.current = editing;
  }, [editing, selected]);
  return (
    <>
      <h1 className="mobile-context-title">Modelos de mensagem</h1>
      <div className="page-context-help">
        <HelpTip topic="whatsapp" label="Ajuda" />
      </div>
      <Failure message={error || view.error} />
      <p role="status">{notice}</p>
      <p>
        Campos permitidos: cliente, numero_pedido, itens, total, data, hora,
        endereco, entre chaves. Não há saldo/fechamento antes da etapa
        financeira.
      </p>
      {view.data?.map((t) => (
        <section className="panel" key={t.kind}>
          <h2>{messageLabels[t.kind]}</h2>
          {editing && selected === t.kind ? (
            <form
              className="data-form"
              onSubmit={(e) => {
                e.preventDefault();
                void api('message-templates', 'PUT', {
                  kind: selected,
                  content,
                })
                  .then(() => {
                    setNotice('Modelo salvo.');
                    setEditing(false);
                    setContent('');
                    void view.refresh();
                  })
                  .catch((e) => setError(e.message));
              }}
            >
              <label>
                Texto do modelo
                <textarea
                  ref={textarea}
                  required
                  maxLength={2000}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </label>
              <div className="actions action-pair">
                <Button variant="primary">Salvar modelo</Button>
                <Button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setContent('');
                    setError('');
                  }}
                >
                  Cancelar edição
                </Button>
              </div>
            </form>
          ) : (
            <>
              <p>{t.content}</p>
              <Button
                id={'edit-message-' + t.kind}
                onClick={() => {
                  setEditing(true);
                  setSelected(t.kind);
                  setContent(t.content);
                }}
              >
                Editar modelo {messageLabels[t.kind]}
              </Button>
            </>
          )}
        </section>
      ))}
    </>
  );
}
