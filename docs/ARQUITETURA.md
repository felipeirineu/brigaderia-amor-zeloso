# Arquitetura proposta (sujeita a validação técnica)

## Stack
- Frontend: React + TypeScript + Vite, PWA com manifest e service worker (por exemplo vite-plugin-pwa), design system simples e acessível.
- Backend: Cloudflare Workers (TypeScript), API REST tipada, validação com Zod ou equivalente.
- Banco: Cloudflare D1 (SQLite). Migrations versionadas e consultas parametrizadas; preferir camada de acesso tipada leve.
- Arquivos: Cloudflare R2 **somente se o armazenamento de fotos exigir**; avaliar elegibilidade e limites de custo antes de ativar. Não pressupor que R2 será sempre gratuito.
- Autenticação: mecanismo robusto compatível com Workers, sessão via cookie HttpOnly Secure SameSite, armazenamento seguro de hash de senha (KDF apropriada) ou provedor externo cuja oferta gratuita seja verificada; evitar criar criptografia caseira.
- Infraestrutura: código privado no GitHub; deploy de frontend e Workers na Cloudflare por CI com segredos protegidos. Escolher Pages ou Workers Static Assets conforme documentação atual e compatibilidade, sem fazer suposições sobre nomes de recursos.
- Testes: Vitest (unitários), integração API/D1 e Playwright (E2E); lint e typecheck em CI.

## Dados (entidades principais)
`organizations`, `users`, `memberships`, `sessions`/identities, `customers`, `addresses`, `products`, `product_variants`, `product_images`, `ingredients`, `recipes`, `recipe_lines`, `inventory_movements`, `orders`, `order_items`, `order_status_events`, `payments`, `expenses`, `delivery_details`, `message_templates`, `contact_events`, `audit_events`, `settings`.

Todas as entidades operacionais carregam `organization_id`. Para simplificar, a versão 1 tem uma única organização, **mas o filtro/isolamento deve ser aplicado no backend em todas as consultas**, sem confiar no ID enviado pelo cliente. Usar UUID/IDs não sequenciais quando apropriado, chaves estrangeiras, índices e constraints de integridade.

- Valores monetários: centavos inteiros; nunca float para cobrança.
- Quantidade de itens: inteiros positivos; pesos: gramas inteiras ou decimal fixo explicitado; ingredientes em unidades padronizadas.
- `order_items` salvam snapshots de nome, variante, preço e quantidade.
- `orders` guardam snapshots de endereço e tipo de entrega para histórico.
- `payments` são eventos; saldo calculado a partir dos registros válidos.
- Estado de pedido não é igual a estado de pagamento.
- Fotos: apenas referências a arquivos autorizados, com limites de tamanho e tipo, nomes não sensíveis, remoção segura.

## Fluxo de pedido
1. Registrar cliente/selecionar cliente.
2. Escolher variantes + quantidade; calcular subtotal e taxa; salvar rascunho.
3. Confirmar pedido com data/horário.
4. Gerar mensagem pré-preenchida e abrir WhatsApp; registrar contato manual se desejado.
5. Alterar produção, pronto, entrega/retirada com eventos auditáveis.
6. Registrar pagamentos parciais, despesas e conclusão.
7. Emitir relatório ou exportar dados.

## Estrutura sugerida após bootstrap
```
/src/                 # aplicação React e componentes
/src/features/        # clientes, produtos, pedidos, producao, entregas, financeiro, whatsapp, catalogo
/worker/              # API e autenticação
/database/migrations/ # migrações D1
/tests/               # integração e e2e
/docs/                # documentação
/.github/workflows/   # CI e deploy controlado
```

## Rotas recomendadas
Privadas: `/login`, `/app`, `/app/clientes`, `/app/produtos`, `/app/pedidos`, `/app/producao`, `/app/entregas`, `/app/financeiro`, `/app/configuracoes`.
Públicas futuras: `/catalogo`, `/catalogo/produto/:slug`; se desabilitado, mostrar indisponível e nunca revelar respostas privadas pela API.

## ADRs iniciais
- PWA em vez de dois apps nativos: reduz custo de manutenção e facilita atualizações.
- Cloudflare em vez de GitHub Pages como hospedagem completa: Pages serve estáticos, mas não banco/API.
- Mensagens WhatsApp geradas, não enviadas automaticamente: menor custo e menos risco.
- Começar pelo fluxo completo de pedido, e não por telas isoladas.
