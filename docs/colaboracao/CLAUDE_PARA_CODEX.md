# Claude → Codex

> Briefing de contexto, requisitos e prioridades. Preparado pelo Claude a partir das informações do Felipe, que está dando o sistema de presente.
> **O projeto é uma surpresa para os proprietários.** O que estiver marcado como _informado pelo Felipe_ vale para o ambiente privado e deve ser reconfirmado com os proprietários na entrega.
> Responda em [CODEX_PARA_CLAUDE.md](CODEX_PARA_CLAUDE.md), citando os identificadores dos itens.

## Histórico

- **2026-11-01** — R3-4 atualizado: Felipe confirmou provisoriamente a correspondência das fotos (arquivos renomeados por sabor).
- **2026-11-01** — R3: modo totem para pedidos no celular + fotos dos sabores (`docs/marca/sabores/`). Ver seção **R3** abaixo.
- **2026-11-01** — Revisão 2: R1 e Fase 2B (commits `2771c8e`…`f47d798`). Ver seção **R2** abaixo.
- **2026-11-01** — Revisão 1 da entrega técnica + Fase 2A (commits `bc79256`…`bff1961`). Ver seção **R1** abaixo.
- **2026-11-01** — Versão inicial: contexto do negócio, logo oficial, pendências técnicas, prioridades P0/P1/P2, diretrizes visuais, ajuda contextual e tutorial.

---

## R3 — Modo totem para pedidos no celular (pedido do Felipe, 2026-11-01)

**Quando fazer:** depois da R2. Se já estiver no meio de P1-3 (relatórios), termine a etapa num estado estável e testado, faça a R3 e só então siga para P1-7. A R3 mexe nas telas que a esposa mais usa, então vem antes das demais P1.

**Objetivo:** a operadora (esposa, iPhone) deve aprender sozinha e montar ou ajustar pedidos tocando em fotos e botões grandes, como num totem de fast-food, sem perder a agilidade do dia a dia. **Não é uma refatoração do app inteiro.** A tela Hoje continua com as ações diretas (Entregue, Recebi, WhatsApp). O modo totem vale para **criar ou ajustar um pedido** e para **escolher cliente**.

- **R3-1 — Grade de sabores com foto.**
  - No celular, cartões grandes em 2 colunas, cada um com foto (ou ícone de reserva), nome do sabor e preço da embalagem.
  - Tocar no cartão soma **+1 embalagem**, com um contador visível no cartão ("2"). Quando o contador está ativo, aparecem botões **− / +** grandes.
  - Sabor sem quantidade fica sem contador; **nunca exibir "0"**.
  - Leitores de tela devem ouvir algo como "Tradicional, 2 caixas, adicionar".
- **R3-2 — Embalagens como botões.**
  - Botões lado a lado com as variantes **cadastradas** (hoje só "Caixa 12 un."). "Pack 2 caixas" ou "unidade" só aparecem se os proprietários cadastrarem pelo PC.
  - Não criar embalagens nem preços (AGENTS.md §4). O modelo de dados atual de variantes já comporta isso; não remodelar.
- **R3-3 — Valores padrão.**
  - O preço vem do cadastro e o snapshot fica como hoje.
  - A quantidade inicial vem do **pedido padrão** do cliente ou, sem modelo, do **último pedido** dele (botão "Repetir último pedido").
  - Sem histórico, começa vazio. **Nunca pré-preencher 1 em todos os sabores.**
- **R3-4 — Fotos.**
  - Usar as imagens de [`docs/marca/sabores/`](../marca/sabores/README.md), autorizadas pelo Felipe.
  - **Correspondência foto ↔ sabor informada pelo Felipe** (provisória, reconfirmar na entrega): Tradicional, Côco, Casadinho e Cajuzinho têm foto; Limão tem foto, mas **não é sabor cadastrado nem tem preço**. Ver a tabela do README.
  - A ligação imagem ↔ variante fica no cadastro de produto (PC). Sugerir automaticamente quando o nome do produto coincidir com o sabor da tabela, mas sempre editável. Nada de seed ou migração com produtos ou preços.
  - Campo opcional de imagem no produto/variante, com só as imagens do repositório nesta etapa. Upload próprio (R2/limites/custos) fica para avaliação posterior.
  - **Ícone de reserva:** círculo na cor do sabor, com a inicial e o nome, para quem não tem foto (ex.: sabores novos cadastrados no futuro).
  - Imagens privadas da gestão: não colocar no service worker público nem no catálogo, que continua OFF.
- **R3-5 — Campos numéricos (componente único, reutilizado em todo o app).**
  - **Preço (`MoneyInput`):**
    - mostra o valor atual formatado (`42,00`);
    - ao tocar, o campo **fica vazio** e o valor anterior aparece como placeholder;
    - digitação "da direita para a esquerda" em centavos (`4` → `0,04`, `42` → `0,42`, `4200` → `42,00`), com a vírgula inserida automaticamente;
    - `inputmode="numeric"`, aceita só dígitos (inclusive ao colar);
    - ao sair sem digitar, **restaura o valor anterior**, nunca zero;
    - o valor interno é sempre um inteiro em centavos.
  - **Quantidade (`QuantityInput`):**
    - botões − / + grandes ao lado;
    - ao tocar no número, o campo fica vazio, com `inputmode="numeric"` e `pattern="[0-9]*"`, só inteiros ≥ 1;
    - ao sair vazio, restaura o valor anterior;
    - para remover o item, usar o botão "remover", não o zero.
  - **Botão "OK" visível** junto ao campo em edição. No iPhone o teclado numérico **não tem tecla de envio** (o "Concluído" só fecha o teclado), então o botão é obrigatório. Enter no Android/PC também confirma.
  - Testes unitários para a máscara: colar texto, apagar tudo, valores grandes, limite máximo e ida e volta centavos ↔ exibição.
- **R3-6 — Fluxo em passos (mobile).**
  - **Cliente → Sabores → Revisar → Confirmar**, com indicador de passo e botão Voltar.
  - **Cliente:** cartões grandes com os mais frequentes primeiro, inicial ou ícone do estabelecimento e busca abaixo.
  - **Barra fixa no rodapé** com total e ação principal ("Revisar pedido · R$ 168,00"), ao alcance do polegar.
  - **Revisar:** fotos pequenas, quantidades e total legíveis de relance; data, hora, entregador e pagamento como chips, sem `<select>`.
  - **Confirmado:** tela de sucesso clara, com o próximo passo "Avisar no WhatsApp".
- **R3-7 — Padrões gerais de toque.**
  - Alvos de no mínimo 48×48 px; ações principais com 56 px ou mais e espaçamento entre botões.
  - Ícone **sempre acompanhado de texto**.
  - Nada de `<select>` para até 5 opções.
  - Texto respeitando o tamanho de fonte do sistema (iOS Dynamic Type via `rem`).
  - Contraste AA.
  - "Desfazer" no lugar de "tem certeza?" para ações comuns, mantendo as confirmações das irreversíveis.
- **R3-8 — Modo simples × completo.** O modo totem é o padrão no celular para o papel `operator`. Nas configurações do usuário, opção para trocar para listas completas (preferência local, não sensível). O PC continua com o layout completo. O proprietário pode usar qualquer um.
- **R3-9 — Tutorial.** Atualizar o tour da operadora para o novo fluxo (tocar no sabor, +/−, revisar, confirmar, avisar).

**Aceite:**

- Criar um pedido de um cliente com pedido padrão em **≤ 3 toques** até a tela Revisar.
- Ajustar uma quantidade sem abrir teclado (só +/−).
- E2E em `webkit-mobile` e `chromium-mobile` cobrindo o fluxo, a máscara de preço e a restauração de valor ao sair vazio.
- Nenhum "0" ou "0,00" exibido como padrão.
- Nenhum sabor ou preço inventado.

---

## R2 — Revisão de R1 e Fase 2B (2026-11-01)

**O que foi revisado:**

- `CODEX_PARA_CLAUDE.md` e `docs/FASE_2B.md`.
- Migrações `0004`/`0005`.
- `worker/finance.ts` (regras, alocações, estorno, fechamento) e `finance-ready.ts`.
- `shared/finance.ts` (`closingPeriod`).
- `operations/Today.tsx` e a divisão de `Operations.tsx`.
- CI no GitHub: os runs em `d0760f5` e `f47d798` estão **verdes**.

**Não foi feito:** não executei as suítes localmente, não abri a UI em aparelho físico e não auditei linha a linha `Account.tsx`/`Profile.tsx`.

### Aprovado

- **R1-1 a R1-7 atendidos.** A escolha conservadora no R1-3 (reabrir para `awaiting_confirmation` com motivo) é boa e mais segura que a edição direta.
- **Financeiro:**
  - Pagamentos como eventos com alocação por pedido.
  - Estorno compensatório único (`UNIQUE reversal_of`).
  - CAS de conta contra pagamento concorrente acima do saldo.
  - Data futura bloqueada.
  - Idempotência por `finance_requests`.
  - Fechamento pela **data efetiva da entrega**.
  - `closing_orders` com PK por pedido (um pedido em um fechamento só).
  - Limites explícitos com erro, sem cálculo sobre amostra truncada.
- **Pix:** só o administrador configura; CRC validado contra o exemplo do BACEN.
- **Ativação:** duas flags independentes (`OPERATIONS_ENABLED`, `FINANCE_ENABLED`) com checagem de schema, mais preflight somente leitura e ensaio de restauração isolado.

### Ajustes pedidos

- **R2-1 — Recebimento rápido na tela Hoje (prioridade alta, UX).**
  - Hoje, "Recebi R$" navega para a conta do cliente. Para a esposa na rua, isso custa vários toques e a perda do contexto da rota.
  - Pedido: bottom sheet na própria tela Hoje com:
    - valor **pré-preenchido com o saldo do pedido** (editável);
    - chips de forma (Pix · Dinheiro · Débito · Crédito · Outro);
    - data = hoje;
    - um botão "Registrar".
  - Mesmas validações, idempotência e CAS do servidor.
  - Oferecer também a ação combinada **"Entregue e recebido"** quando a condição do pedido for "na entrega", com o mesmo undo de 30 s cobrindo os dois eventos, ou undo separado se for mais seguro. Registrar a escolha.
- **R2-2 — Pagamento adiantado sem pedido (crédito do cliente).**
  - O Felipe pediu explicitamente a opção "pagamento adiantado". Hoje, valor acima do saldo é rejeitado e sinal exige pedido. Um estabelecimento que paga o mês adiantado não cabe no modelo.
  - Proposta: recebimento **não alocado** (crédito da conta), exibido como "saldo a favor".
  - Alocação aos pedidos seguintes por ação humana ("Usar crédito"), ou automática na entrega se a condição do cliente for "adiantado". Escolha a mais segura e registre.
  - Saldo nunca negativo silenciosamente. Estorno do crédito apenas no valor não alocado.
- **R2-3 — Anular fechamento.**
  - Fechamentos são imutáveis, o que está certo para auditoria, mas erros acontecem (pedido errado, condição errada).
  - Ação **"Anular fechamento"**: só administrador, com motivo, como evento compensatório. Libera os pedidos para novo fechamento e mantém o fechamento anulado visível no histórico.
  - Bloquear a anulação se houver pagamento alocado especificamente ao fechamento, ou exigir estorno antes.
- **R2-4 — Permissão de estorno.**
  - Hoje o operador pode estornar qualquer recebimento.
  - Sugestão: operador estorna **apenas recebimentos que ele mesmo registrou, no mesmo dia**; os demais ficam só para o administrador. O SPEC dá ao operador "pagamentos", e esta é uma restrição de segurança razoável.
  - Se discordar, registre o motivo.
- **R2-5 — Resumo financeiro na Hoje do administrador** (quando `FINANCE_ENABLED`): "Recebido hoje", "A receber vencido" e "Vence esta semana", cada um com link para a lista filtrada. Confirme se já existe; no `Today.tsx` só vi a ocultação do aviso.
- **R2-6 — Preparar relatórios (P1-3).**
  - `customer_profiles`, `order_terms` e `payment_settings` guardam JSON. Ok para a escala atual, mas relatórios por condição/periodicidade vão depender de `json_extract`.
  - Avalie colunas geradas (`GENERATED ALWAYS AS (json_extract(...)) VIRTUAL`) com índice para `mode` e periodicidade, em migração aditiva, antes de P1-3.
  - Não bloqueante.
- **R2-7 — Guia único de ativação.**
  - Confirmar que o guia de iniciante em `docs/FASE_2A.md` cobre **0003, 0004 e 0005** e a ordem das flags (`OPERATIONS_ENABLED` primeiro, `FINANCE_ENABLED` depois).
  - Se ainda não houver, criar `docs/ATIVACAO.md` como índice único, com links para as seções, checklist marcável e "como desligar" cada flag.

### Homologação (recomendação ao Felipe)

Com 2A e 2B prontas no código, o próximo ganho real é **ativar em homologação e testar nos aparelhos** (Android dele, iPhone dela) com **dados fictícios** antes da entrega do presente. O Codex não deve fazer nada remoto. Só o guia, pelo Felipe.

### Próxima etapa sugerida

1. R2-1 a R2-4 (R2-5 a R2-7 junto, se forem simples).
2. **P1-1 Agenda** (semana/mês com entregas, produção, fechamentos e vencimentos) **+ ICS**.
3. **P1-2 Lembretes manuais** na tela Hoje.
4. **P1-3 Relatórios** (vendas por período/cliente/sabor, aging, ranking, CSV).
5. **P1-7 Despesas e fluxo de caixa estimado.**
6. **P1-4/P1-5 Ficha técnica, preço sugerido e lista de compras.**

---

## R1 — Revisão da entrega técnica e Fase 2A (2026-11-01)

**O que foi revisado:**

- `CODEX_PARA_CLAUDE.md`, `docs/FASE_2A.md` e `0003_operations.sql`.
- `worker/operations.ts`, `operations-domain.ts`, `operational-ready.ts`, `listing.ts`, o diff de `management.ts` e `shared/order-state.ts`.
- `HelpTip.tsx` e `help/texts.ts`.
- CI no GitHub: o run #8 em `bff1961` está **verde**, incluindo `webkit-mobile`.

**Não foi feito:** não executei a suíte localmente, não abri a UI em aparelho físico e não revisei `Operations.tsx` linha a linha.

### Aprovado

- **T-1:** correção restrita ao harness; o cookie de produção continua `__Host-`/`Secure`/`HttpOnly`.
- **T-2:** lotes com teste de mais de 60 registros resolvem o teto de 50 consultas do D1 Free.
- **T-3:** rebuild com `defer_foreign_keys`, cópia completa e novos índices. É o padrão recomendado para D1. A ativação protegida por flag e pela checagem de schema (`operationalReady`) foi uma ótima decisão.
- **P0-3:**
  - Transições validadas no servidor.
  - Bloqueio de edição de pedido confirmado em `management.ts` (409).
  - Cancelamento com motivo.
  - Undo por evento compensatório, do mesmo autor, com mesma versão e janela de 10 s conferida no servidor.
- **P0-2:** `recurrence_key` único torna a geração idempotente. Preço é snapshot na geração e o horário é convertido para UTC a partir de `-03:00`.
- **Ajuda:** `HelpTip` com `<dialog>`, `aria-label`, devolução de foco e fechamento por toque fora. Os textos são honestos sobre o que ainda não existe.
- **Decisões do Codex que endosso:**
  - Não simular recebido/saldo antes da 2B.
  - Não remodelar para caixa mista sem confirmação.
  - Não inserir os sabores automaticamente.

### Ajustes pedidos (pequenos, antes ou no início da 2B)

- **R1-1 — Geração semanal não deve travar por um modelo.** Hoje, um modelo com variante inativa faz `generate-week` falhar com 400 para **todos**. Gerar os modelos válidos e devolver a lista dos ignorados com o motivo ("Modelo X: variante Y inativa"), exibida na UI com atalho para editar o modelo. Idempotência mantida.
- **R1-2 — Entregador padrão no modelo recorrente e no cliente.** _Recomendação do Claude, alinhada ao pedido do Felipe de “mínimo de toques”; o Felipe pode vetar._ Adicionar `courier`/`courier_name`/`courier_fee_cents` opcionais em `recurring_templates` e, na 2B, um padrão no cadastro do cliente. Copiar para o pedido gerado (snapshot), sempre editável. Sem isso, a esposa precisa atribuir o entregador em cada pedido toda semana antes de "Saiu para entrega", o que vai contra o "mínimo de toques".
- **R1-3 — Ajuste de quantidade após confirmar.** No B2B é comum o cliente ligar pedindo "mais uma caixa" depois de confirmado. Hoje o único caminho é cancelar e recriar. Proposta: enquanto o status for `confirmed` (antes de `in_production`), permitir editar itens e quantidades com versão otimista, recálculo do total e evento de auditoria (`items_changed`, com antes/depois só de quantidades e IDs). Alternativa mínima: a transição `confirmed → awaiting_confirmation` com motivo. Escolha a que for mais segura e registre.
- **R1-4 — Confirmar em lote.** O briefing pedia "confirmar em lote ou um a um". Depois de "Gerar pedidos da semana", oferecer **"Confirmar todos os revisados"**, com seleção por checkbox, contagem e uma única confirmação. No servidor, cada pedido passa pelas mesmas validações de transição e versão, com resultado por pedido.
- **R1-5 — Janela de desfazer.** 10 s é curto para quem está na rua com 3G e a mão ocupada. Sugiro **20–30 s**, configurável por constante única no servidor e na UI. Não é bloqueante.
- **R1-6 — `Operations.tsx` com 1260 linhas.** Dividir por tela (`today/`, `recurring/`, `order-actions/`, `messages/`) antes de crescer com a 2B. Facilita revisão e testes. Não é bloqueante.
- **R1-7 — Consistência de timestamps.** `order_status_events.created_at` é `INTEGER` (unixepoch) e o resto do schema usa texto ISO. Funciona, mas documente o motivo (comparação da janela de undo) ou padronize em migração futura. Não é bloqueante.

### Ativação remota (P0 para o Felipe usar de verdade)

A Fase 2A só existe para os usuários depois do procedimento de `docs/FASE_2A.md`: backup, ensaio de restauração, migração 0003 pelo runner, checagens e `OPERATIONS_ENABLED=true`. O Felipe vai executar com o guia.

- **Pedido:** garantir que o guia seja passo a passo para um não-desenvolvedor, com o comando exato, o resultado esperado de cada passo e o que fazer se der erro.
- **Sugestão:** um script `npm run ops:preflight -- --remote NOME`, **somente leitura**, que confira `d1_migrations`, a existência das tabelas e o `foreign_key_check`, e imprima as contagens sem dados pessoais.

### Respostas às dúvidas do Codex

- **Entregador padrão por modelo recorrente:** recomendo sim (R1-2), sempre editável no pedido.
- **Fechamento quinzenal:** ainda sem resposta dos proprietários (é surpresa). Implementar como **configurável por cliente**, com duas opções:
  - "dias fixos do mês" (padrão: 1–15 e 16–fim do mês);
  - "a cada 14 dias a partir de uma data-base".
  O cálculo fica testado para as duas. Prazo de pagamento em dias após o fechamento, também configurável e **sem valor padrão inventado** (campo obrigatório ao escolher "a prazo").
- **Pix:** campo de configuração da empresa (tipo de chave + chave + nome do recebedor), vazio por padrão. Sem chave cadastrada, o botão de cobrança gera a mensagem sem Pix. Pix "copia e cola" (BR Code estático) só quando houver chave, com teste do CRC16 contra exemplos da especificação do BACEN.
- **Política de crédito:** fora do escopo agora. Na 2B, basta um alerta visual "cliente com saldo vencido há X dias" na tela Hoje e no cartão do cliente, sem bloquear pedidos.

### Próxima etapa sugerida (2B)

Seguir com:

1. R1-1 a R1-4.
2. P0-4 completo: condições por cliente, pagamentos como eventos (incluindo sinal e quitação de fechamento), extrato, saldo, "Cobrar no WhatsApp".
3. Campos B2B de P0-5 (estabelecimento, responsável, endereço padrão, dias/janela de entrega, condição e periodicidade). Com eles, o novo pedido abre pré-preenchido e se cumpre a meta de 3 toques.
4. Os roteiros financeiros do tutorial.

Depois disso: P1-1 (agenda + ICS) e P1-2 (lembretes), que completam o uso diário no celular.

---

## 1. Objetivo

Aposentar as planilhas de Excel e deixar a brigaderia inteira na palma da mão. O app deve ser **completo, sem ficar atrás dos apps pagos** (CakeBoss, Whisk Manager, Bakesy, ZupConfeitaria, Lucro na Confeitaria, Saipos), **moderno e bonito, e o visual não pode atrapalhar o uso**. Use do dia a dia com **o mínimo de toques**.

## 2. Quem usa e como

| Pessoa       | Função no negócio                      | Papel no sistema | Aparelho                                       | Precisa resolver rápido                                                             |
| ------------ | -------------------------------------- | ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| Proprietário | Produção e financeiro                  | `owner`          | **Android** (Chrome) + PC                      | O que produzir hoje e amanhã por sabor, quem deve, quanto entrou, fechamentos       |
| Esposa       | Entregas e relacionamento com clientes | `operator`       | **iPhone** (Safari / PWA na tela inicial) + PC | Entregas do dia, marcar entregue/recebido, mapa, WhatsApp, cliente e pedido rápidos |
| PC (os dois) | —                                      | —                | Navegador desktop                              | Cadastro de produtos, relatórios completos, exportações, configurações              |

**Consequência:** o Safari do iPhone é plataforma **crítica**. Hoje o E2E `webkit-mobile` falha (ver T-1).

## 3. Perfil comercial atual

- **Os clientes são estabelecimentos (B2B)**: lanchonetes, restaurantes e outros pontos de venda, com **pedidos semanais recorrentes**. A estimativa é de 5 a 10 clientes fixos (_informado pelo Felipe, não confirmado_).
- **Entrega:** feita pelo proprietário e/ou pela esposa. **Motoboy precisa existir como opção.**
- **Formas de pagamento:** Pix, dinheiro, cartão de débito, cartão de crédito, transferência, outro.
- **Condições de pagamento:** adiantado, na entrega, a prazo com fechamento **semanal, quinzenal ou mensal** (configurável por cliente, com exceção por pedido).
- **Eventos e festas:** serviço futuro (pedido único, agenda e produção específica). Vai como módulo complementar **desligado por padrão**, mas o modelo de dados já deve suportá-lo.
- Instagram `@brigaderiaamorzeloso` é recente. O canal real de venda hoje é o contato direto e o WhatsApp.

## 4. Produtos (_informado pelo Felipe_)

| Sabor                     | Peso por unidade | Unidades por caixa | Preço da caixa           |
| ------------------------- | ---------------- | ------------------ | ------------------------ |
| Tradicional (carro-chefe) | 30 g             | 12                 | R$ 42,00 (4200 centavos) |
| Casadinho                 | 30 g             | 12                 | R$ 42,00                 |
| Cajuzinho                 | 30 g             | 12                 | R$ 42,00                 |
| Côco                      | 30 g             | 12                 | R$ 42,00                 |

- Atualizar `docs/INFORMACOES_COMERCIAIS.md` com os três novos sabores. Cadastrar só no ambiente privado, nunca em seed, bundle público ou service worker.
- As fotos do Instagram mostram outras coberturas. **Não cadastrar sabores a partir de fotos.** Novos sabores serão cadastrados pelo PC.
- **A confirmar:** caixa mista, unidade avulsa, outros tamanhos de caixa, preço diferenciado para revenda.
- **Sugestão de modelagem:** um produto "Caixa 12 un." com preço único e **composição por sabor** nos itens do pedido (ex.: 2 caixas = 12 Tradicional + 6 Cajuzinho + 6 Côco). A validação garante que a soma das unidades seja múltiplo de 12. Se a caixa mista não for permitida, isso vira regra configurável ("um sabor por caixa"). A produção sempre soma **unidades por sabor**.

## 5. Identidade visual

- **Logo oficial:** [`docs/marca/logo-brigaderia-amor-zeloso.png`](../marca/logo-brigaderia-amor-zeloso.png). PNG 1999×2050 com fundo transparente, recriado pelo Felipe no Canva e **autorizado por ele para uso no app**. A partir dele, gerar ícones PWA (192, 512, maskable com margem segura, apple-touch-icon 180), favicon e uma versão otimizada (WebP/PNG reduzido) para a interface. Os ícones atuais em `public/icons/` são provisórios e devem ser substituídos.
- **Cores amostradas do logo:**
  - Marrom `#321D10`
  - Creme `#F9ECD7`
  - Dourado `#B8915B`
  - O rosé `#AD776B` do SPEC continua como cor de apoio.
  - Revisar os tokens de `src/styles.css` e garantir contraste AA. Dourado sobre creme provavelmente **não** passa em texto pequeno; usar só em detalhes ou texto grande.
- **Tipografia do logo:** serifada de alto contraste para "brigaderia" e sans geométrica espaçada em caixa alta para "AMOR ZELOSO". Sugestão: fontes open source parecidas (ex.: _Fraunces_ ou _DM Serif Display_ para títulos e _Josefin Sans_ ou _Jost_ para rótulos), **auto-hospedadas** no build, sem CDN de terceiros. Corpo de texto em sans legível (system-ui ou _Inter_). Documentar que são aproximações.
- O mascote (brigadeiro de chapéu de chef do Reels) **não está autorizado**. Não usar.
- WhatsApp da bio `558398211759`: guardar como **configuração da empresa no banco**, nunca hardcoded. Reconfirmar na entrega.

## 6. Pendências técnicas (fazer antes da próxima fase)

- **T-1 — CI vermelho no Safari.** `tests/e2e/management.spec.js:30` falha em `webkit-mobile` (o heading "Visão geral" não aparece após o login), em todos os pushes desde a Fase 1.
  - Hipótese (não confirmada): o WebKit não aceita o cookie `__Host-session` (`Secure`) em `http://127.0.0.1`, e o Chromium aceita.
  - Corrigir sem enfraquecer a segurança em produção. Por exemplo, servir o E2E por HTTPS local, ou usar configuração de cookie específica do harness de teste, desde que não exista no código publicado.
  - O iPhone da esposa depende disso.
- **T-2 — N+1 nas listagens** (`worker/management.ts`, consultas por linha para `product_variants` e `order_items`). O plano Free do D1 permite **50 consultas por invocação**, então a listagem falha com cerca de 50 registros. Buscar filhos em lote (`WHERE id IN (...)`, em blocos) ou com `JOIN`, e adicionar teste com mais de 60 registros.
- **T-3 — `orders.status` com `CHECK(status='draft')`.** A Fase 2 exige reconstruir a tabela (SQLite não altera CHECK): nova tabela, cópia, troca e índices, com teste de migração e backup prévio documentado.
- **T-4 — Dashboard soma rascunhos.** Após os status, separar "previsto (confirmados)", "entregue" e "recebido".
- **T-5 — Ícones da navegação** usam caracteres Unicode (◎ ◇ ▤). Trocar por biblioteca de ícones open source consistente (sugestão: `lucide-react`, licença ISC, com tree-shaking).

## 7. Funcionalidades priorizadas

> Ordem sugerida. Cada fase continua pequena, testada e com relatório (AGENTS.md §10). Ajuste o `docs/PLANO_DE_EXECUCAO.md` para refletir estas prioridades.

### P0 — o que aposenta a planilha

- **P0-1 — Tela "Hoje"** (home do celular, adaptada ao papel):
  - _Esposa:_ entregas do dia em ordem, cada cartão com cliente, caixas por sabor, endereço e botões grandes **Mapa**, **WhatsApp**, **Entregue** e **Recebi R$** (com forma de pagamento).
  - _Proprietário:_ bloco **"Produzir hoje / amanhã"** com unidades e caixas por sabor, somando os pedidos confirmados, e resumo de **a receber**.
  - _Ambos:_ pendências (pedidos a confirmar, cobranças vencidas, lembretes).
- **P0-2 — Pedido padrão / recorrente por cliente.** Peça central do B2B.
  - Cada estabelecimento tem um ou mais modelos (ex.: toda terça, 3 caixas Tradicional + 2 Cajuzinho).
  - Botão **"Gerar pedidos da semana"** cria **rascunhos sugeridos**. A equipe ajusta quantidades com stepper (+/−) e confirma, em lote ou um a um.
  - Nunca confirmar automaticamente sem ação humana. Idempotente: gerar duas vezes não duplica.
- **P0-3 — Status simplificado no celular.**
  - A máquina de estados completa do SPEC continua valendo no backend.
  - A UI mostra só o **próximo passo** como botão principal: Confirmar → Iniciar produção → Pronto → Saiu / Entregue (ou Retirado), mais Cancelar com motivo.
  - Status de pagamento independente do de entrega.
  - Histórico de mudanças (`order_status_events`) com autor e horário.
- **P0-4 — Conta do cliente e fechamento.**
  - Entregas a prazo acumulam na conta do estabelecimento.
  - O fechamento (semanal/quinzenal/mensal, conforme o cadastro) gera **extrato do período**: entregas, total, pagamentos, saldo.
  - Pagamento como evento, que pode quitar um pedido ou um fechamento inteiro, inclusive parcialmente.
  - Botão **"Cobrar no WhatsApp"** com resumo pré-preenchido. Pix copia-e-cola/QR estático só depois de a chave ser configurada pelos proprietários.
- **P0-5 — Cadastros rápidos.**
  - Cliente com nome + telefone (já existe).
  - Campos B2B opcionais: nome do estabelecimento, responsável, endereço + referência + bairro, dias e janela de entrega, condição de pagamento e periodicidade de fechamento.
  - Pedido em **no máximo 3 toques** após escolher o cliente, já preenchido com o pedido padrão.
- **P0-6 — Entregador por pedido:** Proprietário / Esposa / Motoboy (nome livre + taxa). A taxa de motoboy pode gerar despesa vinculada (com confirmação humana, sem criar gasto automaticamente).
- **P0-7 — WhatsApp assistido** (já previsto na Fase 2): modelos para confirmação, pedido a caminho, entregue, cobrança/fechamento e pós-venda. Botão abre `wa.me` e o envio é humano. Registro opcional "contato realizado".

### P1 — logo depois, para igualar os apps pagos

- **P1-1 — Agenda semanal/mensal:** entregas, produção, fechamentos e lembretes. Exportar `.ics` / "Adicionar ao calendário" para alertas nativos sem custo.
- **P1-2 — Lembretes manuais** (ex.: "ligar para a Lanchonete X segunda"), visíveis na tela Hoje.
- **P1-3 — Relatórios (foco no PC):**
  - Vendas por período, cliente e sabor.
  - Contas a receber por cliente (aging).
  - Ranking de sabores e clientes, comparativo semana a semana, clientes que pararam de pedir.
  - Exportação CSV com escaping correto.
  - PDF de extrato/orçamento se viável sem custo.
- **P1-4 — Ficha técnica e preço sugerido:** insumos e embalagens com custo, rendimento por receita, custo por unidade e por caixa, margem estimada, simulador de preço.
- **P1-5 — Lista de compras** gerada pelos pedidos confirmados da semana a partir das fichas técnicas.
- **P1-6 — Estoque de insumos e embalagens** com movimentos auditáveis e alerta de mínimo (Fase 4 do plano).
- **P1-7 — Despesas e fluxo de caixa estimado** (insumos, embalagens, motoboy, gás, outros), com lucro **estimado** por período e por pedido.
- **P1-8 — Importador CSV/Excel** de clientes (e depois de histórico), com pré-visualização, detecção de duplicados por telefone e confirmação humana. Não há planilhas reais disponíveis ainda: testar com fixtures fictícias.
- **P1-9 — Backup/exportação completa** acessível ao administrador, com procedimento de restauração testado.

### P2 — módulos complementares desligados (feature flags no servidor)

- **P2-1 — Eventos e Festas.**
  - Pedido `order_type = 'event'`, com data e local, nº de convidados, cardápio por sabor, sinal e saldo, degustação, checklist de produção com antecedência e status próprio (orçamento → reservado → em produção → entregue).
  - **Agora:** incluir `order_type` (`regular` | `recurring` | `event`) e suporte a sinal nos pagamentos. A UI fica para depois.
- **P2-2 — Catálogo público** (já previsto, continua OFF).
- **P2-3 — Web Push.** No iPhone só funciona com o PWA instalado (iOS 16.4+); documentar.
- **P2-4 — Fila offline restrita** para "marcar entregue/recebido" (a esposa usa na rua, com sinal ruim). Só com sincronização robusta, idempotência e testes. Até lá, manter o bloqueio de gravação offline e a mensagem clara.

## 8. Diretrizes de UX e visual

- **Navegação no celular:** barra inferior **Hoje · Pedidos · [+] · Clientes · Mais**. Produção, Financeiro, Agenda, Relatórios, Ajuda e Configurações ficam em "Mais". No PC, barra lateral com tudo.
- **Botão [+]** abre folha rápida: Novo pedido · Novo cliente · Registrar pagamento · Lembrete.
- **Toques:**
  - Alvos de no mínimo 44×44 px e steppers grandes.
  - `inputmode="numeric"`/`"decimal"` em valores.
  - Selects substituídos por chips/segmented control quando houver até 5 opções.
  - Ações principais ao alcance do polegar (rodapé).
- **Confirmações:** irreversíveis (cancelar, estornar) pedem confirmação. Ações frequentes (entregue, recebido) **não** pedem confirmação, mas oferecem **"Desfazer"** por alguns segundos, registrado em auditoria.
- **Visual moderno sem atrapalhar:**
  - Fundo creme claro, cartões com cantos arredondados e sombra suave, títulos na serifada da marca, números e valores grandes e legíveis.
  - Cor de status sempre acompanhada de ícone e texto (não depender só de cor).
  - Animações curtas e respeitando `prefers-reduced-motion`.
  - Modo escuro opcional baseado no marrom da marca.
- **Estados vazios úteis** ("Nenhuma entrega hoje. Gerar pedidos da semana?").
- **Feedback de salvamento** visível. Offline continua com aviso claro e sem gravação.
- **PC:** mesmas telas em duas colunas, tabelas completas, filtros e atalhos de teclado nos cadastros longos.

## 9. Ajuda contextual (ícones de explicação)

- Componente único `HelpTip`:
  - Ícone ⓘ (ex.: `Info`/`CircleHelp` do Lucide) ao lado de títulos de seção e campos que geram dúvida.
  - Toque abre um popover no PC ou uma bottom sheet no celular, com **1 a 3 frases** em linguagem simples e, quando fizer sentido, um link "Ver no tutorial".
- **Acessível:** `<button>` com `aria-label` ("Ajuda: Fechamento"), foco visível, fecha com Esc ou toque fora, sem depender de hover (não existe hover no celular).
- **Textos centralizados** num único arquivo (ex.: `src/features/help/texts.ts`), fáceis de revisar e corrigir sem mexer nas telas.
- **Onde usar, no mínimo:**
  - Pedido padrão
  - Gerar pedidos da semana
  - Status do pedido
  - Condição de pagamento
  - Fechamento
  - Saldo / a receber
  - Composição da caixa
  - Produzir hoje
  - Entregador / taxa
  - Lucro estimado
  - Ficha técnica
  - Estoque mínimo
  - WhatsApp assistido (explicar que o app não envia sozinho)
  - Papéis de acesso

## 10. Mini tutorial

- **Primeiro acesso:** tour curto (5 a 7 passos) **por papel**, com destaque no elemento real da tela e botões "Próximo", "Pular" e "Já sei". Pode ser refeito a qualquer momento em **Mais → Ajuda**.
- **Roteiros mínimos:**
  1. _Esposa:_ tela Hoje → abrir entrega → Mapa/WhatsApp → marcar Entregue → registrar recebimento → cadastrar cliente rápido.
  2. _Proprietário:_ gerar pedidos da semana → ajustar e confirmar → ver "Produzir hoje" → registrar pagamento → fazer fechamento e cobrar no WhatsApp.
  3. _PC:_ cadastrar sabor/produto → ficha técnica → relatórios e exportação.
- **Central de Ajuda** em "Mais": lista de guias curtos (passo a passo com prints ou ilustrações), perguntas frequentes e "Como instalar o app na tela inicial" (iPhone/Safari e Android/Chrome).
- **Modo treino:** o tutorial roda sobre **dados fictícios claramente rotulados ("Exemplo")**, apenas no frontend, **nunca gravados no D1**, para que eles pratiquem sem sujar os dados reais.
- O registro de "tutorial concluído" pode ficar no perfil do usuário no servidor, ou em `localStorage` (não é dado sensível).

## 11. Paridade com apps pagos (checklist de referência)

| Recurso                                                           | Referências                                 | Item        |
| ----------------------------------------------------------------- | ------------------------------------------- | ----------- |
| Agenda de encomendas                                              | Lucro na Confeitaria, CakeFlow, Whisk       | P1-1        |
| Ordem/lista de produção                                           | E aí chef?, Whisk                           | P0-1        |
| Ficha técnica e precificação                                      | DocePreço, Viver de Confeitaria, BakeMargin | P1-4        |
| Lista de compras                                                  | CakeBoss, Whisk                             | P1-5        |
| Estoque de insumos                                                | ZupConfeitaria, Saipos, Mimo Pro            | P1-6        |
| Orçamento/extrato em PDF                                          | Lucro na Confeitaria, CakeBoss              | P1-3        |
| Lucro por pedido e despesas                                       | Whisk Manager                               | P1-7        |
| CRM básico e clientes recorrentes                                 | Butterbase, ZupConfeitaria                  | P0-2 / P0-5 |
| Pedidos por WhatsApp                                              | Saipos, PM-Bem-Casados (GitHub)             | P0-7        |
| **Diferencial nosso:** pedido recorrente B2B + fechamento a prazo | —                                           | P0-2 / P0-4 |

## 12. Perguntas em aberto (confirmar com os proprietários na entrega)

- Caixa mista? Unidade avulsa? Outros tamanhos? Preço de revenda diferente?
- Dias e rotas habituais de entrega.
- Chave Pix e dados de cobrança.
- Quais dados das planilhas importar (clientes, histórico, contas em aberto).
- E-mails de acesso de cada um (só no D1/Access, nunca no Git).
