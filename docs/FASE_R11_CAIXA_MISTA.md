# R11 — Caixa mista: situação da implementação

**R11-1: modelo e APIs preparados. Montagem na interface e consumidores ainda pendentes. Não ativar a funcionalidade nesta etapa.**

A composição permitida pelo negócio tem o mesmo preço da embalagem, sabores ativos e total igual às unidades por caixa. Peso por unidade compatível entre os sabores. A implementação usa os valores do cadastro privado; não insere produtos/preços nem usa o protótipo como fonte de dados.

## Modelo preparado

- `0015_mixed_boxes.sql` é aditiva: cria `order_item_components`, com chave da organização/item/variante e FKs para item e variante. Não modifica pedidos antigos nem cria registros comerciais.
- Quantidade do item representa **caixas iguais**; `components[].units` representa unidades de cada sabor **dentro de uma caixa**. Preço e capacidade vêm da variante da embalagem no servidor.
- Item de entrada: `variant_id`, `quantity`, `components: [{variant_id, units}]`; `item_id` opcional na edição preserva a identidade e o preço histórico. `composition_version: 1` declara que o editor entende a composição. Repetição da mesma composição deve ser agregada na quantidade; composições diferentes podem usar a mesma embalagem.
- Servidor recusa soma inválida, duplicatas, valores fracionários/negativos, sabores inativos/de outra organização, peso incompatível e snapshots/preços enviados pelo cliente. Item simples mantém o comportamento anterior.
- Snapshots de composição, nomes, pesos e preços preservam os pedidos após mudanças do catálogo. Atualização/confirmação e componentes compartilham transação, versão, idempotência e auditoria do pedido. Editor antigo recebe conflito ao tentar editar pedido misto; não apaga a composição silenciosamente.
- Leituras de pedido carregam componentes em lote, inclusive com a montagem desligada. Backup inclui a composição e restauração é validada com FKs.

## Bloqueio de ativação

`MIXED_BOXES_ENABLED` é opcional e **desligada por padrão**; a ausência da variável equivale a desligada. Não configurar como `true` enquanto R11-2…5 não estiverem entregues. Mesmo com variável ativada, sem a tabela 0015 o servidor recusa caixas mistas. Banco anterior continua aceitando itens simples.

A aplicação futura da migração deve seguir o runner de pendentes do [guia de ativação](ATIVACAO.md), com backup e conferência do ambiente. Nenhuma migração remota ou alteração de variável foi executada pelo agente. `schema_mixed_model_ready` indica apenas presença do modelo, **não** que montagem, produção, relatórios ou custos estejam concluídos.

## Próximas etapas

- R11-2: montagem visual 4×3, edição e agregação de caixas iguais; modelos recorrentes e geração semanal, sem duplicação.
- R11-3: produção em unidades por sabor, incluindo frações de caixa.
- R11-4: textos de composição em cartões/pedidos/WhatsApp, CSV e relatórios por unidades.
- R11-5: receitas e compras a partir das unidades por sabor.
- R11-6: documentação comercial alinhada à confirmação do negócio.
- R12-1…4: calendário/horário, sugestão do pedido padrão e confirmação que abre a agenda do dia.

Montagem visual, geração semanal mista, produção, relatórios e custos **não foram simulados como concluídos** nesta base. As capturas `r12-depois-*` desta rodada representam os acabamentos R10; os dados continuam fictícios e isolados dos cadastros reais.
