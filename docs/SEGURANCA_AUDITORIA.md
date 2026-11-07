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
