# Changelog

## 0.0.0 — 2026-10-31

- Bootstrap da Fase 0: React/TypeScript/Vite, navegação mobile e demonstração identificada.
- PWA com assets estáticos offline e atualização assistida.
- Esboço Worker/D1 local, migração estrutural e catálogo bloqueado por padrão.
- Lint, formatação, tipos, testes Vitest/SQLite/Playwright e CI sem deploy.
- WebKit, instalação em aparelhos reais e configurações dos proprietários pendentes; detalhes em `docs/FASE_0.md`.

## Preparação da demonstração online

- Build Cloudflare Pages com API bloqueada e cabeçalhos de segurança.
- Configurações separadas para Pages e Worker/D1 local.
- Guia de publicação por integração GitHub e três testes adicionais do adaptador Pages.

## Fase 1 — Gestão privada

- Login Cloudflare Access validado no servidor e sessões D1 revogáveis.
- Clientes, produtos com variantes e rascunhos de pedidos com snapshots em centavos.
- Dashboard, isolamento por organização, auditoria, idempotência e concorrência.
- Testes de integração workerd/D1 e E2E com duas sessões fictícias.
- Registro do Tradicional fornecido pelo responsável, separado da demonstração pública.
- Ativação D1/Access e homologação online pendentes; catálogo continua bloqueado.

## Correção do retorno do Access

- Entrada por navegação completa, com sessão emitida no retorno validado e redirecionamento direto para a gestão.
- Removida a segunda etapa por fetch, que podia falhar ao ser redirecionada para o domínio do Access.

## Correção do callback no service worker

- Excluídas rotas `/cdn-cgi/` do fallback offline para permitir callback e logout do Cloudflare Access.
- Regressão reproduzida em Chromium antes da correção; teste passa a verificar que essas rotas chegam à rede.

## Colaboração, correções técnicas e início da Fase 2A

- Briefing Claude importado, prioridades P0/P1/P2 e informações comerciais documentadas com reconfirmação.
- WebKit no harness sem modificar cookies de produção; N+1 removido, com lotes e testes de volume.
- Logo oficial autorizado, assets PWA/touch/favicon, tokens AA e Lucide.
- Operação Hoje por papel, status auditados com desfazer, modelos semanais idempotentes, entregador e WhatsApp assistido.
- Ajuda contextual, tour base e treino frontend sem gravação.
- Migração preserva pedidos/itens; ativação operacional OFF até backup/migração remota. Recebimentos/fechamentos continuam pendentes.
