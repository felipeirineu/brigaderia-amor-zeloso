# R15 — Kits por tamanho

## Situação desta etapa (R15-A)

A primeira parte entrega o cadastro privado de kits em **Mais → Kits**. A seleção desses kits no Novo pedido, modelos recorrentes e editor completo ainda é a próxima parte da R15. Os pedidos existentes continuam usando seus itens/variantes e composições de 0015/0016; o cadastro não converte, cria ou altera pedidos. A R15 completa não está declarada entregue.

O administrador cadastra tamanho, capacidade, preço inteiro do kit, limite de sabores e embalagem por kit. O peso de massa é opcional, para a futura calculadora; deixar vazio significa não informado, não zero. A embalagem é um insumo em unidades, cadastrado em Insumos e embalagens; pode ter preço desconhecido. Nada da tabela comercial é gravado por seed. Cada combinação tamanho/capacidade tem um cadastro; editar/reativar o existente evita duplicação.

A operadora consulta o cadastro. Somente o administrador cria/edita/inativa kits e muda **Limitar sabores por kit**, com histórico de autor/data. A regra vem ligada por padrão, sem registro inicial no banco. Desligada, a tela mostra a capacidade como limite efetivo. A configuração será aplicada aos pedidos com kits na parte seguinte; não revalida nem altera composições antigas nesta etapa.

Tamanho, capacidade e embalagem usam chips. No WebKit usado no teste, a criação de selects nativos produziu eventos style-src-attr em nós internos; os chips evitaram isso, sem exceção na política de produção. As barras de produção do Hoje também passaram a usar progress e CSS externo, eliminando o estilo inline existente e mantendo a proporção por unidades.

## Banco, segurança e ativação

Migração **0019_kits.sql**, somente aditiva: `kits` e `kit_settings`, isolados por organização, FK da embalagem para insumos, versão e marcador de comando. Sem produtos/variantes artificiais para carregar preços de kits. Sem 0019, a gestão anterior funciona e a rota nova retorna indisponibilidade; não há flag nova. Catálogo público continua desligado.

Rotas privadas `GET/POST /api/p1/kits`, `GET/PUT /api/p1/kits/:id` e `GET/PUT /api/p1/kit-settings`. Anônimo recebe 401; kit de outra organização/inexistente 404; operadora recebe 403 para gravações. CAS e chave de repetição protegem concorrência; auditoria não grava preços, nomes ou payloads. Configuração de outra organização não é retornada. Backup privado inclui os cadastros e a ligação com a embalagem; restauração SQLite verifica FKs.

Nenhuma migração/deploy/secret/configuração foi executada remotamente. Para ativar apenas o cadastro, o responsável deve conferir CI/Segurança verdes, seguir backup/restauração de [ATIVACAO.md](ATIVACAO.md) e executar o workflow **Homologação D1 (manual)**: primeiro PRE_CHECAGEM; depois APLICAR_PENDENTES somente após conferir backup e pendências. Esperado: nenhuma violação de FK e `schema_kits_ready: true`. Migrações 0016–0018 pendentes vêm antes da 0019. Se falhar, parar, preservar backup e voltar à pré-checagem; não reaplicar SQL avulso ou mudar flags. Isso não habilita vendas de kits ainda não implementadas.

## Validação e continuação

`npm run test:kits` cobre concorrência/repetição, permissões, isolamento, limites do cadastro, embalagem com unidade correta, custo desconhecido, compatibilidade até0018 e pedidos antigos intactos. A matriz de segurança inclui todas as rotas. E2E cobre cadastro/edição, regra e consulta pela operadora nos três projetos, sob a CSP real. Apenas o contexto separado de captura usa bypassCSP comentado, pois fotografar no WebKit injeta CSS do Playwright; o fluxo funcional não usa bypass.

Próximo: itens/snapshots de kit e composição por produto-sabor, validação do limite em cada gravação no servidor, Totem/recorrência/editor, Hoje/WhatsApp/relatórios/custos/compras, pessoa/estabelecimento e ocasião. Testes de 25×15g com cinco sabores e recusa de quatro sabores no kit12 pertencem a essa integração, ainda pendente. Não confundir o teste do cadastro de max_flavors com validação de uma composição de pedido.

R17-6 foi avaliada: persistir número é desejável, mas será feito junto aos caminhos de gravação da integração, com sequência transacional, preservação histórica e restauração testadas. Esta migração não acrescenta uma coluna parcialmente ligada; o COUNT existente segue como leitura até a etapa apropriada.

## Revisão R18 (R15-B em andamento)

A 0019 permanece intacta. A 0020 amplia peso e capacidade para inteiros de 1 a 500, copiando o catálogo antes de criar as tabelas de itens de kit. IDs, versões, embalagem, preços e configuração são preservados. Os tamanhos e capacidades conhecidos continuam como atalhos; o administrador também pode escolher Outro. Com banco somente até 0019, valores personalizados ficam indisponíveis até a 0020.

Ao escolher 15/23/30 g, o cadastro sugere massa de 13/20/26 g, identificada como sugestão editável. É possível limpar. Depois de salvar, o tamanho é mantido e a próxima capacidade ainda não cadastrada é selecionada; o preço sempre começa vazio. Sem kits, a tela explica a sequência embalagens em Insumos → kits e oferece o atalho.

Validação R18: sete testes SQL incluindo preservação do catálogo na migração, integração D1 de tamanho/capacidade personalizados e limites 1–500, lint/tipos/build, 85 unitários e três E2E (Chromium móvel/PC e WebKit móvel) com zero violações de CSP. Integração dos kits aos pedidos permanece pendente.

## Integração de leitura R15-B (branch de desenvolvimento)

Snapshots de kit passam a ser lidos em lote no detalhe, lista, Hoje e WhatsApp. Produção e relatórios incluem composição e tamanho, sem repetir receita financeira. O custo usa ficha do produto no mesmo peso; se faltar ou houver ambiguidade, permanece indisponível. Embalagem do snapshot é contada uma vez por kit, sem reutilizar o valor de embalagens por lote da ficha. Compras inclui as embalagens e mantém avisos de insumos desconhecidos/inativos.

Esta etapa ainda não abre criação de kits nos pedidos. O editor anterior recusa modificar um pedido que contenha snapshots de kit, evitando perder itens enquanto a montagem/edição não estiver integrada. Recorrência, Totem/editor completo, cliente pessoa e ocasião seguem pendentes. O teste com 66 pedidos usa somente D1 efêmero e snapshots DEMONSTRAÇÃO; não são pedidos reais nem uma API alternativa de produção.

## Escrita autenticada R15-B (branch de desenvolvimento)

Os endpoints privados de pedido clássico e móvel recebem `kit_items` separadamente de `items` legados. Total, snapshots e composição são gravados juntos e protegidos pela versão do pedido. Uma edição de pedido com kits precisa enviar explicitamente a lista de kits; um editor antigo que a omita recebe 409. A confirmação revalida atividade e soma da composição. O comando `test:kits` inclui o ensaio completo das APIs.

A montagem nas telas e a recorrência de kits ainda estão em integração. A repetição de último pedido que contenha kits fica indisponível no fluxo antigo, para não omitir parte do pedido. A etapa não libera uma experiência completa de venda por kit nem deve ser ativada no Cloudflare separadamente.

## Montagem de pedidos R15-B (branch de desenvolvimento)

Novo pedido permite escolher kit por tamanho/capacidade e montar sabores em unidades. Kits pequenos mostram espaços; capacidades maiores usam contagem por sabor. A montagem deve estar completa antes de continuar. Os seis passos do Totem e as embalagens antigas continuam disponíveis. O editor do PC preserva os dois tipos de item.

Ao ajustar somente quantidade, o preço histórico é mantido. Outra composição usa o preço atual do kit; a prévia acompanha a mesma regra do servidor. Abrir montagem bloqueia a continuação até salvar/cancelar. Pedidos confirmados precisam ser reabertos antes da produção, pelo fluxo auditado existente.

Modelos/geração recorrente de kits, defaults/repetição completa, cliente pessoa e ocasião ainda não foram integrados. Não considerar a R15 inteira concluída nem aplicar a branch diretamente no Cloudflare. A mudança documental `a7a1c64` foi incorporada: a R16 futura considerará uma sacola de envio por pedido iFood, com exemplo R$ 70,28 (exemplo inteiramente fictício atualizado em 14/11).

## Revisão R19

A montagem usa uma linha compacta por sabor e apenas um botão Completar, para o sabor selecionado. O cartão identifica o kit pelo título e pergunta Quantos kits iguais. Produtos com várias variantes ativas exibem o aviso de que cada sabor precisa ser um produto; o app não converte cadastros automaticamente.

Para agilizar os estabelecimentos, abra os Dados do estabelecimento do cliente, escolha Kit padrão do cliente e salve os padrões. No Novo pedido, esse kit vem selecionado: tocar no sabor soma um kit inteiro. Trocar kit muda só o pedido atual. Sem padrão salvo, o atalho usa12×30 somente se esse kit estiver cadastrado e ativo; não inventa um kit se faltar. O campo é validado por organização/atividade e preservado quando um editor antigo não o envia. Pedidos anteriores não são alterados.

A 0020 também cria o índice kit_order_items_order por organização/pedido, antes de qualquer ativação remota. Testes SQL verificam que SELECT e DELETE o utilizam. A montagem de pedidos está testada em Chromium/WebKit; recorrência e os demais itens da R15-B ainda impedem declarar a fase inteira pronta para ativação.

## Recorrências com kits — checkpoint R15-B5

A migração aditiva `0021_kit_recurring.sql` guarda os kits e a composição dos pedidos padrão separadamente dos itens antigos. O editor permite os dois formatos. Uma gravação antiga que omita kits existentes recebe erro 409, para não apagar parte do modelo.

Gerar pedidos da semana usa o catálogo atual, inclusive preço e embalagem; pedidos já gerados não são alterados. Um modelo com sabor/kit inativo é listado como ignorado e os demais continuam. A composição antiga intacta conserva o limite histórico de sabores na geração; alterar a composição exige o limite atual. A geração cria apenas rascunhos, para revisão humana.

Novo pedido e editor completo recebem os kits dos modelos. A repetição do último pedido também valida os kits; consumidores antigos não recebem uma sugestão parcial como válida. Os pedidos existentes mantêm os snapshots anteriores.

As tabelas `kit_recurring_items` e `kit_recurring_components` entram no backup. São dados operacionais de modelos, alcançados automaticamente pela limpeza por vínculos: **não** entram em `KEEP`. O catálogo `kits` e a configuração `kit_settings` continuam preservados. O teste restaura um backup em SQLite e limpa somente seu banco efêmero, nunca a conta Cloudflare.

**Ativação ainda pendente:** não aplicar esta branch isoladamente. Quando a R15-B estiver completa e aprovada, o fluxo manual de homologação deverá aplicar, em ordem, 0019 → 0020 → 0021 (ou somente as ainda pendentes). A pré-checagem deve apresentar `schema_kit_recurring_ready: true`, ambas as tabelas e nenhuma violação em `foreign_key_check`. Se faltar uma tabela ou surgir violação, interromper e guardar o relatório sem dados pessoais; não repetir uma limpeza nem alterar flags para tentar resolver. Esta entrega não executa nenhuma dessas operações remotas.

Importação inicial: reutilizar **Importar cadastro inicial**, que já cobre insumos (R17-1). Uma futura aba Kits pode usar `POST p1/kits`, com prévia e preço obrigatório, depois da consolidação da R15; não converter sabores/variantes ou deduzir preços automaticamente.

## Pessoa/estabelecimento e ocasião — R15-B6

A `0022_customer_type_occasion.sql` é aditiva. Todo cadastro antigo continua como Estabelecimento; só uma escolha explícita muda o tipo. Nenhum nome é usado para inferir tipo. O app consulta a disponibilidade do schema na sessão: antes da 0022, o cadastro e os pedidos antigos continuam disponíveis sem enviar campos novos.

Para um pedido pessoal, cadastre **Pessoa**, com nome e telefone opcional. Endereço também é opcional no cadastro; retirada dispensa endereço no pedido. A tela de condições não apresenta os campos de estabelecimento/dias habituais. Na confirmação, pessoa usa pagamento adiantado ou na entrega. A prazo fica para estabelecimentos; sem financeiro ativo, confirmar um pedido de pessoa fica indisponível. Nenhuma regra de sinal é criada. Contas e eventos antigos continuam legíveis.

Pedido padrão novo não aceita pessoa. Modelos existentes de um cliente posteriormente convertido em pessoa podem ser arquivados e são ignorados na geração semanal, com motivo; não são sugeridos no Novo pedido. Os modelos e pedidos antigos não são convertidos nem excluídos.

A ocasião é opcional, escolhida em Revisar ou no editor do PC. Aparece no Hoje, no detalhe e na mensagem de WhatsApp, sempre com conferência/envio humano. Editor antigo que omita tipo ou ocasião conserva o valor existente. CAS, hashes de idempotência e auditoria continuam protegendo a gravação no mesmo batch. Telefone vazio é apresentado vazio, inclusive na conta financeira; o marcador interno nunca é devolvido.

Na ativação futura, aplicar 0019 → 0020 → 0021 → 0022, somente as pendentes. `ops:preflight` deverá mostrar `schema_customer_orders_ready: true` e nenhuma violação de FK. Falha ou campo false: interromper e compartilhar somente o relatório sem dados pessoais; não alterar flags ou limpar o banco para tentar corrigir. Nenhuma operação remota foi feita nesta etapa. Não há nova tabela: KEEP permanece inalterado, e tipo/ocasião acompanham as tabelas existentes no backup e na limpeza autorizada.

## Produção, compras e relatórios — R15-B7

Produção mantém as unidades exatas por sabor, peso e capacidade. Caixas equivalentes são unidades divididas pela capacidade do kit, inclusive frações; o cálculo não usa 12 fixo nem divisão inteira. Relatórios mostram peso, capacidade e equivalentes, com receita rateada por unidades sem perder centavos. Variantes históricas continuam identificáveis.

O ensaio usa o mesmo sabor em15g/25 unidades e30g/12 unidades. Custos e compras procuram ficha do sabor no peso correto; ausência ou ambiguidade mantém aviso/custo indisponível. Embalagem do kit entra uma vez por kit; não é repetida a embalagem por lote da ficha. Nenhuma compra, baixa de estoque, preço ou despesa é criada automaticamente. A calculadora por massa e as regras adicionais da R16 vêm depois desta integração.

No toque rápido, Trocar kit fica junto ao kit escolhido. A instrução explica que tocar no sabor soma um kit inteiro. Foto do cadastro e contador acompanham os cartões; kits existentes e composições históricas permanecem editáveis pelas regras anteriores.

## Sabor sem embalagem artificial — fechamento da integração

No cadastro de produto, Somente sabor (para kits) permite salvar nome, descrição, foto e ativo sem cadastrar peso/preço de uma embalagem antiga. O tamanho, a capacidade e o preço são escolhidos no kit. Não é criada variante artificial ao montar o pedido. As permissões de produtos existentes continuam válidas para administrador e operadora; criar/configurar kit continua exclusivo do administrador.

Sem ficha compatível, o custo permanece indisponível com aviso. A R16 acrescentará sua calculadora; esta entrega não supõe rendimento, custo real ou preço sugerido para um sabor sem ficha. O importador inicial existente é preservado. A extensão com aba Kits é viável usando a API atual, prévia, deduplicação por tamanho/capacidade e embalagem vinculada pelo cadastro; deverá preservar preços já cadastrados e aceitar Sabores sem embalagem, sem criar outro importador.

### Ativação pelo responsável, após revisão e checks completos

1. GitHub → Actions → Validação da gestão → Run workflow. Selecione a branch revisada. Resultado esperado: validate verde e testes nos três navegadores, incluindo WebKit. O envio normal da branch só testa Chromium móvel. Falha: guardar o link da execução; não avançar main enquanto houver erro. Segurança também deve estar verde no mesmo SHA.
2. Conferir o backup pelo roteiro já existente, restaurado fora do GitHub, e pausar gravações. Isto não é feito automaticamente por esta entrega. Sem backup conferido, interromper aqui.
3. GitHub → Actions → Homologação D1 (manual) → Run workflow → main → mode PRE_CHECAGEM. Resultado esperado: nenhuma violação de FK e lista das migrações realmente pendentes. O código R15 usa0019–0022, em ordem; não reaplicar as já registradas. Erro/violação: interromper e compartilhar só o resumo sem dados pessoais.
4. Somente com os requisitos reais do formulário cumpridos, executar o mesmo workflow com mode APLICAR_PENDENTES e backup_verified marcado. Resultado esperado: execução verde, pending vazio, foreign_key_violations zero, schema_kits_ready / schema_kit_orders_ready / schema_kit_recurring_ready / schema_customer_orders_ready verdadeiros. Falha: parar; não apagar tabelas, editar flags ou rodar limpeza para corrigir migração.
5. Abrir o app atualizado e conferir: sabor sem embalagem; kit com composição completa; pedido padrão de estabelecimento; pessoa com retirada/condição/ocasião; produção e relatório por peso. Usar cadastros de demonstração próprios para esse ensaio e não enviá-los para docs/capturas do repositório. Os dados reais ficam privados no app/planilha.

Antes das migrações, os controles novos ficam ocultos conforme o schema disponível. Catálogo0019 sem0020 mantém pedidos pelas embalagens anteriores; recorrências só oferecem kits após0021; tipo/ocasião só após0022. Nenhuma flag nova é necessária, e o catálogo público continua desligado. O Codex não executou esse procedimento remoto.
