# R11 — Caixa mista: estado vigente em 07/11/2026

**O app já está ativado na conta da brigaderia, inclusive a montagem mista. Não reverter as flags.** Esta informação substitui a restrição temporária da entrega inicial do modelo/API. A ativação e os testes físicos foram registrados pelo responsável/Claude no histórico; esta continuação não altera o Cloudflare nem o banco real.

## Entregas existentes

- R11-1: `0015_mixed_boxes.sql` aditiva, componentes privados por item/organização/variante, snapshots e validação de soma, atividade e peso. Preço/capacidade vêm da embalagem; quantidade no item é de caixas iguais, composição é de unidades por caixa. Edição com `item_id` e `composition_version: 1` preserva identidade/preço e impede perda silenciosa em editor antigo. Backup inclui composição/FKs.
- Claude em 07/11: montagem/edição na etapa Sabores, caixa desenhada, completar/limpar e agregação de caixas iguais; base pelo sabor predominante; produção somada por sabor; composição no Hoje e WhatsApp. `mobile/defaults` informa a disponibilidade mista. Novo pedido usa as etapas Cliente → Sabores → Quando → Entrega → Pagamento → Revisar.
- R11-4 restante: relatórios usam unidades de cada componente, sem atribuir toda a caixa ao sabor base. Ranking por unidades, snapshots históricos, filtros e CSV privado com composição. O total da venda aparece uma vez; valores por sabor usam **rateio proporcional por unidades**, com maior resto e desempate por ID para preservar os centavos. Não representam preços avulsos. Caixas de um sabor e unidades em caixas mistas são distintas; equivalência em caixas aparece apenas como divisão unidades/capacidade no CSV, sem afirmar venda de embalagem fracionada.

## Custos e próximos itens

R11-5 entregue: detalhe do pedido oferece **Custo estimado do pedido**, consultado ao abrir a seção. Soma as unidades de cada sabor, incluindo misturas, usando o custo unitário da ficha atual (arredondado para cima em centavos, como no simulador existente). Inclui insumos/embalagens/mão de obra/despesas gerais definidos na ficha; entrega e despesas fora da ficha não entram. É estimativa atual de produção, não custo histórico congelado nem lucro apurado. Ficha ausente/inativa, insumo inativo ou custo não cadastrado deixam o total indisponível; zero explicitamente cadastrado é válido. Nenhum preço de venda, recebimento, despesa ou estoque é alterado.

Compras soma demanda simples e mista por variante, usa pedidos confirmados/em produção e preserva o arredondamento de lotes/embalagens inteiros. Pode diferir do custo proporcional consumido pelo pedido. Até 1000 pedidos e 10000 linhas de sabores; período de compras até 31 dias. Relatórios mantêm o limite anterior de 1000 vendas/período, agora com limite explícito de 10000 linhas de sabores. Reduza o período se exceder; não há truncamento silencioso.

A nova consulta privada `GET /api/p1/order-costs/:id` é permitida a administrador e operadora, como a leitura de fichas. Retorna 401 sem sessão e 404 para pedido inexistente/de outra organização. Está na matriz de segurança. Usa a migração 0015 já existente, também mantendo custo simples em banco até 0014; não exige nova migração ou alteração de flags.

Depois: misturas em modelos recorrentes/geração semanal e editor do PC, preservando pedidos atuais. R12 entra na etapa Quando já existente; depois R6-5/7/8 e R7. Actions do Node ficam por último, após conferir Dependabot.

## Operação e segurança

As migrações 0001–0015 já foram aplicadas conforme o histórico; não reaplicá-las por tentativa nem alterar flags para executar esta correção de cálculos. Não há nova migração nesta fase. `PUBLIC_CATALOG_ENABLED` permanece false. Banco anterior à composição continua suportado para itens simples nos relatórios.

Cada rota nova deve entrar na matriz `test:security`. O CI e o workflow Segurança devem estar verdes no SHA antes de avançar main para ele. Guias: [auditoria](SEGURANCA_AUDITORIA.md) e [ativação/manutenção](ATIVACAO.md). Dados de homologação e ensaio físico não são substituídos por fixtures automatizadas.
