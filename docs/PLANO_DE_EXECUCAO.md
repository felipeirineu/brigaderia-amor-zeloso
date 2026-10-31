# Plano de execução para Codex

Executar em fases e PRs pequenos; **não implementar todos os módulos em uma única solicitação**. Em cada fase: planejar, implementar, rodar testes, documentar e fazer checklist de entrega. Manter dados de demonstração isolados.

## Fase 0 — Bootstrap e validação
- Confirmar com o responsável: acesso privado, conta GitHub, ambiente Cloudflare, identidade visual original, número WhatsApp, horários, regras de entrega; tudo que faltar fica `TODO-CONFIRMAR`.
- Criar React+TypeScript+Vite, roteamento, PWA instalável, CI, lint, prettier, Vitest, Playwright, `.env.example`, README.
- Tela inicial navegável com dados mockados, componentes acessíveis, design tokens de marca. Não conectar produção.
- Definir esquema inicial e segurança: sessão, permissões, validação, migrações e migrations de teste.
**Aceite:** build/lint/typecheck/tests passam; PWA prévia demonstrável; sem chaves em git.

## Fase 1 — Autenticação, clientes, produtos e pedidos básicos (primeiro fluxo vertical)
- Autenticação e papéis testados; sem registro público.
- Banco D1 de desenvolvimento e migrações com clientes, produtos, variantes, pedidos e itens.
- CRUD com filtros e validação; pedido com múltiplas variantes e valores em centavos.
- Dashboard com próximos pedidos e totais; dados sincronizam em duas sessões.
**Aceite:** pedido criado por operador A aparece para operador B; acesso anônimo bloqueado; preço histórico preservado.

## Fase 2 — Status, entrega e WhatsApp assistido
- Máquina de estados testada; histórico de mudanças.
- Entrega/retirada, agenda, taxa e endereço snapshot.
- Modelos personalizáveis; links wa.me com URI encoding correto; registros manuais de contato.
**Aceite:** todos os modelos sem placeholders faltantes; abertura da conversa exige ato do operador; não há mensagens disparadas automaticamente.

## Fase 3 — Financeiro e relatórios essenciais
- Pagamentos parciais e sinais, saldo, despesas básicas, filtros por período.
- CSV com escaping adequado; PDF de orçamento/relatório se viável sem elevar custos.
- Testes de rounding, cancelamentos e idempotência de pagamentos.
**Aceite:** reconciliação de recebimentos e pedidos; nenhum valor negativo inesperado.

## Fase 4 — Produção, receitas, estoque
- Ingredientes, fichas técnicas, rendimento, custo estimado, lista de produção.
- Movimentações e ajustes auditáveis; alertas de estoque baixo.
- Registrar e documentar diferença entre previsão, separação e consumo real.
**Aceite:** estimativas reproduzíveis e estoque sem desconto duplo.

## Fase 5 — Catálogo público em modo desativado
- Área pública em feature flag OFF com listagem apenas de produtos aprovados para publicação.
- Carrinho de orçamento e botão de WhatsApp só quando ativado explicitamente.
- Testes de vazamento de dados e bloqueio do catálogo desligado.
**Aceite:** flag OFF torna UI e endpoints públicos indisponíveis; não expõe dados administrativos.

## Fase 6 — Homologação e entrega
- Testar Android Chrome e Safari iPhone, instalação na tela inicial, processos PWA, login e navegação.
- Backup D1 e imagens, procedimento de restauração testado em ambiente separado.
- Revisar LGPD, retenção e exclusão; logs sem informações pessoais desnecessárias.
- Publicar apenas ambiente privado de homologação; ativação do domínio e catálogo após aprovação.
- Manual de uso em pt-BR, guia de administração, custos, documentação de transferência de GitHub/Cloudflare.
**Aceite:** checklist assinado pelos responsáveis; nenhuma credencial hardcoded; procedimento de rollback e recuperação conhecido.

## Definição de pronto por tarefa
- Requisitos e casos de erro implementados.
- TypeScript sem erros, build e lint aprovados.
- Testes unitários/integrados relevantes e E2E do fluxo crítico aprovados.
- Acessibilidade básica verificada em mobile.
- Migrações reversíveis ou plano de rollback documentado.
- Sem dados privados em commit, fixtures ou console.
- README e changelog atualizados; pendências declaradas.

## Backlog posterior (não entrar no MVP)
- Automação oficial WhatsApp Business Platform com consentimento/template aprovado, custos e segurança analisados.
- Pagamentos online, frete automático, notificações web push, integração com catálogo do WhatsApp Business.
- Multi-unidade, emissão de nota fiscal, roteirização de entregas, marketplace, painel avançado BI.
