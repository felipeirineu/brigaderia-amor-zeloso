# T4+T5 — Aparência e Novidades (0.17.0)

Entrega em branch para revisão, sem alteração do banco, flags, catálogo público ou Cloudflare. T6 continua na fila para outra entrega.

## Aparência

Em **Mais → Preferências → Aparência**, escolha:

- **Automático** (padrão): acompanha claro/escuro do celular, inclusive quando o sistema muda enquanto o aplicativo está aberto.
- **Claro** ou **Escuro**: mantém sua escolha mesmo quando o celular usa outro modo.

A alteração é imediata e fica neste navegador/aparelho. Não altera a aparência dos outros usuários em outros aparelhos. Se o navegador bloquear o armazenamento, a escolha funciona nesta abertura e volta ao padrão ao recarregar.

O arquivo externo `public/theme-init.js` lê somente a preferência e aplica antes de carregar o aplicativo; não usa script inline, estilo inline, eval ou recurso externo. A CSP permanece igual. Os tokens ficam em `src/theme.css`; superfícies, campos, etiquetas, avisos, folhas e skeleton usam a paleta. Fotos, logo e mascote não são invertidos; as cores das bolinhas de composição continuam representando sabores.

Meta `theme-color` e manifesto acompanham o modo. O manifesto escuro é gerado do mesmo objeto do manifesto claro, com id, ícones, escopo e início idênticos. Isso preserva a identidade do aplicativo instalado. O navegador/sistema decide como aplica a cor à própria barra/janela; a validação local usa navegadores simulados, não um aparelho físico instalado.

A proteção de armazenamento também cobre as leituras do passeio e do modo de pedido que renderizam junto de Preferências. Se o armazenamento falhar, essas escolhas ficam em memória; não bloqueiam a tela de aparência.

## Novidades — pronta, oculta antes de 1.0.0

Na **0.17.0**, a folha e o atalho **Mais → Novidades** ficam ocultos. Não há flag ou endereço especial para habilitar a versão 1.0.0 no aplicativo publicado.

A partir da **1.0.0**, depois de entrar na gestão:

1. A primeira abertura da versão apresenta **Novidades da versão X**, com até três destaques. Aguarda fechar outra folha que já esteja aberta.
2. Na 1.0.0, a folha traz **Bem-vindos ao app da Brigaderia Amor Zeloso** e três orientações sobre recursos entregues.
3. **Entendi**, Esc/Voltar ou fechar por gesto marca a versão como vista neste navegador. Reabrir, trocar de tela ou recarregar não repete o anúncio da mesma versão. Uma versão anterior à já vista também não reanuncia.
4. **Mais → Novidades** permite consultar o histórico, sem exibir versões futuras.

Somente o número da versão vista é guardado em `localStorage`, sem nomes, endereços, pedidos, preços ou custos. Sem armazenamento, o registro vale nesta abertura; após recarregar o anúncio pode aparecer novamente.

## Manutenção do histórico

`src/release-notes.ts` é a fonte única do conteúdo exibido. O histórico inicial reproduz as versões da FILA em linguagem de uso, até três itens por versão. Ao preparar uma versão futura, acrescente seu resumo nesse arquivo; o teste exige uma entrada para a versão de `package.json`. Não inventar um resumo automático de uma versão sem notas.

A comparação usa versão semântica, incluindo pré-release e metadados. A versão de produção permanece vindo de `package.json`; a 1.0.0 usada no E2E é um build separado em diretório temporário, servido apenas pelo harness de teste, sem alterar o pacote da entrega ou adicionar rota/flag de teste na produção.

## Validação e publicação

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:brand
npm run test:security
npm run build:pages
npm run test:e2e -- tests/e2e/appearance-news.spec.js
```

As capturas `docs/colaboracao/capturas/t4-escuro-*` usam apenas DEMONSTRAÇÃO em banco efêmero. O teste verifica preferência antes de executar o aplicativo, cores calculadas/contraste dos botões, auto/manual/persistência, bloqueio do armazenamento, metadados, ausência na 0.17.0 e anúncio/histórico na fixture 1.0.0.

O PR executa CI completo nos três navegadores e Segurança automaticamente; não disparar workflow manual. Claude revisa e publica após conferir os resultados. O Codex não faz merge nem avança o main. Não há migração ou ativação remota a executar para esta entrega.
