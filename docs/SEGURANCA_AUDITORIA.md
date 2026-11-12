# Auditoria de segurança (2026-11-07)

Escopo: o plano de 7 itens sugerido ao Felipe, sem mudar a arquitetura (Cloudflare Pages Functions + D1 + Access). Feito no branch de trabalho. Não houve nenhuma alteração em produção ou no banco remoto.

Legenda: ✅ feito com evidência · 🟡 feito em parte · 👤 depende do Felipe (precisa de login na Cloudflare ou no GitHub).

## Resumo

| #   | Item                                        | Situação                                                        |
| --- | ------------------------------------------- | --------------------------------------------------------------- |
| 1   | Configuração publicada, flags e banco       | 🟡 repositório conferido; site e painel ficam com 👤            |
| 2   | Autenticação, permissões e rotas            | ✅ matriz automatizada com 117 verificações                     |
| 3   | Backup e restauração isolada                | 🟡 ferramenta e teste existem; ensaio com dado real fica com 👤 |
| 4   | Scanners de código, segredos e dependências | ✅ workflow `Segurança` e Dependabot                            |
| 5   | Verificações obrigatórias no GitHub         | 👤 passo a passo abaixo                                         |
| 6   | OWASP ZAP                                   | 🟡 workflow pronto, alvo local; ainda não executado             |
| 7   | Documentação e manutenção                   | ✅ este arquivo                                                 |

## 1. Configuração

Conferido no repositório (`wrangler.jsonc`):

- O D1 é `brigaderia-amor-zeloso-homologacao`. As migrações vão de 0001 a 0015.
- As flags de gestão estão ligadas, inclusive `MIXED_BOXES_ENABLED`.
- `PUBLIC_CATALOG_ENABLED` está `false`. As rotas `/catalogo` e `/api/catalogo` respondem 404 sempre, independente da flag (coberto por teste).
- `ACCESS_TEAM_DOMAIN` e `ACCESS_AUD` são identificadores públicos. Não são senhas: sem o token da Cloudflare eles não dão acesso a nada.

Não verificado: o ambiente desta revisão não tem acesso de rede a `pages.dev`.

👤 **Roteiro para o Felipe (5 minutos, navegador anônimo):**

1. Abra `https://brigaderia-amor-zeloso.pages.dev/gestao`. Esperado: tela de login do Cloudflare Access, e não o app.
2. Abra `/api/customers`. Esperado: tela do Access ou `AUTHENTICATION_REQUIRED`, nunca dados.
3. Abra `/api/catalogo`. Esperado: `CATALOG_UNAVAILABLE`.
4. No Zero Trust, em Access → Applications, confirme:
   - a aplicação cobre o domínio inteiro `brigaderia-amor-zeloso.pages.dev`;
   - a política permite só os e-mails do Felipe, do Tiago e da Alda;
   - existe uma regra para as prévias `*.brigaderia-amor-zeloso.pages.dev`, ou as prévias estão desligadas (configuração "None").
5. Em Pages → Settings → Functions → D1 bindings, confirme que `DB` aponta para `brigaderia-amor-zeloso-homologacao`.
6. Em Pages → Settings → Variables, confirme que não há variável sobrescrevendo as flags do `wrangler.jsonc`.

## 2. Autenticação, permissões e rotas

Como funciona hoje (conferido no código):

- **Entrada:** o JWT do Cloudflare Access é verificado com a chave pública da equipe. São checados emissor, audiência, expiração e RS256. O e-mail precisa estar em `authorized_emails`.
- **Sessão:** cookie `__Host-session` (HttpOnly, Secure, SameSite=Lax). O banco guarda só o hash SHA-256. O logout apaga a sessão no servidor.
- **Rotas protegidas:** todas as rotas `/api/*` passam por `actor()`. As únicas exceções são health, config, entrada pelo Access e o catálogo (sempre 404).
- **Gravações:** exigem `Origin` igual ao do site (proteção contra CSRF), `Content-Type: application/json` e corpo de até 32 KB.
- **Isolamento:** toda consulta filtra por `organization_id`. O papel é relido do banco a cada requisição.
- **Login:** limitado a 10 tentativas por IP a cada 15 minutos, com contagem persistida no D1.
- **Erros:** não expõem stack trace nem SQL.
- **Páginas:** CSP restritiva, `X-Frame-Options: DENY` e `Referrer-Policy: no-referrer` (`public/_headers`). Como `.dev` usa HSTS pré-carregado, os navegadores já forçam HTTPS.

Novo teste: `npm run test:security` (`tests/integration/security.mjs`), também incluído no CI. São 117 verificações:

- 36 rotas GET e 8 gravações sem sessão retornam 401, sem vazar detalhes internos.
- Cookie forjado, vazio ou com nome errado é recusado.
- JWT expirado, de outra audiência, de outro emissor ou sem assinatura (`alg none`) é recusado, assim como e-mail não autorizado.
- Gravação de outra origem ou sem `Origin` recebe 403; sem JSON, 415; corpo gigante, 413.
- Outra organização recebe exatamente 404 ao ler ou alterar cliente, pedido, conta financeira ou padrões. Nenhuma listagem vaza, e os dados ficam intactos.
- A operadora recebe exatamente 403 em backup, importação, gestão de acessos e configuração do Pix, e o acesso proibido não é criado.
- Cabeçalhos `no-store`, `nosniff` e CSP estão presentes no JSON, e o logout invalida a sessão.

Achados: nenhuma falha. Observações (não são falhas):

- O limite de tentativas vale só para o login. O resto da API depende de sessão válida. Se no futuro houver abuso, dá para ativar o Rate Limiting da Cloudflare (camada gratuita).
- O Access é a primeira barreira, e a lista `authorized_emails` é a segunda. Remover alguém exige tirar o e-mail das duas.

## 3. Backup e restauração

Já existia, e foi conferido:

- Ferramentas → Backup (só owner) exporta SQL da organização, sem sessões nem caches.
- `npm run test:backup` restaura num SQLite isolado e confere chaves estrangeiras, contagens, UTF-8 e fotos. Resultado: passou.
- `npm run ops:restore-check -- .local/arquivo.sql` restaura o backup num D1 local novo, dentro de `.local/` (que fica fora do Git), sem nenhum comando remoto.

👤 **Ensaio real (mensal):**

1. No app, baixe o backup.
2. Mova o arquivo para `.local/`.
3. Rode o `ops:restore-check`.
4. Compare as contagens com a tela do app.
5. Guarde o arquivo fora do computador, por exemplo num Google Drive privado.

O backup contém dados de clientes: nunca mande por WhatsApp nem coloque no GitHub.

## 4. Scanners

Workflow `.github/workflows/security.yml`. Roda a cada push, em PRs, toda segunda-feira e manualmente:

- **gitleaks:** segredos em todo o histórico.
- **npm audit:**
  - falha em alta ou crítica nas dependências que vão para produção;
  - nas de build, falha só em crítica.
- **CodeQL:** consultas `security-extended` para JavaScript e TypeScript.
- **dependency-review:** em PRs.

Dependabot (`.github/dependabot.yml`): uma atualização agrupada por mês para npm e outra para Actions.

Estado nesta data:

- `npm audit --omit=dev`: 0 vulnerabilidades.
- Auditoria completa: vulnerabilidades moderadas em `deepmerge`, `glob` e `minimatch`. Todas vêm de `vite-plugin-pwa` → `workbox-build`, que roda só no build e não vai para o servidor nem para o navegador. A correção exige versão nova do plugin. Fica para o Dependabot.
- Varredura manual dos 129 commits com padrões de chaves (Cloudflare, GitHub, Google, AWS, chaves privadas, senhas): nada encontrado. Não há `.env`, `.dev.vars` nem backups versionados, e `.gitignore` cobre esses arquivos.

## 5. Verificações obrigatórias no GitHub (👤)

Em Settings → Rules → Rulesets → New branch ruleset:

1. Nome `main`, Enforcement **Active**, alvo **Default branch**.
2. Marque **Restrict deletions** e **Block force pushes**.
3. Marque **Require status checks to pass** e adicione:
   - `validate` (Validação da gestão);
   - `Segredos no histórico (gitleaks)`;
   - `Dependências (npm audit)`;
   - `Análise de código (CodeQL)`.
4. Não marque "Require a pull request" por enquanto: o fluxo atual publica o mesmo commit que já passou no branch de trabalho, e a regra de checks aceita esse avanço do main.

Também em Settings → Code security, ative (é grátis em repositório público):

- **Secret scanning** e **Push protection**, que barram um push que contenha uma chave;
- **Dependabot alerts**;
- **Private vulnerability reporting**.

## 6. OWASP ZAP

O job `zap` do workflow `Segurança` roda só no agendamento semanal ou manualmente, em Actions → Segurança → Run workflow. Ele:

- sobe o app e a API no próprio runner, com D1 temporário e dados fictícios (`scripts/zap-target.mjs`);
- roda o ZAP baseline (passivo) em `/gestao`.

Ele não toca no site publicado nem no banco da Cloudflare. O relatório fica no artefato `relatorio-zap`.

Limitações:

- Ainda não foi executado. Este ambiente não tem Docker ativo, então o primeiro resultado sai no GitHub.
- Nesta primeira versão, o ZAP varre sem sessão (página e respostas 401). As rotas autenticadas já estão cobertas pela matriz do item 2.
- A primeira execução só relata (`fail_action: false`). Depois de triar os alertas, a ideia é ligar a falha.

Escanear o site publicado exigiria um token de serviço do Access e mexeria no ambiente real. Não recomendado sem necessidade.

## 7. Repositório público: decisão do Felipe

O repositório `felipeirineu/brigaderia-amor-zeloso` é **público**. Não há segredos nem dados de clientes nele. Ficam visíveis o código, a documentação (preços, processo, notas de colaboração) e as fotos da marca.

- **Manter público:** CodeQL e Secret scanning continuam grátis.
- **Tornar privado:** menos exposição do negócio. Nesse caso, o job `codeql` deixa de funcionar sem GitHub Advanced Security (pago) e deve ser removido; gitleaks e npm audit continuam.

Recomendação: tornar privado antes de transferir o repositório ao Tiago. A segurança do app não depende de o código ser secreto, mas os documentos descrevem o negócio.

## Plano de manutenção

| Quando                      | O quê                                                                                                | Quem                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| A cada push                 | CI + `test:security` + scanners                                                                      | automático                              |
| Semanal                     | ZAP local, gitleaks, CodeQL                                                                          | automático (conferir se ficou vermelho) |
| Mensal                      | Aplicar PR do Dependabot depois do CI verde; ensaio de backup                                        | Felipe                                  |
| A cada novo acesso ou saída | Atualizar a política do Access **e** `authorized_emails`                                             | Felipe/Tiago                            |
| Na entrega do presente      | Transferir o repositório, trocar o token `CLOUDFLARE_API_TOKEN` do GitHub, revisar membros do Access | Felipe                                  |

## Continuação de 07/11 — consulta de custo por composição

R11-5 acrescenta `GET /api/p1/order-costs/:id`, somente leitura. Segue `actor()`, P1 ativo e organização do pedido; sem sessão recebe 401, pedido de outra organização/inexistente recebe 404. Operadora pode consultar, assim como fichas; não é uma rota exclusiva de owner. Não aceita gravação nem cria evento financeiro/estoque. Resposta privada usa `no-store` e cabeçalhos do JSON da API.

A matriz `test:security` passou de 117 para **122 verificações**, incluindo essa rota, a consulta autorizada pela operadora e ID inexistente. Integrações de custos também conferem 405 para POST e nenhum efeito em despesas/estoque. Os demais itens e as tarefas humanas desta auditoria continuam válidos; isto não afirma ensaio em dados reais, configuração de rulesets ou execução manual do ZAP.

### Continuação de 08/11 — modelos mistos

Rotas existentes de modelos/defaults/geração reutilizadas, sem nova API ou ampliação de papéis. Matriz ampliada para **127 verificações**: modelo misto exige sessão, outra organização recebe 404 em GET/PUT e operadora consulta/pausa preservando composição. Migração aditiva 0016, FKs por organização, CAS e auditoria mantidos. Backup/restauração local inclui as novas tabelas. PRs de dependências continuam bloqueados pelo Dependency graph; ver DEPENDABOT.md, sem contornar o check.

### R6-5 — fotos de perfil (08/11)

Matriz ampliada para **139 verificações**, com GET/PUT/DELETE das fotos: 401 sem sessão, 404 entre organizações, 403 para alteração de outra pessoa/remoção por operadora e 200 para remoção administrativa. No-store/nosniff, CAS/idempotência e validação WebP/dimensões/tamanho; fotos não entram no contexto JSON, logs ou assets. Migração aditiva 0017 e restauração de BLOB com FK testadas localmente. Sem alteração de flags ou configuração remota; guia FASE_R6_FOTOS.md.

### R6-7 — Lembretes e Web Push

Matriz ampliada para **153 verificações**, incluindo estado/inscrição/revogação/teste de aparelhos e `.ics` privado por lembrete. Sem sessão 401, IDs de aparelho/lembrete de outra organização 404; aparelhos também isolados por usuário, inclusive para administrador. Não há função nova exclusiva de owner na API push. Endpoint capturado por outra pessoa/organização recebe conflito genérico, sem revelar dono ou assinatura. Respostas privadas no-store; nenhuma chave privada no bundle, backup ou JSON de estado.

Criptografia AES128GCM/VAPID testada com receptor independente; somente provedores HTTPS explícitos e redirecionamento manual sem seguir Location. Claim atômico/idempotência evita repetição em cron concorrente/repetido; erros de rede/5xx e claims abandonados são incertos, sem retry automático. Logout revoga a sessão e suas assinaturas. Banco até 0017 e ausência de VAPID mantêm lembretes/calendário disponíveis e envio desligado. Backup restaura metadados com FKs, exclui assinaturas/fila/ledger e sessões. Ativação e ensaios físicos são manuais, conforme FASE_R6_LEMBRETES.md; sem alteração remota nesta entrega.

### R6-8 — Prévia de WhatsApp por pedido

**160 verificações** na matriz, incluindo as rotas existentes de prévia/contato/cobrança: sem sessão 401, outra organização 404 e operadora autorizada prepara Chegando. `order_id` opcional na prévia financeira só seleciona pedido da mesma conta já autorizada; inexistente/externo é 404, combinação com fechamento é recusada e saldo usa o mesmo cálculo do extrato. Prévia não grava evento financeiro; contato é opt-in/idempotente. Nome de exibição vem do perfil autenticado, URL wa.me é codificada e só aberta por ação humana. Nenhum envio automatizado, migração, flag ou mudança de Cloudflare nesta etapa.

## Revisão de 11/11/2026

Análise geral do app (segurança, defeitos e melhorias), com correções feitas pelo Claude e aprovadas pelo responsável.

### Defeitos corrigidos

- **Fotos e localização não funcionavam em produção.** `public/_headers` bloqueava `blob:` em `img-src` (leitura da foto escolhida) e desligava `geolocation`. Agora `img-src 'self' data: blob:` e `geolocation=(self)`. `blob:` só referencia dados criados pela própria página; scripts continuam restritos a `'self'`.
- **Causa raiz:** o ambiente de teste não aplicava os cabeçalhos de produção. `tests/helpers/runtime.mjs` passou a servir o bloco `/*` de `_headers`, então todos os testes de tela e o ZAP rodam sob a mesma CSP. Novo `tests/e2e/prod-headers.spec.js` trava foto, localização e ausência de violações.
- **Lista de Pedidos** trazia os 200 mais antigos; agora traz os 200 mais recentes.
- **Raiz do site e app instalado** abriam a demonstração da Fase 0; agora abrem `/gestao`.

### Decisões

- **Sessão de 30 dias** (era de 8 horas), aprovada pelo responsável. Motivos: o envio de avisos de lembrete exige sessão válida, e o login a cada 8 horas derrubava telas em uso. Compensações: o Cloudflare Access continua na frente; "Sair" apaga a sessão no servidor; remover o e-mail de `authorized_emails` bloqueia na requisição seguinte. Em aparelho perdido: remover o e-mail no app **e** revogar a sessão no Zero Trust.
- **Telefone do cliente opcional.** O banco exige telefone único e não nulo; sem telefone, grava-se um marcador interno (`sem:<id>`, `shared/phone.ts`) que nunca sai pela API nem é pesquisável. Mensagens sem telefone abrem o WhatsApp para escolher o contato.

### Scanners

- **ZAP (primeira execução, 09/11):** 0 falhas, 9 avisos. Eram quase todos cabeçalhos ausentes no alvo local, resolvidos com o harness acima.
- **gitleaks:** a execução semanal (histórico completo) acusou `ACCESS_AUD` em dois commits. Falso positivo, registrado em `.gitleaksignore`. **Correção a este documento:** no push o gitleaks examina apenas os commits novos; o histórico completo só é varrido no agendamento semanal e na execução manual.

### Continua com o responsável

Aplicar as migrações 0016 a 0018; tornar o repositório privado; regra de proteção do `main`; roteiro do painel (item 1); ensaio de backup (item 3).

## Continuação de 12/11 — cadastro de kits (R15-A)

Matriz ampliada para **178 verificações**, incluindo todas as rotas do cadastro/configuração de kits. Escrita só por owner (operadora403), leituras autorizadas pela equipe, kit externo404 e anônimo401. CAS/idempotência, FK da embalagem e auditoria de alterações; nenhum telefone de cliente é lido ou exposto nessas rotas novas. Kits sem 0019 ficam indisponíveis e gestão legada permanece operacional. Backup/restauração inclui kit/configuração e vínculo com insumo, com FK verificada.

Cabeçalhos de produção preservados. A barra do Hoje usa progress/value/max e CSS externo, em lugar de width inline. Nova tela usa chips para evitar violações internas de select no WebKit. Teste funcional e observador de securitypolicyviolation rodam sem bypass; só o contexto de fotografia tem exceção comentada, necessária à injeção de estilo do próprio Playwright. Sem eval ou recursos externos no produto. Nenhuma configuração Cloudflare, migração remota ou catálogo foi ativado.
