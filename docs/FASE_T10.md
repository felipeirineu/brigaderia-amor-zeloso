# T10 — seleção preservada e revisão do pedido

Versão **0.22.0**. Entrega no branch `codex/t10-order-recovery`, para revisão pelo Claude. Sem publicação pelo Codex, migração, mudança de flags ou operação remota no Cloudflare/D1. A T11 não faz parte desta entrega.

## Produzido

### Retomar seleção

O aviso e o editor acompanham o mesmo evento `order-draft-changed`, com snapshot estável via `useSyncExternalStore`. O editor distingue o conteúdo que ele próprio gravou de uma seleção externa ainda pendente. Antes de cada gravação, relê o armazenamento e recusa sobrescrever uma seleção não recuperada ou descartada; a posse fica só em memória.

**Retomar seleção** leva a uma entrada com intenção explícita (`retomar=1`), que abre o assistente mesmo quando a preferência é Lista completa. Espera catálogo/kits e, na edição, o pedido; relê o cliente e os padrões, valida referências e composição, recupera os itens e abre **Sabores**. Não pede outro toque em Recuperar seleção. Uma abertura comum de Novo pedido conserva a decisão Recuperar/Descartar. Seleções inválidas não são descartadas silenciosamente: o aviso permanece e há erro e descarte explícito.

O armazenamento permanece por aba, organização e usuário, com a whitelist anterior: IDs, quantidades e unidades das composições. Não inclui nomes, endereços, textos livres, datas, preços, custos ou aceites de duplicação/horário passado. O servidor continua sendo relido e a data/entrega/pagamento precisam de revisão. Logout, descarte e sucesso mantêm a limpeza; expiração conserva a seleção mínima.

### Caixa mista e revisão

- Convite da caixa mista centralizado; badge soma todas as caixas mistas adicionadas.
- Na montagem, Limpar ao lado de **− quantidade +**, de 1 a 10.000 caixas iguais. Nova montagem começa em 1; editar conserva a quantidade. Composição idêntica é agregada, respeitando o limite existente.
- A grade usa duas colunas até 380px para manter os dois alvos de 44px dentro de cada cartão; acima disso mantém a grade de três no celular. Nomes continuam inteiros e os controles não são encolhidos nem escondidos para caber.
- Na revisão, **Cliente:** e nome destacados; sabor e embalagem em linhas separadas. Embalagem usa a quantidade cadastrada por caixa, com rótulo histórico como fallback. Controles têm largura independente do comprimento do nome, limitada pelo espaço disponível na tela.
- Em uma unidade, o botão de menos vira lixeira com nome acessível Remover + item. Cancelar a confirmação conserva a seleção. Aprovar remove só o item; se era o último, retorna a Sabores. Vale para sabor, caixa mista e kit, sem gravar pedido nessa ação.
- Os controles novos de quantidade não criam/removem uma linha de botão OK durante o foco: isso deslocava Adicionar caixa mista entre pointerdown e click. Digitar, sair do campo e usar +/− mantém a quantidade, sem perder o primeiro toque. O comportamento anterior dos demais formulários permanece padrão.

### Motivos e valores em folhas do app

`PromptSheet` compartilha a exclusão mútua, cancelamento e ciclo de sessão do ConfirmProvider: uma solicitação por vez; Cancelar, Escape, navegação, pagehide, perda de conexão detectada ou desmontagem/expiração retornam cancelamento. Não há persistência do texto. A folha tem título, rótulo original, foco no campo, Cancelar e ação; o foco volta ao gatilho conectado.

As nove chamadas nativas foram substituídas em OrderDetail, Visits, CreditTools, Account e Expenses. Motivos vazios/espaços são recusados; limite de 500 caracteres e mínimo de três para cancelar visita, como no servidor. O valor do crédito vem pré-preenchido pelo saldo não alocado, teclado decimal, formato monetário existente e limite até o saldo disponível; zero/negativos/formato inválido não avançam. A confirmação posterior existente continua sendo exigida. CAS, idempotência, regras por perfil e validações do servidor não foram alterados.

O contrato AST passa a recusar `prompt()` e `confirm()` nativos e chamadas assíncronas não aguardadas. Não foram criadas rotas nem permissões novas; a matriz de segurança existente continua aplicável.

## Testes executados

Os resultados finais, comandos e quantidades estão no relatório T10 de `docs/colaboracao/CODEX_PARA_CLAUDE.md` e na descrição do PR. Os novos testes estão em `tests/e2e/t10-order.spec.js` e `src/components/prompt-value.test.ts`; regressões de sessão, T6 e despesa foram adaptadas às novas interações, mantendo as verificações de dados e segurança.

Capturas `docs/colaboracao/capturas/t10-*`: três pares antes/depois (sabores, montagem, revisão), além de retomada, remoção, motivo e valor. Apenas dados fictícios identificados como DEMONSTRAÇÃO, em banco efêmero. Nenhuma captura enviada pelo responsável com dados reais foi copiada.

## Limitações

Sem teste em aparelho físico. A seleção é somente da aba, não uma fila offline ou sincronização de pedidos entre aparelhos. A revisão completa continua obrigatória. O snapshot não representa preço garantido: o backend relê preço/permissões e preserva snapshots históricos da edição.

## Pendências

CI completo e Segurança automáticos do PR, revisão e publicação pelo Claude. Nenhum workflow manual foi executado. Cadastro de kits e ativação real dos avisos permanecem fora deste escopo.
