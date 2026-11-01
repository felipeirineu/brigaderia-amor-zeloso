# Codex → Claude

## Status dos itens

“Entregue” abaixo significa código implementado e testado localmente. **A operação da Fase 2A ainda não está ativada no banco/site remoto**: `OPERATIONS_ENABLED=false` até backup, migração 0003 e homologação. Fases 0/1 permanecem disponíveis.

| Item         | Status       | Observação                                                                                                                                                                          |
| ------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-1          | entregue     | Falha reproduzida no WebKit: cookie Secure em HTTP. Ponte somente no harness verifica flags originais; produção permanece __Host-/Secure/HttpOnly. Login/gestão passaram no WebKit. |
| T-2          | entregue     | Filhos em lotes: até três consultas para 200 pais, 91 bindings por lote; testes com 65 produtos e 65 pedidos e isolamento.                                                          |
| T-3          | entregue     | Migração 0003 e regressão preservam pedidos, itens, versões, snapshots e FKs. Aplicada somente localmente.                                                                          |
| T-4          | em andamento | Separados rascunhos, previstos confirmados e entregues. Recebido/saldo dependem dos pagamentos da 2B e não são simulados.                                                           |
| T-5          | entregue     | Lucide, logo autorizado, ícones PWA/touch/favicon e tokens com contraste AA testado. Fontes locais como aproximação.                                                                |
| P0-1         | em andamento | Hoje por papel, produção completa hoje/amanhã, entregas, mapa e contato. Recebimentos, aging e lembretes ficam nas etapas financeiras.                                              |
| P0-2         | entregue     | Modelos semanais pausáveis e geração idempotente de rascunhos; até 100 modelos, confirmação individual humana e snapshots.                                                          |
| P0-3         | entregue     | Estados completos no servidor, próxima ação, cancelamento confirmado com motivo, histórico e desfazer auditável por dez segundos.                                                   |
| P0-4         | adiado       | Fase 2B: condições, pagamentos/sinal, contas por estabelecimento, extrato, saldo e fechamentos reais.                                                                               |
| P0-5         | em andamento | Navegação móvel e + para novo pedido/cliente entregues. Campos B2B avançados e meta de três toques ainda pendentes na 2B.                                                           |
| P0-6         | entregue     | Endereço de entrega como snapshot; proprietário/esposa/motoboy e nome/taxa. Legado fica A definir; nenhuma despesa automática.                                                      |
| P0-7         | em andamento | Modelos operacionais editáveis, prévia, wa.me por clique e registro manual de contato. Cobrança/fechamento aguardam financeiro.                                                     |
| P1-1         | adiado       | Agenda e ICS.                                                                                                                                                                       |
| P1-2         | adiado       | Lembretes manuais.                                                                                                                                                                  |
| P1-3         | adiado       | Relatórios e exportações financeiras.                                                                                                                                               |
| P1-4         | adiado       | Fichas técnicas e simulador de margem.                                                                                                                                              |
| P1-5         | adiado       | Lista de compras.                                                                                                                                                                   |
| P1-6         | adiado       | Estoque/embalagens.                                                                                                                                                                 |
| P1-7         | adiado       | Despesas/caixa/lucro estimado; nenhuma despesa gerada pela taxa de motoboy.                                                                                                         |
| P1-8         | adiado       | Importação com preview e deduplicação.                                                                                                                                              |
| P1-9         | adiado       | Interface de backup/exportação; backup e ensaio de restauração administrativos são pré-requisitos da ativação.                                                                      |
| P2-1         | em andamento | order_type preparado; eventos bloqueados. Sinal em pagamentos na 2B; interface/eventos depois.                                                                                      |
| P2-2         | adiado       | Catálogo público continua OFF na API e UI.                                                                                                                                          |
| P2-3         | adiado       | Push não implementado.                                                                                                                                                              |
| P2-4         | adiado       | Fila offline não implementada; escritas privadas continuam exigindo conexão.                                                                                                        |
| Ajuda §9/§10 | em andamento | HelpTip com 14 temas, central, tour base de cinco passos por papel e treino Exemplo em memória. Roteiros financeiros/fichas técnicas dependem dessas funções.                       |

## Dúvidas e decisões

- Caixa mista é sugestão, não decisão comercial: manter produtos/variantes atuais, sem remodelar dados cadastrados. Confirmar mistura/avulso/revenda na entrega.
- T-1: transporte HTTP adaptado somente no harness, com verificação das flags reais em testes separados. Homologação HTTPS e instalação em iPhone físico continuam necessárias; WebKit Linux não equivale a Safari no aparelho.
- Relatórios de recebido/saldo exigem P0-4. A tela Hoje inicial não apresentará números financeiros inexistentes. Suporte a sinal será parte do modelo de pagamentos da 2B; não criar coluna fingindo recebimentos.
- A regra SPEC sobre confirmação de alterações irreversíveis prevalece: cancelamento exige motivo/confirmação. Desfazer entrega deve ser compensação auditável, sem apagar evento; entregue com janela de dez segundos, validação de autor/versão e evento compensatório.
- Telefone comercial e dias/rotas não serão inferidos. WhatsApp de cliente usa exclusivamente contato autorizado do cadastro privado. Caixa padrão usa variante existente e seu preço; não inserir os quatro sabores automaticamente.
- Existem registros no D1 remoto: sem reset/seed, migrações novas e ensaio de preservação. Sem credenciais administrativas nesta máquina, a aplicação remota da migração continuará exigindo procedimento do responsável.

- Reconfirmar com os proprietários os quatro sabores/preços informados pelo Felipe. Validar se desejam entregador padrão por modelo recorrente; atualmente a escolha é explícita, sem inferência.
- Para a 2B: fechamento quinzenal é em dias fixos do mês ou a cada 14 dias? Confirmar prazos, política de crédito e Pix configurável antes de implementar cobrança. As dúvidas não bloqueiam a operação entregue.
- Nenhum conflito bloqueante com AGENTS. Sugestão de caixa mista permanece pendente; cancelamento exige confirmação/motivo, e desfazer entrega usa compensação auditável. Arquivos de autoria Claude foram preservados.

## Histórico

- **2026-11-01 — Fase 2A concluída no código:** backend `4306c74` e interface `0b70037`. Estados/histórico/desfazer, Hoje por papel, recorrência semanal idempotente, entregador, WhatsApp assistido e base HelpTip/tour. Migração preservou dados de fixture e passou também no runner D1 local. Produção agrega todos os itens, inclusive no teste com 205 pedidos e limite de 200 cartões. Não houve escrita no D1 remoto ou envio de mensagem. `OPERATIONS_ENABLED=false`; ativar somente após backup/restauração ensaiada, 0003 e conferências. Relatórios detalhados: `docs/ENTREGA_TECNICA.md` e `docs/FASE_2A.md`.

- **2026-11-01 — Validação final:** 30 unitários, 28 verificações API base, 11 verificações API operacional, regressão da migração, volume com 65 pais/filhos, seis SQLite, ícones/AA, lint/formato/tipos/build passaram. E2E completo: 20 passaram e um offline WebKit permaneceu ignorado como na suíte anterior; login/gestão/operação WebKit executados e aprovados. Após ajustes visuais, seis E2E privados passaram novamente; após o agregado completo, três operacionais passaram. Pendentes: CI após push, iPhone/Android físicos, ativação remota e revisão do Claude. P0 financeiro/fechamentos e cadastros B2B avançados continuam na 2B; P1/P2 não foram declarados concluídos.

- **2026-11-01 — Marca/T-5:** PWA 192/512/maskable, apple-touch-icon, favicon e WebP derivados do logo autorizado; Lucide e tokens oficiais. Teste de dimensões/ICO e AA passou (marrom/creme 13,65:1, secundário 5,82:1, dourado escuro 5,91:1). Dourado original apenas decorativo.

- **2026-11-01 — T-1:** falha da linha 30 reproduzida em WebKit executado localmente. Correção restrita ao transporte HTTP de testes; mantém as verificações de JWT, organização, expiração e flags originais. E2E WebKit passou; não equivale a instalação Safari/iPhone físico. Dependências Debian verificadas foram extraídas em diretório local; launcher aponta para binário WebKit original com bibliotecas locais, sem desativar TLS.

- **2026-11-01 — T-2:** removido N+1, leitura em lotes de 90 IDs com organização obrigatória. 27 testes unitários passaram e integração com 65 produtos/65 pedidos passou. Nenhuma alteração de schema ou dados remotos.

- **2026-11-01 — Planejamento:** arquivos de colaboração e logo importados do branch Claude; briefing lido integralmente. Comercial e plano reescritos antes do código. T-1/T-2/marca antecedem a Fase 2A; financeiro e complementares preservados como fases futuras. Nenhuma dúvida acima bloqueia correções técnicas ou a base operacional aprovada. Sem conflito de autorização com AGENTS; sugestões comerciais não confirmadas permanecem pendentes, catálogo OFF.
