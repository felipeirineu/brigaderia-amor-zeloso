# R11 — Caixa mista: estado vigente em 07/11/2026

**O app já está ativado na conta da brigaderia, inclusive a montagem mista. Não reverter as flags.** Esta informação substitui a restrição temporária da entrega inicial do modelo/API. A ativação e os testes físicos foram registrados pelo responsável/Claude no histórico; esta continuação não altera o Cloudflare nem o banco real.

## Entregas existentes

- R11-1: `0015_mixed_boxes.sql` aditiva, componentes privados por item/organização/variante, snapshots e validação de soma, atividade e peso. Preço/capacidade vêm da embalagem; quantidade no item é de caixas iguais, composição é de unidades por caixa. Edição com `item_id` e `composition_version: 1` preserva identidade/preço e impede perda silenciosa em editor antigo. Backup inclui composição/FKs.
- Claude em 07/11: montagem/edição na etapa Sabores, caixa desenhada, completar/limpar e agregação de caixas iguais; base pelo sabor predominante; produção somada por sabor; composição no Hoje e WhatsApp. `mobile/defaults` informa a disponibilidade mista. Novo pedido usa as etapas Cliente → Sabores → Quando → Entrega → Pagamento → Revisar.
- R11-4 restante: relatórios usam unidades de cada componente, sem atribuir toda a caixa ao sabor base. Ranking por unidades, snapshots históricos, filtros e CSV privado com composição. O total da venda aparece uma vez; valores por sabor usam **rateio proporcional por unidades**, com maior resto e desempate por ID para preservar os centavos. Não representam preços avulsos. Caixas de um sabor e unidades em caixas mistas são distintas; equivalência em caixas aparece apenas como divisão unidades/capacidade no CSV, sem afirmar venda de embalagem fracionada.

## Custos e próximos itens

R11-5 está em implementação: custo por composição e compras consolidadas por sabor. Nenhum custo ausente será tratado como zero, e previsão não criará despesa ou baixa de estoque. A próxima entrega usará fichas/insumos cadastrados e explicará arredondamento e limites.

Depois: misturas em modelos recorrentes/geração semanal e editor do PC, preservando pedidos atuais. R12 entra na etapa Quando já existente; depois R6-5/7/8 e R7. Actions do Node ficam por último, após conferir Dependabot.

## Operação e segurança

As migrações 0001–0015 já foram aplicadas conforme o histórico; não reaplicá-las por tentativa nem alterar flags para executar esta correção de cálculos. Não há nova migração nesta fase. `PUBLIC_CATALOG_ENABLED` permanece false. Banco anterior à composição continua suportado para itens simples nos relatórios.

Cada rota nova deve entrar na matriz `test:security`. O CI e o workflow Segurança devem estar verdes no SHA antes de avançar main para ele. Guias: [auditoria](SEGURANCA_AUDITORIA.md) e [ativação/manutenção](ATIVACAO.md). Dados de homologação e ensaio físico não são substituídos por fixtures automatizadas.
