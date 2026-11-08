# R11 — Caixa mista: estado vigente em 08/11/2026

**O app já está ativado na conta da brigaderia, inclusive a montagem mista. Não reverter as flags.** Esta informação substitui a restrição temporária da entrega inicial do modelo/API. A ativação e os testes físicos foram registrados pelo responsável/Claude no histórico; esta continuação não altera o Cloudflare nem o banco real.

## Entregas existentes

- R11-1: `0015_mixed_boxes.sql` aditiva, componentes privados por item/organização/variante, snapshots e validação de soma, atividade e peso. Preço/capacidade vêm da embalagem; quantidade no item é de caixas iguais, composição é de unidades por caixa. Edição com `item_id` e `composition_version: 1` preserva identidade/preço e impede perda silenciosa em editor antigo. Backup inclui composição/FKs.
- Claude em 07/11: montagem/edição na etapa Sabores, caixa desenhada, completar/limpar e agregação de caixas iguais; base pelo sabor predominante; produção somada por sabor; composição no Hoje e WhatsApp. `mobile/defaults` informa a disponibilidade mista. Novo pedido usa as etapas Cliente → Sabores → Quando → Entrega → Pagamento → Revisar.
- R11-4 restante: relatórios usam unidades de cada componente, sem atribuir toda a caixa ao sabor base. Ranking por unidades, snapshots históricos, filtros e CSV privado com composição. O total da venda aparece uma vez; valores por sabor usam **rateio proporcional por unidades**, com maior resto e desempate por ID para preservar os centavos. Não representam preços avulsos. Caixas de um sabor e unidades em caixas mistas são distintas; equivalência em caixas aparece apenas como divisão unidades/capacidade no CSV, sem afirmar venda de embalagem fracionada.

## Custos e próximos itens

R11-5 entregue: detalhe do pedido oferece **Custo estimado do pedido**, consultado ao abrir a seção. Soma as unidades de cada sabor, incluindo misturas, usando o custo unitário da ficha atual (arredondado para cima em centavos, como no simulador existente). Inclui insumos/embalagens/mão de obra/despesas gerais definidos na ficha; entrega e despesas fora da ficha não entram. É estimativa atual de produção, não custo histórico congelado nem lucro apurado. Ficha ausente/inativa, insumo inativo ou custo não cadastrado deixam o total indisponível; zero explicitamente cadastrado é válido. Nenhum preço de venda, recebimento, despesa ou estoque é alterado.

Compras soma demanda simples e mista por variante, usa pedidos confirmados/em produção e preserva o arredondamento de lotes/embalagens inteiros. Pode diferir do custo proporcional consumido pelo pedido. Até 1000 pedidos e 10000 linhas de sabores; período de compras até 31 dias. Relatórios mantêm o limite anterior de 1000 vendas/período, agora com limite explícito de 10000 linhas de sabores. Reduza o período se exceder; não há truncamento silencioso.

A nova consulta privada `GET /api/p1/order-costs/:id` é permitida a administrador e operadora, como a leitura de fichas. Retorna 401 sem sessão e 404 para pedido inexistente/de outra organização. Está na matriz de segurança. Usa a migração 0015 já existente, também mantendo custo simples em banco até 0014; não exige nova migração ou alteração de flags.

Misturas em modelos recorrentes/geração semanal e editor do PC entregues conforme a seção abaixo. Depois: R12, preservando pedidos atuais. R12 entra na etapa Quando já existente; depois R6-5/7/8 e R7. Dependabot: ver [diagnóstico R14](DEPENDABOT.md); não integrar checks vermelhos.

## Operação e segurança

As migrações 0001–0015 já foram aplicadas conforme o histórico; não reaplicá-las por tentativa nem alterar flags para executar esta correção de cálculos. Relatórios/custos não exigem migração nova. Modelos mistos exigem 0016, descrita abaixo. `PUBLIC_CATALOG_ENABLED` permanece false. Banco anterior à composição continua suportado para itens simples nos relatórios.

Cada rota nova deve entrar na matriz `test:security`. O CI e o workflow Segurança devem estar verdes no SHA antes de avançar main para ele. Guias: [auditoria](SEGURANCA_AUDITORIA.md) e [ativação/manutenção](ATIVACAO.md). Dados de homologação e ensaio físico não são substituídos por fixtures automatizadas.

## Modelos recorrentes mistos e editor completo

Em Pedidos padrão, selecione a variante e marque **Caixa mista**. Distribua as unidades até completar a capacidade; a quantidade continua em caixas. Só aparecem sabores de mesmo peso/capacidade. O sabor predominante define a base/preço (empate por ID estável). Salvar não confirma pedidos. É possível ter duas combinações diferentes da mesma embalagem, além de itens simples. Pausar/reativar preserva as composições.

**Gerar pedidos da semana** cria os snapshots em um único batch com o pedido. Repetir a semana não duplica. Modelo com sabor inativo/incompatível ou composição inválida é listado em Modelos ignorados; os válidos são gerados. Alterações posteriores do modelo/catálogo não reescrevem pedidos gerados. Confira antes de confirmar, inclusive na confirmação em lote.

No editor completo do PC, marque Caixa mista para montar/editar. A variante base acompanha o sabor predominante. Alterar somente caixas preserva ID/preço histórico; trocar a base cria um item com o preço atual, mostrado na prévia e conferido no servidor. Alterar quantidades/composição só nos estados editáveis existentes. No Modo simples, os padrões e Repetir último pedido carregam as misturas para revisão nas etapas já existentes.

### Ativação da 0016 pelo responsável

A migração `0016_recurring_mixed.sql` acrescenta duas tabelas; não altera itens/modelos simples. O editor de pedidos usa a 0015 já aplicada. Antes de 0016, modelos simples continuam funcionando, a montagem recorrente fica indisponível e a API rejeita sua gravação com 503. Não mudar as flags para contornar isso.

1. Conferir CI e Segurança verdes no main. Fazer backup privado e ensaiar a restauração pelo [guia existente](ATIVACAO.md), pausando gravações durante manutenção. Se o ensaio falhar, parar e preservar o backup fora do GitHub.
2. Em GitHub → Actions → **Homologação D1 (manual)** → Run workflow → branch main → `PRE_CHECAGEM`. Esperado: lista somente a 0016 como pendente (se 0001–0015 já estão aplicadas). Se houver outra migração pendente ou erro de FK, não aplicar por tentativa; conferir o relatório sem dados pessoais.
3. Depois das verificações do guia e do backup, executar o mesmo workflow com `APLICAR_PENDENTES`, atendendo à confirmação exigida pela tela. Esperado: 0016 aplicada e pré-checagem final verde, incluindo `schema_recurring_mixed_ready: true`. Se falhar, não repetir SQL avulso; guardar o erro e repetir somente PRE_CHECAGEM para diagnóstico.
4. Reabrir o app para atualizar a sessão. Em um modelo de teste, montar a mistura, salvar, editar, gerar a semana duas vezes e conferir que o segundo resultado não duplica. Nenhuma confirmação, recebimento ou envio WhatsApp é automático. Se o controle continuar indisponível, conferir a pré-checagem e recarregar a sessão; não alterar as flags.

Teste local isolado: `npm run db:migrate:local` aplica pendências somente ao banco local; `npm run test:mixed` testa composições, 66 modelos, CAS/idempotência e compatibilidade até 0015. Backup/restauração cobre as duas tabelas novas e FKs por organização. Nenhuma execução remota foi feita pelo agente.
