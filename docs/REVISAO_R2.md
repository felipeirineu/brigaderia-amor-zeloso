# Revisão R2

## Produzido

Recebimento rápido em bottom sheet no Hoje com saldo real pré-preenchido, data, chips e versões. Entregue e recebido somente com condição na entrega e transição válida; transação única, idempotência e CAS da conta/pedido. Undo conjunto por 30 s cria estorno e compensação de status; autor/mesmo dia e versões exigidos. Nenhuma mensagem ou dinheiro movimentado automaticamente.

Crédito recebido sem pedido, saldo a favor e uso manual em pedido confirmado. Alocações têm trilha e não duplicam recebimentos. Crédito estornado somente no valor disponível; administrador pode liberar alocação com motivo para corrigir o pedido. Anulação de fechamento somente pelo administrador, com motivo/evento, histórico de membros preservado e liberação para refazer. Bloqueada até estornar/liberar valores nos membros (regra conservadora mais forte que somente pagamentos do fechamento).

Operador estorna somente seus registros do dia civil atual de Fortaleza; administrador corrige outros. Resumo financeiro recebido/vencido/vence até domingo e links filtrados. Colunas virtuais de condição/periodicidade indexadas. Migração 0006 aditiva com rebuild de closings preservando cabeçalho, membros e FKs.

## Testes executados

Pacote final: 42 unitários e integrações anteriores de operação/financeiro passaram. Integração R2: entrega/pagamento e undo conjuntos, idempotência, crédito/alocação/liberação parcial/refundo, anulação/refechamento, pagamentos bloqueando anulação, permissão, isolamento e FKs. E2E R2: três projetos aprovados (Chromium mobile/desktop, WebKit mobile), preservando a rota Hoje.

## Limitações

WebKit Linux não é iPhone físico. Crédito não é alocado automaticamente. Liberação de crédito reservada ao administrador. Não anular extrato com valores líquidos recebidos em qualquer membro, mesmo que o recebimento não tenha sido lançado pelo fechamento. Registros manuais, sem consulta bancária. A nova detecção de schema exige 0006 antes de disponibilizar a revisão financeira.

## Pendências

Homologação física, revisão Claude e ativação pelo Felipe após backup/ensaio/migrações. Nada remoto nesta tarefa, inclusive push; commits e testes no checkout local. Agenda e demais P1 foram concluídos em etapas separadas, relatadas em P1_ETAPAS.md. A suíte consolidada terminou com 32 E2E aprovados e um offline WebKit já ignorado.
