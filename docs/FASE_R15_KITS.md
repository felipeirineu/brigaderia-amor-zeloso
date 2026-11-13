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
