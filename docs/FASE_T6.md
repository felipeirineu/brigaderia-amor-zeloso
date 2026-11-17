# T6 — Ajustes visuais (0.18.0)

Entrega para revisão em `codex/t6-visual-polish`. Sem migração, alteração de flags ou operação no Cloudflare/D1.

## O que conferir

1. Em **Clientes**, Clientes/Contatos ficam centralizados na mesma linha. Novo cliente ou Novo contato aparece centralizado abaixo e abre o mesmo formulário.
2. Em **Novo pedido → Quem leva**, nome e avatar têm espaços separados. Selecionar mantém o círculo ou a foto visível. O mesmo componente é usado no entregador do detalhe do pedido e nos responsáveis de lembretes.
3. As escolhas sem seleção não reservam espaço para um visto vazio. Na ocasião, Casamento/Presente e Brinde/empresa/Outra cabem em pares no celular de referência (390 px), inclusive com Casamento selecionado. A largura acompanha o conteúdo, com quebra quando necessária.
4. No **Hoje**, o aviso de seleção em andamento tem Retomar seleção e Descartar seleção lado a lado. Retomar abre a recuperação existente: é preciso conferir novamente quantidades, data, entrega e pagamento. Isso não confirma um pedido. Descartar apenas remove a seleção da aba.
5. Calcular rota fica alinhado ao nome do cliente, após o avatar. Ver todos os lembretes e Cadastrar cliente ficam alinhados ao texto do próprio bloco, sem recuo extra. O alvo de toque continua com pelo menos 44 px de altura.
6. No tema escuro, o logo recebe contorno dourado de 2 px. O tema claro e a imagem original continuam preservados.

`AvatarChip` compartilha a apresentação do avatar. `Button` preserva um ícone explícito quando selecionado e só cria a área do ícone quando existe conteúdo. As cores usam os tokens de `theme.css`; sem estilos inline, exceção de CSP ou `backdrop-filter`.

## Evidências e testes

As capturas em `docs/colaboracao/capturas/t6-*.png` usam somente DEMONSTRAÇÃO em 390×844. Há sete pares antes/depois e duas capturas adicionais depois: lembrete e alinhamento da rota ao nome do cliente. O cenário anterior foi executado sobre a versão 0.17.0; as verificações geométricas novas são aplicadas à entrega atual.

```bash
npm run build:pages
npm test
npm run test:brand
npm run test:security
npx playwright test tests/e2e/t6-visual.spec.js
```

O E2E verifica alinhamento, espaçamento, avatar selecionado, pares de ocasiões, toque de 44 px, tema claro/escuro, recuperação/descarte sem criar pedido e cancelamento de lembrete sem registro ou assinatura de avisos. As regressões incluem pedidos, sessão expirada, ocasiões, lembretes, atualização e aparência. Os resultados executados estão em `docs/colaboracao/CODEX_PARA_CLAUDE.md` e no PR.

Para repetir as capturas **depois**, use `T6_CAPTURE=depois npx playwright test tests/e2e/t6-visual.spec.js --project=chromium-mobile`. Não execute `T6_CAPTURE=antes` sobre a versão atual: isso rotularia a evidência incorretamente.

## Limitações e pendências

Validação local em navegadores simulados; falta revisão em aparelhos físicos. A versão 0.18.0 mantém Novidades oculta até 1.0.0. Publicação depende da revisão do Claude e do CI completo + Segurança automáticos do PR. Sem CI manual, merge ou avanço do main nesta entrega.
