# R16 — calculadora de preço por peso

## Uso na gestão

Abra **Mais → Fichas → Calculadora por peso**. Administrador cadastra/configura; operadora consulta e simula. Sem a migração 0023, o atalho não aparece e as fichas anteriores continuam disponíveis.

1. Cadastre os insumos e seus custos reais somente no app ou na planilha privada. Não envie valores, clientes ou capturas reais ao repositório.
2. Cadastre os kits, sua embalagem e o peso de massa por doce. O peso final inclui acabamento; o cálculo da massa usa o peso de massa configurado no kit.
3. Crie uma ficha por sabor. Uma ficha representa uma receita. Separe massa e custos por receita (como gás) do acabamento por doce, informado para cada tamanho.
4. Informe massa total ou rendimento de referência e peso por doce. O padrão é 16 doces / 26 g de massa; as sugestões especiais de rendimento são editáveis e precisam de conferência. Rendimentos proporcionais são estimativas, arredondadas para baixo. Um rendimento medido no tamanho/peso correspondente prevalece.
5. Informe acabamento por tamanho. **Usar estimativa** aplica a proporção de superfície ao formulário; só **Salvar ficha** grava. Não aceitar uma estimativa mantém o tamanho sem custo completo. Quantidade zero deve ser explícita quando o insumo não é usado naquele tamanho.
6. Em **Forminhas, opcionais e canal iFood**, escolha os insumos unitários reais: nº 4 sugerida para 30 g e nº 5 para 15/23 g. Configure tamanhos personalizados conforme o cadastro. Fundo/pétala são opcionais, fora da ficha padrão; selecionar na consulta conta uma unidade por doce apenas na simulação.
7. Confira o detalhamento por kit, margem e preço sugerido. O adicional padrão de 20% inclui todos os custos calculados e a embalagem antes da margem. O administrador pode alterá-lo.

Insumo sem preço/inativo, acabamento ausente, massa inválida ou embalagem indefinida deixam o custo indisponível; não são convertidos em zero. Arredondamento sempre para cima ao centavo nos parciais/unidade. Configuração e ficha usam controle de versão: se alguém salvar antes, recarregue e refaça a alteração.

## iFood e aceite fictício

**DEMONSTRAÇÃO — números inteiramente fictícios, sem relação com custos reais.** Uma receita de R$ 20,00 / 16 doces dá R$ 1,25 por doce. Kit de 12 mais caixa de R$ 2,00: R$ 17,00. Adicional de 20%: **R$ 20,40**. Margem desejada de 40%: sugestão de R$ 34,00.

O iFood assume **1 kit e 1 sacola por pedido**. Configurar embalagem, etiqueta e sacola como insumos unitários; embalagem ausente na configuração usa a do kit. Com tabela fictícia de R$ 50,00, embalagem de canal de R$ 1,00, etiqueta de R$ 0,50 e sacola de R$ 0,50: `(50 + 1 + 0,50 + 0,50) / 0,74`, arredondado para cima, dá **R$ 70,28**. A tela mostra também o cálculo a partir do preço sugerido. O repasse de 74% é configurável. Sem os custos necessários, o canal fica indisponível.

Consulta não muda preço de tabela, pedido, estoque ou despesa. As fichas por peso são um cadastro adicional por sabor; não convertem automaticamente as fichas anteriores por variante nem substituem o custo dos pedidos/compras existentes. Também não distribuem sacola entre vários kits de um pedido: esse cenário não é assumido pelo simulador.

## Ativação pelo responsável — sem comando SQL avulso

Nenhuma etapa remota foi executada nesta entrega. Não mudar flags. A migração **0023_weight_costing.sql** é aditiva, sem valores de exemplo ou conversão de fichas.

1. Confira no GitHub o commit que será publicado e os checks **Validação da gestão** (manual, três navegadores) e **Segurança** verdes no mesmo SHA. Se algum estiver vermelho, não avance a publicação/ativação.
2. Faça e confira o backup conforme [Ativação](ATIVACAO.md). Não colocar o arquivo no GitHub/chat. Se a restauração local de conferência falhar, pare; não aplique migração.
3. Abra **Actions → Homologação D1 (manual) → Run workflow**, selecione o código publicado e a ação **PRE_CHECAGEM**. Esperado: zero violações de FK e apenas migrações ainda não aplicadas; 0020–0022 vêm antes da 0023. Se 0001/0002 aparecerem pendentes em banco ativo, pare e peça revisão do histórico.
4. Com backup conferido, execute o mesmo workflow na ação **APLICAR_PENDENTES**, preenchendo as confirmações solicitadas pelo próprio formulário. Não executar limpeza, reset ou SQL manual. Se falhar, pare e preserve o backup/log sem dados pessoais; não tente reaplicar pedaços por conta própria.
5. Rode **PRE_CHECAGEM** novamente. Esperado: nenhuma pendente, zero violações de FK, contagens antigas preservadas e `schema_weight_costing_ready: true`. Se não aparecer, não configure fichas ainda; conferir versão e banco do workflow.
6. Após a publicação do código pelo procedimento habitual do responsável, entre na gestão e abra o atalho. Cadastre/confronte uma ficha com a planilha privada. Verifique que operadora pode consultar, mas não editar. Não testar com valores fictícios no cadastro usado pela operação.

As quatro tabelas de cadastro/configuração estão no backup e em KEEP. A limpeza opcional de produtos passa a ser recusada por alcançar fichas protegidas, inclusive em schema com essas tabelas vazias; a limpeza padrão de movimentos permanece permitida. O workflow descartável de limpeza não foi recriado.

## Validação e limites

Unidades e APIs cobrem aceite, pesos, rendimento medido/estimado, acabamento aceito, opcionais, arredondamento, dados desconhecidos, CAS/idempotência, permissões e organização. Backup/restauração e limpeza são ensaiados apenas em D1 efêmero. Testes de tela exercitam consulta e edição móvel, criação sem variante artificial e banco até 0022. A captura `r16-depois-calculo-peso.png` usa exclusivamente DEMONSTRAÇÃO.

Aparelho físico e homologação de receitas reais cabem ao responsável. R17 (exceto item 1, já atendido pelo importador atual) e R7 seguem como próximas fases.
