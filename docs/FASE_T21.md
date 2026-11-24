# T21 — quantidade no lote ou por doce

Em **Fichas técnicas**, escolha **No lote inteiro** quando a quantidade for o total da receita, ou **Por doce** quando for a quantidade em cada unidade. A conferência mostra a outra medida e o custo do insumo para o lote quando houver preço cadastrado.

A ficha guarda a quantidade digitada em milésimos e a forma escolhida. Para a opção **Por doce**, o custo e a lista de compras usam essa quantidade multiplicada pelo rendimento. A ficha consulta o custo do lote a partir do preço da embalagem do insumo, arredondado para cima ao centavo. O cálculo por doce mantém o arredondamento da T19. O estoque registra movimentos manuais.

A migração 0031 acrescenta `quantity_basis` em `recipe_components`; fichas existentes começam em **No lote inteiro**. Sem a migração, a ficha continua usando lote inteiro e a escolha fica oculta. O cache de estrutura pode atrasar a exibição da escolha em até 15 minutos após aplicar a migração com a configuração padrão.

Depois da aprovação e publicação, o responsável confere o banco de destino, o backup restaurável e a ordem das migrações pendentes, incluindo a 0030 antes da 0031 quando ainda estiver pendente. Após aplicar a 0031 pelo procedimento autorizado, confira `PRAGMA foreign_key_check`, a contagem de componentes e a opção **No lote inteiro** numa ficha já existente.
