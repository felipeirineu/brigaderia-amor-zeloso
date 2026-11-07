# Brigaderia Amor Zeloso | Gestão

PWA administrativo para uma pequena brigaderia em João Pessoa (PB), com preparação para catálogo público e atendimento assistido pelo WhatsApp.

> **Estado em 07/11/2026:** gestão privada ativada na conta da brigaderia, conforme o histórico. Montagem mista e produção por sabor disponíveis; catálogo público desligado. Relatórios/custos por composição seguem a continuação documentada na R11. Os relatos de fases anteriores abaixo são históricos, não instruções para reverter flags.

## Objetivos

- Permitir que dois proprietários administrem clientes, produtos, pedidos, produção, entregas e finanças em Android e iPhone.
- Ter uma única fonte de dados sincronizada, permissões e trilha básica de auditoria.
- Abrir conversas do WhatsApp com mensagens personalizadas pré-preenchidas, sem envio automático na primeira versão.
- Deixar preparado um catálogo público que só será habilitado após validação dos dados comerciais.
- Manter projeto transferível para os futuros proprietários, com infraestrutura documentada e backups.

## Ler primeiro

1. [SPEC.md](SPEC.md) — requisitos funcionais e critérios de aceite.
2. [docs/ARQUITETURA.md](docs/ARQUITETURA.md) — arquitetura e modelagem.
3. [docs/PLANO_DE_EXECUCAO.md](docs/PLANO_DE_EXECUCAO.md) — implementação por fases.
4. [docs/SEGURANCA_E_OPERACAO.md](docs/SEGURANCA_E_OPERACAO.md) — privacidade, segurança, custos e operação.
5. [AGENTS.md](AGENTS.md) — instruções para o Codex.
6. [PROMPT_INICIAL_CODEX.md](PROMPT_INICIAL_CODEX.md) — primeira tarefa a copiar e colar.

## Referências confirmadas das capturas fornecidas

- Nome: **Brigaderia Amor Zeloso**.
- Instagram: `@brigaderiaamorzeloso`.
- Slogan: **O sabor das boas lembranças**.
- Mensagem comercial: brigadeiros tradicionais, receitas com mais de 20 anos de tradição, **de Campo Grande para João Pessoa**.
- Contato exibido na bio: `https://wa.me/558398211759` — **confirmar o número com os proprietários antes de publicar**.
- Logo exibido nas capturas: círculo marrom-escuro, lettering creme e subtítulo dourado; referência não equivale a arquivo original em qualidade de produção.
- Fotos não confirmam sabores, pesos, preços, alérgenos ou rendimentos. Posteriormente, o responsável informou o Tradicional de 30 g, caixa com 12 por R$ 42,00; veja [Informações comerciais](docs/INFORMACOES_COMERCIAIS.md). Outros dados permanecem a confirmar.

## Organização inicial

A criação do código de aplicação e infraestrutura será conduzida pelo Codex nas fases planejadas. Nunca comitar dados reais de clientes, credenciais ou backups sensíveis.

## Desenvolvimento — Fase 0

A demonstração pública continua sem dados privados ou cadastros. A gestão autenticada da Fase 1 é separada; ativação remota depende de D1/Access. WhatsApp fica para a Fase 2. Veja o [relatório e decisões da Fase 0](docs/FASE_0.md).

Requisitos: Node.js 24 (mínimo 22.12), npm e Python 3 para testes de SQL. Use o checkout existente; o ambiente de nuvem já é isolado, sem necessidade de criar worktrees.

```bash
npm ci
npm run dev
```

O Vite informa a porta local (padrão 5173). Abra a rota `/app`. Não é necessário criar `.env`: a demonstração não usa segredos. `.env.example` documenta a flag de servidor; o Worker local recebe `PUBLIC_CATALOG_ENABLED=false` em `worker/wrangler.jsonc`. Alterar a flag não ativa o catálogo na Fase 0.

Para testar o build e o service worker, use `npm run build` seguido de `npm run preview`. O service worker não é ativado pelo servidor de desenvolvimento. A atualização é oferecida na interface; offline funciona após carregar o build online.

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:migrations
npm run db:migrate:local
npm run build
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

`npm run format` aplica Prettier. Os documentos originais de planejamento são preservados. Os testes E2E iniciam o preview na porta 4173, exercitam navegação, responsividade, foco, catálogo bloqueado e PWA offline. Trace e capturas ficam em `test-results/` (ignorado no Git). CI executa as mesmas verificações; não publica nada.

### Worker e D1 locais

```bash
npm run db:migrate:local
npm run worker:dev
```

O Worker escuta em loopback na porta 8787. `/api/health` retorna saúde do scaffold, `/api/customers` retorna 401 e `/api/catalogo` retorna 404. O frontend não chama essa API nesta fase. D1 é emulado em `.wrangler/`, sem seeds reais e sem vínculo com banco remoto. Não usar comandos de deploy ou `--remote` com esta configuração.

### Particularidades do ambiente de nuvem

Se o diretório pessoal não for gravável:

```bash
export npm_config_cache=/workspace/.npm-cache
export XDG_CONFIG_HOME=/workspace/.config
export WRANGLER_LOG_PATH=/tmp/brigaderia-wrangler.log
export WRANGLER_SEND_METRICS=false
export PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright
npm ci
```

A rede atual bloqueou o download do Playwright em `cdn.playwright.dev`. O Chromium já instalado permite esta alternativa local:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium-mobile --project=chromium-desktop
```

Isso não executa WebKit nem valida Safari/iPhone real. Para a suíte completa, liberar os destinos de download do Playwright nas configurações de rede, instalar os navegadores e executar `npm run test:e2e`.

## Testar online

O projeto está preparado para publicar **somente a demonstração** no Cloudflare Pages por integração com GitHub. Use o comando de build `npm run build:pages`, saída `dist` e Node 24. O guia [Testar online](docs/TESTAR_ONLINE.md) explica a conexão da conta, publicação e roteiro de testes. Catálogo e acesso privado da API continuam bloqueados; nenhum banco real é necessário.

## Fase 1 — Gestão privada

A área `/gestao` implementa clientes, produtos/variantes e rascunhos de pedidos com sessões e permissões no servidor. O login `/login` depende de **Cloudflare Access e D1 configurados**; sem isso, a demonstração continua pública e os dados privados são negados. Não há senha de demonstração ou usuário padrão.

Consulte [Fase 1: configuração e homologação](docs/FASE_1.md) para conectar o banco, configurar o Access, autorizar o primeiro administrador e testar dois usuários. `npm run test:api` executa integração real em workerd/D1 locais; a CI também executa os E2E da gestão. A publicação da Fase 0 foi validada por HTTP e pelo responsável, mas isso não valida a autenticação/banco da Fase 1.

## Colaboração e Fase 2A

Briefing aprovado em [Claude → Codex](docs/colaboracao/CLAUDE_PARA_CODEX.md), respostas/status em [Codex → Claude](docs/colaboracao/CODEX_PARA_CLAUDE.md). Os arquivos de autoria do Claude são preservados pelo formatter. O [plano](docs/PLANO_DE_EXECUCAO.md) segue P0/P1/P2.

A [entrega técnica](docs/ENTREGA_TECNICA.md) corrige WebKit, elimina N+1 e aplica a marca autorizada. A [Fase 2A](docs/FASE_2A.md) inclui Hoje por papel, status/histórico, pedidos padrão semanais, entregador, WhatsApp assistido e base de ajuda/tutorial. `OPERATIONS_ENABLED=false` preserva o uso atual até backup e migração 0003; não ativar apenas a flag antes de conferir o banco. O catálogo continua bloqueado e nenhuma gravação offline é aceita.

Verificações adicionais:

```bash
npm run test:listing
npm run test:brand
npm run test:operations
```

`npm run brand:build` regenera os assets a partir do logo aprovado. Para WebKit no ambiente de nuvem com bibliotecas locais, usar `PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH=/workspace/.webkit-deps/run-webkit.sh`; em CI/máquina com dependências Playwright instaladas, deixar essa variável ausente. A adaptação de cookie HTTP existe somente em tests/helpers/runtime.mjs e não altera a segurança da aplicação de produção.

## Revisão R1 e Fase 2B

A revisão está integrada e a [Fase 2B](docs/FASE_2B.md) oferece conta B2B, condições, sinal/parciais, estorno auditável, extrato/fechamento configurável e cobrança/Pix assistidos, além de novos pedidos preenchidos pelo modelo e tutorial financeiro. Os dados online permanecem preservados; `OPERATIONS_ENABLED=false` e `FINANCE_ENABLED=false` até seguir o [guia de ativação para iniciante](docs/FASE_2A.md#ativação--passos-curtos-no-windows-powershell). São necessárias as migrações 0003/0004/0005 que ainda estiverem pendentes; não reaplicar migrações históricas manualmente.

```bash
npm run test:finance
npm run ops:preflight -- --local brigaderia-local
```

A pré-checagem é somente leitura. O guia também explica como exportar um backup real e ensaiar restauração em estado local separado, sem enviar arquivos privados ao GitHub ou ao chat. Não há compra, envio automático de mensagem ou integração bancária nesta entrega.

## R2 e módulos P1 — código local, sem ativação remota

A [revisão R2](docs/REVISAO_R2.md) inclui recebimento rápido no Hoje, entrega/recebimento atômicos com desfazer, saldo a favor, uso de crédito, anulação de fechamento e estorno por autor/dia. As [etapas P1](docs/P1_ETAPAS.md) acrescentam agenda/ICS, lembretes, relatórios/CSV, despesas/fluxo registrado e ficha/custo/preço estimado/lista de compras.

O [índice único de ativação](docs/ATIVACAO.md) orienta administrador: backup/restauração, migrações pendentes, flags OPERATIONS → FINANCE → P1 em etapas. `P1_ENABLED=false` permanece no repositório. A rodada R2/P1 foi solicitada somente local, sem push, deploy ou alterações remotas. Dados reais, receitas e custos não são semeados.

```bash
npm run test:r2
npm run test:p1
```

Todos os exports são privados, por ação humana, e devem ser guardados em destinos autorizados. Arquivos CSV protegem fórmulas e valores em centavos são identificados nos cabeçalhos. Não há estoque, push ou compra automática nesta entrega.

## Entrega R3/R4 e complemento P1

Código de pedidos por fotos, localização privada, deslocamentos, estoque manual, importação de clientes CSV/XLSX e backup administrativo disponível no main. Módulos exigem migrações e flags; não estão ativados automaticamente no ambiente remoto. Catálogo continua desligado.

- [Índice de ativação](docs/ATIVACAO.md).
- [Pedidos por fotos](docs/FASE_R3.md).
- [Localização e deslocamentos](docs/FASE_R4.md).
- [Estoque, importação e backup — passos curtos](docs/P1_COMPLEMENTO.md).
- [Relatórios, testes e limitações por P1](docs/P1_ETAPAS.md).

As validações usam dados fictícios DEMONSTRAÇÃO em bases locais separadas. Homologação em iPhone/Android físicos e ativação são feitas pelo administrador com o guia.

## R11 — caixa mista e continuação

O estado vigente está no [guia R11](docs/FASE_R11_CAIXA_MISTA.md) e no histórico de colaboração. A montagem mista e a produção por sabor já foram entregues com o Claude; o app foi ativado na conta da brigaderia. **Não reverter flags com base nos relatórios históricos deste README.** Esta continuação entrega relatórios e custos/compras por composição; modelos recorrentes, editor do PC e R12 seguem na ordem registrada. Sem cadastro automático de produtos/preços. A [auditoria de segurança](docs/SEGURANCA_AUDITORIA.md) define a matriz de rotas e os checks antes de publicar.
