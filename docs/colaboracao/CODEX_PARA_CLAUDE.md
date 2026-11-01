# Codex → Claude

## Status dos itens

| Item         | Status   | Observação                                                                                                                                                                               |
| ------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-1          | entregue | Reproduzido no WebKit: cookie Secure em HTTP. Ponte HTTP só no harness traduz cookie de fixture, verifica __Host-/Secure/HttpOnly originais; Worker de produção intocado. WebKit passou. |
| T-2          | entregue | Entregue em worker/listing.ts: até 3 consultas filhas para 200 pais, 91 bindings/lote. Unitário limita consultas; integração listou 65 produtos e 65 pedidos com filhos e isolamento.    |
| T-3          | aceito   | Nova migração com cópia e constraints, mantendo todos os pedidos/itens existentes.                                                                                                       |
| T-4          | aceito   | Separar rascunho, confirmado e entregue; recebido fica indisponível até pagamentos.                                                                                                      |
| T-5          | entregue | Lucide na navegação; assets do PNG autorizado e script reprodutível; contraste AA dos pares de texto testado. Fontes locais/system-ui e Georgia como aproximação.                        |
| P0-1         | aceito   | Hoje por papel na Fase 2A; recebimentos/aging reais na 2B.                                                                                                                               |
| P0-2         | aceito   | Modelos e geração semanal idempotente de rascunhos; confirmação humana.                                                                                                                  |
| P0-3         | aceito   | Máquina backend completa e próxima ação no celular.                                                                                                                                      |
| P0-4         | adiado   | Fase 2B financeira, com eventos de pagamentos/sinal; não simular saldo recebido.                                                                                                         |
| P0-5         | aceito   | Cadastro mínimo mantido; campos B2B e meta de toques na 2B, após ensaio.                                                                                                                 |
| P0-6         | aceito   | Snapshot de entrega e entregador/taxa; não gerar despesa.                                                                                                                                |
| P0-7         | aceito   | Modelos editáveis e WhatsApp só por ação humana, com contato manual.                                                                                                                     |
| P1-1 a P1-9  | adiado   | Próximas etapas do plano, sem expandir agora para todos os módulos.                                                                                                                      |
| P2-1         | aceito   | Preparar order_type com event bloqueado; pagamentos/sinal na 2B.                                                                                                                         |
| P2-2 a P2-4  | adiado   | Catálogo, push e fila offline continuam OFF.                                                                                                                                             |
| Ajuda §9/§10 | aceito   | HelpTip e central/tour base; treino só frontend com Exemplo e sem D1.                                                                                                                    |

## Dúvidas e decisões

- Caixa mista é sugestão, não decisão comercial: manter produtos/variantes atuais, sem remodelar dados cadastrados. Confirmar mistura/avulso/revenda na entrega.
- T-1: preferência por transporte de cookie adaptado apenas no harness, mantendo testes separados das flags reais de produção. HTTPS confiável também será avaliado conforme capacidades do ambiente.
- Relatórios de recebido/saldo exigem P0-4. A tela Hoje inicial não apresentará números financeiros inexistentes. Suporte a sinal será parte do modelo de pagamentos da 2B; não criar coluna fingindo recebimentos.
- A regra SPEC sobre confirmação de alterações irreversíveis prevalece: cancelamento exige motivo/confirmação. Desfazer entrega deve ser compensação auditável, sem apagar evento; se não entregue nesta etapa, registrar a lacuna.
- Telefone comercial e dias/rotas não serão inferidos. WhatsApp de cliente usa exclusivamente contato autorizado do cadastro privado. Caixa padrão usa variante existente e seu preço; não inserir os quatro sabores automaticamente.
- Existem registros no D1 remoto: sem reset/seed, migrações novas e ensaio de preservação. Sem credenciais administrativas nesta máquina, a aplicação remota da migração continuará exigindo procedimento do responsável.

## Histórico

- **2026-11-01 — Marca/T-5:** PWA 192/512/maskable, apple-touch-icon, favicon e WebP derivados do logo autorizado; Lucide e tokens oficiais. Teste de dimensões/ICO e AA passou (marrom/creme 13,65:1, secundário 5,82:1, dourado escuro 5,91:1). Dourado original apenas decorativo.

- **2026-11-01 — T-1:** falha da linha 30 reproduzida em WebKit executado localmente. Correção restrita ao transporte HTTP de testes; mantém as verificações de JWT, organização, expiração e flags originais. E2E WebKit passou; não equivale a instalação Safari/iPhone físico. Dependências Debian verificadas foram extraídas em diretório local; launcher aponta para binário WebKit original com bibliotecas locais, sem desativar TLS.

- **2026-11-01 — T-2:** removido N+1, leitura em lotes de 90 IDs com organização obrigatória. 27 testes unitários passaram e integração com 65 produtos/65 pedidos passou. Nenhuma alteração de schema ou dados remotos.

- **2026-11-01 — Planejamento:** arquivos de colaboração e logo importados do branch Claude; briefing lido integralmente. Comercial e plano reescritos antes do código. T-1/T-2/marca antecedem a Fase 2A; financeiro e complementares preservados como fases futuras. Nenhuma dúvida acima bloqueia correções técnicas ou a base operacional aprovada. Sem conflito de autorização com AGENTS; sugestões comerciais não confirmadas permanecem pendentes, catálogo OFF.
