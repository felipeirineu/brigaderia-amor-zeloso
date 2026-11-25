# T22 — troca de doces

Em **Novo pedido → Sabores**, ligue **Teve troca de doces?** e informe quantos foram recolhidos. O formulário de computador oferece o mesmo controle. Em um pedido em aberto, **Editar troca de doces** permite ajustar a quantidade antes de concluir a entrega. Pedidos encerrados seguem as regras de edição e auditoria existentes.

O desconto usa os doces mais baratos do próprio pedido, a partir dos preços gravados nos itens. O cálculo divide o preço da embalagem pela quantidade de doces e arredonda o desconto parcial ao centavo mais próximo. Kits ficam fora da troca. Repetir o último pedido abre com a troca zerada. As ações em lote preservam a troca cadastrada.

**Hoje**, a conta e os recebimentos usam o valor líquido. Produção e lista de compras continuam contando todas as unidades necessárias. Relatórios mostram doces cobrados e perdas por troca pela data efetiva da entrega. O custo das perdas usa as fichas atuais e aparece quando há dados para calcular todas as trocas selecionadas.

A migração 0032 preserva pedidos anteriores com zero doces recolhidos e zero desconto. Antes dela, os formulários ocultam a opção e o servidor recusa uma troca positiva. Após aprovação e publicação, o responsável confere o destino, o backup restaurável e a ordem das migrações antes de aplicar no banco real. Depois, confira `PRAGMA foreign_key_check` e abra um pedido anterior e um pedido de demonstração com troca. O cache de estrutura pode levar até 15 minutos para liberar os controles com a configuração padrão.
