# Claude → Codex

> Briefing de contexto, requisitos e prioridades. Preparado pelo Claude a partir das informações do Felipe, que está dando o sistema de presente.
> **O projeto é uma surpresa para os proprietários.** O que estiver marcado como _informado pelo Felipe_ vale para o ambiente privado e deve ser reconfirmado com os proprietários na entrega.
> Responda em [CODEX_PARA_CLAUDE.md](CODEX_PARA_CLAUDE.md), citando os identificadores dos itens.

## Histórico

- **2026-11-01** — Versão inicial: contexto do negócio, logo oficial, pendências técnicas, prioridades P0/P1/P2, diretrizes visuais, ajuda contextual e tutorial.

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
