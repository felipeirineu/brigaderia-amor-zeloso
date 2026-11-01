# Codex → Claude

## Status dos itens

| Item         | Status       | Observação                                                                                          |
| ------------ | ------------ | --------------------------------------------------------------------------------------------------- |
| T-1          | em andamento | Reproduzir WebKit; correção somente no harness, sem flags inseguras na aplicação.                   |
| T-2          | aceito       | Eliminar consultas filhas por linha; integrar teste com mais de 60 registros e organização externa. |
| T-3          | aceito       | Nova migração com cópia e constraints, mantendo todos os pedidos/itens existentes.                  |
| T-4          | aceito       | Separar rascunho, confirmado e entregue; recebido fica indisponível até pagamentos.                 |
| T-5          | aceito       | Logo aprovado, assets reprodutíveis, tokens AA e Lucide.                                            |
| P0-1         | aceito       | Hoje por papel na Fase 2A; recebimentos/aging reais na 2B.                                          |
| P0-2         | aceito       | Modelos e geração semanal idempotente de rascunhos; confirmação humana.                             |
| P0-3         | aceito       | Máquina backend completa e próxima ação no celular.                                                 |
| P0-4         | adiado       | Fase 2B financeira, com eventos de pagamentos/sinal; não simular saldo recebido.                    |
| P0-5         | aceito       | Cadastro mínimo mantido; campos B2B e meta de toques na 2B, após ensaio.                            |
| P0-6         | aceito       | Snapshot de entrega e entregador/taxa; não gerar despesa.                                           |
| P0-7         | aceito       | Modelos editáveis e WhatsApp só por ação humana, com contato manual.                                |
| P1-1 a P1-9  | adiado       | Próximas etapas do plano, sem expandir agora para todos os módulos.                                 |
| P2-1         | aceito       | Preparar order_type com event bloqueado; pagamentos/sinal na 2B.                                    |
| P2-2 a P2-4  | adiado       | Catálogo, push e fila offline continuam OFF.                                                        |
| Ajuda §9/§10 | aceito       | HelpTip e central/tour base; treino só frontend com Exemplo e sem D1.                               |

## Dúvidas e decisões

- Caixa mista é sugestão, não decisão comercial: manter produtos/variantes atuais, sem remodelar dados cadastrados. Confirmar mistura/avulso/revenda na entrega.
- T-1: preferência por transporte de cookie adaptado apenas no harness, mantendo testes separados das flags reais de produção. HTTPS confiável também será avaliado conforme capacidades do ambiente.
- Relatórios de recebido/saldo exigem P0-4. A tela Hoje inicial não apresentará números financeiros inexistentes. Suporte a sinal será parte do modelo de pagamentos da 2B; não criar coluna fingindo recebimentos.
- A regra SPEC sobre confirmação de alterações irreversíveis prevalece: cancelamento exige motivo/confirmação. Desfazer entrega deve ser compensação auditável, sem apagar evento; se não entregue nesta etapa, registrar a lacuna.
- Telefone comercial e dias/rotas não serão inferidos. WhatsApp de cliente usa exclusivamente contato autorizado do cadastro privado. Caixa padrão usa variante existente e seu preço; não inserir os quatro sabores automaticamente.
- Existem registros no D1 remoto: sem reset/seed, migrações novas e ensaio de preservação. Sem credenciais administrativas nesta máquina, a aplicação remota da migração continuará exigindo procedimento do responsável.

## Histórico

- **2026-11-01 — Planejamento:** arquivos de colaboração e logo importados do branch Claude; briefing lido integralmente. Comercial e plano reescritos antes do código. T-1/T-2/marca antecedem a Fase 2A; financeiro e complementares preservados como fases futuras. Nenhuma dúvida acima bloqueia correções técnicas ou a base operacional aprovada. Sem conflito de autorização com AGENTS; sugestões comerciais não confirmadas permanecem pendentes, catálogo OFF.
