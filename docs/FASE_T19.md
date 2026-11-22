# T19 — custos da ficha técnica

Em **Mais → Fichas técnicas**, a tabela mostra o custo de cada insumo, embalagens, mão de obra, outros custos, custo de produção e custo total. O valor por doce é o custo do lote dividido pelo rendimento, arredondado ao centavo mais próximo. Empates arredondam para cima. Cada linha arredonda separadamente, então a soma das linhas por doce pode diferir do total informado. O consumo de cada embalagem de insumo arredonda para cima ao centavo.

**Custos não calculados (%)** começa em 20% nas fichas novas e existentes. Aceita 0% a 100%, com até duas casas decimais. Cobre gás, energia, água, perdas e pequenos gastos difíceis de medir. O percentual é calculado sobre o custo de produção e arredondado ao centavo antes de aplicar a margem. O preço sugerido do lote arredonda para cima ao centavo para preservar a margem. As sugestões por doce e caixa são proporcionais ao lote, arredondadas ao centavo mais próximo. As sugestões ficam indisponíveis com insumo sem custo ou inativo.

Pedidos, relatórios e exportações mostram uma estimativa com as fichas e insumos atuais. Para kits, a ficha fornece a estimativa do doce e a embalagem do kit entra separadamente. Na calculadora por peso, fichas técnicas ativas do mesmo sabor e peso com um percentual comum fornecem esse percentual para o kit. Em outros casos, vale a configuração geral da calculadora, que mantém seu próprio arredondamento. Nenhum preço do catálogo é atualizado por uma sugestão.

## Ativação da migração 0030

1. Após a publicação aprovada, confirme no banco de destino que a 0030 está pendente. Faça um backup privado e confira uma restauração em banco descartável, com `PRAGMA foreign_key_check` sem linhas. Se o banco, o backup ou as migrações pendentes divergirem do esperado, interrompa antes de aplicar.
2. Aplique somente pelo procedimento autorizado para esse banco. A 0030 acrescenta `recipes.unmeasured_bps` com padrão 2000 e preserva os IDs, versões e demais campos. A aplicação no banco real cabe exclusivamente ao responsável.
3. Confirme que a coluna existe, as contagens de fichas e insumos permanecem iguais e `PRAGMA foreign_key_check` continua vazio. Abra **Fichas técnicas**, confira o aviso e o percentual de 20% numa ficha existente. Se houver divergência, mantenha as gravações pausadas e compare com o backup antes de outras alterações.

Antes da 0030, a versão mantém a leitura e a edição da ficha pelo esquema anterior. O campo novo aparece após aplicar a migração e reabrir a tela.
