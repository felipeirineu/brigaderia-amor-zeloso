import { FinancialTutorial } from '../finance/Tutorial';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { helpTexts } from './texts';

export function Tour({ role }: { role: string }) {
  const [step, setStep] = useState(-1),
    [done, setDone] = useState(
      () => localStorage.getItem(`az-tour-${role}`) === 'done',
    );
  const location = useLocation();
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const steps = useMemo(
    () => [
      {
        target: 'today',
        title: 'Comece pelo Hoje',
        text:
          role === 'owner'
            ? 'Veja a produção de hoje e amanhã, com quantidades por variante.'
            : 'Veja as entregas do dia e abra o pedido para agir.',
      },
      {
        target: 'orders',
        title: 'Abra um pedido',
        text: 'Confira o cliente e os itens. O botão principal avança o status, sempre com histórico.',
      },
      {
        target: 'new',
        title: 'Cadastro rápido',
        text: 'O botão + reúne novo pedido e novo cliente. Funções financeiras ainda não disponíveis são identificadas.',
      },
      {
        target: 'customers',
        title: 'Seus clientes',
        text: 'Nome e telefone bastam para começar. Use o cadastro privado para conferir os contatos.',
      },
      {
        target: 'more',
        title: 'Modelos e ajuda',
        text: 'Em Mais ficam pedidos padrão, produtos, ajuda e acessos de administrador. Você pode refazer este passeio.',
      },
    ],
    [role],
  );
  useEffect(() => {
    if (step < 0) return;
    const element = Array.from(
      document.querySelectorAll(`[data-tour="${steps[step].target}"]`),
    ).find((node) => node.getClientRects().length > 0);
    element?.classList.add('tour-highlight');
    return () => element?.classList.remove('tour-highlight');
    // O passo escolhe um seletor estável de navegação real, sem dados privados.
  }, [step, steps]);
  function close() {
    dialog.current?.close();
    setStep(-1);
    setDone(true);
    localStorage.setItem(`az-tour-${role}`, 'done');
    trigger.current?.focus();
  }
  return (
    <>
      <div
        className={`tour-invite ${done && !location.pathname.endsWith('/ajuda') ? 'tour-complete' : ''}`}
      >
        <span>{done ? 'Passeio do aplicativo' : 'Conheça os atalhos'}</span>
        <button
          ref={trigger}
          onClick={() => {
            setStep(0);
            dialog.current?.showModal();
          }}
        >
          {done ? 'Refazer passeio' : 'Conhecer o app'}
        </button>
      </div>
      <dialog
        ref={dialog}
        className="help-sheet tour-sheet"
        aria-label="Passeio guiado"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        {step >= 0 && (
          <div className="sheet-body">
            <p>
              Passo {step + 1} de {steps.length} ·{' '}
              {role === 'owner' ? 'Administrador' : 'Operador'}
            </p>
            <h2>{steps[step].title}</h2>
            <p>{steps[step].text}</p>
            <div className="actions">
              <button onClick={close}>Pular</button>
              <button onClick={close}>Já sei</button>
              <button
                onClick={() =>
                  step < steps.length - 1 ? setStep(step + 1) : close()
                }
              >
                {step < steps.length - 1 ? 'Próximo' : 'Concluir'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
export function HelpCenter({ financial = false }: { financial?: boolean }) {
  const [example, setExample] = useState(false);
  return (
    <>
      <h1>Ajuda</h1>
      <p>
        Guias curtos para usar a gestão. O passeio pode ser refeito pelo botão
        “Conhecer o app” ou “Refazer passeio”.
      </p>
      <section className="panel">
        <h2>Treino · Exemplo</h2>
        <p>
          Estabelecimento Exemplo · pedido fictício. Este exercício só muda esta
          tela e nunca grava no banco.
        </p>
        <p role="status">
          {example
            ? 'Exemplo marcado como entregue.'
            : 'Exemplo aguardando entrega.'}
        </p>
        <button onClick={() => setExample(!example)}>
          {example ? 'Reiniciar exemplo' : 'Marcar exemplo entregue'}
        </button>
      </section>
      <section className="panel">
        <h2>Seu primeiro fluxo</h2>
        <ol>
          <li>Cadastre o cliente e os produtos em Mais.</li>
          <li>Prepare um pedido padrão ou um novo rascunho.</li>
          <li>Revise endereço/retirada e confirme o pedido.</li>
          <li>No Hoje, abra o pedido e siga a próxima ação.</li>
          <li>
            Para WhatsApp, confira o texto e envie pelo aplicativo de mensagens.
          </li>
        </ol>
        <p>
          {financial
            ? 'Recebimentos e fechamentos têm roteiro abaixo. Ficha técnica segue em preparação.'
            : 'Recebimentos e fechamentos dependem da ativação financeira; ficha técnica segue em preparação.'}
        </p>
        <Link to="/gestao/recorrentes">Preparar pedido padrão</Link>
      </section>
      {financial && <FinancialTutorial />}
      {Object.entries(helpTexts).map(([key, text]) => (
        <details className="panel" key={key}>
          <summary>{text.title}</summary>
          <p>{text.text}</p>
        </details>
      ))}
      <section className="panel">
        <h2>Instalar na tela inicial</h2>
        <p>
          iPhone: abra o endereço no Safari, use Compartilhar e Adicionar à Tela
          de Início. Android: abra no Chrome e procure Instalar aplicativo ou
          Adicionar à Tela Inicial no menu. É necessário HTTPS e suporte do
          navegador.
        </p>
        <p>
          Sem conexão, nenhuma alteração privada é aceita. Reconecte antes de
          salvar.
        </p>
      </section>
    </>
  );
}
