# Fase 1 — Gestão privada

## Produzido

- Área `/gestao` separada da demonstração pública `/app`.
- Login sem senha local: identidade validada por Cloudflare Access com JWT RS256, assinatura por JWKS, emissor, audiência, expiração e claims obrigatórias. Não basta confiar no e-mail ou num header sem validar a assinatura.
- Sessão aleatória de 256 bits, somente SHA-256 do token no D1, cookie `__Host-session` HttpOnly/Secure/SameSite=Lax, expiração em 8 horas, rotação no login e revogação no logout.
- Allowlist no D1 e papéis administrador/operador. Somente administrador pode autorizar novos e-mails. Sem cadastro público. Consulta de sessão verifica autorização e organização a cada requisição.
- Clientes: nome, telefone normalizado E.164, e-mail/notas opcionais, busca por nome/telefone, edição e arquivamento. Unicidade de telefone por organização.
- Produtos com múltiplas variantes, gramas por unidade, unidades por embalagem, preço em centavos, ativo/inativo e arquivamento.
- Rascunhos de pedidos com vários itens, prazo, notas, snapshots de cliente/produto/variante/preço/embalagem, total calculado no servidor e edição/arquivamento.
- Dashboard com totais de rascunhos (explicitamente não faturamento) e próximos pedidos, datas exibidas em America/Fortaleza.
- Validação estrita, limite de corpo 32 KiB, consultas parametrizadas, CSRF por Origin e JSON, rate limit persistente de login (10 tentativas/IP em 15 minutos), idempotência de criações e versão otimista com escrita atômica e auditoria.
- Catálogo bloqueado em todas as circunstâncias. Nenhuma integração WhatsApp nesta fase.

A implementação não adiciona preços ou informações comerciais reais ao bundle público. O [Tradicional informado pelo responsável](INFORMACOES_COMERCIAIS.md) será cadastrado no ambiente privado, após ativação: 30 g por unidade, 12 unidades por caixa, 4200 centavos por caixa. Não é preço por brigadeiro.

## Configuração para ativar online

O código está preparado; nenhuma conta Access, banco remoto ou credencial foi criada nesta tarefa. O painel Cloudflare conectado ao GitHub não concede acesso administrativo ao agente. Não fornecer tokens no chat. As instruções abaixo exigem um administrador da conta, escolha consciente dos recursos e verificação dos limites gratuitos atuais; não habilitar plano pago para seguir este guia.

1. Criar um **D1 de homologação**, sem dados reais inicialmente. Anotar nome e ID não secreto do banco.
2. Copiar os campos do `wrangler.production.example.jsonc` para o `wrangler.jsonc` raiz: manter `pages_build_output_dir`, adicionar `d1_databases` com binding **DB**, nome/ID reais e `migrations_dir: database/migrations`. Nunca usar o identificador `local-only-phase-0` no remoto. Preencher `ACCESS_TEAM_DOMAIN` com o domínio exato da equipe e `ACCESS_AUD` com o Audience da aplicação Access. Essas duas configurações não são senhas. O arquivo de exemplo não é aplicado automaticamente.
3. Antes do deploy, aplicar `0001_identity_foundation.sql` e `0002_management.sql`, nessa ordem. Se a primeira já foi aplicada pelo sistema de migrations, o Wrangler a ignora. Em uma máquina autenticada administrativamente, executar `npx wrangler d1 migrations apply NOME_REAL --config wrangler.jsonc --remote`. Essa é uma operação remota explícita, não executada pelo agente. Fazer backup antes de atualizar um banco que já tenha dados.
4. No Cloudflare Zero Trust, criar uma aplicação Access **self-hosted** que proteja o caminho `brigaderia-amor-zeloso.pages.dev/api/access/*` (os dois endpoints `/api/access/start` e `/api/access/login` precisam estar cobertos). Autorizar somente os e-mails dos responsáveis, sem políticas Bypass/Everyone/Service Auth para o login humano. Usar login por e-mail verificado ou provedor confiável; sem contas/funcionários públicos. Garantir que rotas alternativas, aliases e previews com binding do banco usem a mesma proteção e configuração, ou deixar esses ambientes sem o binding DB.
5. Obter o **Application Audience (AUD)** dessa aplicação e o domínio da equipe `nome.cloudflareaccess.com`. Atualizar o arquivo/configuração do Pages com os valores. O servidor verifica JWT independentemente da política da borda; sem assinatura/emissor/audiência corretos, o login falha.
6. Preparar o primeiro administrador como descrito abaixo. Não colocar e-mails pessoais em migrations ou em commits.
7. Manter build `npm run build:pages`, saída `dist`, Node 24; publicar a configuração no GitHub/Pages e conferir `/api/auth/config` (`configured: true`). Isso confirma presença das configurações, não a validade do Access ou a migração do banco.
8. Abrir `/login`, selecionar **Verificar identidade** (GET protegido pelo Access), autenticar e, após voltar à página, selecionar **Entrar após a verificação**. O fluxo não precisa expor tokens a JavaScript. O operador também precisa constar na allowlist D1, além da política Access.
9. Executar o roteiro de homologação abaixo com dois usuários autorizados e uma terceira identidade não autorizada. Antes disso, a prontidão online da Fase 1 permanece pendente.

Se a interface do Cloudflare indicar que bindings/variáveis são gerenciados pelo Wrangler, manter os valores no arquivo raiz e fazer novo deploy, em vez de configurar somente o painel. Guardar arquivos locais alternativos com credenciais fora do Git. Nenhuma chave de API é necessária no frontend.

### Primeiro administrador

Crie em sua máquina um JSON **fora do Git**, por exemplo `.local/admin.json`, contendo `organization_id` (UUID gerado para essa organização), `organization_name` e `admin_email` (e-mail autorizado no Access). Não reutilizar dados da demonstração como se fossem reais.

```bash
# Gera somente um UUID, sem conta nem recurso remoto:
node -p 'crypto.randomUUID()'
# Após preencher seu arquivo privado:
npm run admin:prepare -- .local/admin.json
```

O comando valida o JSON e gera `.local/bootstrap.sql` com permissões restritas, sem sobrescrever um arquivo já existente. **Não executa SQL remotamente**. Revise o arquivo e o banco selecionado, depois importe uma única vez no D1 de homologação usando uma sessão administrativa autenticada (por exemplo `npx wrangler d1 execute NOME_REAL --config wrangler.jsonc --remote --file .local/bootstrap.sql`). O arquivo não deve ir para Git, chat, logs ou artefatos de CI. Não repetir o bootstrap: os dois INSERTs são para uma organização nova. Se uma execução administrativa for interrompida, inspecionar o estado antes de repetir; não apagar registros ou recriar a organização às cegas.

Após entrar, o administrador autoriza o segundo proprietário em **Acessos** e também o inclui na política Access. A interface não altera nem revoga acessos existentes nesta fase. Para revogar imediatamente, remover a entrada de `authorized_emails` no banco correto por procedimento administrativo; a sessão passa a falhar porque a autorização é consultada a cada requisição. Para mudar papel, atualizar esse registro com cautela. Preservar pelo menos um administrador autorizado. Essas operações administrativas de manutenção ainda não têm interface.

## Instalação, desenvolvimento e testes

```bash
npm ci
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:migrations
npm run test:api
npm run db:migrate:local
npm run build:pages
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium-mobile --project=chromium-desktop
```

O último comando usa o Chromium do ambiente de nuvem. Em outra máquina, instalar os navegadores com `npx playwright install --with-deps chromium webkit` e usar `npm run test:e2e`. Os testes de gestão usam Miniflare/workerd e D1 efêmeros, pares RSA e identidades `example.test`. O serviço de JWKS fictício fica dentro do harness de testes; não existe bypass de autenticação ou login de teste no código publicado. Miniflare usa a mesma versão instalada pelo Wrangler, com o conversor público de opções v4 para v5.

`npm run dev` serve a interface; `/api` é encaminhada ao Worker local na porta 8787. `npm run worker:dev` usa somente o D1 local e requer configuração Access apropriada para login humano; o Access da borda não autentica automaticamente localhost. Para testar o fluxo completo local sem conta externa, use a suíte E2E de gestão, que autentica usuários fictícios por JWTs assinados no harness isolado. `npm run preview:pages` sem binding/Access continua servindo a demonstração, com gestão negada.

### Dados e cache

- Dados privados ficam no D1 e na memória da página autenticada. Não são gravados em localStorage, sessionStorage, IndexedDB ou cache do service worker.
- Todas as respostas API têm `no-store`; o SW armazena somente shell/assets de build. Ao ficar offline, a área privada desmonta as telas e oculta dados; não há fila de gravação.
- Sessão expirada esvazia a interface; logout limpa a sessão no D1 e abre o logout do Access. Para sair é necessário estar online. Inatividade visual não prolonga a validade absoluta da sessão.
- Atualização entre aparelhos acontece em consulta/recarregamento; há botão de atualizar listas e revalidação de sessão no foco e a cada minuto. Não há promessa de sincronização em tempo real ou mesclagem automática de formulários.
- Listagens são limitadas a 200 registros, com busca. Paginação além desse limite, histórico visual detalhado, endereços e campos avançados de clientes são pendências.
- Pedidos só têm estado rascunho nesta fase. Status/entrega, confirmação, cancelamento, WhatsApp e pagamentos serão tratados depois.

## Migração e rollback

`0002_management.sql` é aditiva. `0001` foi preservada. A FK composta impede vincular itens/clientes/variantes de outra organização. Toda consulta exige a organização da sessão; nenhuma entrada aceita `organization_id` arbitrário. D1 batch transaciona cabeçalho, itens/variantes e auditoria. Um UUID de mutação condiciona todas as escritas filhas ao sucesso do controle de versão.

Criar backup D1 antes de migrar um banco com dados; validar restauração em banco de teste separado antes de dados reais. A exportação/restauração remota não foi testada nesta tarefa. Para rollback da aplicação, voltar à versão anterior mantendo tabelas aditivas e revogar sessões/autorização se necessário. Não executar DROP em produção para desfazer a fase. O bootstrap não tem rollback automático: revisar qualquer execução parcial administrativamente.

## Testes e pendências de homologação

Resultados locais e limitações serão mantidos no relatório da entrega. Não confundir simulação local de identidade assinada com homologação do login na conta Cloudflare real. O cadastro real do Tradicional só deverá ser feito na gestão privada, após configurar e testar acesso e banco.

## Relatório de validação local

- Lint, formatação, TypeScript e build Pages passaram.
- Vitest: 25 testes passaram.
- Integração workerd/D1: 26 verificações passaram (JWT, permissões, CSRF, duplicidade, IDOR, concorrência, snapshots, auditoria, expiração/logout e rate limit).
- SQLite em memória: seis testes passaram. Migração 0002 aplicada também no D1 local pelo Wrangler.
- Playwright Chromium: 12 testes passaram nos projetos mobile/desktop. Os dois testes de gestão foram repetidos após acrescentar limpeza de telas na troca de organização; ambos passaram.
- Bootstrap: SQL gerado com caracteres escapados foi aplicado em SQLite temporário; o comando recusou sobrescrita. Nenhum dado administrativo real usado.
- Download WebKit passou após a liberação da rede, mas faltam bibliotecas nativas GTK4, Graphene, Harfbuzz ICU, Manette, Hyphen e GLES. A tentativa de obter pacotes via apt encontrou catálogo de pacotes indisponível neste ambiente. WebKit/Safari permanece não validado; CI instala essas dependências com Playwright, mas a execução no GitHub ainda não foi acompanhada.
- Um primeiro E2E falhou por seletor de label de select; passou com a seleção pelo papel acessível combobox. Outro revelou disputa de navegação no teste de logout; foi corrigido aguardando a navegação ao logout do Access antes de abrir a área privada novamente. As verificações de bloqueio foram mantidas.
- Os testes usam identidades fictícias e D1 efêmero; nenhuma migração remota ou autenticação na conta Cloudflare real foi executada.
- Configuração reutilizável de instalação/startup da nuvem atualizada em rascunho. Salvar o rascunho não ativa D1/Access no Pages.

## Pendências

Conectar banco e Access, autorizar responsáveis, homologar o fluxo online, testar instalação Android/iPhone e restauração de backup remoto antes de dados reais. A Fase 2 ainda não foi iniciada. Limitações funcionais desta etapa (campos avançados de clientes, paginação e manutenção de acessos existentes) estão explicitadas acima.
