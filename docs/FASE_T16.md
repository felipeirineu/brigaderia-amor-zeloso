# T16 — entrega feita pelos dois

Em **Novo pedido → Entrega**, **Editar entrega** ou **Entregador padrão**, escolha **Os dois**. No **Hoje**, abra **Mais ações do pedido → Atribuir aos dois** em uma entrega em aberto. As iniciais vêm dos nomes de exibição cadastrados. Quando faltar um perfil, o app usa as iniciais de Administrador e Operador.

O pedido e a corrida continuam aparecendo uma vez nos totais. Alterar quem leva não registra despesa nem duplica a taxa do pedido. Modelos recorrentes copiam o responsável e a taxa para um único pedido por semana. Os relatórios atuais somam por pedido e corrida.

## Aplicação pelo responsável

A versão 1.4.0 pode ser publicada antes da migração. A opção aparece depois que o servidor detecta a migração `0029_shared_delivery.sql` nas duas tabelas. Aplique no banco autorizado só após a revisão e a aprovação do Felipe.

1. Pause gravações e faça um backup. Confira a restauração em uma base separada. Se houver erro de restauração, preserve o backup e resolva a divergência antes de continuar.
2. Em **GitHub → Actions → Homologação D1 (manual) → Run workflow**, selecione o branch `main` e `PRE_CHECAGEM`. Espere `foreign_key_violations: 0` e confira se `pending` contém a 0029. Guarde as contagens para comparar depois. Se o banco ou a lista de pendências forem inesperados, confira o histórico e a configuração do ambiente antes de aplicar.
3. No mesmo workflow, escolha `APLICAR_PENDENTES` e confirme o backup verificado. Espere `pending: []` e `foreign_key_violations: 0`. Com as gravações pausadas, pedidos, itens e demais contagens conferidas devem continuar iguais. Se a execução falhar ou houver divergência, mantenha as gravações pausadas e encaminhe o log e as contagens para revisão.
4. Rode `PRE_CHECAGEM` mais uma vez e reabra a gestão. Confirme que **Os dois** aparece. Use um pedido de demonstração autorizado para testar a seleção, a edição e a geração semanal.

Os bancos anteriores à 0029 continuam com as quatro opções anteriores. Depois que houver registros com `both`, mantenha um app capaz de ler esse valor em qualquer reversão de versão. A migração conserva valores e vínculos existentes e amplia apenas o conjunto de entregadores aceitos.
