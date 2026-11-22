import {
  readLocalPreference,
  writeLocalPreference,
} from '../../local-preferences';
import { DisclosureSummary } from '../../components/DisclosureSummary';
import { Button } from '../../components/Button';
import { useField } from '../field/FieldContext';
import { FinancialTutorial } from '../finance/Tutorial';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { helpTexts } from './texts';
import { Mascot } from '../../components/Mascot';

export function Tour({
  role,
  visits = false,
}: {
  role: string;
  visits?: boolean;
}) {
  const [step, setStep] = useState(-1),
    [done, setDone] = useState(
      () => readLocalPreference(`az-tour-${role}`) === 'done',
    );
  const location = useLocation();
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const open = () => {
      setStep(0);
      dialog.current?.showModal();
    };
    window.addEventListener('start-tour', open);
    return () => window.removeEventListener('start-tour', open);
  }, []);
  // Prévia aprovada em 20/11: cinco passos, textos por papel.
  const steps = useMemo(() => {
    const owner = role === 'owner';
    return [
      {
        target: 'today',
        title: 'Comece pelo Hoje',
        text: owner
          ? 'O que produzir hoje e amanhã, as entregas do dia e os lembretes. Quando for hora do backup, o aviso aparece aqui.'
          : 'As entregas do dia, o que produzir e os lembretes. Toque em Mapa para a rota e em WhatsApp para avisar o cliente.',
      },
      {
        target: 'orders',
        title: 'Seus pedidos',
        text: 'Busque por cliente e abra o pedido para mudar o status, avisar no WhatsApp ou registrar o recebimento. Se sair no meio de um pedido novo, o app guarda a seleção para retomar.',
      },
      {
        target: 'new',
        title: 'Tudo começa no +',
        text:
          'Novo pedido, novo cliente, novo lembrete' +
          (visits ? ' e nova visita' : '') +
          '. No pedido: escolha o cliente, toque nas fotos dos sabores (ou monte uma Caixa Mista) e revise antes de confirmar.',
      },
      {
        target: 'customers',
        title: 'Seus clientes',
        text: 'Estabelecimentos e contatos. O endereço com localização ajuda no mapa e nas rotas.',
      },
      {
        target: 'more',
        title: 'Mais opções',
        text: owner
          ? 'Produtos, kits, relatórios em PDF e planilha, backup e Preferências, onde dá para ligar o modo escuro. A Ajuda explica cada tela.'
          : 'Preferências (modo escuro, sua foto e seu nome) e a Ajuda, que explica cada tela.',
      },
    ];
  }, [role, visits]);
  // Contorno dourado aceso sobre o fundo escurecido da folha: fica numa
  // camada própria (popover) acima do fundo; sem suporte, vale o destaque comum.
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (step < 0) return;
    const element = Array.from(
      document.querySelectorAll(`[data-tour="${steps[step].target}"]`),
    ).find((node) => node.getClientRects().length > 0);
    element?.classList.add('tour-highlight');
    const halo = ring.current;
    const place = () => {
      if (!halo || !element) return;
      const r = element.getBoundingClientRect();
      Object.assign(halo.style, {
        left: r.left - 6 + 'px',
        top: r.top - 6 + 'px',
        width: r.width + 12 + 'px',
        height: r.height + 12 + 'px',
      });
      try {
        if ('showPopover' in halo && !halo.matches(':popover-open'))
          halo.showPopover();
      } catch {
        /* Navegador sem popover: fica o destaque comum. */
      }
    };
    const frame = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
      element?.classList.remove('tour-highlight');
      try {
        if (halo?.matches(':popover-open')) halo.hidePopover();
      } catch {
        /* Sem popover. */
      }
    };
    // O passo escolhe um seletor estável de navegação real, sem dados privados.
  }, [step, steps]);
  function close() {
    dialog.current?.close();
    setStep(-1);
    setDone(true);
    writeLocalPreference(`az-tour-${role}`, 'done');
    const menu = document.querySelector<HTMLButtonElement>(
      '.profile-menu-trigger',
    );
    if (menu && matchMedia('(max-width:700px)').matches) menu.focus();
    else trigger.current?.focus();
  }
  return (
    <>
      <div
        className={`tour-invite ${done && !location.pathname.endsWith('/ajuda') ? 'tour-complete' : ''}`}
      >
        <span>{done ? 'Passeio do aplicativo' : 'Conheça os atalhos'}</span>
        <Button
          ref={trigger}
          onClick={() => {
            setStep(0);
            dialog.current?.showModal();
          }}
        >
          {done ? 'Refazer passeio' : 'Conhecer o app'}
        </Button>
      </div>
      <dialog
        ref={dialog}
        className="help-sheet tour-sheet"
        aria-label="Passeio guiado"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        {step >= 0 && (
          <div className="sheet-body">
            {step === 0 && <Mascot size={88} className="mascot-wave" />}
            <div className="tour-dots" aria-hidden="true">
              {steps.map((_, k) => (
                <i key={k} className={k === step ? 'on' : ''} />
              ))}
            </div>
            <p className="tour-count">
              Passo {step + 1} de {steps.length}
            </p>
            <h2>{steps[step].title}</h2>
            <p>{steps[step].text}</p>
            <div className="tour-actions">
              <Button variant="ghost" onClick={close}>
                Pular passeio
              </Button>
              <Button
                disabled={step === 0}
                onClick={() => setStep(Math.max(0, step - 1))}
              >
                Voltar
              </Button>
              <Button
                variant="primary"
                onClick={() =>
                  step < steps.length - 1 ? setStep(step + 1) : close()
                }
              >
                {step < steps.length - 1 ? 'Próximo' : 'Concluir'}
              </Button>
            </div>
          </div>
        )}
      </dialog>
      <div
        ref={ring}
        className="tour-ring"
        popover="manual"
        aria-hidden="true"
      />
    </>
  );
}
export function HelpCenter({
  feedback = false,
  financial = false,
  p1 = false,
  tools = false,
}: {
  financial?: boolean;
  p1?: boolean;
  tools?: boolean;
  feedback?: boolean;
}) {
  const [example, setExample] = useState(false);
  const field = useField();
  const location = useLocation(),
    closingRef = useRef<HTMLDetailsElement>(null);
  // O (?) de Fechamento abre a ajuda já nesta seção.
  useEffect(() => {
    if (location.hash !== '#fechamento-prazos' || !closingRef.current) return;
    const el = closingRef.current;
    el.open = true;
    // Depois da volta ao topo que o app faz ao trocar de tela.
    const timer = window.setTimeout(
      () => el.scrollIntoView({ block: 'start' }),
      80,
    );
    return () => window.clearTimeout(timer);
  }, [location.hash]);
  return (
    <>
      <h1 className="mobile-context-title">Ajuda</h1>
      <section className="panel help-hello">
        <Mascot size={80} />
        <p>
          Oi! Aqui estão as explicações de cada parte do app. Toque no{' '}
          <strong>?</strong> ao lado de um campo para ver a ajuda dele.
        </p>
      </section>
      {feedback && (
        <Button
          to="/gestao/sugestoes"
          state={{ page: 'ajuda' }}
          variant="ghost"
        >
          Sugestões e problemas
        </Button>
      )}
      <section className="panel">
        <h2>Novo pedido (modo simples)</h2>
        <p>
          Em Mais → Preferências escolha Modo simples. Escolha o cliente e toque
          na foto para adicionar uma embalagem. Use + ou − para ajustar; Remover
          retira o item. O pedido padrão válido preenche as quantidades. Sem
          padrão, escolha Repetir último pedido ou comece vazio.
        </p>
        <p>
          Revise itens, data, entrega e pagamento. Confirme uma vez e confira a
          mensagem antes de abrir o WhatsApp. Para editar valores, digite os
          centavos: 4200 vira 42,00. Ao tocar no campo ele limpa; sair vazio
          restaura o valor anterior. O botão OK fecha a edição no celular.
        </p>
      </section>
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
        <Button onClick={() => setExample(!example)}>
          {example ? 'Reiniciar exemplo' : 'Marcar exemplo entregue'}
        </Button>
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
          {p1
            ? 'Consulte também os roteiros de agenda, custos e compras abaixo.'
            : financial
              ? 'Recebimentos e fechamentos têm roteiro abaixo. Ficha técnica, agenda e compras ainda não foram ativadas.'
              : 'Recebimentos e fechamentos dependem da ativação financeira; ficha técnica segue em preparação.'}
        </p>
        <Button to="/gestao/recorrentes" variant="ghost">
          Preparar pedido padrão
        </Button>
      </section>
      {p1 && (
        <section className="panel">
          <h2>Pedido de festa, brinde ou presente</h2>
          <ol>
            <li>
              Em Clientes, escolha Pessoa para um pedido pessoal ou
              Estabelecimento para um cliente comercial. Telefone e endereço são
              opcionais no cadastro; entrega precisa de endereço no pedido.
            </li>
            <li>
              Em Novo pedido, escolha o tamanho e a capacidade do kit. Monte
              todos os doces e confira a contagem de cada sabor antes de
              continuar.
            </li>
            <li>
              Combine data, retirada ou entrega e quem leva. Para pessoa,
              escolha adiantado, na entrega ou na próxima entrega; registrar a
              condição não registra pagamento.
            </li>
            <li>
              Em Revisar, a ocasião é opcional. Confira itens, quantidades e
              valor antes de confirmar. A ocasião aparece no Hoje e no texto
              preparado para WhatsApp.
            </li>
            <li>
              Pedidos padrão e geração da semana são para estabelecimentos. O
              modelo usa o preço atual na geração; pedidos já gerados preservam
              os valores anteriores.
            </li>
          </ol>
        </section>
      )}
      {field && (
        <section className="panel">
          <h2>Localização e corrida</h2>
          <ol>
            <li>
              No cliente, preencha contato e endereço. Estando no local, toque
              em Usar minha localização e salve. A busca OpenStreetMap é uma
              sugestão: confira antes de salvar.
            </li>
            <li>
              Em Localização, foto e Instagram escolha Tirar foto ou galeria; a
              imagem fica privada. O administrador cadastra a base em Mais →
              Preferências.
            </li>
            <li>
              No Hoje, use Uber, Maps ou Waze por toque. Para 99, copie o
              destino e abra o site. Confira origem/destino no aplicativo;
              distância exibida é em linha reta.
            </li>
            <li>
              Depois de Entregue, informe o valor pago e Registre despesa paga,
              ou Pular para lançar depois em Mais → Deslocamentos. A taxa do
              motoboy só vira despesa quando confirmar o pagamento.
            </li>
            <li>
              Corridas com vários pedidos têm rateio estimado. Corrija por
              Estornar deslocamento com motivo; operador só estorna o próprio
              registro do dia. Nome de exibição fica em Preferências.
            </li>
          </ol>
        </section>
      )}
      {financial && <FinancialTutorial />}
      {tools && (
        <section className="panel">
          <h2>Estoque, importação e backup</h2>
          <details>
            <DisclosureSummary>Conferir e movimentar estoque</DisclosureSummary>
            <p>
              Em Mais → Estoque, escolha o insumo, tipo de movimento, quantidade
              e motivo. Confira a unidade. Previsão não baixa estoque; consumo
              só ocorre após sua confirmação. Lote e validade são anotações. O
              administrador define o mínimo. Para corrigir use estorno com
              motivo; operador só estorna os próprios registros de hoje.
            </p>
          </details>
          <details>
            <DisclosureSummary>
              Importar clientes (administrador)
            </DisclosureSummary>
            <p>
              Prepare CSV UTF-8 ou XLSX com nome (telefone opcional), até 50
              clientes. Não use fórmulas nem macros. Em Mais → Importar
              clientes, escolha o arquivo, Veja prévia e confira os telefones
              normalizados. Selecione as linhas e confirme. Telefones existentes
              não são sobrescritos; nenhuma mensagem é enviada.
            </p>
          </details>
          <details>
            <DisclosureSummary>
              Guardar e testar backup (administrador)
            </DisclosureSummary>
            <p>
              Em Mais → Backup privado, baixe o arquivo e guarde fora do
              Git/chat. Ele contém dados pessoais, fotos, chave Pix cadastrada e
              autorizações; não compartilhe. Use o guia de restauração em uma
              base local separada e compare contagens antes de confiar no
              backup. Não há restauração sobre o banco em uso pelo app.
            </p>
          </details>
        </section>
      )}
      {(p1 || financial) && (
        <section className="panel">
          <h2>Rotinas e financeiro</h2>
          <details id="fechamento-prazos" ref={closingRef}>
            <DisclosureSummary>Fechamento e prazos</DisclosureSummary>
            <p>
              Para estabelecimentos <strong>a prazo</strong>. Funciona como a
              fatura do cartão de crédito: o cliente não paga a cada entrega;
              paga tudo de uma vez depois que a conta fecha.
            </p>
            <h3>Exemplo</h3>
            <p>
              Uma conveniência recebe 1 Kit 12 de R$ 42,00 toda terça e sexta.
              Está em <strong>A prazo · Quinzenal · 7 dias depois</strong>.
            </p>
            <ul>
              <li>
                1ª quinzena: entregas nos dias 3, 6, 10 e 13 = 4 kits ={' '}
                <strong>R$ 168,00</strong>. Fecha no dia 15 e vence no dia 22.
              </li>
              <li>
                2ª quinzena: entregas nos dias 17, 20, 24 e 27 ={' '}
                <strong>R$ 168,00</strong>. Fecha no último dia do mês e vence 7
                dias depois, já no mês seguinte.
              </li>
            </ul>
            <h3>A comparação com o cartão</h3>
            <ul>
              <li>Compras no cartão = entregas da Brigaderia.</li>
              <li>
                Fechamento da fatura = <strong>Fechamento</strong>: o app soma
                as entregas do período.
              </li>
              <li>
                Vencimento da fatura = <strong>Pagar</strong>: no fechamento, 7
                dias depois, 15 dias depois ou no próximo dia fixo escolhido.
              </li>
              <li>
                Pagar a fatura inteira = o cliente paga todas as entregas
                juntas.
              </li>
            </ul>
            <p>
              Em <strong>Dia do mês</strong>, o vencimento é a primeira
              ocorrência após o fechamento. Se fechou dia 15 e o dia escolhido é
              10, a conta vence no dia 10 do mês seguinte. Se o mês não tiver o
              dia escolhido (como 30 em fevereiro), vence no último dia do mês,
              como na fatura do cartão.
            </p>
            <p>
              <strong>Na próxima entrega:</strong> a cobrança é por pedido. O
              saldo fica a receber sem vencimento até a próxima entrega
              realizada para o mesmo cliente.
            </p>
            <h3>Quando a conta fecha</h3>
            <ul>
              <li>
                <strong>Semanal:</strong> soma de segunda a domingo; fecha no
                domingo.
              </li>
              <li>
                <strong>Quinzenal:</strong> soma do dia 1 ao 15 (fecha no dia
                15) e do dia 16 ao fim do mês (fecha no último dia).
              </li>
              <li>
                <strong>Mensal:</strong> soma o mês inteiro; fecha no último
                dia.
              </li>
            </ul>
            <h3>Passo a passo</h3>
            <ol>
              <li>
                Durante o período: entregue normalmente e marque cada pedido
                como Entregue. Não cobre na hora.
              </li>
              <li>
                No dia do fechamento (ou logo depois): Financeiro → conta do
                cliente → Gerar fechamento. O app soma tudo.
              </li>
              <li>
                Toque em Cobrar fechamento no WhatsApp, confira a mensagem e
                envie.
              </li>
              <li>
                Quando o cliente pagar: Registrar recebimento na conta dele.
              </li>
            </ol>
            <h3>Dicas</h3>
            <ul>
              <li>
                <strong>No fechamento</strong> vence no mesmo dia em que a conta
                fecha. <strong>15 dias depois</strong> dá mais folga ao cliente.
              </li>
              <li>
                O padrão de cada cliente fica em Financeiro → conta do cliente →
                Condição de pagamento. No pedido, a escolha vale só para aquele
                pedido.
              </li>
              <li>Para pessoa física, use Adiantado ou Na entrega.</li>
            </ul>
            <Button to="/gestao/financeiro" variant="ghost">
              Abrir financeiro
            </Button>
          </details>
          {p1 && (
            <>
              <details>
                <DisclosureSummary>Agenda e lembretes</DisclosureSummary>
                <ol>
                  <li>
                    Em Mais → Agenda, escolha uma data e Semana/Mês; filtre o
                    tipo de evento.
                  </li>
                  <li>
                    Para calendário do aparelho, exporte ICS e importe somente
                    no calendário autorizado. Confira e salve o alarme no
                    aparelho.
                  </li>
                  <li>
                    Em Lembretes, registre título/prazo e cliente opcional.
                    Escolha o aviso e os responsáveis pelos nomes de perfil.
                    Pendentes vencidos e do dia aparecem no Hoje; conclua quando
                    realizado.
                  </li>
                  <li>
                    Ative avisos em Perfil → Preferências e envie um aviso de
                    teste. No iPhone, use iOS 16.4+ e o app instalado na Tela de
                    Início. Se não receber, use Adicionar ao calendário do
                    celular no lembrete. Avisos podem atrasar; após editar,
                    substitua também o evento importado.
                  </li>
                </ol>
                <Button to="/gestao/agenda" variant="ghost">
                  Abrir agenda
                </Button>
              </details>
              <details>
                <DisclosureSummary>Relatórios e fluxo</DisclosureSummary>
                <p>
                  Vendas usam entregas efetivas. Aging é posição atual.
                  Recebimentos e despesas registrados formam fluxo, não saldo
                  bancário ou lucro. O administrador registra/estorna despesas;
                  a taxa de entrega não vira gasto sozinha.
                </p>
                <Button to="/gestao/relatorios" variant="ghost">
                  Abrir relatórios
                </Button>
              </details>
              <details>
                <DisclosureSummary>
                  Ficha, preço estimado e compras
                </DisclosureSummary>
                <ol>
                  <li>
                    O administrador cadastra insumos, quantidade da embalagem e
                    preço informado. Sem preço conhecido, deixe vazio.
                  </li>
                  <li>
                    Cadastre uma ficha, rendimento e quantidades na unidade do
                    insumo; informe custos adicionais e margem desejada. O preço
                    sugerido não altera produtos.
                  </li>
                  <li>
                    Na Lista de compras, escolha o prazo dos confirmados/em
                    produção. Confira lotes, pendências e estoque manual antes
                    de comprar. Não há compra nem baixa automática.
                  </li>
                  <li>
                    No detalhe do pedido, abra Custo estimado do pedido. A
                    consulta está disponível também ao operador. Usa fichas e
                    custos atuais; sem ficha ou preço, a estimativa fica
                    indisponível. Não é lucro apurado e não inclui entrega ou
                    despesas fora da ficha.
                  </li>
                </ol>
                <Button to="/gestao/fichas" variant="ghost">
                  Abrir fichas
                </Button>
              </details>
            </>
          )}
        </section>
      )}

      {Object.entries(helpTexts).map(([key, text]) => (
        <details className="panel" key={key}>
          <DisclosureSummary>{text.title}</DisclosureSummary>
          <p>{text.text}</p>
          {'steps' in text && (
            <ol>
              {text.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
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
