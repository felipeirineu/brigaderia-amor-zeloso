# Fase 0 — Bootstrap e validação

## Produzido

- React + TypeScript + Vite com roteamento, dashboard e oito áreas navegáveis.
- Interface pt-BR mobile-first, paleta provisória, foco nas mudanças de rota, atalho de conteúdo, estados vazios e navegação inferior.
- Demonstração somente leitura, sem clientes, produtos, preços, pedidos ou informações comerciais fictícias apresentadas como reais. Fixtures de preparação em `src/features/modules.ts`; banco sem seeds.
- Manifesto, ícones geométricos provisórios (não representam o logo oficial), service worker, aviso offline e atualização mediante ação do usuário.
- Worker local com saúde, negação de rotas privadas e catálogo bloqueado, inclusive quando a flag recebe `true`. Não há autenticação ou autorização funcional simulada.
- Migração inicial para organizações, identidades externas, vínculos e estrutura de sessões; sem dados operacionais ou banco remoto.
- ESLint, Prettier, TypeScript, Vitest, Playwright e CI de validação sem deploy.

## Arquitetura e decisões provisórias

O frontend é uma demonstração independente. Não chama o Worker, não recebe credenciais e não possui formulários de gravação. `/app` não é uma área autenticada nesta fase: somente o shell estático e exemplos não sensíveis são acessíveis. `/login` informa a ausência de autenticação.

O Worker é iniciado separadamente, somente em loopback, com Wrangler local. `database_id=local-only-phase-0` é um identificador local deliberadamente não utilizável como ID de banco provisionado. A data de compatibilidade `2026-10-30` foi escolhida por ser suportada pelo workerd instalado. O endpoint de saúde informa `database: not-connected`, pois a aplicação não consulta o D1.

Proposta para a Fase 1 (não implementada): preferir identidade externa validada no servidor, escolhida após verificar oferta, custos e compatibilidade. `identity_subject` representa um identificador opaco, não e-mail, senha ou token. A escolha do provedor e o vínculo de emissor/subject ainda precisam ser definidos. Alternativa por senha requer biblioteca madura e KDF compatível, nunca criptografia própria.

Sessões futuras: token aleatório forte, somente hash no banco, validade e revogação verificadas por requisição, rotação após login, cookie `__Host-session` com `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, sem `Domain`. Não haverá cadastro público. Convites serão administrativos. Escritas exigirão proteção CSRF e validação de Origin, schemas de entrada, limite de corpo e rate limits de autenticação. CORS será fechado por padrão.

A organização deve vir do vínculo autenticado no servidor, nunca de parâmetros confiados do cliente. `owner` administra usuários/configurações; `operator` opera os módulos autorizados sem gerenciar usuários. Toda consulta operacional deve filtrar organização. A FK composta das sessões impede vínculo com organização diferente, mas não substitui autorização, validação de expiração ou testes de IDOR da Fase 1.

## PWA e cache

O precache contém apenas arquivos do build e ícones. Não há cache de runtime, IndexedDB, localStorage, fila de gravação ou dados privados. O fallback de navegação exclui `/api` e `/catalogo`. O shell pode abrir offline depois de um acesso online completo, somente para leitura da demonstração. Atualizações do service worker pedem ação do usuário.

Antes de conectar autenticação, revisar o cache: nunca precachear HTML personalizado, respostas autenticadas ou dados pessoais; respostas privadas devem continuar `Cache-Control: no-store`; testar logout, revogação e troca de usuário. Instalação depende de HTTPS (localhost é exceção de desenvolvimento) e do navegador. O manifest não prova instalação em iPhone/Android reais.

## Migrações e rollback

- SQL versionado e imutável em `database/migrations/`; criar nova migração numerada para alterações posteriores.
- Aplicar com `npm run db:migrate:local`; não usar `--remote` nesta fase.
- Wrangler registra migrações aplicadas. Uma segunda aplicação foi verificada sem migrações pendentes.
- Os testes SQLite usam memória e fixtures `demo-*`, separadas do D1 persistente. Testam chaves estrangeiras, funções permitidas, unicidade e revogação por remoção do vínculo.
- Não existe rollback remoto testado. Antes de qualquer banco real, exportar backup, testar restauração em ambiente separado e preparar migração compensatória. Em banco local descartável, reconstrução é possível somente após confirmar que não contém trabalho a preservar. Não apagar estado automaticamente em scripts.
- Clientes/produtos/pedidos e demais entidades serão adicionados nas fases correspondentes. Valores monetários futuros serão centavos inteiros e itens terão snapshots, conforme `ARQUITETURA.md`.

## Testes executados em 31/10/2026

| Verificação                              | Resultado                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Instalação npm                           | Concluída com cache gravável em `/workspace/.npm-cache`                                                   |
| ESLint e Prettier                        | Passaram                                                                                                  |
| Typecheck e build                        | Passaram; manifest e service worker gerados                                                               |
| Vitest                                   | 18 testes passaram                                                                                        |
| SQLite em memória                        | 6 testes passaram                                                                                         |
| D1 local via Wrangler                    | Migração aplicada; reaplicação sem pendências                                                             |
| Worker HTTP real local                   | Saúde 200; rota privada 401; catálogo 404; `no-store` verificado                                          |
| Playwright Chromium instalado no sistema | 10 testes passaram, nos projetos mobile e desktop                                                         |
| Offline                                  | Shell recarrega e navega sem rede; aviso somente leitura; nenhuma rota API/catálogo no cache              |
| Acessibilidade básica                    | Foco após navegação, atalho de teclado e largura de 360 px verificados; inspeção visual de captura mobile |

O primeiro lint detectou parâmetro não utilizado, corrigido. O primeiro E2E detectou foco inicial que pulava o atalho de conteúdo; corrigido sem remover a asserção. O primeiro startup do Worker detectou data de compatibilidade um dia além do suportado; corrigida e retestada. Caches de npm/Wrangler foram redirecionados para caminhos graváveis.

## Limitações e pendências

- Download Playwright bloqueado por HTTP 403 `Domain forbidden` em `cdn.playwright.dev`. Chromium local permitiu executar os dez testes, mas WebKit não foi executado. A suíte prevê quatro testes WebKit e um teste offline explicitamente ignorado nesse motor. Reexecutar após liberar os destinos de download necessários.
- Android Chrome e Safari iPhone físicos, instalação na tela inicial e auditoria completa de acessibilidade ainda pendentes.
- CI configurada, mas execução no GitHub não verificada. Nenhum deploy, conta, custo ou recurso Cloudflare criado.
- Autenticação, CRUD, sincronização entre aparelhos, WhatsApp, pagamentos, produção e catálogo publicado são fases posteriores.
- Wrangler usa metadados `Request.cf` substitutos quando sua consulta externa falha; os testes locais não validam metadados de borda reais.

## Checklist antes de produção

- [x] Interface identificada como demonstração; nenhum segredo adicionado.
- [x] Catálogo bloqueado na UI e na API.
- [x] Build e testes locais Chromium/Worker/esquema executados.
- [ ] TODO-CONFIRMAR: privacidade do GitHub e responsáveis pelos acessos.
- [ ] TODO-CONFIRMAR: conta Cloudflare, permissões e limites/custos atuais.
- [ ] TODO-CONFIRMAR: logo original autorizado, WhatsApp, horários e regras de entrega/retirada.
- [ ] Selecionar autenticação e implementar as proteções documentadas na Fase 1.
- [ ] Executar WebKit e homologação em dispositivos reais.
- [ ] Implementar e testar backup/restauração antes de dados reais.
- [ ] Aprovar publicação separadamente; nenhuma publicação faz parte desta entrega.

## Configuração reutilizável da nuvem

`install_script` e `start_skill` foram salvos no rascunho do ambiente, com instalação por lockfile, migração local, build, startup e verificações. A adição de `cdn.playwright.dev` também foi salva na lista de rede; salvar o rascunho não aplica essa permissão à instância nem comprova que os downloads funcionam. Revisar e salvar nas configurações do ambiente e publicar o ambiente para ativar a versão preparada. Isso é distinto de publicar a aplicação na Cloudflare, que não foi feito.
