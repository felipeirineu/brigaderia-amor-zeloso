## T21 — plano antes do código (24/11/2026)

Base `577564c`, versão 1.8.0 e prévia `previas/t21-quantidade-por-doce.png`. A migração 0031 acrescenta `recipe_components.quantity_basis` com padrão `batch`. A ficha salva a quantidade na forma digitada. Em `shared/recipe-quantity.ts`, centralizar a conversão em milésimos e o custo do ingrediente. Reutilizar no cálculo do servidor, na lista de compras e na conferência em `Recipes.tsx`. Pedido, kit, relatório, exportação e amostras usam o cálculo central. O schema anterior continua com lote inteiro.

Aceite: rendimento variável, frações, ausência de preço, modo preservado na edição, papéis e CAS, compras por lote, relatório, restauração do backup e E2E nos três navegadores. Capturas só com DEMONSTRAÇÃO. Aplicação remota exclusiva do responsável.

## T19 — retorno do CI e da revisão do PR #29 (22/11/2026)

### Produzido

- Incorporei a 1.6.1 do main. Relatórios consultam só as fichas ligadas às variantes e aos pares sabor/peso selecionados; exportações sem custo dispensam a consulta. Se a estimativa atingir o próprio limite, o relatório de vendas continua disponível.
- Os testes de kits e Caixa Mista agora conferem o percentual de 20% e a embalagem do kit contada uma vez. O teste de exportação abre direto na tela de relatórios após o login, evitando cancelar requisições de Hoje no WebKit.

### Testes executados

- Suítes P1 e Kits, incluindo a regressão com 205 fichas alheias ao relatório, custo do pedido e dados exportados. Build, tipos, lint, 257 testes unitários e 351 verificações de segurança.
- Vinte e quatro testes de tela em Chromium móvel, WebKit móvel e Chromium desktop, incluindo os fluxos que falharam no primeiro CI.

### Limitações

- Após a 0030, o cache de estrutura da 1.6.1 pode atrasar a exibição do campo em até 15 minutos com a configuração padrão.

### Pendências

- Validação da gestão e Segurança automáticas no mesmo PR, revisão do Claude e aplicação da 0030 pelo Felipe depois da publicação.

## T19 — entrega para revisão (22/11/2026)

### Produzido

- Versão 1.7.0. A ficha mostra o custo por ingrediente, mão de obra, embalagens, outros custos, subtotal, **Custos não calculados** e total, por lote e por doce. Os preços sugeridos do lote e do doce ficam lado a lado, com a sugestão da embalagem vinculada abaixo.
- A migração 0030 acrescenta o percentual com padrão de 20% em fichas novas e existentes. O administrador pode ajustar cada ficha de 0% a 100%. O percentual entra antes da margem e o preço sugerido do lote arredonda para cima ao centavo.
- A estimativa reflete o percentual nos pedidos, relatórios e exportações. A calculadora por peso e a prospecção usam o percentual comum quando há fichas técnicas ativas do mesmo sabor e peso. Sem uma correspondência de percentual, vale a configuração geral da calculadora.
- Duas capturas de demonstração, guia da migração em `docs/FASE_T19.md` e registro visual em `design-qa.md`.

### Testes executados

- Build de Pages, TypeScript, lint, formatação, 253 testes unitários, 10 testes de migrações e 351 verificações de segurança.
- Integrações da P1, custos mistos, calculadora por peso, prospecção e backup. A T19 aplicou a 0030 em D1 local já populado e verificou padrão 20%, 0%, limites, CAS, papéis, isolamento, relatório, CSV, dados de exportação e restauração SQLite com a nova coluna. Também conferiu preservação do preço do catálogo.
- Quinze cenários de tela em Chromium móvel, WebKit móvel e Chromium desktop, incluindo edição para 0%, custos, ficha por peso e exportação.

### Limitações

- Relatórios e exportações usam o custo estimado atual. A estimativa fica indisponível quando faltam fichas ou custos.
- No esquema anterior à 0030, as fichas mantêm o cálculo anterior e o campo fica oculto. O ensaio de migração e restauração usou dados de demonstração.

### Pendências

- Validação da gestão e Segurança automáticas do PR e revisão do Claude. Após aprovação e publicação, a aplicação da 0030 no banco real cabe ao Felipe.

## T19 — plano antes do código (22/11/2026)

Base `d398594`, versão 1.7.0 e prévia `previas/t19-fichas-custos.png`. A 0030 acrescenta `recipes.unmeasured_bps` com padrão 2000 (0–10000). Em `worker/recipes.ts` e `recipe-domain.ts`, detectar a coluna, preservar uso antes da migração e calcular custos/estimativas em centavos. A ficha mostra custo por ingrediente/lote/doce, percentual, aviso e preços sugeridos. Reutilizar as estimativas em pedido, kits, prospecção, relatórios e exportações; preservar o cálculo da ficha por peso e o percentual geral quando não houver ficha técnica correspondente ao sabor e tamanho.

Aceite: casos de 0%, 20%, arredondamento e insumo sem preço; CAS, papéis, schema pré/pós-migração e backup restaurável; cobertura de pedido/relatório, ficha por peso/kit e telas com dados de demonstração. Aplicação no D1 real somente pelo responsável.

Nota de revisão da T20: o PR #28 publicado contém dois apontamentos automáticos P2 (lote com todos os IDs arquivados numa parte e prazos diferentes para desfazer). A fila atual libera a T19.

## T20 — entrega para revisão (22/11/2026)

### Produzido

- Versão 1.6.0. Em **Pedidos**, **Selecionar** ou um toque longo no celular abre a seleção. **Todos do dia** marca um grupo, e a barra fixa oferece **Mudar data**, **Avançar etapa** e **Marcar entregue**.
- A folha mostra os pedidos antes de aplicar. A mudança preserva o horário de João Pessoa. Entregas e retiradas percorrem suas etapas próprias, com eventos e auditoria. Pedidos encerrados ficam de fora, e o resultado mostra os motivos dos pulados.
- O servidor aplica CAS, organização e idempotência por pedido. O cliente envia até dois por chamada e mostra o progresso. **Desfazer** restaura a data ou registra as transições compensatórias. Os vencimentos da T17 e da T18 são recalculados após concluir ou desfazer.
- Seis capturas de demonstração mostram seleção, data e conclusão no celular e no computador.

### Testes executados

- Build de Pages, TypeScript, lint, formatação, 252 testes unitários, 351 verificações de segurança e integrações de operação e financeiro.
- A integração T20 verificou horário preservado na virada do dia UTC, pedidos pulados, concorrência, idempotência, entrega, retirada, compensação e vencimentos. O lote de duas conclusões medido usou 16 consultas no handler.
- Passaram dez testes de tela de T20, T18, operação e cadastro no Chromium móvel, WebKit móvel e Chromium desktop. O cenário exclusivo do computador ficou fora dos dois projetos móveis. A última rodada da T20 conferiu as capturas e o fluxo nos três projetos.

### Limitações

- A seleção trabalha com os pedidos carregados na lista. Desfazer tem uma janela de 30 segundos por pedido, exige a versão aplicada pelo lote e respeita os fechamentos financeiros. Em lote longo ou interrompido, podem restar somente os pedidos que ainda estão dentro da janela.
- Testes em D1 local com dados fictícios e navegadores emulados.

### Pendências

- Validação da gestão e Segurança automáticas do PR, seguidas da revisão do Claude. A T20 usa o registro de idempotência já presente desde a migração 0007.

## T20 — plano antes do código (22/11/2026)

Base `4ae0bf1`, versão 1.6.0 e prévia `previas/t20-pedidos-em-lote.png`. Em Pedidos, acrescentar seleção por dia, folha de conferência e barra de ações. No servidor, usar pequenos lotes com a mesma validação de confirmação e saída do pedido individual. Por pedido, uma transação grava a mudança, todos os eventos, auditoria e recibo idempotente. Usar o registro existente de operações para permitir desfazer em 30 segundos com CAS e eventos compensatórios. O esquema da 0007 já fornece esse registro.

Aceite: preservar cada horário no fuso do negócio, registrar a sequência completa inclusive retirada, recomputar vencimentos T17/T18, proteger sessão, organização e concorrência, exibir pulados e permitir desfazer somente a alteração original. Testar celular e computador, capturar estados da prévia com dados de demonstração e enviar o PR para revisão.

## T18 — retorno da revisão automática do PR #27 (22/11/2026)

Em `worker/calendar.ts`, filtrar a condição por entregas antes do limite de perfis com fechamento por data. O cálculo de vencimentos continua vindo dos recebíveis. No teste de integração da T18, salvar a condição no cadastro e conferir Agenda e ICS antes e depois da entrega efetiva, junto de um cliente com fechamento semanal.

- **Produzido** — Agenda e exportação ICS voltam a abrir quando há cliente com condição a cada X entregas. O fechamento semanal permanece no calendário. A cobrança do ciclo aparece no vencimento efetivo, conforme os recebíveis. A versão 1.5.0 inclui a correção de rolagem do cadastro no computador da 1.4.4.
- **Testes executados** — reproduzi o erro 500 e confirmei a correção com o teste de integração da T18 e a suíte P1. Validação da gestão e Segurança do PR já haviam passado em `0983617`.
- Com a 1.4.4 incorporada, passaram o build de Pages e sete testes de tela de Agenda, T18 e rolagem do cadastro no computador. O cenário de rolagem é exclusivo do Chromium desktop.
- **Limitações** — a integração externa Workers Builds falhou no commit anterior. A prévia do Pages e os workflows do GitHub Actions passaram.
- **Pendências** — conferir os checks automáticos no novo commit e aguardar a revisão do Claude.

## T18 — entrega para revisão (22/11/2026)

### Produzido

- Versão 1.5.0. **A cada X entregas** está no pagamento do pedido e na condição do cliente, com contador de 2 a 12 e vencimento na última entrega efetiva. Retiradas concluídas contam. O ciclo seguinte começa mesmo com saldo anterior em aberto.
- Ao trocar a condição no meio do ciclo, a primeira entrega efetiva sob a regra nova fecha e dá vencimento aos pedidos anteriores. O valor da entrega sob a nova condição fica separado. Desfazer recalcula o ciclo e preserva os recebimentos registrados.
- O Hoje mostra a contagem e o aviso **Cobrar hoje**, com prévia editável do WhatsApp e recebimento agrupado. A conta mostra progresso, ciclos fechados e saldo. Financeiro e relatórios usam as datas efetivas. O aviso privado da manhã usa o agendador existente.
- Incorporei a versão 1.4.3 do main. A abertura de **ver sabores** tem menos espaço entre o título e a lista. A ajuda inclui um exemplo. Há quatro capturas com dados de demonstração e um guia em `docs/FASE_T18.md`.

### Testes executados

- Build de Pages, TypeScript, lint, formatação, 252 testes unitários e 349 verificações de segurança.
- Integrações de financeiro, operação, P1 e notificações passaram. A T18 foi testada em D1 com migrações até 0028. Verifiquei retirada, cancelamento, desfazer, entrega atrasada, reinício com saldo em aberto, recebimento parcial idempotente, relatórios, isolamento e deduplicação do aviso. As trocas para outro X, Na entrega e A prazo por data fecham apenas o saldo anterior.
- 27 testes de tela passaram em Chromium móvel, WebKit móvel e Chromium desktop. O cenário T18 verificou o contador, a projeção, a prévia do WhatsApp, o recebimento e a abertura da lista de sabores. Na primeira rodada, o WebKit abriu a Caixa Mista porque o teste selecionava o primeiro cartão. O teste final seleciona o sabor pelo nome.

### Limitações

- Um pedido agendado permite conferir a previsão. O recebimento do ciclo e o Pix da cobrança ficam disponíveis após confirmar a última entrega efetiva. O WhatsApp exige conferência e envio humano.
- Os avisos foram testados com provedor simulado. Para aparelhos já inscritos, o aviso novo depende de o responsável republicar o agendador após a publicação.

### Pendências

- Validação da gestão e Segurança automáticas do PR e revisão do Claude. A T18 dispensa migração. O guia registra o passo para republicar o agendador, quando autorizado.

## T18 — plano antes do código (22/11/2026)

Base `8d379b8` e prévia `previas/t18-cobrar-a-cada-x-entregas.png`. Estender o JSON de condições, agrupar entregas efetivas por cliente e vincular o vencimento à última do grupo em Financeiro, recebíveis e relatórios. Troca de condição inicia outro grupo quando há uma entrega efetiva sob a regra nova. Pedidos agendados do dia são projeções no Hoje. Ao desfazer, recalcular sem alterar pagamentos gravados. Reaproveitar a alocação e o CAS dos recebimentos, a prévia do WhatsApp e a fila de avisos privados.

Aceite: condições antigas, contagem de 2 a 12 e reinício com saldo em aberto, cancelamento, desfazer, mudança de condição, retirada, recebimento parcial, isolamento, três navegadores e captura de demonstração. Push parcial autorizado no branch. A estrutura existente comporta os dados e a fila de notificações. Nenhuma operação na Cloudflare ou no banco real.

## T16 — entrega para revisão (22/11/2026)

### Produzido

- Versão 1.4.0. **Os dois** está disponível no Novo pedido, em Editar entrega e nos Pedidos padrão. No Hoje, a ação **Atribuir aos dois** aparece em entregas em aberto, e o cartão mostra as duas iniciais vindas dos nomes de exibição.
- A migração 0029 amplia as opções válidas de entregador em pedidos e modelos. Preserva os dados, índices e vínculos existentes. A sessão habilita a nova escolha após detectar o esquema.
- A geração semanal registra um pedido com uma taxa. Os totais de entregas e corridas continuam contabilizando cada registro uma vez. O guia `docs/FASE_T16.md` descreve a pré-checagem, a aplicação e a conferência pelo responsável.

### Testes executados

- Build de Pages, TypeScript, lint, formatação, 243 testes unitários, 10 testes SQLite de migrações e 349 verificações de segurança.
- Integrações de operação e financeiro passaram. A T16 conferiu bloqueio antes da migração, preservação de pedido e modelo com dependências, edição pelo servidor, recorrência idempotente, totais de venda e corrida, e restauração do backup com a nova opção.
- Wrangler local aplicou a 0029 em uma base fictícia já populada. Preservou os responsáveis anteriores e o evento vinculado. `foreign_key_check` retornou zero linhas.
- Passaram 18 testes de tela em Chromium móvel, WebKit móvel e Chromium desktop, incluindo as escolhas nos quatro fluxos e a compatibilidade sem 0029.

### Limitações

- Os relatórios atuais agregam por pedido, cliente, produto ou corrida, sem indicador de entregas por integrante da equipe. Em uma reversão após gravar a primeira entrega conjunta, mantenha uma versão capaz de exibir e ler o novo valor.
- A migração foi ensaiada em banco local descartável, com dados de demonstração.

### Pendências

- Validação da gestão e Segurança automáticas no PR, seguidas da revisão do Claude. Felipe aplica a 0029 no banco autorizado após a aprovação e a conferência do backup.

## T16 — plano antes do código (22/11/2026)

Base `fdb7c2c`. A migração 0029 amplia o CHECK de entregador em `orders` e `recurring_templates`. Preservar colunas, IDs, índices e vínculos dos pedidos existentes. A API de sessão sinaliza suporte pelo esquema e as três rotas existentes de gravação conferem essa capacidade antes de aceitar `both`. Em Management, FieldContext, Totem, OrderDetail, Recurring e Hoje, oferecer **Os dois** e mostrar as iniciais da equipe. Modelos copiam um único pedido e os totais continuam por pedido ou corrida, conforme o relatório.

Aceite local: migrar uma base com pedidos, modelos e dependências, comparar dados e FKs, testar gravação e edição, geração da semana, totais/relatórios e exportação/restauração, além do fluxo móvel e do esquema anterior. Fazer push parcial no branch conforme a fila. Aplicação de migração real somente pelo Felipe.

## T15 — entrega para revisão (22/11/2026)

### Produzido

- Versão 1.3.0. A gestão em computador usa menu lateral com logo e **+ Novo** fixo, cabeçalho com data, calendário no Hoje, Ajuda e menu da conta. O menu Novo usa a folha existente.
- O Hoje mostra saudação, contagem de entregas e lembretes, quatro indicadores em uma linha e avisos em largura total. Entregas ficam à esquerda. Produção e lembretes ficam à direita. Ações de entrega e avisos dos lembretes continuam acessíveis nas linhas expansíveis.
- Pedidos abre o detalhe ao lado da lista e sincroniza a lista ao mudar o status. Clientes abre a edição à direita. Formulários ficam centralizados quando fora das colunas. Mais tem três colunas. Os filtros de Relatórios ficam em uma linha.
- Dez capturas a 1366 × 860 mostram Hoje, Pedidos, Clientes, Mais e Relatórios nos dois temas. O comparativo com a prévia está registrado em `design-qa.md`.
- Incorporei o `main` em `6436e5e` (1.2.1), preservando o lembrete de nome de exibição e a etapa do passeio.

### Testes executados

- Build, tipos, lint, formatação, 243 testes unitários e 349 verificações de segurança.
- Na bateria móvel completa, passaram 225 cenários e 3 ficaram fora da execução pelos próprios testes. O cenário T3c falhou nos dois navegadores na primeira rodada ao redimensionar para 1024 px. Recoloquei o botão Atualizar Hoje e o cenário passou nos dois navegadores móveis e no Chromium desktop.
- Ao todo, 16 cenários selecionados passaram na compilação final nos três navegadores. O E2E de computador verificou a navegação, quatro indicadores alinhados, as duas colunas, abertura de folhas, mudança de status na tela dividida, filtros e os limites de 1023/1024 px.
- Após incorporar a 1.2.1, passaram novamente build, lint, formatação e 13 cenários de T15, R5, R9 e T3 nos três navegadores. As duas execuções do cenário exclusivo de computador nos projetos móveis foram puladas.

### Limitações

- O layout é aplicado à gestão com operações ativas, a partir de 1024 px. A verificação visual usou navegadores locais e dados fictícios em D1 descartável.

### Pendências

- Validação da gestão e Segurança automáticas do PR, seguidas da revisão do Claude. A entrega dispensa migração e alterações de configuração no Cloudflare.

## T15 — plano antes do código (22/11/2026)

Base `35c60b8` e prévia `previas/computador-hoje.png`. Em Management, CompactHeader e theme.css, montar navegação lateral e cabeçalho únicos a partir de 1024 px, compartilhando o menu Novo, a conta e o calendário existentes. Em Today, Finance, Reminders e Reports, colocar indicadores em uma linha, entregas e produção/lembretes em duas colunas, com avisos em largura total. Em Pedidos e Clientes, usar lista e detalhe/folha quando houver espaço. Conferir 1366×860, claro e escuro, e os limites 1023/1024. Rodar a bateria móvel e registrar dez capturas fictícias. Sem mudanças em API, banco ou Cloudflare.

## T17 — diagnóstico do WebKit (22/11/2026)

Incorporados o `main` `5c51af7` e o branch do Claude `46c0c11`, com o vencimento no último dia para meses mais curtos. No trace do CI do PR #24 (`44984175967`), o primeiro GET de Pedidos é interceptado com o JSON inválido, a recarga recebe a resposta normal e o GET seguinte chega ao servidor real do teste sem passar pelo `page.route`. O DOM mostra Pedidos, sem erro de renderização para a barreira tratar.

Mover apenas a resposta inválida do teste T14 para o transporte HTTP de `tests/helpers/runtime.mjs`. Preservar as três entradas na tela de erro, a recarga normal, Voltar ao Hoje e o envio do diagnóstico. Verificar o cenário repetidamente no WebKit e nos demais navegadores, com os mesmos timeouts.

## T17 — retomada após a T14 (22/11/2026)

Base atualizada para `d8d7493`, com a T14. O CI inicial do PR #24 passou em Segurança e falhou no mesmo cenário de Ajuda nos três navegadores. O exemplo de fechamento ficou abaixo da área visível ao seguir o link. Em `HelpCenter.tsx`, trazer o exemplo para perto da abertura da seção. O teste de agenda existente deve passar sem relaxar a checagem de visibilidade. Revalidar o fluxo T17 e a integração da T14 no mesmo branch.

## T17 — entrega para revisão (22/11/2026)

### Produzido

- O cadastro pelo fluxo **Novo pedido → Revisar** agora permite registrar uma entrega já realizada. Data e hora começam no horário atual de João Pessoa. Um recebimento opcional, integral ou parcial, é registrado na mesma operação idempotente. O pedido entra no financeiro sem passar pela produção.
- **Na próxima entrega** está disponível para pessoas e estabelecimentos. O saldo fica em **A receber**, sem vencimento até a próxima entrega efetiva ao mesmo cliente. O marco é recalculado se essa entrega for desfeita. A condição aparece na ajuda, no filtro do Financeiro e no relatório de vendas.
- Nas condições a prazo, **Dia do mês** aceita de 1 a 31 e usa o próximo vencimento após o fechamento. Se o mês termina antes do dia escolhido, o vencimento cai no último dia do mês. A regra aparece no pedido, na conta, no extrato e na cobrança. Os prazos em dias seguem disponíveis.
- Após incorporar a T14 do `main` (`d8d7493`), o exemplo de fechamento passou para o início da seção da Ajuda, ao alcance do link **Ver explicação completa**. O E2E de diagnóstico da T14 confere a versão declarada no pacote e simula o JSON inválido pelo servidor HTTP local, inclusive após recarga no WebKit.
- Versão 1.2.0, guia em `docs/FASE_T17.md` e captura com dados fictícios em `docs/colaboracao/capturas/t17-entrega-realizada.png`. A entrega usa o esquema de banco existente.

### Testes executados

- Build de Pages, TypeScript, lint, formatação e 243 testes unitários na base atualizada.
- Integrações de financeiro, operações, mobile, R2, P1 e 349 verificações de segurança com a matriz da T14 e teste de avisos de feedback. O cenário T17 verifica produção, recebíveis, relatórios, validade e atomicidade do recebimento, concorrência, isolamento por cliente e organização e vencimento depois do fechamento.
- Os 15 testes locais de agenda (incluindo o link da Ajuda), feedback T14 e fluxo T17 passaram em Chromium móvel, WebKit móvel e Chromium desktop. O cenário de recuperação da T14 também passou em 8 repetições no WebKit móvel, com os mesmos timeouts. Na entrega inicial também passaram os cenários selecionados de financeiro e mobile.

### Limitações

- A baixa de estoque continua manual. Retiradas e entregas planejadas não disparam o vencimento da dívida anterior.
- O registro retroativo fica no fluxo Novo pedido do Modo simples. A versão foi testada em navegadores simulados e em banco local descartável. Depois de gravar as novas condições, qualquer reversão de versão precisa preservar a leitura desses valores.

### Pendências

- Nova Validação da gestão e Segurança automáticas no mesmo PR #24 e revisão do Claude. A T14 já está no main. A T17 não exige migração. Nenhuma operação na Cloudflare ou no D1 real.

## T17 — plano antes do código (22/11/2026)

Base `8b524a0`. Em Novo pedido, registrar entrega ocorrida e recebimento opcional na mesma transação idempotente do cadastro, usando os eventos de status, financeiro e auditoria existentes. O estoque segue manual, como na entrega normal. Usar a data efetiva nos recebíveis e relatórios.

Estender Terms (JSON) com próxima entrega e dia fixo do mês. Financeiro, conta, filtros e relatórios compartilham o cálculo de vencimento. Verificar fechamento, datas retroativas, produção, isolamento e caminhos com/sem recebimento, com integração local e E2E móvel. Sem migração prevista: status, eventos e condições já comportam os valores. Incorporar o main atual antes do PR.

## T14 — entrega para revisão (20/11/2026)

### Produzido

- Versão **1.1.0** com barreira de erro no layout e nas rotas. A recuperação volta ao Hoje, recarrega a página ou abre um relato de Problema com código preenchido. O diagnóstico no navegador registra só código, versão, categoria da tela e tipo de erro.
- Sugestões e problemas em Mais e na Ajuda. Tipos Sugestão, Problema e Elogio, mensagem de até 2000 caracteres, contexto opcional, envio idempotente e histórico com confirmação de leitura. O atalho pós-envio depende do secret `FEEDBACK_WHATSAPP` válido.
- Recebidas exclusiva do administrador, com contador, filtros, nome de exibição, contexto e leitura idempotente. O número de retorno é optativo no perfil e libera um atalho assistido ao WhatsApp.
- O agendador existente envia um aviso genérico por mensagem nova ainda não lida aos aparelhos elegíveis dos administradores. A fila deduplica por mensagem e aparelho e revalida autorização e leitura antes de enviar. A migração aditiva 0028 habilita os recursos e o backup inclui as tabelas. A limpeza remove os relatos de teste e conserva a configuração de retorno. A cópia da T13 exclui mensagens e telefones de retorno.
- Guia `docs/FASE_T14.md` e quatro capturas `t14-*` com dados de demonstração em claro e escuro.

### Testes executados

- Build do Pages, tipos, lint, formatação e **236 testes unitários**, incluindo sanitização do diagnóstico, validação e consentimento.
- **349 verificações de segurança**, com rotas sem sessão, papel, isolamento, limite de envio e reenvio idempotente. Integrações de migrações, backup/restauração, limpeza e push em D1 efêmero. O teste de push decifrou a entrega simulada, conferindo mensagem genérica, destino, deduplicação e cancelamento após leitura.
- **24 testes de tela selecionados** nos três navegadores do projeto. Cobrem erro de renderização, recarregar, voltar ao Hoje, contexto e envio, autorização da caixa, leitura, WhatsApp opcional e regressões de aparência, Novidades, navegação e atualização.

### Limitações

- A barreira trata falhas de renderização. O diagnóstico fica no navegador até a pessoa optar por enviar um relato. A fila cobre as mensagens ainda não lidas das últimas 24 horas para aparelhos elegíveis que já estavam inscritos no momento do envio.
- O WhatsApp abre o texto para revisão e envio humano. As notificações foram testadas com provedor simulado.

### Pendências

- Validação e Segurança automáticas do PR e revisão do Claude.
- Após aprovação do responsável, publicar a versão, aplicar a 0028 ao banco autorizado e atualizar o agendador se o Web Push estiver em uso. O secret do WhatsApp é opcional. Nada foi aplicado no D1 nem na Cloudflare.

## T14 — plano antes do código (20/11/2026)

Base `8879d33` e prévia aprovada. Proteger layout e rotas em App/Management, com diagnóstico sanitizado, recuperação e formulário pré-preenchido. Implementar Sugestões e Recebidas com autorização no servidor, contexto opcional, idempotência, leitura controlada e WhatsApp assistido. A migração 0028 e o agendador local vão cobrir persistência e avisos genéricos. Validar a matriz de segurança, a fila de push, os três navegadores e capturas de demonstração. Nenhuma alteração no D1 ou na Cloudflare nesta etapa.

## T13 — entrega para revisão (19/11/2026)

### Produzido

- Versão **0.25.0** com binding separado de Pages Preview. O marcador `PREENCHER_ID_TESTE` é aceito pelo leitor de configuração do Wrangler. A API da prévia exige o ambiente de teste e a marca criada pelo workflow no D1, antes de consultar dados de negócio. Produção mantém o binding atual.
- Faixa de teste a partir da sessão, confirmação adicional nos cinco pontos que abrem WhatsApp e tela de avisos com indicação de desativação. O servidor também recusa inscrições de push no teste.
- Workflow manual restrito à main e ao ambiente protegido `ambiente-teste`. O modo de branch só avança `teste`; os demais conferem IDs e nomes e gravam apenas no D1 de teste. A cópia usa temporários fora do checkout, elimina chaves Pix e dados técnicos transitórios, troca telefones por números fictícios, ensaia o SQL localmente e confere contagens e vínculos antes de liberar o acesso. A saída da operação resume contagens.
- Guia `docs/AMBIENTE_TESTE.md` e duas capturas de demonstração, `t13-faixa.png` e `t13-whatsapp.png`.

### Testes executados

- Build do Pages, tipos, lint e formatação. Passaram **234 testes unitários**, incluindo a leitura do marcador, separação de bindings, requisitos de confirmação, cópia de schema anterior, validação do vínculo e remoção de temporários.
- Passaram **317 verificações de segurança** e as integrações de backup, limpeza e avisos. Os testes de Pages confirmam o bloqueio das prévias mal configuradas e a autenticação nas prévias prontas.
- **12 testes de tela** em Chromium móvel, WebKit móvel e Chromium desktop. Cobrem faixa em teste e produção, cancelar e confirmar WhatsApp com tráfego interceptado, aviso do ambiente e regressões de mensagens e atualização.
- Wrangler no modo local, com dois D1 descartáveis, confirmou migrações, cópia e limpeza. As três etapas terminaram com 27 migrações e zero violações. A contagem de clientes no teste foi 0, depois 1 após a cópia e 0 após a limpeza.

### Limitações

- A exportação de origem pode interromper consultas momentaneamente. O workflow foi preparado para uso autorizado em janela de baixa atividade. O destino tem cópia privada com nomes, endereços e valores, por isso exige a mesma proteção de acesso.
- A T13 depende de confirmar os bindings no Pages e retirar ou restringir as prévias antigas. O comportamento de importação e publicação na Cloudflare ainda aguarda a primeira execução autorizada.

### Pendências

- Validação da gestão e Segurança automáticas do PR, seguidas da revisão do Claude.
- Criação do D1 de teste, troca de `PREENCHER_ID_TESTE`, configuração do ambiente protegido e do Access e execução humana dos modos do guia. Nenhum workflow manual, acesso ao banco real ou alteração na Cloudflare foi feito nesta entrega.

## T13 — plano antes do código (19/11/2026)

Base `3b350fc`. Separar bindings Pages no `wrangler.jsonc` e bloquear as APIs nas prévias até o banco declarar sua identidade de teste. A sessão informa o ambiente à faixa, aos links de WhatsApp e à tela de avisos. A produção mantém os fluxos atuais.

O workflow manual `ambiente-teste.yml` será preparado para execução humana na main. O script confere nomes e IDs, protege a leitura da origem e permite mutação somente no destino de teste confirmado. Cópia e limpeza serão ensaiadas localmente com SQLite e Wrangler simulado, incluindo exclusões, telefones fictícios, contagens/FKs, logs e limpeza de arquivos. Os testes de tela conferirão faixa e confirmação do WhatsApp. O guia descreverá configuração, acesso protegido e ativação. Nenhum workflow de banco ou operação remota na Cloudflare nesta entrega.

## T12 — entrega para revisão (18/11/2026)

### Produzido

- Versão **0.24.0** com Planilha, PDF e Outros formatos (CSV) nos seis relatórios, no fluxo de caixa e no custo das entregas. Os formatos compartilham o conjunto de dados, o período, os filtros e as permissões existentes. Backup SQL e agenda ICS seguem pelos fluxos atuais.
- Excel com aba nomeada, cabeçalho chocolate, largura ajustada, datas e valores numéricos, formato de reais e totais com SUM. Textos do cadastro são armazenados como texto. O valor calculado do total acompanha a fórmula para visualizadores sem recálculo.
- PDF com logo, Figtree e DM Serif Display incorporadas, período e filtro, resumo de valores, tabela paginada e rodapé com data/hora do aparelho. Abre a folha de compartilhamento nos celulares compatíveis, com download disponível nos demais.
- CSV com BOM UTF-8, separador ponto e vírgula, proteção contra fórmulas e valores em reais com vírgula decimal. A resposta de dados tipados reaproveita as rotas autenticadas e usa `Cache-Control: no-store`.
- Geradores locais fora do precache. Na build, a planilha acrescenta cerca de 15 kB gzip sob demanda e o PDF, cerca de 506 kB gzip mais fontes e logo. Dependências de geração sob licença MIT e fontes sob OFL, com licenças no repositório. Capturas `t12-*` registram a interface e os arquivos com dados de DEMONSTRAÇÃO.

### Testes executados

- Compilação, tipos, lint, formatação e verificação de marca passaram. Foram verificados 227 testes unitários, incluindo leitura do XLSX com `read-excel-file`, extração de texto acentuado e paginação do PDF e centavos positivos e negativos no CSV.
- Integrações P1 passaram. A matriz de Segurança passou 317 verificações, incluindo 401 sem sessão, isolamento por organização e ausência de cache para os dados dos novos formatos.
- 15 testes de tela selecionados passaram em Chromium móvel, WebKit móvel e Chromium desktop. Cobriram os downloads nas três telas, filtros, compartilhamento simulado, permissão da operadora e regressões de custos, caixa mista e atualização do app.
- `npm audit --omit=dev --audit-level=high` encontrou zero vulnerabilidades na árvore de produção. A auditoria completa no limiar crítico passou, com avisos preexistentes na árvore de desenvolvimento.

### Limitações

- O compartilhamento nativo foi simulado nos testes. A disponibilidade e as opções da folha dependem do celular e do navegador. Exportar exige conexão para consultar dados e carregar o gerador.
- O PDF usa as fontes latinas do app. O XLSX e o CSV preservam o texto original. O limite de datas e linhas segue o das consultas existentes.

### Pendências

- Validação da gestão e Segurança automáticas no PR, seguidas da revisão e publicação pelo Claude. A T12 dispensa migração e configuração da Cloudflare.

## T12 — plano antes do código (18/11/2026)

Base `2c30e16`, prévia aprovada e fila lidas. Usar as consultas existentes em `worker/reports.ts`, `worker/expenses.ts` e `worker/travel.ts` para os três formatos, com os mesmos filtros, autorização e limites. Backup e ICS seguem pelas rotas atuais.

O componente de exportação atende Relatórios, Despesas e Custo das entregas. Os geradores de planilha e PDF carregam sob demanda e usam dados em memória. A planilha tem números, datas e fórmulas de total. O PDF inclui marca, fontes locais, filtros, resumo e paginação. O CSV mantém a proteção contra fórmulas e exporta valores em reais com vírgula decimal.

Aceite: conferir conteúdo e tipos dos arquivos, acentos e paginação do PDF, download nos três formatos, permissões e capturas com dados de demonstração. Enviar uma entrega ao PR, com Validação e Segurança automáticas.

## T11 — entrega para revisão (18/11/2026)

> **Atualização após a sincronização:** incorporado o main `8aabd49` (0.22.2). A T11 mantém a versão 0.23.0 e inclui a navegação de volta ao Hoje e as notas da 0.22.2. Nesta base passaram a compilação, a formatação, 224 testes unitários e 18 testes de navegação e backup nos três projetos do Playwright. O PR #20 segue para Validação da gestão e Segurança automáticas.

Branch `codex/t11-backup-reminders`, versão **0.23.0**, base main **a3da716** (0.22.1/NoPhoto) incorporada. Somente T11, prévia aprovada seguida. Guia: **docs/FASE_T11.md**. Sem edição autoral de FILA/VEZ, flags, dados reais, notificações reais, credenciais, publicação ou operação Cloudflare/D1. Migração0027 preparada, **não aplicada no banco real**. T12 fora desta entrega.

### Produzido

- **T11-1 concluída:** configuração por organização, owner no servidor e interface: Toda semana (padrão),15 dias,mês,desligado; segunda9h por padrão, dia/horário local editáveis e salvamento explícito. Migração0027 aditiva com `backup_reminders`, `backup_exports` e classificação/índice único dos jobs de backup. Schema incompleto/ausente oculta o recurso e preserva backup e push anteriores. Configuração incluída em KEEP; exportador reconhece tabelas novas e exclui comprovantes transitórios dos dados exportados.
- **Regra do calendário:** intervalo mínimo em dias civis locais (7/15/um mês), seguido da próxima ocorrência do dia/horário escolhido; mês limitado ao último dia quando necessário. Sem histórico usa a janela da semana inicial. Salvar os mesmos valores preserva a chave e o adiamento, sem outro aviso do mesmo vencimento. O guia e a tela explicam o arredondamento para a janela.
- **T11-2/3 concluídas:** cartão no topo do Hoje do owner com data/dias ou Nenhum backup, Fazer backup/Lembrar mais tarde. Adiamento de1h no servidor com CAS/idempotência; reaparece ao vencer e vale nos outros aparelhos, com atualização no foco/evento e polling de1min. Relógio local atualiza a cada30s; servidor valida o instante dos comandos.
- **Push concluído:** usa o agendador existente, envio único por vencimento/adiamento/aparelho com índice e claim atômico; consultas em lote e até cinco tentativas por invocação. Revalida owner em membership e autorização, sessão e chave/configuração antes do envio; mantém allowlist/410 e envio incerto sem retry. Service worker com ações fixas Fazer backup/Lembrar em1h: relê versão/chave, POST autenticado/idempotente; erro/expiração/aviso antigo abre Backup para ação humana. Nenhum serviço pago novo ou envio a clientes.
- **T11-4 concluída:** comprovante só depois de gerar o SQL inteiro, vinculado ao usuário/organização,15min, uso único/idempotente e auditoria. Confirmação atualiza último backup e resolve o lembrete; comprovante antigo não retrocede a data. Histórico legado vem de `backup.export_requested`; falha de geração/escrita/rede não confirma. A confirmação que falhou após salvar pode ser repetida sem outro download.
- **T11-5 concluída:** pasta fixa com API compatível, handle no IndexedDB por organização/perfil, Trocar pasta/Usar Downloads, renovação explícita de permissão e erros em pt-BR. Só confirma no servidor após `createWritable().close()`. Nome distinto e recusa de colisão antes de escrever; arquivos antigos nunca são apagados. Navegadores sem API continuam com download. Como o download comum não informa se foi salvo, a tela diz Download solicitado e oferece Já salvei o arquivo antes de resolver o lembrete; não simula verificação do sistema.
- **T11-6 concluída:** orientação de guardar oito arquivos/dois meses, ajuda sobre os sete dias de histórico e pasta privada, nenhum apagamento automático.
- **T11-7/8 concluídas:** versão0.23.0/notas (Novidades continua oculta antes de1.0.0), README/guia e **quatro capturas** t11-* só DEMONSTRAÇÃO: Hoje, download aguardando confirmação, ajuda de retenção e pasta no computador. NoPhoto/grade e alterações recentes do Claude preservadas; sem mudança no Totem ou no catálogo.

### Testes executados

- `npm test -- --maxWorkers=2`: **224 testes /48 arquivos**, incluindo oito casos de calendário (fuso/virada de dia,15 dias, mês/bissexto, janela e adiamento), sete casos do service worker (ações fixas, navegação, POST/chave, sessão/aviso antigo/falha e URL forjada), e preservação/erro de escrita do arquivo.
- `test:security`: **302 verificações** verdes; quatro rotas novas na matriz com401 sem sessão,404 em outro tenant,403 para operadora e proteção de Origin nos comandos. `test:api`: **28 verificações** verdes.
- `test:backup` ampliado e verde: restauração SQLite com FKs e isolamento, inclusão de configuração/exclusão de comprovantes, CAS/idempotência, comprovante expirado/reutilizado/anterior, geração recusada por tamanho sem confirmação, migração sobre organização existente, schema anterior, owner exclusivo, cron repetido/concorrente, adiamento, configuração igual sem novo aviso, autorização revogada e erro incerto sem retry. Somente D1 efêmero/provedor simulado.
- `test:push`: regressão completa de interoperabilidade aes128gcm/VAPID, CSRF/SSRF, sessões/revogação/410, cron/claim, limites, ausência de schema e backup privado verde. `test:cleanup` verde, com configuração protegida e zero violações; `test:migrations`: **10 testes** verdes.
- `build:pages` (tipos incluídos), lint, format:check, diff --check e `test:brand` (assets/AA): verdes.
- **27/27 E2E selecionados nos três projetos**: T11, backup, avisos existentes, AppUpdate e CSP/cabeçalhos. Relógio verifica antes/depois do prazo retornado pelo servidor, em vez de depender da diferença entre relógios. Dois aparelhos veem o mesmo adiamento; papel, schema anterior, download sem falsa confirmação, limites da pasta e erro de gravação/rede também cobertos. Pasta simulada usa handle OPFS real persistível no IndexedDB, com permissão/escrita simuladas; perfil de outra organização não reutiliza a pasta. Chromium cobre a API de computador; WebKit confere o fallback sem API.
- **Bateria completa Chromium móvel:106/106 verdes**, incluindo T10/NoPhoto e gestão/financeiro/recorrências/kits/fotos/localização/importação/backup/visitas, CSP e AppUpdate. Sem retirar verificações de segurança nem financeiras.

### Limitações

- Sem aparelho físico. Avisos dependem das permissões, configuração prévia da T8 e cron de cinco minutos; o sistema pode atrasar ou não exibir ações. Um aviso já entregue em outro aparelho pode continuar no histórico do sistema, mas comando de chave antiga é recusado.
- Períodos mínimos são arredondados para a próxima janela de dia/horário. UI usa o relógio do aparelho e backend/cron seu próprio relógio, com validação dos comandos.
- Download comum exige conferência humana; pasta fixa só nos ambientes compatíveis e com permissão. Se a página for fechada antes da confirmação, é necessário fazer outro backup para atualizar o lembrete. SQL continua com os limites existentes; confirmação não substitui ensaio de restauração.
- A API de billing do GitHub recusou a consulta (403); total mensal de minutos não conferido. Envio consolidado e nenhum CI manual, conforme o fluxo aprovado.
- O workflow atual de homologação ainda exige a declaração **Somente dados de teste**. Não foi alterado nem executado. O guia não orienta marcar isso se já houver dados reais: descreve a pré-checagem e a alternativa de migração pelo administrador somente após aprovação, backup/conferência e pausa das gravações.

### Pendências

- CI completo+Segurança automáticos do PR e revisão/publicação pelo Claude, sem merge/avanço de main pelo Codex. Nenhum workflow manual foi disparado.
- Após aprovação, responsável publica app0.23.0 antes da0027, aplica/confere a migração pelo procedimento adequado ao banco, republica o agendador existente e testa os próprios aparelhos. Essas operações **não foram executadas**. Sem0027, recurso novo oculto e backup anterior preservado.
- T12 e cadastros/ativações reais continuam fora desta entrega.

## T11 — plano antes do código (18/11/2026)

Branch `codex/t11-backup-reminders`, main **a3da716** (0.22.1, NoPhoto e os ajustes posteriores do Claude) incorporado. FILA e prévia `previas/t11-lembrete-backup.png` lidas: somente T11, versão0.23.0. T12 fica fora. Sem edição autoral de FILA, mudança de flags, banco real, credenciais, notificações reais ou Cloudflare.

- **Modelo/calendário:** `shared/backup-reminder.ts` e unidades: períodos semana/15 dias/mês/desligado, segunda9h por padrão, fuso America/Fortaleza, mês com fim de mês, próxima janela no dia escolhido, adiamento1h. Migração **0027** só aditiva: configuração da organização e comprovantes de exportação; classificação/deduplicação dos jobs de backup. Recursos ocultos enquanto o schema completo não existe. Configuração entra em KEEP; registros transitórios não entram nos dados do backup.
- **Servidor:** `worker/backup-reminders.ts`, `p1.ts`, `p1-common.ts`, `backup.ts`, registro de tabelas e matriz de segurança. GET/PUT de configuração, POST de adiamento e confirmação de arquivo: owner, tenant, CAS/idempotência e auditoria. Último backup legado inicializado pelo evento `backup.export_requested`. Exportações novas só atualizam o lembrete após confirmação da gravação; falha de geração/escrita/cancelamento não resolve o aviso. Comprovante vinculado à organização/usuário, prazo curto e uso único, sem credencial em URL/storage.
- **Avisos:** ampliar o agendador existente (sem outro serviço) com jobs distintos por vencimento/adiamento/aparelho e claim antes do envio. Revalidar configuração/último backup, perfil owner, membership/autorização e sessão antes de enviar. Preservar allowlist de endpoints, tratamento de410, limite de consultas e ausência de retry em envio incerto. `public/push-worker.js`: somente ações fixas Fazer backup e Lembrar em1h, POST autenticado/idempotente com validação do vencimento; em falha/sem sessão abrir a gestão para ação humana.
- **Interface:** `Backup.tsx`, cartão no topo do Hoje apenas do owner, hook de atualização e tokens do theme. Mesma ordem/textos da prévia; seleção explícita de período/dia/hora, pasta/alteração/permissão, botão de backup, confirmação e retenção dos oito arquivos. Pasta fixa só com API suportada; handle no IndexedDB por organização/perfil, arquivo apenas no destino escolhido, nomes únicos sem sobrescrever nem apagar antigos.
- **Limite do navegador:** `createWritable().close()` permite confirmar a gravação na pasta fixa. Download comum não informa ao app se o usuário realmente salvou: manter mensagem honesta de solicitação e pedir **Já salvei o arquivo** antes de atualizar o lembrete. Nunca afirmar salvamento verificado só por clicar no link. A confirmação/retry não deve gerar outra exportação.
- **Aceite:** unidades de calendário/limites/virada de dia, integração local de CAS/401/404/403, ausência de schema, comprovante e erro, cron repetido/concorrente/revogado/adiado/sem retry. E2E com relógio, owner/operadora, download comum, pasta simulada com handle persistível/permissão/escrita recusada, confirmação e ausência de recurso em banco anterior; regressões de backup/restauração, limpeza, push, CSP/AppUpdate e gestão. Capturas t11-* só DEMONSTRAÇÃO. CI completo+Segurança automáticos do PR, sem workflow manual ou avanço de main. Guia de ativação para o responsável aplicar0027 só após aprovação e republicar o agendador; nenhuma dessas operações será executada pelo Codex.

## T10 — entrega para revisão (18/11/2026)

Branch `codex/t10-order-recovery`, versão **0.22.0**, main **0a8ccc6** incorporado. Somente T10, incluindo o item 4 acrescentado à fila (retirada dos prompts nativos). T9 já publicada; ajustes posteriores do Claude preservados. Guia: **docs/FASE_T10.md**. Sem edição autoral de FILA/VEZ, flags, migração, credenciais, dados reais ou operações remotas Cloudflare/D1.

### Produzido

- **T10-1 concluída:** aviso/editor compartilham leitura reativa por `useSyncExternalStore` e evento `order-draft-changed`. Gravações próprias são distinguidas das seleções externas pendentes, com releitura antes de escrever; não sobrescreve a seleção antes de recuperação/descarte. Retomar seleção carrega automaticamente, relê cliente/padrões/catálogos, valida referências/composição e abre Sabores com aviso, inclusive com Lista completa salva. Abertura comum conserva Recuperar/Descartar. Seleção inválida continua guardada até decisão. Proteção também cobre resposta assíncrona após saída do editor.
- **Privacidade preservada:** whitelist anterior de IDs/quantidades/unidades, por organização/usuário/aba. Nenhum nome, endereço, texto livre, data, preço, custo ou aceite de duplicação/horário passado entra no storage. Recuperar não envia pedido; o aviso de repetido reaparece e exige novo aceite. Logout, sucesso e descarte mantêm a limpeza.
- **T10-2 concluída:** convite centralizado, quantidade de caixas iguais na montagem (padrão/mínimo 1), edição conserva quantidade, badge soma as caixas mistas. Grade com duas colunas até380px para conter alvos de44px; três colunas nas larguras maiores do celular. Corrigido também o deslocamento de Adicionar ao sair do campo numérico: o controle novo não insere/remove uma linha OK durante o foco, mantendo o primeiro toque e o valor digitado. Demais formulários mantêm o padrão anterior.
- **T10-3 concluída:** Cliente destacado; sabor e embalagem separados (unidades cadastradas, rótulo histórico como fallback); controle com largura independente do nome. Lixeira em uma unidade para sabor, misto e kit, com ConfirmSheet; Cancelar preserva e aprovar retira só o item. Último item volta a Sabores, sem API de criação/alteração do pedido.
- **T10-4 concluída:** PromptSheet irmão da confirmação, com textarea de motivo ou valor decimal pré-preenchido, rótulo original, Cancelar e ação. As **9 chamadas nativas** foram migradas em OrderDetail/Visits/CreditTools/Account/Expenses. Motivo obrigatório/até500 caracteres, mínimo3 da visita; valor positivo e até saldo não alocado. Confirmações posteriores, autorização, CAS/idempotência e servidor preservados. Exclusão mútua com ConfirmSheet, foco, cancelamento por Escape/navegação/pagehide/offline detectado/desmontagem/expiração; motivos/valores só em memória. Contrato AST recusa confirm/prompt nativos e chamadas assíncronas sem await.
- **T10-5 concluída:** versão0.22.0/notas (Novidades continua oculta antes de1.0.0), guia e **11 capturas DEMONSTRAÇÃO**: três pares antes/depois (sabores, montagem, revisão) e extras de320px, retomada, remoção, motivo e valor. Nenhuma captura do responsável com dados reais foi copiada. T11/T12 não implementadas.

### Testes executados

- `npm test -- --maxWorkers=2`: **206 testes /45 arquivos** verdes, incluindo motivo, mínimo da visita, formato/zero/limite do valor e contrato AST; whitelist/isolamento do rascunho preservados.
- `npm run test:security`: **285 verificações** verdes; nenhuma rota nova. `npm run test:api`: **28 verificações** verdes; `npm run test:mobile`: confirmação atômica, idempotência, CAS, totais/defaults, isolamento e fotos privadas verdes.
- `build:pages` (tipos incluídos), lint, format:check, diff --check e `test:brand` (assets/contraste AA): verdes.
- **Bateria completa Chromium móvel: 102/102 verdes**. Inclui sessões/duplicação, pedido normal/misto/kit, recorrências/PC, financeiro, despesas/estorno, visitas, importações/backup, fotos, CSP, AppUpdate, skeleton e regressões visuais anteriores.
- **42/42 regressões selecionadas no WebKit móvel e Chromium desktop**:21 cenários por projeto, incluindo T10, sessão/rascunho, mistos, financeiro/despesa, T9, cabeçalhos e AppUpdate.
- **Rodada final T10+T6: 27/27 nos três projetos** (nove cenários por projeto), após a última conferência de rótulos/fluxo. O teste lento segura de fato a resposta do catálogo e confere o storage antes de liberá-la. Todos os sete cenários novos da T10 passaram nos três navegadores; retomada logo após login/Voltar, app recém-aberto com misto+kit, evento tardio, geometria320/360/390/430px, cancelamento/remoção e último kit, motivo vazio/cancelado/expiração sem POST e crédito com limites/cancelamento/motivo/estorno aprovado.
- Os testes legados de sessão/T6 foram adaptados à retomada automática, mantendo as verificações de aviso/quantidades/ocasião não restaurada/sem envio/descarte/isolamento; o E2E de despesa agora preenche a folha em vez de aceitar um prompt nativo. Nenhuma asserção de segurança ou financeira foi retirada.

### Limitações

- Sem Android/iPhone físico. A seleção continua apenas nesta aba, sem fila offline, sincronização entre aparelhos ou envio automático; dados e preços são relidos e a revisão é obrigatória.
- A bateria completa dos três navegadores continua sendo a automática do PR. Localmente houve a bateria móvel inteira e as seleções descritas nos demais, com repetição final da T10/T6; não foi declarado CI verde antes de ele executar.

### Pendências

- Aguardar CI completo+Segurança automáticos do PR T10 consolidado e revisão/publicação pelo Claude. Nenhum workflow manual ou merge/avanço de main pelo Codex.
- T11/T12 e cadastro/ativação reais permanecem fora desta entrega, conforme a fila.

## T10 — plano antes do código (18/11/2026)

Branch `codex/t10-order-recovery`, main **f27655f** incorporado, versão prevista **0.22.0**. FILA atual lida: somente T10, incluindo o novo item 4 (retirada de prompts nativos). T9 já publicada pelo Claude; seus ajustes de grade e teste de animação foram preservados. Nenhuma alteração autoral em FILA/VEZ, flags, migração, Cloudflare/D1 ou dados reais.

- **Recuperação:** `order-draft.ts`, `OrderDraftContext.tsx`, `Totem.tsx` e a entrada de Pedidos em `Management.tsx`: assinatura reativa do rascunho e proteção contra sobrescrita enquanto aguarda decisão/validação. Retomar seleção identifica a intenção pela navegação, recupera automaticamente cliente/itens/mistos/kits relendo o servidor e abre Sabores. A abertura comum mantém a escolha explícita. Nunca restaurar aceite de duplicado nem guardar nomes, endereços, valores ou textos livres no storage.
- **Montagem/revisão:** `Totem.tsx`, componente de quantidade e `theme.css`: número de caixas iguais antes de adicionar, contador agregado de mistos, botões contidos entre 320–430px, Cliente destacado, sabor/embalagem em linhas separadas e seletor de largura constante. Em uma unidade, lixeira com confirmação para sabor/misto/kit; retirar o último volta a Sabores, sem API.
- **Folhas de texto/valor:** estender a infraestrutura de ConfirmSheet com chamada assíncrona de texto cancelável, rótulo original, motivo obrigatório e valor decimal validado pelos limites atuais. Migrar as nove chamadas em OrderDetail/Visits/CreditTools/Account/Expenses; manter motivos, limites, CAS/idempotência e autorização existentes. Contrato AST sem prompt nativo e sem chamadas assíncronas não aguardadas.
- **Aceite/testes:** unidades do armazenamento/quantidade/validação e E2E do Voltar real, primeira retomada com dados lentos, abertura nova, mistos+kit, rascunho externo chegando após montagem, descarte e inválidos. Geometria entre 320–430px e revisão com nome longo; cancelar/remover último de cada tipo; folha de motivo vazio/cancelada sem gravação e aprovação com motivo. Regressões de sessão/duplicado, financeiro, visitas, kits, AppUpdate/CSP. Capturas antes/depois `t10-*` somente DEMONSTRAÇÃO; build/tipos/lint/format, unidade e segurança local. Um envio/PR consolidado, CI completo+Segurança automáticos, sem workflow manual nem avanço de main.

## T9 — entrega para revisão (17/11/2026)

Branch `codex/t9-interface-refinements`, versão **0.21.0**, main **e939ec8** incorporado/conferido. Somente T9, prévia de Foto do produto seguida. Guia: **docs/FASE_T9.md**. Sem edição autoral de FILA/VEZ, flags, migração, operações Cloudflare/D1, credenciais reais ou execução do workflow de ativação.

### Produzido

- **T9-1 concluída:** nomes inteiros centralizados em cartões/botões de sabor, inclusive quebra de linha e montagem. Teste com sabor longo DEMONSTRAÇÃO, sem truncar.
- **T9-2 concluída:** ConfirmSheet/contexto/hook substituem **19 confirm nativos**, mantendo textos, validações, motivos, CAS/idempotência e autorização. Tem certeza?, Cancelar e ação danger. Promise aguardada em cada consumidor; segunda solicitação pendente retornafalse. Escape/gesto/fechar, navegação, pagehide, offline detectado e desmontagem/expiração cancelam. Foco inicial seguro em Cancelar, restaurado ao gatilho conectado. Provider existe na gestão autenticada; prompts de preenchimento de motivos/valores permanecem como antes, fora da substituição solicitada.
- **T9-3 concluída:** botão Arquivar produto só owner/tela>700px. Servidor exige owner no DELETE e nas tentativas de criar/alterar produto para inativo por POST/PUT, depois do isolamento de tenant. Edição comum de produto ativo continua permitida. Unidade da política e matriz de segurança ampliada com401/404/403, bypass e preservação do registro/histórico.
- **T9-4 concluída:** ajuda do Ativo de cliente/produto com o texto pedido e reativação; ajuda fora do label preserva o nome acessível do checkbox e evita alternância acidental.
- **T9-5 concluída:** Cadastrar novo cliente + Lista de clientes antes dos cartões do assistente.
- **T9-6 concluída:** Clientes/Contatos com gap20px (space5), mesma linha central.
- **T9-7 concluída:** Agenda/Prospecção dizem no horário local. Timezone de negócio e cálculos não mudaram.
- **T9-8 concluída:** foto conforme prévia: Sugerir/Sem foto em par, grade3 de cartões quadrados iguais, foto redonda, nome centralizado e inteiro, contorno/visto no selecionado e dica pequena. As nove opções atuais cabem em até2 linhas, sem line-clamp/reticências. Escolha não grava antes de Salvar. Largura limitada da grade no computador.
- **T9-9 concluída:** Ajuda com texto/ícone; formulário no cartão escolhido em Mensagens, foco no textarea, Cancelar sem salvar e retorno de foco ao botão de edição.
- **T9-10 concluída:** foto/inicial centralizada; ajuda de Avisos à direita do título, em uma linha.
- **T9-11 concluída:** simples padrão para ambos os papéis, em qualquer largura; auto antigo/ausente/inválido passa a simples, full persistido preservado como Lista completa. Preferência continua por aparelho/perfil, sem dados de pedido. Automático de Aparência preservado. Seletor de sabor do pedido completo usa Sabor; payload/identificadores permanecem iguais.
- **T9-12 concluída:** versão0.21.0, notas e **19 capturas** t9-*, só DEMONSTRAÇÃO em390×844:8 pares antes/depois e3 extras depois (confirmação, ajuda de mensagens e avisos). Novidades segue oculta antes de1.0.0.

### Testes executados

- `npm test -- --maxWorkers=2`: **194 testes /44 arquivos**, incluindo política de arquivamento com403 pt-BR, normalização de preferência e contrato AST que recusa confirm nativo/chamada de confirmação sem await.
- `npm run test:security`: **285 verificações** verdes (+11 da regra de produtos); `test:api`: **28 verificações** verdes de login, CAS, snapshots, auditoria/arquivamento, catálogo bloqueado e sessão.
- Tipos/build:pages, lint, format:check, diff --check e assets/contraste AA (`test:brand`): verdes.
- **157 execuções E2E distintas verdes nas rodadas finais correspondentes:**95 cenários no Chromium móvel,31 cenários selecionados no WebKit móvel e os mesmos31 no Chromium desktop. A rodada final selecionada passou **93/93** nos três projetos, incluindo os5 cenários novos da T9 em cada um.
- A rodada móvel completa inicial passou91/95. Quatro expectativas legadas foram ajustadas: Lista completa é escolhida aguardando o botão (sem consultar count antes de carregar); skeleton define o modo antes de reter a API; rolagem seleciona o corpo direto da folha; geometria considera grupos visíveis, excluindo os diálogos fechados. Todas as quatro repassadas na rodada final93/93, preservando as verificações de fluxo/rolagem/semântica.
- T9: confirmação Cancelar/Escape/pagehide/expiração =zero DELETE; aprovação =um DELETE e registro inativo no D1 efêmero. Papel/largura, preferência auto/full/default, foco/cancelamento de mensagem, ajuda, grade/nome completo/foto sem salvar e centralização também verificados.
- Regressões incluem financeiros/recebimento/fechamento/Pix/despesa/estorno com escolha explícita da folha, kit padrão cancelado/aprovado, kits/recorrências/mistos e edição PC, sessão/rascunho, fotos privadas, CSP, AppUpdate, T1/T3/T6/T7/skeleton e pedido móvel. Motivos de prompts nativos continuam simulados nos testes que os exigem.

### Limitações

- Sem conferência física em Android/iPhone. Preenchimentos de motivo/valor via prompt nativo não foram redesenhados; apenas as confirmações foram migradas, conforme escopo.
- A largura da tela é apresentação, não autorização; o servidor usa o perfil da sessão. A folha não substitui os controles de CAS/idempotência/permissões.
- Nenhum dado/ação real e nenhum workflow manual nesta sessão. A rodada completa dos três navegadores continua sendo a automática do PR; localmente houve a bateria móvel completa e regressões selecionadas nos demais.

### Pendências

- CI completo+Segurança automáticos do PR T9 e revisão/publicação pelo Claude. Main atual e939ec8 conferido antes do envio consolidado. Sem merge/avanço do main pelo Codex.
- Cadastro dos kits e ativação/testes reais dos avisos permanecem com o responsável, fora da T9.

## T9 — plano antes do código (17/11/2026)

Main **e939ec8** como base de `codex/t9-interface-refinements`; T8 publicada. Somente T9, versão0.21.0. Prévia `previas/t9-foto-produto.png` lida/aprovada: grade3, nome inteiro centralizado, par de ações, contorno e visto. Sem edição de FILA, flags, migração, Cloudflare/D1 ou ativação do workflow.

- Registrar capturas DEMONSTRAÇÃO antes/depois de foto do produto, sabores com nome longo, clientes, mensagens, preferências, modos e confirmação. Mesmos fixtures locais, sem dados comerciais reais.
- T9-1/8: tokens/theme para nomes de sabores centralizados e picker de foto seguindo a prévia, sem reticências, imagem redonda e indicação selecionada; manter seleção só ao salvar produto.
- T9-2: ConfirmSheet/contexto/hook assíncrono compartilhado, diálogo help-sheet com Cancelar e ação danger. Migrar todos os confirm nativos mantendo textos, motivos, validações, CAS/idempotência e sem API antes da escolha positiva. Escape/gesto/fechar/navegação/expiração desmontando a gestão cancelam a pendência; segunda solicitação não duplica. Prompts de motivo existentes não fazem parte da substituição. Adaptar os E2E que aceitavam confirm nativo para escolher a folha explicitamente.
- T9-3: botão de arquivar produto só owner/tela larga. Política testada no backend para DELETE e tentativa de arquivar por active=false em POST/PUT, após isolamento do tenant; sem restringir edições comuns. Matriz de segurança cobre403 e bypass, mantendo401/404 e CAS.
- T9-4/5/6/7/9/10: ajuda de ativo para cliente/produto, Cadastrar novo cliente + Lista de clientes, gap20px, horário local nos textos, ajuda rotulada em Mensagens e edição no cartão escolhido com foco/cancelamento; avatar central e ajuda dos avisos no título.
- T9-11: simple padrão em qualquer papel/tela, auto antigo passa a simple; full preservado como Lista completa, sem alterar a preferência de aparência Automático. Label Sabor somente no seletor do pedido completo. Testes legados que exigem o editor completo passam a escolher esse modo explicitamente.
- Aceite: unidade da política/modo/contrato sem confirm nativo; E2E confirmação/cancelar sem API/foco/Escape, roles/viewport/bypass, foto sem gravação prematura, textos/ajudas/mensagem e default/migração de modo, além das regressões financeiras/kits. Tipos/lint/format/build/security e testes locais apropriados. Um envio/PR T9, sem CI manual ou merge no main; relatório e revisão pelo Claude.

## T8 — entrega para revisão (17/11/2026)

Branch `codex/t8-push-activation`, versão **0.20.0**, main **a285ac4** incorporado/conferido. Somente T8. **Workflow não executado; nenhuma chamada real à Cloudflare, D1, credenciais reais ou criação de environment nesta entrega.** Sem edição autoral de FILA/VEZ; T9 fica para a próxima tarefa.

### Produzido

- **T8-1 concluída:** `.github/workflows/push-activation.yml`, nome Ativar lembretes (manual), somente workflow_dispatch/main, environment lembretes-push, contents:read, concorrência serial sem cancelamento, modos VERIFICAR (padrão)/ATIVAR/REPUBLICAR_AGENDADOR. Boolean confirmo obrigatório com padrãofalse; escritas recusadas semtrue também no script. Token/conta nos mesmos nomes da homologação; APP_URL em vars, sem inputs interpolados no shell, upload de artefatos ou execução por push/PR.
- **T8-2 concluída:** runner lê metadados por GET na API Cloudflare: Pages produção, acesso a Workers, nomes de secrets, existência e cron. Não lê D1 ou devolve corpos/valores em logs. Confirma acesso de leitura; permissão Edit é configurada pelo responsável, sem escrita de teste.
- **ATIVAR:** recusa VAPID existente em qualquer destino, inclusive configuração parcial ou chave pública em variável comum. ES256/P-256 em memória pelo helper compartilhado com create-push-keys; subject HTTPS de APP_URL, sem e-mail. Mesmo trio por stdin nos bulks do Wrangler, Worker primeiro (rascunho sem cron se necessário), Pages produção depois, deploy do agendador ao final. Nova conferência de metadados; não declara conclusão se incompleta.
- **REPUBLICAR_AGENDADOR:** exige agendador e três secrets completos nos dois destinos; somente deploy, sem geração/gravação de chaves. Keep-vars/secrets preservados; DB/nome/id vêm do wrangler da aplicação, cron5min, sem URL workers.dev/preview. Pages, flags e banco não são publicados/alterados pelo runner.
- **T8-3 concluída:** ::add-mask pelo canal oculto do Actions antes dos subprocessos; logs humanos só mensagens fixas, nomes validados e estados. Stdout/stderr/stack do Wrangler nunca são repassados, nem em erro. Config temporária0600 em diretório0700 fora do checkout, sem chaves, removida em finally. Log interno do Wrangler aponta para symlink de /dev/null; métricas desligadas e sanitização forçada. Chaves somente em memória/stdin, nunca arquivo do workflow. Falha parcial interrompe sem retry/rollback/regeneração.
- **T8-4 concluída:** testes com HTTP e Wrangler simulados, transporte/stdin/mascaramento, falhas sem vazamento, temporários reais privados/cleanup, sem rede ou operações Cloudflare.
- **T8-5 concluída:** guia **docs/FASE_R6_LEMBRETES.md** passa a orientar pela interface do GitHub: permissões Edit, environment/secret/variables, VERIFICAR→ATIVAR, republicação habitual do Pages, teste por aparelho. Resultado/erro por passo, identidade existente, falha parcial/propagação e REPUBLICAR explicados. Terminal fica alternativa, usando subject HTTPS; migrações antigas não são reaplicadas neste procedimento.
- **T8-6 concluída:** versão0.20.0 e notas correspondentes; Novidades segue oculta antes de1.0.0. Nenhuma rota de API, migração, flag ou dado comercial alterado.

### Testes executados

- `npm test -- --maxWorkers=2`: **191 testes /41 arquivos**, incluindo **38 novos** do runner/contrato do workflow. Casos de Actions/main/evento/modo/confirmo, config/URL inválidas, GET sem escrita, produção sem preview, nomes em vez de valores, identidade existente/parcial/plaintext, trio igual por stdin, preservação na republicação, 403/404/500 e erros do filho sem vazamento, cron inconclusivo sem retry, env_vars vazio do Pages, secrets do Worker conferidos separadamente dos bindings, cleanup, geração/assinatura P-256 e escape do canal add-mask. O transporte mockado separa comandos de mascaramento do log humano; o adapter padrão também tem teste com execFileSync simulado/stdio pipe.
- `npm run test:push`: integração local workerd/D1 e provedores fictícios verdes: interoperabilidade aes128gcm/VAPID, cron repetido/concorrente, autorização/sessão,410, SSRF/redirecionamento, falha incerta sem retry, ICS/alarme, aparelhos e logout/backup/ausência de schema.
- `npm run test:security`: **274 verificações** verdes; sem novas rotas para acrescentar à matriz.
- `npm run build:pages` (inclui typecheck), `lint`, `format:check` e `git diff --check`: passaram.
- Não houve E2E local novo nesta entrega sem mudança de tela; CI completo de três navegadores + Segurança serão automáticos do PR. Nenhum workflow manual disparado, incluindo o de ativação.

### Limitações

- Integração real com a API Cloudflare/conta/permissões e recebimento físico não executados. O responsável confere pelo workflow após revisão/publicação. Comandos foram conferidos na versão instalada do Wrangler e simulados; não foi feito deploy ou teste de escrita real.
- Metadados confirmam nomes/cron, não provam correspondência de valores opacos preexistentes nem entrega no aparelho. Secrets do Pages exigem republicação habitual do Pages. Propagação do cron pode exigir nova VERIFICAR, sem repetir ATIVAR.
- Pages/Worker não têm transação única. Falha parcial pode deixar configuração em um destino; interrompe e pede revisão humana, sem apagar/regenerar uma identidade. Sem cópia privada em arquivo no workflow; o helper de terminal continua a produzir seu arquivo local privado somente se o administrador escolher essa alternativa.

### Pendências

- Revisão/publicação pelo Claude e CI completo+Segurança automáticos do PR T8, sem merge pelo Codex.
- Responsável prepara permissões/environment/APP_URL, executa VERIFICAR e ATIVAR, republica Pages e testa cada aparelho. Essas ações remotas **não foram feitas**. Cadastro dos kits e T9 continuam fora da T8.

## T8 — plano antes do código (17/11/2026)

Main **a285ac4** incorporado em `codex/t8-push-activation`; T7 publicada. FILA libera somente T8, versão0.20.0. **Não executar o workflow nem operações Cloudflare/D1**, criar environment ou ler credenciais reais. T9 fica para outra vez.

- `.github/workflows/push-activation.yml`: somente workflow_dispatch/main, environment lembretes-push, contents:read, concurrency sem cancelamento, VERIFICAR/ATIVAR/REPUBLICAR_AGENDADOR e confirmação para escrita. Mesmo token/conta da homologação por secret/var; APP_URL por variável. Sem interpolação de inputs no shell ou artefatos.
- `scripts/run-push-activation.mjs`: valida entradas/configuração antes de acesso; leituras de metadados Pages produção + Workers/cron sem mostrar valores. ATIVAR recusa VAPID existente, gera ES256 em memória, mascara pelo canal de comandos do Actions, envia o mesmo trio a Pages/Worker por stdin do Wrangler e publica o agendador com DB da aplicação/cron5min. REPUBLICAR publica só o código, sem gerar/gravar chaves. Preservar secrets no deploy; não publicar o Pages nem mudar flags/banco.
- Extrair geração de chaves para helper compartilhado com create-push-keys.mjs, mantendo o modo local existente. Configuração temporária fora do checkout, permissões restritas e remoção em finally; chave nunca em arquivo. Saída do Wrangler/API nunca repassada crua e erros fixos sem valores; falhas parciais param sem regeneração/retry automático.
- Testes `scripts/*.test.mjs` com transporte HTTP e Wrangler simulados, sem rede real: somente leitura, confirmação/main, recusa com chaves em qualquer destino, mesmo par nos dois destinos, stdin sem argumentos/arquivos de chaves, nomes/cron, cleanup/falhas sem vazamento, republicação sem secrets e algoritmo. Validar YAML/guardas do workflow por teste de contrato.
- Guia `docs/FASE_R6_LEMBRETES.md`: caminho principal pela interface do GitHub (permissões do token, environment/APP_URL, VERIFICAR→ATIVAR, republicar Pages, teste em cada aparelho), resultados e erros curtos. Terminal como alternativa; não instruir repetir migrações já aplicadas. Registrar limites de transação/propagação e recuperação humana de falha parcial.
- Aceite: unidade, lint/format/typecheck/build, segurança e regressão local de push. Sem rota nova de API. Um envio/PR T8 com relatório e CI completo+Segurança automáticos; sem workflow_dispatch, merge/main ou edição autoral da FILA.

## T7 — entrega para revisão (17/11/2026)

Branch `codex/t7-pre-release`, versão **0.19.0**, main **cf9728d** incorporado/conferido. Somente T7; sem edição autoral de FILA/VEZ, flags, worker/API, banco real, Cloudflare ou T8. Prévia aprovada `previas/t7-abertura-alcool.png` seguida. Guia e auditoria por tela: **docs/FASE_T7.md**.

### Produzido

- **T7-1 concluída:** `AppOpening` com logo central de220px, fundo da marca, três pontos discretos, contorno dourado no escuro e animação desligada com reduced-motion. Status acessível sem texto técnico visível. Sem atraso artificial: sessão válida abre a rota pedida/Hoje;401 mantém a entrada existente. Falha inicial de conexão oferece Tentar novamente, não login, preservando retry; sessão já aberta continua sendo preservada nas falhas de rede. AppUpdate, ícones e catálogo desligado intactos.
- **Manifestos:** já tinham fundos claro/escuro corretos; preservados. E2E compara os fundos da abertura com background_color de ambos os manifestos. Sem script/estilo inline, eval, dependência externa ou exceção de CSP.
- **T7-2 concluída:** `AlcoholTag` compartilhado em Totem e KitItemsEditor (opções, montagem, revisão e embalagens anteriores). Ícone decorativo + Álcool; nome acessível Contém álcool, com papel de imagem no selo. Nome/selo dividem linha quando cabem; nome comprido quebra com selo embaixo, sem truncar ou criar overflow. Detecção de shared/alcohol.ts preservada, sem inferência nova de produtos.
- **T7-3 concluída:** Gerar pedidos da semana? alinhado ao título do cartão por ghost-inline, sem mudar rota/ação.
- **T7-4 concluída:** Clientes ou contatos à esquerda; chips na mesma linha central com gap12px (space3). Novo cadastro continua em linha própria.
- **T7-5 concluída:** menu+ em grade2×2, ordem Nova visita/Novo pedido/Novo cliente/Novo lembrete. Mesma largura/altura, mínimo64px, mesmos condicionais de permissão e ações de fechar/navegar.
- **T7-6 concluída:** auditoria das telas especificadas, com tabela individual no guia. Insumos/Fichas/Lembretes: Salvar/Limpar ou Cancelar em pares; Fichas: Insumos/Compras em pares; Kits: Editar/Usar padrão em pares, confirmação e owner preservados; Preferências: câmera/galeria e salvar/cancelar foto em pares; montagem do kit: Completar/Limpar e Salvar/Cancelar em duas linhas. Voltar para Fichas (Insumos/Calculadora) alinhado ao texto. Classe action-pair por grupo, tokens, mínimo48px, sem cortar rótulos longos. Outras telas conferidas mantêm os grupos existentes, especialmente confirmações financeiras e ações únicas de Acessos/Backup.
- **T7-7 concluída:** versão0.19.0 e entrada correspondente na fonte única de Novidades, que segue oculta antes de1.0.0.
- **Evidências:** **57 PNGs** t7-*, somente DEMONSTRAÇÃO em390×844:27 pares antes/depois, montagem/nome comprido adicionais e uma imagem intermediária da montagem antes de compactar seu rodapé (já com selo novo), identificada como intermediária. Custos e valores são dos fixtures fictícios locais, nunca do banco real.

### Testes executados

- `npm run build:pages` (typecheck incluído), `lint`, `format:check`, `git diff --check`: passaram.
- `npm test -- --maxWorkers=2`: **153 testes /40 arquivos**, incluindo SSR do selo/nome acessível/ícone decorativo e todos os testes anteriores de Button, iniciais, álcool, aparência e versões.
- `test:security`: **274 verificações** verdes; `test:brand`: assets e contraste AA verdes. Nenhuma rota nova ou alteração de autenticação/CSP.
- **48 execuções E2E distintas /16 cenários × Chromium móvel, WebKit móvel e Chromium desktop:**12 da T7 (abertura, auditoria/menu, etapas com álcool e nome longo) +36 regressões de T3/T6, gestão/login/duas sessões/logout, sessão expirada/rascunho/repetição, kits no celular/PC, confirmação do kit padrão em massa, foto privada, CSP e AppUpdate. Rodada48/48 verde. Testes legados intactos, incluindo o alinhamento original de Calcular rota ao nome.
- Após explicitar o papel acessível de imagem no selo, repetidos os seis casos de etapas/nome comprido nos três navegadores: **6/6 verdes**, incluindo a busca pelo nome acessível Contém álcool. Unidade153/153 e lint repetidos verdes.
- A auditoria não confirma pedidos nem salva cadastros/recebimentos. Menu Novo cliente foi aberto/cancelado e contagens preservadas. Nos testes de regressão, gravações são apenas em D1 efêmero/local dos fixtures.

### Limitações

- Sem aparelho físico instalado: o sistema controla a splash nativa e a atualização de cor do manifesto. Fundos e estados foram verificados nos navegadores simulados.
- Auditoria cobre os percursos/estados descritos no guia, sem executar todos os estados possíveis de fechamento financeiro, importação, restore de backup ou outras operações não alteradas. Textos longos podem aumentar a altura dos botões; não são cortados para forçar altura fixa.

### Pendências

- Envio consolidado no PR T7. Aguardar CI completo + Segurança automáticos e revisão/publicação do Claude; sem CI manual/merge pelo Codex. Main atual cf9728d conferido antes do envio.
- T8 e cadastro dos kits no banco real continuam fora desta entrega. Sem ativação de notificações, nova migração ou decisão comercial necessária para T7.

## T7 — plano antes do código (17/11/2026)

Main cf9728d como base de `codex/t7-pre-release`; T6 publicada com CI/Segurança verdes. FILA libera somente T7, versão0.19.0. Prévia `previas/t7-abertura-alcool.png` lida: seguir logo central/3 pontos/reduced-motion/contorno escuro e selo curto de álcool junto ao nome. Sem edição de FILA, banco real, flags, Cloudflare ou T8.

- Capturar DEMONSTRAÇÃO antes/depois em390×844: abertura clara/escura, menu+, Hoje, Pedidos/detalhe, todas as etapas do Novo pedido, Clientes/Contatos/visitas, Kits, Insumos, Fichas/calculadora, Lembretes, Financeiro/conta, Relatórios, Mais/Preferências, Acessos/Backup. Auditar ações/overflow sem executar operações reais.
- `Management.tsx` + componente de abertura/theme: logo central com status acessível e pontos discretos até a sessão; preservar erro/login em falha e sessão/offline/retry. Manifestos já usam os fundos claro/escuro; validar correspondência. Sem atraso artificial, texto técnico ou exceção de CSP.
- Selo AlcoholTag compartilhado em Totem/KitItemsEditor: ícone + Álcool, acessível Contém álcool, ao lado do nome com quebra segura quando comprido; manter detecção em shared/alcohol.ts intacta.
- Hoje: alinhar Gerar pedidos da semana? ao título por classe ghost-inline. Clientes: legenda à esquerda, gap mínimo space3 e chips na mesma linha. Menu+: quatro atalhos na ordem aprovada, grade2×2 com alvos iguais e condicionais de permissões preservadas.
- Após capturas, agrupar somente ações dispersas comprovadas na auditoria usando contêiner de ações/tokens, com alvo44px, sem reordenar fluxos ou ocultar conteúdo. Relatório por tela, incluindo telas conferidas sem mudança.
- Aceite: E2E da sessão retida→logo→Hoje,401→login, claro/escuro e reduced-motion, selo/nome e nome longo, grade/links, geometria e ações de cancelamento; regressões T3/T6, AppUpdate, CSP, pedidos. Unidade/SSR do selo; typecheck/lint/format/build/brand/security. Um envio/PR T7 e CI automático completo+Segurança; sem workflow manual ou merge no main.

## T6 — correção do CI no PR #16 (17/11/2026)

### Produzido

- Main **f1de0f2** incorporado no mesmo branch `codex/t6-visual-polish`; versão0.18.0 mantida. Somente correção solicitada na FILA.
- Restaurado o recuo de Calcular rota por tokens (padding + avatar + gap), alinhando seu rótulo ao nome do cliente. Preservados alvo44px, ajuste vertical e demais fantasmas.
- Corrigida a asserção da T6 que usava incorretamente a borda do cartão como referência; agora compara rótulo e nome com tolerância1px. **Teste original da T3 intacto**. Guia esclarece a referência.
- Captura adicional `t6-depois-rota-cliente.png`, DEMONSTRAÇÃO,390×844; demais evidências anteriores preservadas. Agora16 PNGs da T6.

### Testes executados

- `npm run build:pages` (inclui typecheck), `lint`, `format:check` e `git diff --check`: passaram.
- `npx playwright test tests/e2e/t3-visual.spec.js tests/e2e/t6-visual.spec.js`: **9/9 verdes**, três cenários × Chromium móvel/WebKit móvel/Chromium desktop. Inclui o alinhamento original da T3, outros fantasmas, toque44px, avatares/ocasiões, recuperação/descarte, lembrete e logo claro/escuro.
- CI anterior do PR: Segurança verde; Validação falhou no alinhamento da T3 nos três navegadores. Não foi resultado verde completo. Revalidação automática do PR ocorrerá após este push; nenhum workflow manual.

### Limitações

- Sem teste físico; unitários/integrações não repetidos nesta correção exclusivamente de CSS/asserção visual. Resultados da entrega anterior permanecem no histórico, sem afirmar nova execução.

### Pendências

- CI completo + Segurança do novo SHA e revisão/publicação pelo Claude, no mesmo PR #16. Sem merge pelo Codex, Cloudflare/D1, flags, dados reais ou edição autoral da FILA.

## T6 — plano de correção do CI (17/11/2026)

Main f1de0f2 incorporado no mesmo branch/PR #16; FILA pede somente corrigir o alinhamento de Calcular rota. O recuo da T6 foi interpretado incorretamente: a referência é o nome do cliente, não a borda do cartão.

- Restaurar em `src/theme.css` o recuo por tokens de padding + avatar + gap, preservando altura44px e ajuste vertical.
- Corrigir a asserção nova em `tests/e2e/t6-visual.spec.js` para comparar o rótulo com o nome (±1px), em vez da borda. Não modificar `tests/e2e/t3-visual.spec.js`.
- Rodar T3 e T6 nos três navegadores após build; conferir demais fantasmas, format/lint/diff, atualizar guia/relatório e enviar tudo junto no mesmo branch/PR. Sem CI manual, migração, Cloudflare ou edição autoral da FILA.

## T6 — entrega para revisão (17/11/2026)

Branch `codex/t6-visual-polish`, versão **0.18.0**, main **b187400** conferido. Somente T6-1 a T6-6; sem alteração autoral de FILA/VEZ, flags, APIs, banco real ou Cloudflare. Guia: `docs/FASE_T6.md`.

### Produzido

- **T6-1 concluída:** Clientes/Contatos centralizados na mesma linha, Novo cliente/Novo contato centralizado em linha própria abaixo. Ajuda e formulário existentes preservados.
- **T6-2 concluída:** `AvatarChip` compartilhado no Quem leva, entregador do detalhe e responsáveis dos lembretes. Avatar/foto separado do rótulo, círculo de 28 px preservado ao selecionar, com contraste pelos tokens. Motoboy usa o mesmo padrão.
- **T6-3 concluída:** `Button` só renderiza o espaço de ícone quando existe conteúdo; ícone explícito permanece no selecionado, enquanto chips sem ícone selecionados continuam com visto. Largura pelo conteúdo. Ocasiões em pares Casamento/Presente e Brinde/empresa/Outra no celular de referência, inclusive selecionadas; enum/dados comerciais não mudaram.
- **T6-4 concluída:** aviso com o texto exato pedido, compacto, Retomar seleção primário e Descartar seleção tonal lado a lado. Mesmos handlers/whitelist de recuperação. Retomar exige rever os dados; não confirma pedido nem restaura aceite de repetição.
- **T6-5 concluída:** classe explícita para fantasmas Calcular rota, Ver todos os lembretes e Cadastrar cliente, sem recuo lateral extra e alvo mínimo de 44 px. Outros botões fantasma preservados.
- **T6-6 concluída:** contorno dourado de 2 px no logo da gestão somente no tema escuro; original e tema claro preservados. Sem estilo inline, mudança de CSP ou backdrop-filter.
- **Evidências:** 15 PNGs `t6-*`, DEMONSTRAÇÃO em390×844: sete pares antes/depois (Clientes, Contatos, Novo pedido, entregador, ocasião, rascunho e logo escuro) e mais o lembrete depois. Antes executado sobre0.17.0; capturas depois na0.18.0. Fonte de Novidades ganha a entrada0.18; segue oculta até1.0.

### Testes executados

- `npm run typecheck`, `lint`, `format:check`, `build:pages`, `git diff --check`: passaram.
- `npm test`: **152 testes /39 arquivos**, preservados os testes anteriores de Button (submit, loading, link e aria-pressed), mais dois para ausência de espaço vazio e avatar selecionado.
- `test:security`: **274 verificações** verdes; `test:brand`: assets e contraste AA claros/escuros verdes. Sem rota nova, alteração de autenticação ou dependência.
- **51 execuções E2E distintas /17 cenários × Chromium móvel, WebKit móvel e Chromium desktop**, verdes nas rodadas finais: 6 de T6,9 de aparência/Novidades e36 regressões de recuperação com sessão expirada/isolamento/repetição, pedidos/ocasiões, cabeçalhos/cancelamento/rolagem, lembretes/push e AppUpdate. A última rodada de T6 + aparência passou15/15, incluindo o WebKit após a correção de sincronização.
- Na primeira rodada de42 verificações,41 passaram; o teste novo no WebKit conferiu o contorno claro antes do evento assíncrono de matchMedia. Corrigido para esperar `data-theme=light`, sem pausa fixa, mudança no app ou redução da asserção.

### Limitações

- Navegadores simulados; sem conferência física em iPhone/Android nesta sessão. Ajustes são de apresentação; não alteram rotas de mapa, assinatura de avisos, regras de pedido ou confirmação.
- Ambiente reiniciado durante a preparação anterior; trabalho preservado e testes retomados localmente com NO_PROXY/no_proxy de loopback. Sem alteração de rede de produção.

### Pendências

- Main atual b187400 conferido novamente antes do envio consolidado. Revisão/publicação pelo Claude e CI completo (três navegadores) + Segurança automáticos do PR pendentes. Sem execução manual; Codex não avança o main. Relatório também na descrição do PR; capturas incluídas no branch.
- Nenhuma migração/ativação ou decisão comercial necessária para esta entrega. Próxima tarefa depende da FILA atualizada pelo Claude.

## T6 — plano antes do código (17/11/2026)

Main b187400 incorporado em `codex/t6-visual-polish`, versão0.18.0. FILA libera somente T6-1 a6. Revisão geral do Claude liberou a etapa; preservo também o timeout40min atualizado no main. Sem edição autoral de FILA/VEZ, operações Cloudflare/D1, flags ou alterações de regras comerciais.

- Capturar antes/depois DEMONSTRAÇÃO em390×844 usando o mesmo fluxo/fixture; teste geométrico de alinhamento nos modos claro/escuro e WebKit. Não alterar comportamento de cadastro, rascunho ou confirmação.
- T6-1: classe específica do cabeçalho/filtro de Clientes, com Clientes/Contatos na mesma linha central e botão Novo em linha própria central. Manter título, ajuda e acessibilidade, sem afetar outros ChoiceChips.
- T6-2/3: Button não cria espaço de ícone vazio e preserva ícone explícito quando selecionado. AvatarChip compartilhado para seleções de entregador e destinatários de lembretes, avatar/foto separado do texto, círculo legível no selecionado. Chips com largura pelo conteúdo, texto central sem reservar ✓ vazio e espaçamento que permita as ocasiões em pares sem truncar texto/alvo de toque.
- T6-4: somente o aviso do Hoje em OrderDraftContext recebe o texto solicitado, ações lado a lado (retomar primário/descartar secundário), compacto. Mesmas funções de recuperação/descarte e whitelist de sessionStorage.
- T6-5: reduzir recuo horizontal/espaco dos botões fantasma soltos em Calcular rota, Ver todos os lembretes e Cadastrar cliente por classe explícita, mantendo alvo44px e foco.
- T6-6: contorno do logo no tema escuro com token dourado, preservando imagem e geometria; nenhuma alteração do logo claro.
- Verificação: unidade/SSR do Button/AvatarChip, E2E de avatar antes/depois de selecionar, geometria dos chips/Clientes/rascunho/ghost/logo, ações de retomar/descarte e confirmação do pedido inalteradas; regressões de lembretes, pedidos, aparência, atualização e CSP. Tipos/lint/formatação/build, capturas t6-* e relatório. Envio consolidado/PR T6 com CI completo+Segurança automáticos, sem CI manual/merge no main.

## T4+T5 — entrega para revisão (17/11/2026)

Branch `codex/t4-t5-appearance-news`, versão **0.17.0**, main **cc771e1** incorporado/conferido antes do PR. Somente T4+T5; T6 continua depois. Sem edição autoral de FILA/VEZ, flag, banco real ou Cloudflare. Trabalho retomado após indisponibilidade do ambiente; arquivos preservados, logs temporários perdidos e validação repetida antes do envio.

### Produzido

- **T4 concluída:** Preferências → Aparência com Automático (padrão, acompanha o sistema), Claro e Escuro. Boot externo síncrono no head aplica antes do app, sem script/estilo inline ou exceção de CSP; acompanha mudanças do sistema e mantém preferência por navegador. Storage protegido por try/catch e escolha em memória quando indisponível.
- **Paleta escura centralizada:** marrom/creme da marca, superfícies, controles, navegação, folhas, skeleton, avisos e estados. Cores fixas da base CSS passaram a tokens. Texto/primário/sucesso/erro/aviso com pares AA; fotos/logo/mascote preservados, sem inversão de imagens ou backdrop-filter. Onze capturas **t4-escuro-*** em390×844, somente DEMONSTRAÇÃO.
- **Metadados:** meta theme-color e manifesto acompanham claro/escuro. Manifesto escuro gerado do mesmo objeto do claro, mesmo id/ícones/start_url/escopo; ambos entram nos arquivos públicos do build/cache. Registro de service worker/AppUpdate preservado.
- **T5 concluída, oculta na0.17.0:** fonte única `src/release-notes.ts` com histórico reescrito para uso, até3 itens/versão e boas-vindas1.0.0. Comparação semântica, anúncio após sessão e sem interromper outra folha, Entendi/cancelamento/gesto registra visto por aparelho. Não reanuncia versão vista/downgrade. Mais → Novidades mostra somente versões até a atual. Folha, item e rota ficam indisponíveis antes de1.0.0; não foi antecipada a publicação1.0.
- **Teste de1.0 sem gancho em produção:** Vite gera fixture isolada em diretório temporário, e `runtime.mjs` aceita diretório de assets somente como opção do harness. Não há URL, storage, flag ou endpoint para forçar1.0 na aplicação publicada. Nenhuma API de negócio mudou.
- **Resiliência de Preferências:** leituras/gravações do passeio e modo de pedido, que renderizam junto, receberam fallback em memória para não quebrar a tela com storage bloqueado. Com armazenamento normal, chaves/comportamento anteriores preservados. Guia **docs/FASE_T4_T5.md**.

### Testes executados

- `npm run typecheck`, `lint`, `format:check`, `build:pages` e `git diff --check`: passaram.
- `npm test`: **150 testes / 39 arquivos**, incluindo versões/pré-release/metadados, limiar1.0, ordenação/limite do histórico, boot anterior ao DOM pronto, auto/manual, storage inválido/bloqueado e fallback em memória.
- `test:brand`: assets/ícones originais e pares de contraste claros/escuros AA. No escuro, pares centrais entre **6,87:1 e15,53:1**; E2E calcula contraste dos botões primários/sucesso visíveis e habilitados (mínimo4,5:1).
- `test:security`: **274 verificações**; nenhuma rota nova de API, alteração de autenticação, CSP ou catálogo.
- **33 execuções E2E distintas / 11 cenários × Chromium móvel, WebKit móvel e Chromium desktop:** 9 de aparência/Novidades +24 regressões. Incluem boot com módulo do app retido, telas escuras/foto, escolha manual oposta ao sistema/persistência/auto, storage bloqueado, manifestos/meta, ausência na0.17, fixture1.0 com versão anterior vista/Entendi/recarga/histórico; login/cadastros/duas sessões/logout, pedidos por fotos, cartão de entrega, cabeçalhos/CSP/foto/localização, AppUpdate, tipografia e skeleton. Todos verdes nas rodadas finais.
- A rodada inicial do WebKit após reinício recebeu bloqueio de loopback do proxy do ambiente; repetida localmente com NO_PROXY/no_proxy explícitos para localhost/127.0.0.1/::1: **3/3 novos +8/8 regressões WebKit verdes**. Sem alteração de rede do app ou afrouxamento de segurança. Falhas anteriores de montagem do teste foram corrigidas (retirada da rota aguardando handler e seleção explícita do modo simples do administrador).
- Sem CI manual. Validação completa + Segurança executam automaticamente no PR; conferir resultados no SHA final antes de publicar. Cancelar só duplicatas de push, mantendo as execuções do PR.

### Limitações

- **Novidades não aparece na0.17.0:** só a partir da1.0.0, quando o responsável decidir a entrega. O conteúdo inicial1.0 usa somente recursos entregues, sem dados comerciais.
- Preferência e versão vista são por navegador. Sem armazenamento, valem nesta abertura; após recarregar a aparência volta ao automático e o anúncio pode reaparecer.
- Barras/janelas do aplicativo instalado obedecem ao navegador/sistema. Metadados foram verificados em navegadores simulados; nenhum teste físico de PWA instalado foi alegado.

### Pendências

- **Claude:** revisar o PR, conferir CI completo + Segurança no SHA final e publicar conforme o fluxo; revisão geral3/3 prevista na FILA. O Codex não faz merge nem avança main.
- **T6** permanece para o próximo “continue” e somente quando a fila liberar; sem antecipar ajustes de layout/avatar/chips.
- Sem migração, ativação de catálogo, serviço pago ou outra operação real necessária nesta entrega.

## T4+T5 — plano antes do código (17/11/2026)

Main cc771e1 incorporado em `codex/t4-t5-appearance-news`. PR14 revisado/publicado; CI completo e Segurança do PR verdes. FILA libera somente T4+T5, versão0.17.0; T6 permanece depois. Sem edição autoral de FILA/VEZ, banco, flags ou Cloudflare.

- T4: paleta escura centralizada em `src/theme.css`, com seleção automática via preferência do sistema e opção explícita claro/escuro. Boot externo síncrono no head (CSP intacta) aplica antes do paint; localStorage protegido por try/catch, somente preferência por navegador, sem dados comerciais. Preferências permite os três modos; mudanças do sistema acompanham Automático. Meta theme-color e manifesto equivalente claro/escuro acompanham o modo, mesmo id/ícones/start_url. Sem backdrop-filter.
- Revisar cores fixas das superfícies/textos/avisos/controles na base CSS para usar tokens, preservando marca, fotos e mascote. Testar contraste AA de texto/botões e estados (sucesso/erro/aviso), telas/folhas/skeleton em390×844. Sem antecipar ajustes T6 de layout/chips.
- T5: fonte única `src/release-notes.ts` com histórico da FILA, até3 itens por versão e boas-vindas1.0.0. Comparação semântica testada; anúncio só após sessão da gestão, uma vez por versão/aparelho com Entendi e histórico em Mais. Tudo oculto antes de1.0.0. Fechar por gesto/voltar também registra visto; storage indisponível não bloqueia o app. Sem parâmetro/flag de teste para habilitar1.0 na produção.
- Testes: build de fixture1.0 em diretório temporário exclusivo do harness (sem mudar package.json da entrega nem endpoints), E2E da ausência0.17 e do fluxo1.0/uma vez/histórico, versão nova após Atualizar e contraste/auto/manual/persistência/armazenamento indisponível sob CSP real. Unitários de versões e boot, tipos/lint/formatação/build, capturas t4-escuro-* DEMONSTRAÇÃO e guia/relatório. Incorporar main, envio consolidado/PR T4+T5; apenas CI completo e Segurança automáticos, sem merge no main.

## R7d — entrega para revisão (17/11/2026)

Branch `codex/r7d-visit-entry`, versão **0.16.0**, main **cc030dc** incorporado antes do PR. A FILA mantém somente R7d liberada. Li as atualizações: **0026 aplicada/conferida pelo responsável** (`0ccdf68`); T4+T5 agrupadas para depois. Nenhuma edição autoral de FILA/VEZ, flag, Cloudflare/D1 ou dados reais. O Codex não aplicou a 0026.

### Produzido

- **Nova visita no +:** mesma folha de agendamento existente, com busca única por nome/telefone entre contatos/clientes ativos; Novo contato rápido (nome, telefone opcional e PlaceFields com endereço/sugestões existentes). Salvar contato e agendar visita são confirmações separadas. Lista recolhe após escolher; amostras opcionais recolhidas no atalho. Hoje/Amanhã/Escolher data e horários 09/14/18, com campo livre de data/hora. Hoje, Agenda e Visitas se atualizam ao salvar pelo +. Botões do calendário explicitamente não submetem o formulário.
- **Cliente atual:** servidor define e guarda público/objetivo no JSON (`customer`/`new_options` ou `prospect`/`presentation`), sem migração. Cliente ativo pode ser visitado e ter amostras registradas **sem alterar cadastro/versão/funil ou criar conversão/evento de contato**. Cartão/agenda identificam Visita a cliente e Novos sabores/opções. Amostras de ambos os grupos continuam em unidades na produção, sem venda, cobrança ou despesa automática.
- **Histórico e relatório:** visitas antigas sem campo novo continuam de aquisição; converter depois não reclassifica o passado. Novas visitas ao convertido são relacionamento. Relatório separa contagens/custos e exclui relacionamento da coorte, do sabor associado à aquisição e do CAC; inclusive se uma visita de cliente for registrada com data anterior. Custos/WhatsApp da R7c funcionam para cliente sem prospect_details, preservando autorização, prévia humana, confirmação de pagamento e estorno.
- **Ajuda:** tópico com passos numerados em Ajuda e no ? dos Contatos/agendamento, do cadastro à visita/retorno/conversão. Passeio inclui Visitas de apresentação quando a capacidade estiver pronta; acesso móvel pelo menu do perfil preservado.
- Guia **docs/FASE_R7D.md**, quatro capturas **r7d-*** exclusivamente DEMONSTRAÇÃO e bateria `test:visit-entry` no CI automático. Sem tabela ou regra KEEP nova; campos JSON acompanham o backup existente.

### Testes executados

- Tipos/build Pages, lint, formatação e `git diff --check`: passaram. Unitários: **144 testes / 36 arquivos**, SQL: **10 testes**.
- `test:visit-entry`: público não pode ser forjado pelo formulário; cliente atual sem funil, CAS/repetição, tenant, busca unificada sem mudar filtros padrão, Hoje/agenda, relatório separado, visitas antigas/após conversão e compatibilidade até0025/flag desligada.
- `test:security`: **274 verificações**, incluindo busca unificada privada, GET/PUT/registro de visita de cliente com 401/404/operadora e ausência de criação de funil. Nenhuma rota nova fora da matriz.
- `test:visits`, `test:prospect-costs`, `test:backup`, `test:cleanup`, `test:prospects`, `test:p1`, `test:api` (**28 verificações**), `test:listing`: passaram. Orçamentos D1 preservados: Hoje com65 visitas **30 SQL**; relatório **18**, custos **22**, sessão **29**, abaixo de45 reservados de50.
- **33 execuções E2E distintas / 11 cenários × Chromium móvel, WebKit móvel e Chromium desktop**: R7d (contato rápido/endereço/sem telefone, calendário sem agendamento involuntário, cliente atual/registro sem funil, ajuda e passeio/cancelamento); regressões R7b/c e fallbacks, R12/calendário de pedidos, Agenda/ICS/lembrete e AppUpdate. Rodada final de **30/30** verde; Agenda/ICS/lembrete também verde nos três projetos. Falhas iniciais foram referências incorretas do teste a GET inexistente de localização e ao botão do passeio oculto no celular; corrigidas para field/context e menu do perfil. Nenhuma permissão ou CSP foi afrouxada.
- Somente CI completo + Segurança automáticos do PR; sem workflow manual. Resultados remotos devem ser conferidos no SHA do PR antes da publicação; duplicatas de push podem ser canceladas para economizar minutos.

### Limitações

- Busca mostra até12 opções de uma vez; refine nome/telefone para outros resultados. Cadastro de contato já confirmado permanece se a visita for cancelada depois; a folha explica isso antes de salvar.
- Público/objetivo é definido pelo servidor no agendamento. Visitas anteriores sem o campo novo são contatos (único grupo permitido antes). Estimativas continuam usando fichas atuais, não custos históricos; custos/retorno/relatório da R7c dependem de prontidão0026.
- WhatsApp e lembretes/corridas/despesas permanecem ações humanas. Nenhum serviço pago ou catálogo público ativado.

### Pendências

- **Claude:** revisar o PR e conferir CI completo + Segurança no SHA final; publicar conforme o fluxo aprovado. O Codex não faz merge nem avança main.
- **T4+T5** permanecem para o próximo “continue” e somente quando a FILA liberar; sem implementação antecipada.
- Sem migração nova ou outra operação real pendente nesta entrega. Conforme a FILA,0026 já foi aplicada/conferida pelo responsável; a compatibilidade com bancos anteriores foi preservada/testada.

## R7d — plano antes do código (17/11/2026)

Main 4f655e5 incorporado em `codex/r7d-visit-entry`; R7c aprovada/publicada com CI completo e Segurança verdes. FILA libera somente R7d, versão 0.16.0. Nenhuma edição de FILA/VEZ, flag, banco real ou Cloudflare. 0026 permanece com o responsável.

- `shared/visits.ts`, `worker/visits.ts`: guardar público e objetivo no JSON do agendamento (sem migração), definidos pelo servidor a partir do cadastro ativo e preservados no registro/edição. Visitas antigas continuam classificadas como visitas a contatos mesmo após conversão. Cliente atual aceita agendamento/registro sem criar nem alterar funil/eventos de contato. Tenant, CAS/idempotência e histórico preservados.
- `Management.tsx`, `prospects/Visits.tsx` e componente de seleção/cadastro: Nova visita no +; busca única entre contatos e clientes, Novo contato rápido com nome/telefone opcional/PlaceFields existentes. Chips Hoje/Amanhã/Escolher data e 09/14/18 horas, data/hora editáveis. Amostras continuam opcionais e não criam pedido/despesa.
- `worker/prospect-costs.ts`, `shared/prospect-costs.ts`, `Followup.tsx`: custos e mensagens também para cliente sem prospect_details; relatório separa visitas a contatos/clientes. Coortes, sabor associado à conversão e CAC só usam visitas a contatos anteriores à conversão, sem inflar aquisição com visitas de relacionamento a clientes.
- Ajuda em `help/texts.ts`/`HelpCenter.tsx`, ícone ? nos Contatos/Nova visita e passo Visitas de apresentação no passeio, explicando cadastro→visita→amostras→retorno humano→conversão e visita a cliente atual.
- Aceite: integração/matriz de segurança para cliente/tenant/papéis, ausência de alteração de funil/vendas/pagamentos, separação do relatório com histórico após conversão; E2E +→Nova visita para contato novo/cliente e ajuda, chips, cancelamento, prontidão de schemas anteriores. Tipos/lint/formatação/build, capturas DEMONSTRAÇÃO. Push consolidado/PR R7d, CI completo e Segurança automáticos, sem CI manual/merge no main.

## R7c — entrega para revisão (17/11/2026 UTC; 16/11 em Fortaleza)

Branch `codex/r7c-prospect-costs`, versão **0.15.0**, main **f36ffad** incorporado e conferido antes do PR. Somente R7-6/7/9 da FILA; nenhuma edição autoral de FILA/VEZ, flag, Cloudflare ou D1 real. O código da R7a/b e a ativação aprovada dos Contatos foram preservados. A situação da 0025 deve ser conferida pelo responsável; o Codex não a aplicou.

### Produzido

- **R7-6 concluído:** seção de custos consultada só ao expandir o cartão da visita registrada. Estimativa unitária por sabor/peso, R16 prioritária com massa conhecida e P1-4 compatível; forminha/adicional configurados, sem caixa/iFood/opcionais presumidos. Ausência/ambiguidade nunca vira zero. Corridas líquidas somadas uma vez. Despesa de amostras só por administrador, com pagamento efetivo inicialmente vazio, conferência humana, CAS, idempotência e bloqueio de despesa ativa duplicada. Estorno no módulo existente; histórico/cópia da estimativa preservados. Categoria exibida como **Amostras e prospecção**.
- **R7-7 concluído:** os três modelos solicitados na folha WhatsApp da visita, prévia editável somente em memória e abertura humana. Tabela usa apenas opções ativas/preços cadastrados. Sem nome/telefone, orienta correção; sem campanha, Pix inventado, catálogo público ou registro automático de envio.
- **R7-9 concluído:** Mais/Relatórios → Prospecção, visitas efetivamente realizadas, unidades por sabor/peso, coorte de contatos únicos com taxa e corte explícitos, conversões no período separadas, tempo desde a primeira visita e custo médio de aquisição incluindo visitas históricas anteriores à conversão. Pagamento substitui a estimativa das mesmas amostras; corridas entram uma vez. Destaque por sabor une contatos distintos entre pesos. Custos incompletos e subtotais conhecidos ficam explícitos.
- **0026 aditiva preparada localmente:** `prospect_sample_expenses`, vínculo com despesa/visita e cópia da estimativa, tenant/FKs/índice. Backup e restauração incluem a tabela; limpeza operacional acompanha despesas, preservando visitas/registros no KEEP. Sem 0026, R7b continua e os recursos R7c ficam escondidos. Também testado até 0023/24, flag desligada e financeiro pausado.
- Guia **docs/FASE_R7C.md**, quatro capturas **r7c-*** exclusivamente DEMONSTRAÇÃO, tokens/CSP reais, nenhum estilo inline/recurso externo. Nova bateria `test:prospect-costs` integrada ao CI automático.

### Testes executados

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (**144 testes / 36 arquivos**), `npm run build:pages` e `git diff --check`: passaram.
- `test:prospect-costs`: R16/P1-4, custo ausente/zero, pagamento explícito, concorrência/CAS/repetição, estimativa alterada, estornos, permissões/tenant, ausência de gravação em prévias, coortes entre meses, tempo/CAC, sabores e fallbacks. Com **65 visitas**, relatório **18 SQL**, custos **22 SQL**, sessão **29 SQL**; teto reservado de 45 + autenticação até 50 do D1 Free.
- `test:security`: **261 verificações**, incluindo todas as rotas novas (401, tenant 404/coleção vazia, operadora 403 para pagamento e leitura autorizada; papel validado também em visita cancelada).
- `test:backup`, `test:cleanup`, `test:migrations` (**10 testes**), `test:visits`, `test:prospects`, `test:weight-costing`, `test:p1` e `test:field`: passaram, com restauração SQLite/FKs, nova ligação e KEEP.
- **39 execuções E2E distintas / 13 cenários × Chromium móvel, WebKit móvel e Chromium desktop**: R7a/b/c, cancelamento/registro de pagamento, modelos/preenchimento de WhatsApp, operadora, nomes/telefones ausentes, fallback 0023/24/25, financeiro, agenda, localização/foto, AppUpdate e skeleton. Uma falha inicial no seletor do teste do relatório (duas seções encontradas) foi corrigida restringindo a seção; repetição verde nos três navegadores. A prévia foi ampliada para sete linhas e a bateria R7c repetida verde. A coleta de CSP foi mantida entre navegações: revelou no WebKit dois avisos no seletor nativo de pagamento; a folha nova usa chips de pagamento, como o recebimento rápido, preservando a CSP. Fluxo repetido com coleta contínua sem violações.
- Nenhum CI manual. O PR dispara **Validação completa + Segurança**; resultado remoto deve ser conferido no SHA do PR antes de publicar. Execuções redundantes de push podem ser canceladas após as do PR começarem, para economizar minutos.

### Limitações

- Estimativa usa ficha atual, não custo histórico. Relatórios usam pagamentos/estornos conhecidos agora; não são extrato de caixa nem posição contábil na data final. Sem conversões, média indisponível. Associação por sabor não afirma causalidade.
- Massa desconhecida/ambígua, ficha ou insumo sem custo impedem estimativa completa. Até 1.000 visitas/conversões por período e 2.000 visitas históricas de aquisição, com erro explícito ao exceder. Mensagem de preços limitada a 30 opções.
- Despesa de amostras é valor efetivamente pago informado por humano; a estimativa nunca vira lançamento automático nem deve duplicar ingredientes já registrados.

### Pendências

- **Claude:** revisar o PR e conferir CI completo/Segurança no SHA final antes de publicar; nenhuma mesclagem ou avanço do main pelo Codex.
- **Responsável:** backup/restauração, conferência da 0025 e autorização/aplicação da 0026 somente após publicação aprovada, seguindo o guia. Nenhuma operação real executada nesta entrega.
- **R7d** (atalho no +, visita a cliente atual e ajuda) permanece para a próxima tarefa da fila; sem implementação antecipada.

## R7c — plano antes do código (16/11/2026)

FILA/mainf36ffad libera somente R7-6/7/9, versão0.15.0, branch codex/r7c-prospect-costs. R7b publicada;0025 ainda é uma decisão/operação do responsável. R7d permanece para depois. Li R7/AGENTS e a fila; sem edição de FILA, operação Cloudflare/D1, alteração de flags ou serviço pago.

- Cálculo em lote em worker/prospect-costs.ts: custo por unidade/peso via fichas ativas (R16 quando houver massa conhecida em tamanho cadastrado; P1-4 compatível), usando funções existentes, sem embalagem de caixa/iFood ou opcionais presumidos. Ausência/ambiguidade/custo desconhecido é null, nunca zero fictício. Estimativa usa fichas atuais e fica rotulada; catálogo carregado uma vez por consulta.
- Despesa de amostras somente por confirmação humana, com valor/data/forma de pagamento editáveis. Permissão existente de Despesas: administrador; operadora pode consultar e usar as corridas do módulo já autorizado.0026 aditiva, se necessária, somente vínculo operacional visita↔despesa/snapshot da estimativa; backend com tenant/CAS/idempotência, sem duplicar despesa ativa e com estorno pelo módulo existente. Backup/limpeza operacional incluem o vínculo; visitas/registros permanecem no KEEP. Readiness mantém R7a/b sem0026.
- WhatsApp: folha com os3 modelos solicitados, prévia editável e abertura humana. Tabela de preços só de kits/embalagens ativos e preços cadastrados; sem inventar lista, Pix ou catálogo público. Sem telefone/nome de exibição, orientar o cadastro; sem envio automático ou campanha.
- Relatório por período: visitas reais e amostras por sabor, estimativas e pagamentos separados; custo usa pagamento de amostras quando registrado, estimativa nos demais, mais corridas líquidas, sem duplicar ambos. Conversão do grupo visitado com denominador explícito e corte no fim do período; conversões ocorridas no período e média desde a primeira visita registradas separadamente. Custo de aquisição usa histórico anterior à conversão dos convertidos, não mistura denominadores de períodos. Sabores associados às conversões, sem afirmar causalidade. Dados incompletos mantêm custo completo indisponível e subtotal conhecido explícito.
- UI em visitas/relatórios/Mais e guia/capturas DEMONSTRAÇÃO, tokens/skeleton/gestos/CSP. Toda rota nova na matriz de segurança; testes de custos conhecidos/ausentes/R16, isolamento, CAS/duplicatas/estorno, coortes/tempo/sabores, backup/restauração/limpeza, fallback0023/24/25/flagoff e volume>60 sem N+1. E2E mobile, tipos/lint/formatação/build. Incorporar main antes do PR R7c consolidado; apenas CI/Segurança automáticos do PR, sem merge em main.

## R7b — entrega para revisão (16/11/2026)

Branch `codex/r7b-prospect-visits`, versão **0.14.0**. Main **c211d36** incorporado: a ativação dos Contatos/0.13.1 feita pelo fluxo responsável foi preservada. Conforme a FILA,0024 já foi aplicada pelo responsável; o Codex não executou essa operação. Somente R7-3/4/5; nenhuma edição autoral da FILA/VEZ.

### Produzido

- **R7-3 concluído:** agendamento por Contatos, Mais ou Visitas e amostras; data/hora, planejamento por sabor/unidades e observação. Edição/cancelamento com versão/motivo. Cartões no Hoje por papel e eventos/filtro na Agenda/ICS; Mapa (Google/Waze/Apple), WhatsApp abre conversa humana, Uber abre destino e99 copia endereço. Sem pedido ou corrida automáticos.
- **R7-4 concluído:** folha Registrar visita com unidades/fotos/+−, quem foi, quando aconteceu, observação e próximo passo (+3dias sugerido/editável). Registro imutável separado de vendas, com snapshot de sabor/peso informado, autoria e auditoria. Funil avança por registro humano; Não teve interesse e Virou cliente são preservados. Visitas existentes continuam editáveis/registráveis após conversão e todo histórico permanece no mesmo cliente.
- Ofertas de **lembrete** e **corrida de prospecção** abrem os módulos existentes. Cancelar/Pular não grava. Só Salvar lembrete cria o lembrete ligado ao contato; controle de aviso no celular mantém opt-in existente. Só Registrar despesa paga cria corrida/vínculo e, acima de zero, despesa Prospecção; zero registra somente deslocamento. Estorno respeita regra existente de autor/dia/administrador. Não há pedido fictício nem rateio por venda para uma visita.
- **R7-5 concluído:** demanda de amostras em seção separada da produção vendida, somada em unidades por sabor/data/peso informado, para hoje/amanhã ou dias selecionados. Canceladas/registradas e contatos arquivados não demandam produção. Sem peso aparece a definir; não se inventa peso ou custo. Produto desativado não entra em novos planos, mas amostra já planejada pode ser registrada historicamente.
- **0025 aditiva**, sem exemplos, com visitas/registros/vínculo de corrida, índices por organização/data/cliente e FKs compostas. Schema readiness protege bancos até0023/0024 e flag desligada. Agendamentos/registros em KEEP/backup; vínculo operacional de corrida acompanha limpeza dos deslocamentos de teste. Guia [FASE_R7B](../FASE_R7B.md), capturas `r7b-hoje.png`, `r7b-producao.png`, `r7b-registrar.png` (390×844, DEMONSTRAÇÃO). Tokens, Button/DisclosureSummary, AppUpdate, skeletons e gestos preservados; sem backdrop-filter novo.

### Testes executados

- **144 unitários (36 arquivos),241 verificações de segurança e9 testes SQL** aprovados. Todas as rotas novas na matriz (401 sem sessão,404 outro tenant/coleção isolada, operadora autorizada). Tipos/lint sem erros ou avisos, formatação/build Pages/diff aprovados; permanece aviso preexistente de chunk grande no build.
- Integração R7b: agendar/editar/cancelar, agenda/ICS, produção em unidades separadas, CAS concorrente/idempotência, quem foi/tenant, bloqueios de entrada, registro sem faturamento/saldo/lembrete/despesa, conversão e desinteresse preservados, histórico de sabor inativo, corrida explícita/estorno e compatibilidade até0023/0024/flagoff.
- **65 visitas no Hoje:30 preparações SQL no handler** (orçamento45, reserva de5 para autenticação/middleware até o teto50), usando o handler real/D1 efêmero. Sem N+1 de visitas/amostras. Kits continuam com67 modelos/41SQL (orçamento46).
- Backup/restauração SQLite incluindo3 tabelas novas e FKs, limpeza/KEEP, APIs de gestão/listagens, P1 completo (agenda/relatórios/despesas/receitas), campo/fotos privadas, financeiro/endereço, operações/mensagens, kits e R7a aprovados.
- **42 E2E de regressão aprovados nos três projetos**: R7b, R7a, campos/financeiro, operações, agenda, push, AppUpdate, skeletons e gestos. **9 E2E finais R7b/campo aprovados após incorporação do main**, incluindo sabor desativado depois do plano, cancelamento das ofertas sem gravação, salvamento separado do lembrete e corrida, conversão preservando registros e fallback0024. Chromium móvel/WebKit móvel/Chromium desktop, CSP real e dados fictícios.
- CI completo/Segurança são os automáticos do PR. Nenhum workflow manual disparado pelo Codex.

### Limitações

Sem aparelho físico. Consulta limitada a200 visitas; filtro de período disponível inclusive no histórico do contato. Registro concluído não é sobrescrito; ajuste de dados deve ser conferido antes de salvar. Quem foi usa equipe cadastrada/autor. Peso opcional e custo das amostras ainda sem estimativa; R7c fará custos/modelos/relatórios de conversão. A diferença entre unidades planejadas/deixadas não gera perda, baixa de estoque ou despesa implícita. Lembrete sem próxima data não é oferecido. Entrega de avisos depende da autorização do aparelho no módulo existente.

Nenhuma operação Cloudflare/D1 remoto, aplicação de migração, alteração autoral de flags, catálogo ou serviço pago. Uso mensal de Actions indisponível à integração; conferir limite da fila. Limpeza operacional de corridas de teste apaga seus vínculos, mas preserva os registros da visita/amostras; limpeza de clientes permanece bloqueada por KEEP.

### Pendências

Claude revisar/publicar com CI/Segurança verdes, sem merge pelo Codex. **0025 no banco real depende do responsável**: backup/restauração, pré-checagem, aplicação autorizada e nova pré-checagem. Contatos já ligados continuam funcionando sem0025; Visitas só aparece com schema pronto. Input backup_verified ainda diz “Somente dados de teste”; se houver dados reais, revisar o procedimento antes, sem declarar condição falsa. O guia explicita isso; nenhuma ativação foi tentada pelo Codex.

R7c e demais tarefas aguardam liberação da fila. Após a terceira entrega, vale a revisão geral prevista na FILA pelo Claude. Se CI falhar, corrigir no mesmo PR a partir do diagnóstico, respeitando as paradas.

## R7b — plano antes do código (16/11/2026)

FILA/main90a50ac libera R7-3/4/5, versão0.14.0, em codex/r7b-prospect-visits. R7a publicada,0024/flag ainda dependem do responsável. Li R7 e AGENTS; nenhuma operação remota no Cloudflare/D1, ativação ou edição da FILA.

- Migração0025 apenas aditiva: agendamentos, registro imutável de visita/amostras (snapshots por sabor/unidades; peso só quando informado) e vínculo de corrida. Schema readiness junto a PROSPECTS_ENABLED mantém R7a no banco até0024 e legado até0023. Cadastros/histórico entram no backup/KEEP/pré-checagem.
- worker/visits.ts/shared/visits: listar/agendar/editar/cancelar/registrar com tenant, operador autorizado, CAS/idempotência/auditoria e validação em lote dos sabores/equipe. Registro preserva histórico do contato e não cria pedido, recebimento, lembrete ou despesa sozinho.
- Hoje/agenda/ICS: cartões Visita de apresentação com Mapa/WhatsApp/Uber/99 e Registrar visita. Planejamento de amostras separado da produção vendida, em unidades avulsas por sabor/data/peso informado. Canceladas/registradas deixam de demandar produção.
- Telas/folhas de visitas e acesso por Contatos/agenda/Mais. Registro rápido com fotos/+−, quem foi, observação, data do próximo passo (+3dias sugerida/editável). Ofertas abrem lembrete pré-preenchido ou corrida Prospecção; só Salvar confirma cada criação, usando os módulos existentes. Sem WhatsApp automático, push ou gasto sem confirmação.
- Critérios: fluxo móvel agendar→Hoje/agenda/produção→registrar→retornar→converter preserva cadastro/registros; nenhum saldo/faturamento alterado; amostras não viram caixas vendidas. Segurança de todas rotas novas, concorrência/idempotência, backup/restauração/KEEP, fallback0023/0024 e flagoff; E2E/CSP, tokens, sem backdrop-filter. Tipos/lint/formatação/build, relatório/guia/capturas fictícias. Main incorporado antes do PR R7b; CI completo/Segurança só automáticos do PR.

## R7a — entrega para revisão (16/11/2026)

Branch `codex/r7a-prospect-funnel`, versão **0.13.0**. Main `1dc3689` incorporado: T3c/skeletons, AppUpdate e SheetGestures preservados. Retomado checkpoint0054e47. FILA e VEZ sem edição autoral; somente R7-1, R7-2 e R7-8 nesta entrega.

### Produzido

- **R7-1 concluído:** filtro Clientes/Contatos no mesmo cadastro; contato com nome, pessoa de contato, telefone opcional, origem/observações e localização/foto/Instagram reaproveitados. Arquivamento/reativação pelo mecanismo existente. Contatos não convertidos ficam fora das seleções de vendas; APIs também recusam novos pedidos/modelos para eles.
- **R7-2 concluído:** chips A visitar/Amostra entregue/Retornar/Não teve interesse; próximo passo sempre explícito (data ou a definir), motivo opcional e histórico com etapa, autor e data. Etapa Amostra entregue é acompanhamento humano; unidades/visitas/produção pertencem à R7b. Mesmos Button/DisclosureSummary/tokens, skeleton para filtro de contatos, sem novo armazenamento local de dados pessoais.
- **R7-8 concluído:** Virou cliente mantém o mesmo id, dados/local/foto/Instagram/histórico; abre condições B2B e oferece pedido padrão/primeiro pedido. Nomes são reaproveitados em perfil novo, sem sobrescrever perfil configurado. Pessoa continua pessoa e não recebe oferta de pedido padrão. Conversão não gera pedidos, pagamentos, lembretes, despesas ou mensagens.
- **Banco/operação:** 0024_prospects.sql aditiva, sem seed, com default customer para cadastros anteriores, detalhes/eventos e índices por organização. Flag PROSPECTS_ENABLED=false em ambas configurações; prontidão do schema esconde a função no banco até0023. Tenant/CAS/idempotência/auditoria nas ações. Tabelas novas em backup/KEEP/pré-checagem.
- Cadastro de contato reutiliza o processamento de rota já configurado para endereços, com cache/orçamento existentes. Sem chamada ao provedor em mudanças do funil/conversão. Guia docs/FASE_R7A.md e capturas DEMONSTRAÇÃO r7a-contato-retornar.png/r7a-convertido.png atualizados.

### Testes executados

- **144 unitários (36 arquivos)** e **223 verificações de segurança**, com toda rota nova na matriz (sem sessão401, outro tenant404; operadora autorizada).
- Integração R7a: concorrência/CAS, idempotência, entradas inválidas/tentativa de forjar conversão, bloqueio de vendas, conversão sem finanças/lembretes, pessoa e perfil existente preservados, histórico/local/bytes da foto, arquivamento/reativação, flag desligada e banco até0023.
- Backup/restauração SQLite com FKs e novos dados; limpeza/KEEP preservando contato/eventos; **8 testes SQL** de migração, default/versão dos clientes anteriores e isolamento.
- **28 verificações de API**; listagens com65 produtos/pedidos e seleção dos200 mais recentes dentre216. Suíte completa de kits e caixas mistas aprovada;67 modelos com41 preparações SQL (orçamento46). Rotas com provedor simulado: endereço de contato calcula/cacheia; etapas/conversão não fazem chamada extra.
- **21 E2E aprovados nos três projetos** (Chromium móvel/WebKit móvel/Chromium desktop): R7a, T3c, login/cadastros, AppUpdate com SW e gestos das folhas. **6 E2E R7a finais** após acabamentos, nos três projetos: fluxo contato→amostra (etapa)→retornar→converter, nomes/endereço/histórico/autoria preservados, seleção de vendas antes/depois e fallback0023.
- Tipos, lint, formatação, build Pages e diff sem erros; build mantém aviso preexistente de chunk grande. D1/SQLite efêmeros e dados fictícios; CSP real do harness. CI completo e Segurança serão os automáticos do PR, sem workflow manual.

### Limitações

Sem aparelho físico. Histórico da tela mostra os50 eventos recentes; banco/backup preservam todos. Arquivamento entregue, exclusão física não. Limpeza padrão preserva contatos/histórico; opção de apagar clientes passa a ser recusada por alcançar tabelas KEEP, mesmo vazias (testado/documentado). Nenhuma visita real, amostra de produção, lembrete, despesa ou WhatsApp automatizado implementados nesta etapa.

Nenhuma operação remota Cloudflare/D1, aplicação de migração, catálogo ou serviço pago. A função permanece desligada. Uso mensal de Actions não está disponível à integração; conferir limite da fila antes de novas entregas.

### Pendências

Claude revisar/publicar código após CI/Segurança verdes, sem merge pelo Codex. **Ativação no banco real precisa do Felipe:** backup/restauração conferidos, procedimento autorizado para0024, pré-checagem posterior e decisão de ligar a flag. O guia alerta que o input backup_verified do workflow atual diz “Somente dados de teste”; se houver dados reais, não marcar uma declaração falsa: responsável precisa revisar o procedimento antes de aplicar. Nenhuma ativação foi tentada.

R7-3/4/5 aguardam R7b; R7-6/7/9 aguardam R7c, sempre pela fila. Se CI falhar, seguir diagnóstico no mesmo PR, respeitando as paradas da FILA.

## R7a — retomada antes do código (16/11/2026)

FILA/main1dc3689 libera somente R7a, versão0.13.0; T3c publicada pelo PR10. Retomado checkpoint0054e47, comparado com main e incorporados skeletons e SheetGestures/AppUpdate. Conflitos de imports, CSS, versão e histórico resolvidos preservando as duas entregas; nenhuma alteração autoral da FILA.

Plano: revisar worker/prospects.ts/Management/ProspectPanel e migração0024; validar isolamento, CAS/idempotência, conversão sem movimentação e seleção de vendas sem contatos. Conferir preservação do cadastro/local/foto/histórico e oferta de pedido padrão/primeiro pedido no perfil. Reexecutar matriz de segurança, backup/restauração/KEEP, fallback até0023 e flag desligada, integrações de pedidos/modelos/listagens e E2E com CSP real e novos skeletons/gestos. Preservar AppUpdate e suas regressões. Tipos/lint/formatação/build e relatório final; incorporar main novamente e enviar PR R7a consolidado. Sem CI manual, merge em main ou Cloudflare/D1 remoto; PROSPECTS_ENABLED continua false. Banco real e ativação dependem do responsável no fluxo da fila.

## R7a — checkpoint preservado; prioridade mudou para T3c (16/11/2026)

A FILA no main cf4deaf passou a mandar guardar R7a e executar T3c antes. Trabalho preservado em commit local no branch `codex/r7a-prospect-funnel`, sem push/PR/ativação; versão futura ajustada para0.13.0 conforme a fila. Este checkpoint não é uma entrega publicada.

**Produzido:** migração0024 aditiva, flag false/prontidão, contatos/funil/conversão com CAS/idempotência/auditoria, reaproveitamento de local/foto/Instagram, nomes no B2B sem sobrescrever perfil, filtro e guardas de pedidos/modelos, backup/KEEP/pré-checagem e guia FASE_R7A. Sem visitas/amostras financeiras (R7b/c).

**Testes executados:**142 unitários;223 verificações de segurança; integração de contatos/CAS/concorrência/foto/tenant/sem movimentos financeiros e fallback até0023/flagfalse;28 verificações da API base, listagens65/216, kits completos (41 preparações SQL/67 modelos), backup/restauração, limpeza e8 testes SQL.4 E2E Chromium/WebKit de contato→retorno→cliente/fallback passaram; captura adicional Chromium aprovada. Tipos/lint/formatação/build aprovados antes da troca só de versão para0.13.0.

**Limitações:** nada remoto/publicado. Limpeza opcional de clientes agora recusa alcançar cadastros protegidos (documentado/testado). Guia observa que o campo backup_verified do workflow atual exige dados apenas de teste: condições não verdadeiras precisam do Felipe antes de aplicar, sem declaração falsa.

**Pendências:** retomar somente quando liberada novamente, incorporar T3c/main, concluir regressões finais e emitir PR R7a com CI/Segurança automáticos. Migração/ativação reais continuam decisões do Felipe; nenhum CI manual, flag ligada, dado real ou edição de FILA. A próxima entrega será apenas T3c.

## R7a — plano antes do código (16/11/2026)

Base/main4445078, VEZ CODEX/R7a, versão0.12.0. Li seção R7 completa do briefing e regras da FILA. Branch `codex/r7a-prospect-funnel`, somente R7-1/2/8; visitas/amostras/despesas/relatórios ficam nas etapas seguintes.

- Migração0024 apenas aditiva: customers.kind com default customer, detalhes de contato e eventos do funil ligados ao mesmo id/organização. Nenhum seed. PROSPECTS_ENABLED=false em ambas configurações e prontidão de schema; banco até0023/flag desligada mantém gestão e esconde módulo.
- shared/prospects e worker/prospects: criação/edição/etapas/conversão com tenant, operador autorizado, validação, CAS, idempotência e auditoria. Conversão preserva id, localização/foto/Instagram e histórico; não cria venda, saldo, lembrete, visita, despesa ou WhatsApp. Arquivamento pelo mecanismo existente, sem exclusão irreversível.
- Clientes/Contatos: filtro e status, pessoa de contato/origem/observações, próximo passo explícito (ou a definir), funil em chips. Reaproveitar captura/local/foto. Converter abre B2B e oferece pedido padrão/primeiro pedido por ação humana. Contatos não aparecem na seleção de vendas; APIs de novos pedidos/modelos também validam.
- Operação: databaseTables/backup, KEEP e pré-checagem incluem cadastros/histórico novos. Testes de backup/restauração/limpeza e fallback sem0024, matriz de segurança para toda rota nova, integrações CAS/concorrência/idempotência/conversão, E2E móvel de contato→retorno→cliente (visitas reais só R7b).
- Tipos/lint/unitários/formatação/build e checks adequados. Guia de ativação com backup e ordem código→migração pelo Felipe→conferência→decisão da flag; nenhuma ação no D1 real/Cloudflare. Incorporar main e abrir PR R7a com relatório Produzido/Testes executados/Limitações/Pendências. Nenhum CI manual, edição da FILA ou avanço de main.

## T3c — entrega para revisão (16/11/2026)

Branch `codex/t3c-loading-skeleton`, main `cf4deaf` incorporado/conferido antes do PR. Somente T3c; FILA/VEZ preservados. Versão **0.12.0** em package/lock. R7a guardada no commit local `0054e47` de `codex/r7a-prospect-funnel` (versão futura0.13.0), sem envio/PR nem operação no banco.

### Produzido

- Skeleton compartilhado (linha/círculo/retângulo), SkeletonCard/List/Stats e composição Hoje por papel: valores/produção antes das entregas para administrador; entregas primeiro para operadora. Quatro atalhos e botão grande representados nos cartões de entrega.
- Carga inicial em Hoje, Clientes, Produtos, Pedidos/lista/detalhe, Novo pedido/clientes/sabores, Kits, Insumos, Fichas, Lembretes (inclusive Hoje), Financeiro/contas e Relatórios. Listas de gestão reutilizam useRemote, preservando dados já recebidos durante Atualizar; isso inclui resultado vazio. Trocar o filtro pode carregar uma nova lista.
- Tokens theme.css, brilho1,4s e sem animação com movimento reduzido. Região aria-busy com texto acessível; formas decorativas escondidas da árvore acessível, sem botões falsos, estilos inline, backdrop-filter ou role=status novo. Erros continuam no alerta existente.
- Capturas t3c-antes-* (base main) e t3c-depois-* em docs/colaboracao/capturas,390×844, somente DEMONSTRAÇÃO. Em Pedidos a lista fica abaixo do formulário completo; captura depois rola até a região da lista para mostrá-la.

### Testes executados

- 144 testes unitários aprovados (36 arquivos), incluindo composições/semântica dos skeletons e ordem por papel.
- 18 E2E de regressão aprovados em Chromium/WebKit móveis: T3c, gestão privada, operações, agenda/lembretes, T3/T3b, R8 e AppUpdate com service worker real.
- Bateria final T3c nos três projetos: **6 E2E aprovados (Chromium móvel, WebKit móvel e Chromium desktop)**. Retém API com page.route, verifica loading/reduced-motion e conteúdo após liberar; atualizações mantêm conteúdo e listas vazias. Cobre também auxiliares, sabores, detalhe e erro503. Cada tela principal usa página isolada para não herdar interceptadores; SW bloqueado só nesses testes de interceptação, sem mudar autenticação/CSP de produção.
- 209 verificações locais de segurança aprovadas. Tipos, lint, format:check, build Pages e git diff --check aprovados. Build conserva o aviso já existente de chunk grande.
- CI completo/Segurança serão os automáticos do PR; nenhum workflow manual.

### Limitações

Não validado em aparelho físico. Alturas do skeleton aproximam a composição inicial; quantidade de dados e permissões podem alterar a altura final. Não foi adicionado polling novo: o conteúdo permanece durante as recargas já existentes. Servidor, autenticação, flags, migrações e catálogo inalterados; nenhum Cloudflare/D1 remoto. Uso mensal de Actions não está disponível à integração; Claude/responsável deve conferir o limite da fila.

### Pendências

Claude revisar o PR e publicar após checks verdes. Codex não avança main nem altera a VEZ. R7a só continua quando liberada na fila, incorporando esta entrega antes de retomar. Se CI falhar, seguir o diagnóstico da fila no mesmo PR.

## T3c — plano antes do código (16/11/2026)

FILA/main cf4deaf: VEZ CODEX/T3c, versão 0.12.0. R7a preservada apenas no branch local codex/r7a-prospect-funnel (versão futura 0.13.0), sem push/PR, migração ou ativação. A prioridade agora é somente T3c.

- Criar Skeleton/SkeletonCard/SkeletonList/SkeletonStats em src/components/Skeleton.tsx e estilos em theme.css: tokens, brilho 1,4s, reduced-motion, aria-busy e texto acessível, sem role=status extra nem estilos inline.
- Aplicar em Today, Management (clientes/produtos/pedidos), OrderDetail, Totem (clientes/sabores), Kits, Recipes (insumos/fichas), Reminders, Finance/Account e Reports. Erros preservados. Recarregar mantém conteúdo já recebido, inclusive listas vazias; mudança de filtro pode carregar uma nova lista.
- E2E com API retida em Hoje/Clientes/Pedidos, liberação exibindo dados DEMONSTRAÇÃO, atualização sem skeleton, movimento reduzido, erros e ausência de status vazio. Capturas antes/depois em390×844. Regressões de navegação, tipografia e atualização PWA.
- Tipos/lint/formatação/build e testes locais; versão0.12.0 em package/lock. Incorporar main antes do push consolidado/PR T3c. Só CI automático do PR; nenhum workflow manual, edição de FILA, serviço pago, dado real ou operação Cloudflare/D1 remoto.

## T3b — entrega para revisão (16/11/2026)

Branch `codex/t3b-heading-wrap`, base/main799fe7c e VEZ CODEX/T3b conferidos. Versão0.11.1 em package/lock. Somente T3b, sem editar FILA/VEZ ou iniciar R7.

### Produzido

Removida a regra genérica de headings que vencia a serifa original da saudação. Escolha o cliente usa wizard-question; saudação/perguntas/títulos de página/sucesso retomam DM Serif Display400. Cartões/seções continuam Figtree600 pelos defaults existentes.

Nome do cliente no Hoje com overflow-wrap normal, palavras inteiras, clamp visual em duas linhas e reticências, preservando selo de situação à direita. Texto completo permanece no DOM/árvore acessível e no atributo title. Evidências DEMONSTRAÇÃO inspecionadas em capturas/t3b-depois-hoje.png e t3b-depois-novo-pedido.png,390×844.

### Testes executados

- 6 E2E aprovados em Chromium/WebKit móveis: novo T3b, T3 visual e R8 originais. Família/peso computados para saudação, perguntas de todas as etapas e sucesso; cartão continua Figtree600.
- Range verifica que DEMONSTRAÇÃO ocupa uma única linha de texto (sem separar a palavra); geometria confirma duas linhas máximas, selo à direita, texto integral e ausência de overflow horizontal. Fluxo termina com pedido confirmado no D1 efêmero.
- Tipos, lint, formatação, build Pages e diff sem erros. CSP real e fixtures fictícias. Nenhuma asserção existente alterada; unitários/integrações do servidor não repetidos nesta correção de CSS/classes.
- CI completo/Segurança serão os automáticos do PR, sem workflow manual.

### Limitações

Sem aparelho físico. Nome excepcionalmente comprido pode aparecer abreviado visualmente, conservando conteúdo integral para acessibilidade/título. Nenhum comportamento de gravação, API, banco, flag ou dado real alterado; nenhuma operação Cloudflare/D1 remoto. Cota mensal do Actions não está disponível à integração; responsável/Claude deve conferir o limite da fila.

### Pendências

Claude revisar/publicar com checks verdes. Codex não avança main nem troca VEZ. Se CI ficar vermelho, seguir diagnóstico no mesmo PR; próximas tarefas aguardam liberação e continue.

## T3b — plano antes do código (16/11/2026)

Li FILA no main799fe7c: T3 publicada, VEZ CODEX/T3b, versão0.11.1. Branch `codex/t3b-heading-wrap`, somente a correção solicitada.

- theme.css/Totem: remover a regra genérica que vence a serifa da saudação; marcar Escolha o cliente como wizard-question. Preservar defaults Figtree600 dos cartões e grupo original de títulos serifados.
- theme.css/Today: nome com quebras entre palavras e limite visual de duas linhas/reticências, sem mover selo de situação; texto completo permanece no DOM e no título. overflow-wrap normal no nome, sem overflow horizontal.
- E2E: família computada da saudação e perguntas do Novo pedido; manter cartão em Figtree600. Geometria de palavras por Range e nome longo com duas linhas/selo à direita em390×844. Regredir R8/T3 nos dois navegadores, CSP real, fixtures DEMONSTRAÇÃO; evidências de Hoje/Novo pedido.
- package/lock0.11.1, tipos/lint/formatação/build. Main incorporado antes do push/PR T3b, sem CI manual, edição de FILA ou operação Cloudflare/D1 remoto. Sem R7 nesta entrega.

## T3 — entrega para revisão (16/11/2026)

Branch `codex/t3-visual-polish`; base/main d5255c2, VEZ CODEX/T3 conferida. Versão0.11.0 no package/lock conforme a nova regra da fila. Nenhuma alteração da FILA/VEZ ou início de outra tarefa.

### Produzido

| Item                | Status                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T3-1 tipografia     | Página/marca usam --az-serif; cartões, seções e nomes dos pedidos usam --az-sans600. Removidos sidebar-note e brand-art sem consumidores da Fase0; private-brand e subtítulo usam tokens.                                      |
| T3-2 telefone       | formatPhone usa visiblePhone, mascara móvel/fixo BR, preserva internacional e oculta marcador/valor inválido. Lista, detalhe e prévia de importação formatados só na exibição; inputs, API, persistência e links mantêm E.164. |
| T3-3 Hoje           | Data numa linha própria e saudação/chips em grade; controles40px/14px sem cortar seus textos. Mantida saudação em serifa. Primeiro cartão no limite original R8, com e sem nome de exibição.                                   |
| T3-4 fim das listas | Padding do conteúdo dimensionado por barra/FAB/safe-area; modo foco considera sua própria barra. E2E confirma último cliente e rodapé de Mais acima da navegação ao rolar até o fim.                                           |
| T3-5 Clientes       | Resumo/rota alinhados, sem espaço de ícone vazio; nome, telefone e situação com espaçamento consistente.                                                                                                                       |
| T3-6 espaçamento    | Tokens de espaçamento/raio e sombras de uma camada; cartões de pedidos/clientes e Mais padronizados. Retiradas margens duplicadas dos cartões de Mais. Nenhum backdrop-filter.                                                 |
| T3-7 evidências     | 10 PNG a390×844: capturas/t3-antes-* e t3-depois-* para Hoje, Pedidos, Novo pedido, Clientes e Mais. Inspecionados visualmente, somente DEMONSTRAÇÃO.                                                                          |

### Testes executados

-142 unitários (35 arquivos), incluindo móvel/fixo/internacional/marcador/vazio/inválidos no formatador; tipos, lint, formatação, build Pages e diff sem erros.
-18 E2E únicos aprovados em Chromium/WebKit móveis: T3, R8, R9, T1, importação CSV/XLSX e AppUpdate. CSP real, D1 efêmero e rede externa bloqueada.

- T3 confere fonte/peso dos títulos, nome do pedido, telefone formatado com input ainda em E.164, alinhamento de rota, chips40px, ausência de overflow horizontal e último cliente/rodapé acima da barra.
- O R8 detectou espaço excessivo com perfil preenchido na primeira rodada; margem corrigida e R8/T3 repetidos nos dois navegadores, aprovados. Nenhuma asserção existente foi alterada ou relaxada.
- CI completo e Segurança serão os automáticos do PR no SHA entregue; nenhum workflow manual. Sem nova rota/API/migração, teste de comportamento do servidor não foi repetido para esta alteração de exibição.

### Limitações

Sem aparelho físico ou homologação com dados reais. Safe-area validada por CSS/posições no emulador; Safari/iPhone físico depende de conferência posterior. Capturas são do viewport inicial: listas longas exigem rolagem, com área final livre comprovada no E2E. Consumo mensal de Actions não disponível à integração; responsável/Claude deve conferir o limite da fila.

### Pendências

Claude revisar/publicar com CI e Segurança verdes. Sem main, deploy, banco remoto, catálogo, serviço pago ou dado real pelo Codex. Outras tarefas aguardam liberação da fila e novo continue.

## T3 — plano antes do código (16/11/2026)

Base main d5255c2, VEZ CODEX/T3 conferida. Branch `codex/t3-visual-polish`, somente T3; versão alvo0.11.0 conforme fila.

- Registrar antes/depois Hoje/Pedidos/Novo pedido/Clientes/Mais a390×844 em capturas/t3-*.png com fixtures DEMONSTRAÇÃO, sem dados reais. Conferir visualmente as evidências.
- styles/theme: retirar estilos de marca da Fase0 sem consumidores; página em --az-serif e cartões/seções em --az-sans600, incluindo nomes dos pedidos; marca privada usa tokens.
- shared/phone e consumidores: formatador de exibição chama visiblePhone, preserva armazenamento/links/E.164 e números internacionais. Unitários para móvel/fixo/vazio/marcador; aplicar à lista, detalhe e prévia de importação.
- Hoje: chips40px/14–15px sem corte; proteger primeiro cartão no viewport pelo R8. Conteúdo com espaço para barra/FAB/safe-area; alinhar resumo e rota dos Clientes; revisar raios/sombras/espaçamento nas cinco telas por tokens.
- Versão package/lock0.11.0. Aceite: capturas antes/depois, tipografia computada, telefone e fim de lista acessível, E2E existentes sem afrouxar. Tipos/lint/unitários/formatação/build e regressões dirigidas. Incorporar main, push conjunto e PR T3; sem manual de CI, edição da FILA, migração ou Cloudflare/D1 remoto.

## T2b — entrega para revisão (16/11/2026)

Branch `codex/t2b-past-order-time`; base6893cc0, main atual f2b25fe incorporado antes do PR (novidade só na FILA). Li VEZ CODEX/T2b; T2 publicada e revisão geral sem bloqueio. Não editei FILA nem comecei outra tarefa.

### Produzido

Horários anteriores de hoje em Fortaleza têm fundo discreto, texto com contraste e continuam clicáveis. Selecionar/digitar horário passado mostra a pergunta aprovada e exige Sim, registrar mesmo assim para Continuar. Data/hora e aceite ficam no mesmo estado: qualquer nova seleção, modelo, recuperação ou troca de cliente zera o aceite, inclusive ao voltar a um valor anterior; nada desse aceite entra no sessionStorage. Edição de pedido não avisa. Datas futuras mantêm o fluxo.

O relógio atualiza a tela a cada30s e ao retornar ao app; eventos de continuar/confirmar reconferem o horário atual. Se vencer depois da etapa, a confirmação volta para Quando, sem enviar o pedido. Helper puro em shared/order-schedule, tokens do theme.css, sem inline/eval/backdrop-filter. Nenhuma API, migração, flag, versão do pacote ou regra de autorização alterada.

### Testes executados

-139 unitários (34 arquivos), incluindo três casos novos com igualdade do minuto, futuro/ontem, datas inválidas, UTC diferente do dia de Fortaleza e virada de dia/ano.
-6 E2E dirigidos em Chromium/WebKit móveis: passado/aceite, reset por dia/hora (inclusive ida e volta), horário manual, futuro, vencimento com tela aberta, edição sem aviso e pedido repetido.
-6 regressões adicionais Chromium móvel: pedido móvel, calendário/R12 e três fluxos de sessão/rascunho.12 E2E aprovados ao todo, CSP real e fixtures DEMONSTRAÇÃO em D1 efêmero.

- Teste existente de pedido repetido passou a usar page.clock às08h do dia local: preserva o propósito e não depende de o CI rodar antes de14h. Não removeu asserções.
- Tipos, lint, formatação, build Pages e diff sem erros. Relógio em eventos/temporizadores; nenhuma regra de lint/CSP desabilitada. CI completo/Segurança serão os automáticos do PR; nenhum manual.

### Limitações

Sem aparelho físico ou operação Cloudflare/D1 remoto. Comparação tem precisão de minuto: o minuto atual continua válido. Relógio do dispositivo orienta o aviso, que é uma conferência humana do fluxo móvel; não é nova restrição na API nem sinaliza que o pedido já foi entregue. Apenas prossegue com o cadastro normal. Consumo mensal de Actions segue indisponível à integração; Claude/responsável deve conferir o limite da fila.

### Pendências

Claude revisar/publicar com CI e Segurança do PR verdes. Sem merge/push no main ou troca de VEZ pelo Codex. T3 e demais tarefas aguardam liberação e novo continue.

## T2b — plano antes do código (16/11/2026)

Li FILA no main6893cc0: T2 publicada/revisada, VEZ CODEX/T2b. Branch `codex/t2b-past-order-time`, sem trabalho nas demais tarefas.

- shared/order-schedule e testes: função pura compara data/hora civil com America/Fortaleza; só hoje, minuto completo anterior, inválidos não disparam. Aceite: igualdade, futuro, ontem, fuso e virada de dia/ano.
- Totem: chips passados com aparência tonal apagada mas clicáveis; aviso e aceite explícito antes de Continuar. Troca de data/hora e seleção/restauração zeram aceite, sem sessionStorage. Edição excluída. Relógio acompanha a tela aberta; conferir novamente antes de prosseguir/enviar se o horário vencer mais tarde.
- theme.css: tokens existentes, sem reduzir contraste do texto nem backdrop-filter.
- E2E com page.clock: passado bloqueia até aceite, troca de dia/hora reseta inclusive retorno ao valor anterior, entrada manual, futuro e edição sem aviso. Regressões dos fluxos afetados, tipos/lint/unitários/formatação/build. Incorporar main e push/PR T2b consolidado; nenhum workflow manual, edição da FILA ou operação remota Cloudflare/D1.

## T2 — correção do status vazio do perfil, PR #6 (15/11/2026)

### Produzido

Segundo diagnóstico da FILA seguido no mesmo branch `codex/t2-customer-address`: main b1c4d7a incorporado (merge 7a19b75). CustomerAddress renderiza o aviso role=status apenas quando há texto; Failure já omite erro vazio. Teste R19 e demais E2E intactos, sem contornar seletores. Orçamento D1 resolvido na rodada anterior, sem novas alterações. FILA/VEZ não editadas, nenhum novo PR ou início de T2b.

### Testes executados

8 E2E aprovados em Chromium/WebKit móveis: financeiro/Profile, review-r19 e t2-address (endereço/versão, número ausente e foco). CSP real e dados DEMONSTRAÇÃO em D1 efêmero. Tipos, lint, formatação, build Pages e diff sem erros. Testes unitários/integrações não repetidos nesta alteração de renderização; seus resultados anteriores permanecem históricos, sem substituir o CI do novo SHA.

### Limitações

Sem aparelho físico, operação Cloudflare/D1 remoto, migração ou dados reais. CI completo e Segurança serão os automáticos do mesmo PR; nenhum workflow manual, merge/push no main ou nova tarefa.

### Pendências

Claude revisar o novo SHA do PR #6 com CI/Segurança verdes. O problema anterior de orçamento não se repetiu; a falha de role=status foi um ponto diferente. Se este mesmo ponto ficar vermelho novamente, seguir a parada obrigatória da FILA.

## T2 — segundo diagnóstico do CI: plano (15/11/2026)

Li FILA no main b1c4d7a: orçamento D1 resolvido; falha nova no R19 por status vazio duplicado em Profile. Main incorporado no mesmo branch/PR #6, sem conflitos e sem editar FILA. Plano: condicionar o aviso de CustomerAddress à existência de texto; Failure já retorna null para erro vazio. Manter o teste R19 intacto. Aceite: E2E de financeiro/Profile, R19 e t2-address nos dois navegadores móveis, tipos/lint/formatação/build. Depois relatório e push consolidado no mesmo branch, sem CI manual, novo PR, main ou Cloudflare/D1 remoto. Nenhum início da T2b.

## T2 — primeira correção do CI do PR #6 (15/11/2026)

### Produzido

Diagnóstico da FILA seguido no mesmo branch `codex/t2-customer-address`. Main 412cb67 incorporado (merge 19a73fb), preservando api.ts/api.test.ts, Management, Totem, CompactHeader, theme.css e new-order-back.spec.js. Apenas fieldReady do generate-week foi calculado uma vez e reutilizado no UPDATE de endereço e snapshotPlaces. Teste de recorrências mantém a asserção <=46, com comentário sobre o UPDATE em lote e reserva4 até50. FILA/VEZ não editadas; nenhum novo PR ou início da T2b.

### Testes executados

- test:kits completo aprovado; medição local de67 modelos:41 preparações SQL, dentro do orçamento46. Verificação ativa, sem pular teste, consulta por modelo ou remoção da escrita de endereço.
- test:finance (financeiro existente + endereço único) e test:operations (geração, idempotência e mensagens) aprovados.
  -136 unitários (34 arquivos), tipos, lint, formatação e build Pages aprovados.
  -6 E2E Chromium/WebKit móveis aprovados: endereço B2B→Clientes→Novo pedido/versão, número ausente/foco, retorno do Novo pedido e logo maior apenas no Hoje. CSP real, runtime/D1 efêmero e fixtures DEMONSTRAÇÃO.

### Limitações

Resultados acima são locais; o novo CI automático do mesmo PR ainda precisa terminar. Nenhum workflow manual, operação Cloudflare/D1 remoto, migração, dado real ou avanço do main. As quantidades SQL observadas variam com os caminhos de schema/cache; o teto testado continua46 e não50.

### Pendências

Claude revisar o novo SHA do PR #6 com CI/Segurança verdes. Se o mesmo ponto ficar vermelho pela segunda vez, seguir a parada obrigatória da fila. Sem trocar VEZ nem começar outra tarefa.

## T2 — correção do CI do PR #6: plano (15/11/2026)

Li o diagnóstico da primeira falha na FILA e incorporei main 412cb67 no mesmo branch `codex/t2-customer-address` (merge sem conflitos). Preservadas as mudanças de API, retorno do Novo pedido, cabeçalho/logo e tema; nenhuma edição da FILA.

Plano: calcular fieldReady uma vez no generate-week de operations.ts e reutilizar em endereço/snapshot; manter a asserção de kit-recurring.mjs com orçamento <=46 e documentar a escrita adicional de endereço (reserva4 até50). Aceite: teste de67 modelos passa sem consulta por modelo; kits, endereço/financeiro e operações aprovados. Conferir tipos/lint/unitários/formatação/build e E2E T2/retorno do pedido após o merge. Enviar juntos no mesmo PR, sem CI manual ou novo PR, sem main/Cloudflare/D1 remoto. T2b não iniciada.

## T2 — entrega para revisão (15/11/2026)

Branch `codex/t2-customer-address`, base/main e2b68cc. Li FILA: T1 publicada, VEZ CODEX/T2. Não editei FILA/VEZ e não iniciei T3/T4/T5.

### Produzido

| Item                | Status                                                                                                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T2-1 endereço único | Perfil B2B/pessoa usa PlaceFields com chave pelo cliente e a mesma API, CAS e permissões de Localização; formulário próprio Salvar endereço, independente de Salvar padrões. Legado aparece como Endereço anterior quando não há site; campos antigos preservados no schema/backup.                     |
| T2-1 servidor       | Helper SQL comum prioriza customer_sites com linha completa e referência uma vez; legado só sem site, sem N+1. Financeiro/PC e geração semanal seguem a regra; destino específico do modelo e snapshots anteriores preservados. Totem não ressuscita legado quando um site existe com endereço apagado. |
| T2-2 número ausente | Sugestão, GPS de PlaceFields e captura no Novo cliente avisam e focam Número após atualizar os campos. S/N permanece opção explícita, sem procurar número por proximidade.                                                                                                                              |
| T2-3 versão         | package/package-lock em 0.9.0; Vite define versão, data/hora Fortaleza e SHA curto, fallback desenvolvimento sem git. Rodapé discreto em Mais sem chamada ao servidor.                                                                                                                                  |

Sem migração, tabela nova, flag, rota nova, gasto ou dado real. Matriz de segurança mantida e executada. Tokens/estilos existentes e CSP preservados, sem inline/eval/backdrop-filter. AppUpdate e manifesto permanecem intactos.

### Testes executados

- 134 unitários (34 arquivos); tipos, lint, formatação e build Pages aprovados.
- 209 verificações de segurança; financeiro existente (8 verificações) e integração nova no mesmo comando test:finance: legado/site, bairro/referência, site vazio, CAS, tenant, destino específico, geração semanal e snapshots aprovados em D1 efêmero.
- Listagens: 65 produtos/pedidos com filhos e isolamento, mais 216 pedidos com limite 200; operações (14 verificações), geração/idempotência e mensagens passaram.
- 4 E2E T2 aprovados nos dois navegadores móveis: perfil→Clientes/Localização→Novo pedido, versão em Mais, sugestão/GPS sem housenumber incluindo captura do cadastro, foco e S/N, sem consultas adicionais por proximidade. CSP real, runtime/D1 efêmero e fixtures DEMONSTRAÇÃO.
- Ajustes locais da suíte antes do envio: seletores compatíveis com o fluxo atual (data explícita e endereço salvo exibido em checkbox), cooldown real do provedor respeitado e foco após renderização. Sem enfraquecer o limitador ou a CSP.
- Mais 4 E2E de regressão aprovados: foto/localização/perfil/despesa e AppUpdate em Chromium/WebKit móveis (8 E2E únicos ao todo com os da T2). CI completo/Segurança serão os automáticos do PR; nenhum workflow manual.

### Limitações

Não homologado em aparelho físico ou dados de produção. Campos legados permanecem para compatibilidade e exigem redistribuição manual quando necessário; não houve conversão em massa. Endereço e condições têm botões de gravação separados; pedidos anteriores e destinos próprios de modelos não são sobrescritos. Build identifica o HEAD do checkout que o produziu (no PR pode ser o merge de teste). Consumo mensal de Actions não está disponível pela integração atual; não afirmo saldo abaixo do limite da fila.

### Pendências

Claude revisar/publicar somente com CI e Segurança do PR verdes, conferir limite mensal e executar a revisão geral prevista depois da T2. Codex não avança main nem troca VEZ. Em vermelho, diagnóstico na fila e correção no mesmo PR. Demais tarefas dependem de liberação e novo continue.

## T2 — plano antes do código (15/11/2026)

Base/main e2b68cc; li FILA (VEZ CODEX/T2; T1 publicada), AGENTS e referências vigentes. Branch `codex/t2-customer-address`; somente T2.

- Profile/PlaceFields/FieldContext: endereço em campos usa customer_sites, mesma API/CAS/permissões do SiteEditor; sem site mostra legado B2B para redistribuir. Campos antigos continuam aceitos no servidor. Aceite E2E: salvar ali reflete em Localização e Novo pedido.
- finance/management/operations e helper de endereço: site primeiro, legado apenas sem site, referência formatada uma vez, sem bairro duplicado. Preservar snapshots de pedidos e endereço explícito do modelo. Aceite integração em D1 efêmero para site+legado, só legado e recorrência; sem migração e sem N+1.
- PlaceFields/locate: sugestão/localização sem número avisa e foca Número, sem consulta por proximidade. Aceite E2E com mapa simulado sem housenumber.
- package/package-lock/Vite/declarações/More: versão 0.9.0 e build em Fortaleza + SHA curto via define, fallback desenvolvimento, sem chamada de rede. Aceite E2E em Mais confere package.json.
- Tipos/lint/unitários/formatação/build, integrações e E2E dirigidos sob CSP real. Incorporar main antes de push único/PR T2; sem workflow manual, alteração da FILA ou operação Cloudflare/D1 remoto.

## T1 — entrega para revisão (15/11/2026)

Branch `codex/t1-interface-exits`, base/main `7d5cd0a`. Li a fila atual: T0 publicada (PR #4), VEZ CODEX/T1. Nenhuma edição de FILA/VEZ; T2 e posteriores não iniciadas. A correção de permissão do Gitleaks publicada pelo Claude está incorporada, sem alteração de workflows nesta entrega.

### Produzido

| Item | Status                                                                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1-1 | Busca e cadastro antes dos cartões de clientes no Novo pedido.                                                                                                                               |
| T1-2 | Cabeçalho preserva iniciais e avatar de fallback quando Voltar está visível.                                                                                                                 |
| T1-3 | `shared/initials.ts` compartilhado entre SiteAvatar, StaffAvatar e CompactHeader; ignora conectivos, normaliza acentos e usa maiúsculas.                                                     |
| T1-4 | Cancelar edição de mensagens inclusive com texto vazio; voltar para Clientes e descartar localização; seis resets distinguem Cancelar edição de Limpar campos. Cancelar/descartar não grava. |
| T1-5 | Fundo bloqueado por dialog aberto, overscroll contido; PlaceFields reinicia por rascunho/cliente e cancela temporizadores/respostas antigas ao desmontar.                                    |

Tokens existentes preservados, sem backdrop-filter, estilo inline, eval ou recursos externos. `AppUpdate`, teste correspondente, CSP, APIs, flags e migrações sem alterações.

### Testes executados

- 134 testes unitários (34 arquivos), incluindo 10 casos de iniciais; tipos, lint, formatação e build Pages aprovados.
- 6 casos E2E T1 aprovados em Chromium/WebKit móveis: ações acima da lista, iniciais/fallback, cancelamento de modelo/localização sem PUT nem alteração no D1, troca A→B→Novo cliente sem busca/sugestões anteriores, retorno ao cadastro e contenção da rolagem.
- Mais 4 E2E de regressão aprovados: AppUpdate e localização/foto/perfil/despesa, nos dois navegadores móveis. Tudo em runtime/D1 efêmero, fixtures DEMONSTRAÇÃO, CSP real e rede externa bloqueada.
- A primeira rodada revelou flags incompletas na fixture e indisponibilidade de mouse.wheel no WebKit móvel; fixture corrigida e rolagem verificada por PageDown no limite da folha em ambos, mais wheel no Chromium. Reexecução dos casos afetados aprovada; nenhum teste ignorado ou CSP relaxada.
- CI completo e Segurança serão os automáticos do PR no SHA entregue; nenhum workflow manual. Resultados locais não afirmam checks remotos verdes.

### Limitações

Sem aparelho físico ou gesto touch nativo; WebKit móvel do Playwright não suporta wheel. Os resets com alteração só de rótulo usam os handlers existentes; não foi criado teste que apenas espelhe cada rótulo. Nenhuma operação Cloudflare/D1 remoto, publicação, nova rota, catálogo, serviço pago ou dado real. Acesso ao consumo mensal do Actions segue indisponível para a integração; não afirmo saldo abaixo do limite da fila.

### Pendências

Claude revisar/publicar com CI/Segurança do PR verdes e conferir a cota conforme fila. O Codex não avança main nem troca VEZ; se o PR ficar vermelho, aguarda diagnóstico na fila e corrige no mesmo branch/PR. T2 somente após liberação e novo continue.

## T1 — plano antes da implementação (15/11/2026)

Base `origin/main` 7d5cd0a; T0 publicada e VEZ CODEX/T1 conferidas. Branch `codex/t1-interface-exits`. Somente T1; não editar FILA, flags ou banco remoto.

- Totem/CompactHeader/FieldContext/styles e shared/initials: recuperar os três ajustes preservados, conferindo o diff atual. Aceite: buscar/cadastrar antes da lista, iniciais visíveis com Voltar, conectivos ignorados com testes unitários.
- MessageTemplates/SiteEditor/Management/Recurring/Reminders/Recipes: saídas explícitas, rótulos conforme cadastro/edição, remount de PlaceFields por cliente/rascunho. Aceite: cancelar/descartar não grava; cliente seguinte e cadastro novo sem busca/sugestões anteriores.
- theme.css: bloquear rolagem do fundo com dialog aberto e conter overscroll da folha. Aceite: janela não rola com Novo cliente aberto, incluindo WebKit móvel.
- Testes: unitários, tipos/lint/formatação/build e E2E dirigidos com CSP real. Atualizar seletores antigos. Incorporar main ao final, enviar commits juntos e abrir PR T1; sem CI manual. Relatório final com Produzido / Testes executados / Limitações / Pendências.

# Codex → Claude

## T0 — R17 pronta para revisão pelo PR (novo fluxo,15/11/2026)

Main1d686e5 incorporado no branch `codex/r17-session-continuity`. FILA lida e preservada: somente o Claude a edita. A linha VEZ aponta T1, mas a tabela mantém T0 em andamento e a instrução direta do responsável determina T0 agora, T1 no próximo continue; sigo T0, sem alterar VEZ. Isso é resolução de escopo pela instrução direta, não discordância técnica.

### Produzido

- R17-2: recuperação explícita de seleção por IDs/quantidades em sessionStorage por usuário/organização, sem nomes, endereço, datas, valores, custos ou aceite de repetido. Relê cliente/catálogo; novo aceite exigido; sucesso/descarte/logout limpam; edição relê dados salvos do servidor.
- R17-3: Fase0/modules/RuntimeStatus removidos; AppUpdate original e app-update.spec.js preservados idênticos ao main no layout da gestão, com registro único do SW. Manifesto/ícones/raiz→gestão/login/catálogo desligado e feedback offline preservados.
- R17-5: validade da sessão do aparelho, filtragem de vínculo inválido, cron revalida autorização/equipe/sessão antes de enfileirar/enviar; dados privados do aparelho não são expostos.
- R17-7: ZAP bloqueante com exceções informativas justificadas, COOP/COEP/CORP e CORP no JSON, CSP estrita/validador jitless. No novo fluxo, ZAP roda também em pull_request, sem dispatch manual ou alvo remoto.
- Main atual integrado: CEP/Paraíba/estabelecimentos primeiro e AppUpdate preservados. FILA excluída do formatter para respeitar autoria, sem modificar seus bytes.
- Trabalho de T1 já preparado sob autorização anterior fica preservado no a4f63f7, no branch local `codex/t1-first-three-preserved` e no patch local ignorado `.local/t1-first-three.patch`. Somente os arquivos de interface/iniciais e seu teste foram retirados do diff de T0; reutilizar no próximo continue após ler a fila. Itens4/5 da T1 não iniciados.

### Testes executados

Validações históricas anteriores estão abaixo, vinculadas aos seus respectivos commits; não substituem os checks do PR atual. Nesta revisão passaram localmente124 unitários,209 verificações de segurança, tipos/lint/formatação/build e push/revogação/reativação.21 E2E em Chromium/WebKit passaram, com1 ignorado previsto de service worker no WebKit: AppUpdate/PWA/login/catálogo, rascunho/repetido/edição e avisos. Evidência final é o CI completo (três navegadores) e Segurança do pull request, executados automaticamente, sem CI manual nesta entrega. Nenhum teste com banco/cliente/custo real ou SSO real.

### Limitações

Sem homologação em iPhone/Android físicos ou Access real. Uma seleção por usuário/organização/aba, sem backup/fila offline; storage bloqueado impede recuperar, sem impedir fluxo normal. Aviso já despachado pode chegar após revogação. Scanner de shell não substitui auditoria autenticada completa. Não houve operação remota Cloudflare/D1, credencial, migração/limpeza, catálogo ou serviço pago, nem avanço de main pelo Codex. A consulta somente leitura ao uso mensal do Actions retornou403 (Resource not accessible by integration); não ampliei permissões nem solicitei nova credencial. O saldo mensal precisa ser conferido pelo responsável/Claude; não afirmo que esteja abaixo do limite da fila.

### Pendências

Revisão/publicação pelo Claude pelo PR T0, com os checks desse PR verdes; se houver vermelho, aguardar diagnóstico na fila e corrigir no mesmo branch/PR. R17-1/6 resolvidos e4 adiado. T1 fica para o próximo continue e R7 permanece fora da fila por exigir migração/aprovação. Não editar FILA nem executar tarefas futuras. Os relatórios de preparação anteriores são históricos; o escopo entregue agora é somente T0.

## R17 — complemento integrado ao mainfc75964 (15/11/2026)

Branch `codex/r17-session-continuity`, sem avanço do main pelo Codex. Incorporei mainfc75964 em63df2e3, li Histórico15/11(2) e resolvi o conflito de App mantendo o AppUpdate original no layout `/gestao`. A regra de publicação automática com CI completo/Segurança no mesmo SHA pertence ao Claude; migrações/limpezas reais, catálogo e serviços pagos continuam exigindo aprovação explícita. Não executei operações Cloudflare/D1.

| Pedido                     | Estado no código                                                                                                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Incorporação do main       | Paraíba/estabelecimentos primeiro, postcode/CEP e kit padrão em massa preservados. AppUpdate e app-update.spec.js idênticos ao mainfc75964. Tema/mascote/sem backdrop-filter e timeout do WebKit preservados.                     |
| Atualização do app / R17-3 | AppUpdate é o único componente que chama registerSW; RuntimeStatus foi removido. OfflineStatus conserva a mensagem de conexão sem registrar o worker. Manifesto/ícones/raiz/login/catálogo desligado/shell continuam disponíveis. |
| Step0 do Totem             | Buscar cliente e Cadastrar cliente antes de customer-tiles; E2E usa lista de16 clientes fictícios e confere posição/viewport e busca funcional.                                                                                   |
| Círculo do perfil          | Seletor de compactação não esconde profile-initials nem fallback initial-avatar. Iniciais visíveis com Voltar no step0 e após selecionar cliente, inclusive com imagem sintética inválida em D1 efêmero.                          |
| Iniciais compartilhadas    | shared/initials.ts usado por SiteAvatar, StaffAvatar e CompactHeader; ignora de/da/do/das/dos/e, normaliza NFC e usa maiúsculas.10 testes puros; apenas nomes DEMONSTRAÇÃO nas fixtures, sem reproduzir cadastros reais.          |

**Produzido:** integração do main e os três ajustes solicitados, sem alterar as regras de recuperação/repetido da R17. Atualizador original preservado; não há registro duplicado do SW. Guia R17 atualizado. R17-2/3/5/7 continuam implementados no branch;1/6 resolvidos,4 adiado e R7 posterior.

**Testes executados localmente:**134 unitários;209 verificações de segurança, incluindo POST field/reverse recebido do main como rota privada; tipos/lint/build/formatação.21 E2E aprovados na integração (Chromium/WebKit),1 ignorado previsto de SW no WebKit, cobrindo AppUpdate/PWA, login/catálogo, rascunho e push. Regressão dirigida adicional de endereços/CEP/fotos/CSP e os três ajustes; o novo cenário de lista/avatares passou nos três projetos. O primeiro mock de foto não foi interceptado no WebKit após o SW assumir a página: trocado por imagem inválida sintética no D1 efêmero, sem bloquear SW ou relaxar CSP. API de locais/fotos e push/revogação/reativação passaram.

**Validação remota final:** consultar checks do commit final deste complemento no branch. Rodar uma única Validação da gestão manual nos três projetos e Segurança nesse mesmo SHA; os resultados anteriores do4d6f3f3 não substituem essa conferência. Envio consolidado para poupar minutos de Actions, sem publicar main. Não alterar o SHA depois dos checks apenas para registrar resultados; a evidência remota estará nos checks e no relatório da entrega.

**Limitações:** sem homologação em iPhone/Android físicos ou Access real. Os testes usam banco local efêmero e dados identificados como DEMONSTRAÇÃO; nenhuma mensagem real ou operação no banco remoto. Rascunho continua limitado a IDs/quantidades, não é backup/fila offline e não restaura o aceite de repetido.

**Pendências:** revisão e publicação pelo Claude conforme a regra vigente após checks verdes do SHA final; aparelhos físicos; R17-4 adiado e R7 posterior. Nenhuma aprovação adicional é pedida pelo Codex para publicar: essa ação pertence ao Claude, não ao agente nesta tarefa.

## R17 — entrega no branch para revisão (15/11/2026)

Base main8f135a6 incorporada antes do código; branch `codex/r17-session-continuity`. Nenhum avanço do main. R16 foi revisada sem bloqueios e0023 aplicada pelo responsável, conforme Histórico15/11(1); relatos anteriores de ativação pendente são históricos.

| Item  | Estado no branch / evidência                                                                                                                                                                                                                                                                                                                                                            |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R17-1 | Resolvido pelo importador existente; não duplicado.                                                                                                                                                                                                                                                                                                                                     |
| R17-2 | Seleção de cliente/variantes/mistos/kits e edição guardada só como IDs/quantidades em sessionStorage por usuário/organização. Recuperação explícita relê cadastro, não restaura aceite de repetido; dia/entrega/pagamento revisados. Dados já salvos de edição vêm do servidor. Descarte/logout/sucesso limpam; inválido fica disponível para descarte/revisão. Sem escrita automática. |
| R17-3 | Fase0/modules removidos; sem link de demonstração no login. Manifesto/ícones, raiz→gestão, login, catálogo bloqueado, acessibilidade e SW/shell sem cache de API preservados.                                                                                                                                                                                                           |
| R17-4 | Adiado como combinado; não há renovação deslizante parcial.                                                                                                                                                                                                                                                                                                                             |
| R17-5 | Valid_until real por aparelho, filtragem de sessão inválida e explicação na UI/guia R6. Cron também valida autorização/equipe antes de enfileirar/enviar, corrigindo a lacuna identificada na revisão. Sem token/hash de sessão/endpoint na resposta.                                                                                                                                   |
| R17-6 | Resolvido/avaliado anteriormente; sem coluna parcialmente integrada.                                                                                                                                                                                                                                                                                                                    |
| R17-7 | Baseline local limpo do build estável e CSP real: exit0,0 FAIL,0 WARN não ignorados,60 PASS,2 informativos ignorados,36 URLs, comando -a -j. COOP/COEP/CORP complementados; exceções informativas justificadas em rules.tsv;90004 não ignorada. fail_action=true após esse resultado.                                                                                                   |
| R7    | Próxima fase; não implementada nesta entrega.                                                                                                                                                                                                                                                                                                                                           |

**Produzido:** commits funcionais de continuidade/PWA/validade (`cf9ec89`) e segurança/guia/relatório. [Guia R17](../FASE_R17.md), guia R6 e auditoria atualizados. Preservados theme.css/Mascot, sombra de uma camada/sem backdrop-filter, timeout WebKit60s, aviso de repetição, ApiError(0), campos/Photon/reverse/endereço e kit padrão em massa do main. Nenhum custo/cliente real em fixtures/capturas; somente DEMONSTRAÇÃO. B2B antigo não unificado.

**Testes executados localmente:**120 unitários;208 verificações de segurança; API base, push/falhas/validade/revogação/reativação, locais/fotos e marca. Tipos/lint/build/formatação.29 E2E dirigidos aprovados em Chromium/WebKit móveis,1 ignorado previsto de SW no WebKit: expiração D1 real→401→novo login→repetido exige novo aceite, storage mínimo, isolamento, misto+kit, edição sem perder observação salva, inválido/descarte/logout/envio, login/manifesto/raiz/offline/ícones/CSP/GPS/foto e regressões do main. Zero violações CSP no fluxo recuperado; modo jitless evita inclusive o probe eval do Zod. ZAP local descrito acima. Rascunho não muda regra de idempotência nem promete reenvio seguro após perder o corpo original.

**Validação remota final:** consultar os checks do SHA final deste relatório no branch. Será usada uma única execução manual de Validação da gestão (três projetos), além de Segurança manual com ZAP bloqueante; resultados de SHAs anteriores não substituem o final. Envio consolidado dos commits para evitar execuções intermediárias descartadas. Nenhuma solicitação de publicação antes dos checks verdes; o Codex não publica o main.

**Limitações:** aparelho físico e SSO real/homologação privada não executados; HTTP/cookies adaptados somente no harness existente. Uma seleção por usuário/organização/aba, sem nomes/endereço/texto/datas/preços/custos/credenciais; não é backup, sincronização entre aparelhos ou fila offline. Storage bloqueado impede recuperação, sem impedir fluxo normal. Scanner local cobre shell/recursos e não substitui auditoria autenticada completa. Aviso já despachado pode chegar após logout/revogação. Nenhum deploy, flag, migração, dado real ou operação remota Cloudflare/D1.

**Pendências:** revisão/publicação pelo Claude com aprovação do responsável; validação em iPhone/Android físicos; R17-4 permanece adiada e R7 posterior. Itens2/3/5/7 implementados no branch, sem tratá-los como já ativados.

## R16 — entrega para revisão (14/11/2026)

Base mainba64664 incorporada antes do código; li Histórico14/11(7). Nenhum conflito com trabalho local anterior: a R15 publicada contém aquele branch; Pix, timeout, importador atual e remoção do workflow de limpeza preservados. Plano prévio consta no histórico abaixo. Branch `codex/r16-weight-calculator`; não ativado remotamente.

| Item            | Status / aceite                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R16-1           | Grupos massa/receita, acabamento por doce/tamanho e custos por receita separados; insumos do cadastro, sem seed real ou fictício no banco usado.                                                                   |
| R16-2 / 7       | Massa total ou rendimento/peso de referência, medido por tamanho opcional; divisão para baixo, estimativa identificada;16 padrão editável, sugestões17/15 editáveis. Massa vem do kit.                             |
| R16-3           | Superfície^(2/3) oferecida no formulário, só persiste ao aceitar e salvar. Tamanho ausente continua indisponível.                                                                                                  |
| R16-4 / 5       | Custo por doce/kit, tabela/margem/sugestão; centavos para cima; ausente/inativo não vira zero. Simular não altera pedidos/preços/despesas/estoque/auditoria.                                                       |
| R16-6           | Testes puros, API, matriz de segurança e E2E, incluindo flavor sem variante artificial e fallback até0022. Checks remotos serão conferidos no SHA final.                                                           |
| R16-8 / 9       | Forminha por tamanho configurável; opcionais unitários fora das fichas, um por doce selecionado apenas na simulação. Referências impedem trocar unidade silenciosamente e duplicar opcionais/forminhas nas fichas. |
| R16-10          | Adicional padrão20% sobre todos os custos calculados, inclusive embalagem, antes da margem; configurável owner.                                                                                                    |
| R16-11 / 12     | Canal embalagem/etiqueta/sacola, divisor configurável0,74;1kit/1sacola por pedido explícitos, tabela e sugerido detalhados. Aceite DEMONSTRAÇÃO R$20,40/R$70,28 conferido.                                         |
| R17-1           | Já entregue pelo importador existente, preservado. Não criei outro.                                                                                                                                                |
| R17 demais / R7 | Próximas fases, não declaradas implementadas nesta entrega.                                                                                                                                                        |

**Produzido:** migração0023 e quatro tabelas em KEEP/backup/pré-checagem, APIs privadas com tenant/papéis/CAS/idempotência/auditoria, calculadora e formulários acessíveis, ajuda, guia [FASE_R16](../FASE_R16.md) e captura r16-depois-calculo-peso exclusivamente DEMONSTRAÇÃO. Usada DisclosureSummary para evitar o marcador de triângulo do Safari. As fichas anteriores por variante e o importador continuam funcionando; fichas por peso são adicionais, sem converter custos de pedidos/compras antigos.

**Testes executados localmente:** tipos/lint/build,102 unitários,7 SQL, API base/P1/fichas/relatórios/mistos,200 verificações de segurança, backup/restauração e limpeza em D1 efêmero. E2E R16 cobrem consulta sem escrita, edição/configuração owner, aceitação do acabamento, criação por sabor sem variante e fallback do banco. O fluxo funcional usa a CSP real; só contexto separado de captura usa bypassCSP comentado. Conferência manual completa no GitHub deve usar os três perfis antes de avançar main.

**Limitações / pendências:** nenhuma migração, deploy, flag ou limpeza remota. Necessária0023 pelo responsável após publicação e backup; sem0023 mantém interface anterior. Custos e receitas reais/aparelho físico dependem de homologação privada. Não há distribuição da sacola entre vários kits por pedido nem lançamento automático de opcionais em vendas. A proteção KEEP passa a recusar limpeza opcional de produtos por alcançar tabelas de fichas, mesmo vazias; teste ajustado e limpeza padrão preservada. Próximo plano detalhado será registrado antes de R17/R7.

## Status dos itens

“Entregue” abaixo significa código implementado, testado e enviado ao main; não significa ativação remota. **Estado vigente:** gestão e montagem mista ativadas com o Claude na conta da brigaderia em 04–07/11. As descrições de flags desligadas nas rodadas antigas são históricas. Preservar as flags atuais e o catálogo público desligado; não executar migrações nem mudanças remotas.

| Item         | Status                              | Observação                                                                                                                                                                          |
| ------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-1          | entregue                            | Falha reproduzida no WebKit: cookie Secure em HTTP. Ponte somente no harness verifica flags originais; produção permanece __Host-/Secure/HttpOnly. Login/gestão passaram no WebKit. |
| T-2          | entregue                            | Filhos em lotes: até três consultas para 200 pais, 91 bindings por lote; testes com 65 produtos e 65 pedidos e isolamento.                                                          |
| T-3          | entregue                            | Migração 0003 e regressão preservam pedidos, itens, versões, snapshots e FKs. Aplicada somente localmente.                                                                          |
| T-4          | entregue                            | Hoje separa previsto/entregue de recebido líquido e saldo real, por endpoints privados. Financeiro depende de flag/schema 0005.                                                     |
| T-5          | entregue                            | Lucide, logo autorizado, ícones PWA/touch/favicon e tokens com contraste AA testado. Fontes locais como aproximação.                                                                |
| P0-1         | entregue no código                  | Hoje operacional + recebido/saldo/aging e Recebi R$. Lembretes pertencem a P1-2; dispositivos reais/ativação pendentes.                                                             |
| P0-2         | entregue                            | R1: geração parcial/idempotente, defaults de entregador e confirmação explícita dos revisados em lote ou um a um.                                                                   |
| P0-3         | entregue                            | R1: reabertura com motivo antes da produção e undo de 30 s. Histórico financeiro protege cancelamento/edição.                                                                       |
| P0-4         | entregue no código                  | Condições, snapshots, sinal/parciais, estorno integral compensatório, extrato, saldo, fechamento configurável e cobrança/Pix assistidos. Ver limites em FASE_2B.md.                 |
| P0-5         | em homologação                      | Campos/padrões B2B e preenchimento com modelo válido implementados. Caminho curto E2E passou; meta universal de três toques e aparelho físico não declarados validados.             |
| P0-6         | entregue                            | Endereço de entrega como snapshot; proprietário/esposa/motoboy e nome/taxa. Legado fica A definir; nenhuma despesa automática.                                                      |
| P0-7         | entregue no código                  | Modelos operacionais e cobrança de conta/fechamento com prévia editável e abertura humana. Modelo financeiro persistente personalizável fica pendente.                              |
| P1-1         | entregue local                      | Implementado/testado na rodada R2/P1; ver tabela de status e relatório por etapa abaixo.                                                                                            |
| P1-2         | entregue local                      | Implementado/testado na rodada R2/P1; ver tabela de status e relatório por etapa abaixo.                                                                                            |
| P1-3         | entregue local                      | Implementado/testado na rodada R2/P1; ver tabela de status e relatório por etapa abaixo.                                                                                            |
| P1-4         | entregue local                      | Implementado/testado na rodada R2/P1; ver tabela de status e relatório por etapa abaixo.                                                                                            |
| P1-5         | entregue local                      | Implementado/testado na rodada R2/P1; ver tabela de status e relatório por etapa abaixo.                                                                                            |
| P1-6         | entregue no código                  | Estoque manual, mínimo, movimentos e compensação sem negativo; migração 0012.                                                                                                       |
| P1-7         | entregue local                      | Implementado/testado na rodada R2/P1; ver tabela de status e relatório por etapa abaixo.                                                                                            |
| P1-8         | entregue no código                  | CSV/XLSX de clientes, prévia/seleção/deduplicação no servidor; migração 0013.                                                                                                       |
| P1-9         | entregue no código                  | SQL privado do administrador, fotos/eventos e restauração local ensaiada; sem sessões/caches.                                                                                       |
| P2-1         | preparado, módulo adiado            | Tipo de pedido e eventos de sinal preparados; evento/festa segue bloqueado, sem UI ou ativação.                                                                                     |
| P2-2         | adiado                              | Catálogo público continua OFF na API e UI.                                                                                                                                          |
| P2-3         | adiado                              | Push não implementado.                                                                                                                                                              |
| P2-4         | adiado                              | Fila offline não implementada; escritas privadas continuam exigindo conexão.                                                                                                        |
| Ajuda §9/§10 | base e roteiro financeiro entregues | HelpTip/tour, roteiros do administrador/operador e treino financeiro em memória sem escrita. Fichas técnicas/estoque aguardam módulos futuros.                                      |

## Revisão R1 e status da 2B

| Item          | Status                                                          | Resposta para revisão                                                                                                                                                                                                                                           |
| ------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-1          | entregue (`6da06d4`)                                            | Ignora somente modelo com cliente/variante/produto inativo, itens ausentes ou total inválido; motivos e link de revisão na UI. Idempotência mantida, sem bloquear válidos.                                                                                      |
| R1-2          | entregue (`a02b34a`, 2B)                                        | Migração 0004 no modelo, perfil B2B do cliente na 0005; cópia para pedido novo/gerado, sempre revisável. Sem atribuição inventada no legado e sem despesa. Modelo selecionado prevalece sobre defaults do cliente.                                              |
| R1-3          | entregue (`ddee302`)                                            | Escolhida alternativa conservadora: confirmed → awaiting_confirmation, com motivo, CAS e trilha; editar normalmente e confirmar novamente. Produção/encerrados não reabrem por esse caminho. Com pagamentos, não reduzir abaixo do recebido nem trocar cliente. |
| R1-4          | entregue (`0479b58`)                                            | Checkboxes e contagem, confirmação humana única. UI envia grupos de três e servidor usa exatamente a ação individual, com versão/endereço/estado e chave por pedido; resultado individual. Retentativa não duplica confirmação.                                 |
| R1-5          | entregue (`ddee302`)                                            | `UNDO_SECONDS=30` compartilhado UI/servidor. Integração permite aos 20 s e rejeita aos 31 s; autor/versão continuam exigidos.                                                                                                                                   |
| R1-6          | entregue (`2771c8e`)                                            | Operations virou reexports; Today, OrderDetail, Recurring, MessageTemplates e utilitários separados. Financeiro em diretório próprio.                                                                                                                           |
| R1-7          | documentado                                                     | Epoch mantido em order_status_events para janela de undo; convertido explicitamente para exibição/data efetiva da entrega. Financeiro usa ISO. Sem alteração destrutiva da trilha antiga.                                                                       |
| Ativação      | guia/scripts entregues (`d142faa`)                              | PowerShell com comandos exatos, resultados e conduta em erro. Preflight só SELECT/contagens; restauração usa estado local novo. Testado localmente, sem chamada remota.                                                                                         |
| 2B — P0-4     | entregue no código (`b24e42a`, `575e980`, `6f66ba3`, `13f89e0`) | Eventos de recebimento/alocação/estorno, sinal, contas/extrato/saldo/aging, condição por cliente/pedido, calendários e fechamento, Pix privado e WhatsApp assistido. Concorrência e isolamento testados.                                                        |
| 2B — P0-5     | implementado; meta física pendente                              | Cadastro B2B e defaults no servidor. Um modelo válido preenche automaticamente ao escolher cliente; múltiplos exigem escolha, inválidos são sinalizados. Salvar continua criando rascunho revisável.                                                            |
| 2B — tutorial | entregue no código                                              | Roteiros financeiros dos dois papéis e Exemplo sem POST/PUT/DELETE. Tutorial completo de receitas/estoque depende de módulos futuros.                                                                                                                           |

Relatórios: `docs/FASE_2A.md` (R1 + ativação) e `docs/FASE_2B.md` (Produzido, Testes executados, Limitações, Pendências). “Entregue” não significa migração/publicação ativa. Sem integração bancária, estorno parcial, imagem QR, despesas, crédito automático, catálogo, push ou gravação offline.

## R2 e P1 — código concluído, envio autorizado para main

| Item           | Status                   | Decisão / limite                                                                                                                                                                                                                                |
| -------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2-1           | entregue local           | Bottom sheet Hoje com saldo/versões atuais, chips/data. Entrega+recebimento atômicos e undo conjunto de 30 s; autor/dia/versões e compensações dos dois eventos.                                                                                |
| R2-2           | entregue local           | Crédito sem pedido; alocação humana, sem nova entrada de caixa. Estorno só disponível. Administrador pode liberar alocação com motivo/trilha; operador não libera dinheiro já alocado.                                                          |
| R2-3           | entregue local           | Anulação só administrador/motivo/evento. Membros históricos e extrato preservados, vínculo ativo liberado. Bloqueio conservador para qualquer recebido líquido nos membros; estornar/liberar antes.                                             |
| R2-4           | entregue local           | Restrição aceita: operador apenas autor + dia civil do registro em Fortaleza; demais administrador. API e UI aplicam, inclusive crédito/undo.                                                                                                   |
| R2-5           | entregue local           | Hoje com recebido, vencido e vence hoje→domingo, links para filtros privados.                                                                                                                                                                   |
| R2-6           | entregue local           | Colunas virtuais/indexadas payment_mode/closing_cycle em perfis/condições na 0006. JSON e dados anteriores preservados; agenda consulta condição indexada.                                                                                      |
| R2-7           | entregue no código       | ATIVACAO.md como índice; 0003/0004/0005 detalhadas e revisões até 0013. Flags operação → financeiro → P1 → móvel → campo → ferramentas P1; catálogo OFF.                                                                                        |
| P1-1           | entregue local           | Agenda semana/mês, prazos/produção planejada/fechamentos/vencimentos e ICS privado com escaping/folding UTF-8/UID estável. Sem notificação automática.                                                                                          |
| P1-2           | entregue local           | Lembretes manuais, cliente opcional, concluir/reabrir/arquivar, Hoje/agenda; idempotência/CAS/auditoria.                                                                                                                                        |
| P1-3           | entregue local           | Vendas por data efetiva/cliente/produto/condição, rankings, comparação anterior, série semanal, clientes sem novas entregas e aging atual. CSV privado com proteção de fórmula/aspas/newline. Aging não é histórico reconstruído; PDF pendente. |
| P1-7           | entregue local           | Despesas manuais/estorno integral por administrador e fluxo registrado/CSV. Não é banco ou lucro; motoboy não gera gasto sozinho.                                                                                                               |
| P1-4           | entregue local           | Insumos, ficha/rendimento, custos adicionais explícitos e sugestão por margem. Preço desconhecido não vira zero. BigInt/centavos e simulador local de margem, sem alterar preço de produtos.                                                    |
| P1-5           | entregue local           | Lista bruta dos confirmados/em produção com lotes/embalagens para cima, snapshots de unidades e avisos de ficha/custo ausente. Sem comprar, criar despesa ou baixar estoque.                                                                    |
| P1-6/P1-8/P1-9 | entregues no complemento | Estoque, importação CSV/XLSX de clientes e backup SQL administrativo. Ver P1_COMPLEMENTO.md; migrações 0012/0013 e flag P1_TOOLS_ENABLED false.                                                                                                 |

Relatórios por etapa em docs/REVISAO_R2.md e docs/P1_ETAPAS.md. Todos os itens acima significam código/testes locais, não ativação, dados reais ou homologação física. Nenhum push, CI remota, migração/flag Cloudflare ou envio WhatsApp nesta rodada, conforme “nada remoto”.

## Dúvidas e decisões

- Caixa mista é sugestão, não decisão comercial: manter produtos/variantes atuais, sem remodelar dados cadastrados. Confirmar mistura/avulso/revenda na entrega.
- T-1: transporte HTTP adaptado somente no harness, com verificação das flags reais em testes separados. Homologação HTTPS e instalação em iPhone físico continuam necessárias; WebKit Linux não equivale a Safari no aparelho.
- Relatórios de recebido/saldo exigem P0-4. A tela Hoje inicial não apresentará números financeiros inexistentes. Suporte a sinal será parte do modelo de pagamentos da 2B; não criar coluna fingindo recebimentos.
- A regra SPEC sobre confirmação de alterações irreversíveis prevalece: cancelamento exige motivo/confirmação. Desfazer entrega deve ser compensação auditável, sem apagar evento; entregue com janela de dez segundos, validação de autor/versão e evento compensatório.
- Telefone comercial e dias/rotas não serão inferidos. WhatsApp de cliente usa exclusivamente contato autorizado do cadastro privado. Caixa padrão usa variante existente e seu preço; não inserir os quatro sabores automaticamente.
- Existem registros no D1 remoto: sem reset/seed, migrações novas e ensaio de preservação. Sem credenciais administrativas nesta máquina, a aplicação remota da migração continuará exigindo procedimento do responsável.

- Reconfirmar com os proprietários os quatro sabores/preços informados pelo Felipe. Validar se desejam entregador padrão por modelo recorrente; atualmente a escolha é explícita, sem inferência.
- Dúvida de quinzena respondida na R1: ambas implementadas e testadas, configuráveis por cliente. Prazo é obrigatório a prazo, chave Pix começa vazia, política de crédito fica fora (somente alerta). Proprietários ainda precisam conferir suas próprias configurações.
- Nenhum conflito bloqueante com AGENTS. Sugestão de caixa mista permanece pendente; cancelamento exige confirmação/motivo, e desfazer entrega usa compensação auditável. Arquivos de autoria Claude foram preservados.

## R3 e R4 — acompanhamento

| Item        | Status                                   | Evidência / próximo passo                                                                                                             |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| R4-0        | entregue e enviado                       | bf316a5; redação neutra, Limão e teste de regressão.                                                                                  |
| R3-1 a R3-4 | entregue no código                       | Grade, embalagens reais do cadastro, padrão/repetir e fotos privadas com ligação editável.                                            |
| R3-5        | entregue no código                       | MoneyInput/QuantityInput reutilizados, máscara de centavos, foco/restore/OK.                                                          |
| R3-6 a R3-9 | entregue no código                       | Passos, revisão e confirmação atômica, preferência local, tutorial.                                                                   |
| R4-1        | entregue no código                       | GPS por toque, busca Photon privada com cache/limite global, sugestão revisável e snapshot do destino.                                |
| R4-2        | entregue no código                       | Câmera/galeria, WebP até 256 px/40 KB no D1 existente, privado e sem SW.                                                              |
| R4-3        | entregue no código                       | Perfil Instagram normalizado e abertura humana.                                                                                       |
| R4-4        | entregue no código                       | Base privada por administrador, distância em linha reta e ordenação opcional no Hoje.                                                 |
| R4-5        | código testado; aparelho físico pendente | URLs Uber/Maps/Waze e volta à base, copiar destino + abrir 99. Sem contratação automática.                                            |
| R4-6        | entregue no código                       | Corrida manual/sheet, vários pedidos, despesa única P1, CAS/idempotência, estorno autor/dia, rateio estimado e relatório/CSV.         |
| R4-7        | entregue no código                       | Nome pelo perfil no D1; papéis legados mantidos, vários perfis no mesmo papel aparecem juntos. Deslocamento permite escolher usuário. |

R2-1 a R2-7 e P1-1 a P1-5/P1-7 já publicados com a entrega afbdb39, CI aprovada (41316631301). Relatórios P1-3 estão estáveis nessa base. Sem ativação remota. R3 requer 0010 e flag MOBILE_ENABLED; ver FASE_R3.md.

## R5 — escopo desta sessão

Plano: R5-1 (CompactHeader, Management, Tour e CSS; linha móvel ≤56 px e menu acessível) → R5-12 (Button único e estilos/estados compartilhados) → R5-3 (Totem e ordenação privada de sabores; foco/5 cartões em 390×844) → R5-2 (Today; entregas antes de lembretes e data compacta) → R5-4 (Customers; lista e folha de cadastro). Um commit/push por item. Sem deploy, migração ou alteração no Cloudflare. R5-5…11 ficam para outra sessão.

| Item  | Status                               | Evidência                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R5-1  | entregue                             | Cabeçalho móvel de 56 px, logo/título/menu, perfil quando cadastrado; Ajuda, passeio e Sair no menu. PC preservado. Build/tipagem/lint e seis E2E de cabeçalho/operação passaram nos três projetos; gestão/logout também passaram nos três projetos.                                                                                                                                                                                |
| R5-12 | entregue                             | Button compartilhado, primário/tonal/fantasma/perigo/chip/cartão, loading/foco/reduced-motion. 52 unitários, contraste AA, build/tipagem/lint e 53 E2E aprovados; um offline WebKit ignorado. Seis capturas r5-depois- incluídas.                                                                                                                                                                                                   |
| R5-3  | entregue com limite de sincronização | Foco sem barra inferior, Voltar no cabeçalho, cartão de embalagem única sem texto duplicado, fotos 120 px, contador/decremento, estado vazio sem 0,00. Prioridade cliente → geral → preferência manual local, depois cadastro (Tradicional no desempate). Ordem manual em Produtos salva apenas IDs neste navegador; sincronização entre aparelhos exige armazenamento compartilhado e fica pendente sob a restrição de não migrar. |
| R5-2  | entregue                             | Operadora vê entregas antes dos lembretes; data no cabeçalho e proximidade junto ao título. Primeira entrega até 140 px em 390×844.                                                                                                                                                                                                                                                                                                 |
| R5-4  | entregue                             | Lista/busca em cartões; cadastro e edição em folha, GPS/câmera/galeria no início, rascunho descartável e foto comprimida enviada somente após salvar.                                                                                                                                                                                                                                                                               |

Limitação: validação em navegador simulado, aparelho físico pendente.

## Histórico

- **2026-11-14 — Fechamento R15-B8:** sabor pode ser cadastrado sem embalagem/preço artificiais, mantendo as permissões de produtos da SPEC e o cadastro de kits só por owner. Sessão informa schema de pedidos/modelos de kits; a interface mantém o fluxo legado antes das migrações. R15-B implementada no código (B5 recorrências, B6 pessoa/ocasião, B7 agregações e B8 sabor puro/compatibilidade). R16 ainda não implementada. Guia atualizado; envio consolidado para poupar Actions e execução manual completa no branch antes de qualquer avanço de main. Sem operação Cloudflare, limpeza ou dado real no repositório.

- **2026-11-14 — R15-B7:** teste regressivo confirmou truncamento na produção de caixas mistas; corrigido para equivalentes fracionários pela capacidade de cada kit. Relatórios agora exibem peso/capacidade/equivalentes. Ensaio com o mesmo sabor em15g/30g confirmou receita sem duplicação, ficha por peso, compras e embalagem contada uma vez. R19: Trocar kit junto à escolha, instrução clara e contador sempre visível; fotos preservadas. Doze E2E móveis direcionados e suites kits/P1/mistos/segurança passaram. Capturas só DEMONSTRAÇÃO em r15-depois-*. Falta a conferência final do cadastro de sabor sem embalagem artificial e os checks do SHA final.

- **2026-11-14 — R15-B6 / main f645068:** entradas14/11(2)–(5) lidas e CI enxuto preservado. Pessoa/estabelecimento e ocasião implementados na0022 aditiva; omissão preservada, fallback da interface/schema0021, financeiro/recorrência validados no servidor e telefone vazio normalizado também na conta. Relatório/guia/tutorial atualizados. Sem nova tabela/KEEP, importador ou dados reais. Continuação: consolidação sabor×peso/equivalentes (B7), seguida de execução manual de Validação da gestão nos três navegadores no SHA final antes de avançar main.

- **2026-11-14 — R15-B5, recorrências com kits:** backend em 79fec4b; 0021 aditiva, modelos com snapshots separados, edição CAS/auditada e guarda 409 para editor antigo. Catálogo/configuração em lote para 67 modelos (66 válidos, um com sabor inativo): só o inválido é ignorado; preço atual na nova semana, repetição idempotente e rascunhos para revisão. Defaults modernos e telas reutilizam kits no PC/celular; consumidor antigo não recebe repetição parcial como válida. Backup/restauração e limpeza efêmera comprovam FKs e preservação de kits/settings em KEEP. R17-1 já entregue pelo Importar cadastro inicial; aba Kits avaliada para extensão posterior, sem outro importador. R15-B ainda não concluída: pessoa/estabelecimento, ocasião e conferência final das agregações sabor×peso/equivalentes antecedem R16. Não avançar main nem executar operações remotas neste checkpoint.

- **2026-11-14 — Sincronização 981153e / continuidade R15-B:** li as entradas de 14/11 (2), (3), (4) e a aprovação da R19. Main incorporado preservando o importador e os estilos dos kits; conflito restrito ao final do CSS, resolvido mantendo os dois blocos. R17-1 coberta pelo Importar cadastro inicial: não criar outro importador. Avaliar/estender com aba Kits após consolidar as APIs/modelos R15. Kit/settings já estão em KEEP; tabelas novas de modelos serão dependentes de recurring_templates e produtos, portanto devem ser apagadas com os movimentos conforme o roteiro. Custos/clientes reais ficam fora do repositório; exemplos antigos do meu relatório foram substituídos pelo caso fictício vigente (iFood R$ 70,28). Não executar limpeza, deploy ou migrações remotos.

- **2026-11-13 — R19-4, seleção de modelo legado:** quando um modelo antigo preenche embalagens, a grade legada abre automaticamente e o atalho novo fica oculto enquanto houver itens antigos selecionados. Mantém preço/quantidade originais e evita somar um kit novo sem perceber o preenchimento anterior; nenhuma conversão automática. Três E2E Chromium/WebKit passaram com um modelo antigo e catálogo de kits ativo, além do toque rápido novo. Novo SHA deve substituir os checks do checkpoint 2eea610 antes de qualquer avanço.

- **2026-11-13 — R19 implementada na branch:** R19-1 índice na 0020 (9dbe60e); R19-4 padrão do cliente no perfil com validação/compatibilidade (5690256); montagem compacta, textos, toque rápido e aviso de variantes finalizados. Seis E2E Chromium/WebKit passaram, 86 unitários, sete SQL com plano de índice, integrações de kits/financeiro/backup e 178 checks de segurança passaram. Capturas r19-depois-* registradas. Sem avanço do main: recorrência, pessoa/estabelecimento, ocasião e consolidação das agregações da R15-B seguem pendentes; R16 posterior. CI/Segurança devem ser conferidos no SHA final desta entrega.

- **2026-11-13 — Retomada R19 / main 6307d73:** ambiente reativado; árvore limpa e checkpoint 25531bd preservado. Incorporei main 6307d73 e li R19 integralmente. Plano antes do código: R19-1 índice na 0020 (ainda somente testes); R19-2 montagem em linhas .mix-row com foto44, contador/−/+, um seletor de sabor para Completar e Limpar; R19-3 textos claros usando nome do kit/rótulo Quantos kits iguais; R19-4 default_kit_id no JSON de perfil do cliente (CAS/auditoria/permissões existentes, validação de organização/atividade, preservar campo quando editor antigo omitir), escolha em Dados do estabelecimento e toque rápido nos sabores no Totem, com padrão 12×30 somente se cadastrado e sem inventar kit/preço; R19-5 aviso de produtos com várias variantes ativas no cadastro de Kits e montagem, sem converter variantes automaticamente. Arquivos: 0020, shared/finance e kit-orders, finance-domain/finance, CustomerProfile, KitItemsEditor, Kits, Totem, CSS e testes SQL/API/E2E. Aceite: plano SQL usa índice, montagem compacta/sem overflow em390px, limite/soma/álcool preservados, cliente com kit padrão ganha um kit inteiro em um toque, editar preço/quantidade mantém snapshot, defaults externos/inativos recusados, atualização antiga não apaga padrão, CSP real e CI/Segurança verdes na branch antes de main. Depois continuar recorrência, pessoa/estabelecimento, ocasião e agregações de produção/relatórios; R16 somente após fechar R15-B. Nenhum deploy/migração/flag remota.

- **2026-11-13 — Retomada sobre 5aede5c / R18 e R16:** li a revisão R18 e os itens 7–12 da R16. Main incorporado por merge na branch R15-B; o modelo local de snapshots foi preservado e ainda não é uma entrega de pedidos. Sem conflito com os ajustes do Claude. Antes de conectar as referências de pedidos, a 0020 reconstruirá somente `kits`, preservando IDs, versões, preços e FKs e aceitando peso/capacidade 1–500; 0019 permanece intacta. Arquivos: migração 0020, `worker/kits.ts`, `shared/kits.ts`, `Kits.tsx`, schemas de composição e testes SQL/API/E2E. Aceite R18: capacidade/tamanho personalizados, sugestões editáveis 13/20/26, cadastro sequencial sem preço sugerido e estado vazio com Insumos. Depois conectar snapshots às leituras, gravações/CAS, confirmação, recorrência, Totem/PC, produção, relatórios, compras/custos e backup antes de liberar criação de pedidos com kits. Critérios R15: soma/limites/tenant/atividade validados no servidor, legado preservado, kit 25 × 15 g com cinco sabores, nenhum N+1 ou variante artificial. R16 permanece a próxima fase: rendimento editável (16/26 g como sugestão), forminha por tamanho, opcionais configuráveis por uso, acréscimo configurável de 20% e iFood independente com divisor 0,74 e custos desconhecidos indisponíveis. O exemplo exige precisão intermediária: 2000/16 × 12 + 200 = 1700 centavos; com 20% → 2040 (exemplo integralmente fictício atualizado em 14/11), sem multiplicar previamente um custo unitário já arredondado. A política de arredondamento será explícita e testada. Sem deploy, aplicação de migração ou alteração de flags; CI e Segurança verdes na branch antes do main.

- **2026-11-12 — Sincronização e plano R15 → R16 → R17 → R7:** main atualizado por fast-forward para **7d20cfd**, sem mudanças locais inéditas. Li o Histórico de 11/11, R17 e a revisão de segurança, além de R15/R16 e informações comerciais. R6-7/R6-8 aprovadas; preservo CSP real no harness, blob:/GPS autorizados, telefone opcional/visiblePhone, sessão de 30 dias, lista recente e raiz/start_url privados. Não reabrir esses trabalhos nem usar bypassCSP global. Plano detalhado abaixo, antes do código.

- **2026-11-08 — R6-5 UI:** câmera/galeria com prévia circular e confirmação, recorte central WebP, avatar no cabeçalho/entregadores/históricos, iniciais quando ausente/erro e remoção administrativa. 75 unitários, 139 checks de segurança, integração/backup e E2E integral: **101 aprovados, um ignorado**. Captura r6-depois-foto-perfil inspecionada; guia FASE_R6_FOTOS. Sem ensaio físico nem 0017 remota. Envio por branch/checks antes de main; próximo R6-7.

- **2026-11-08 — R6-5 backend:** foto privada por membership, CAS/idempotência/auditoria, own PUT/DELETE e owner DELETE da equipe, validação WebP quadrado ≤256/40KB. 139 checks de segurança e integração de assinatura/tamanho/dimensões/corpo >32KB, papéis/tenant, concorrência e banco até 0016 aprovados. Leitura normaliza BLOB D1 para bytes HTTP (também na fachada); backup/restauração inclui foto. Migração 0017 somente local; UI/ensaio final na mesma branch.

- **2026-11-08 — Dependabot concluído:** responsável ativou Dependency graph; reexecução dos checks bloqueados passou. #1 (Actions, 878b1c9) e #3 (npm sem TypeScript 7, a1f8aef) integrados no main pelos SHAs validados, sem merge vermelho. #2 fechado/substituído pelo bot. Aplicação rebaseada sobre as atualizações, sem conflitos, com npm ci limpo e regressão completa aprovada.

- **2026-11-08 — R12:** calendário/contagem com passado bloqueado em Quando; atalhos/horário editável e sugestão identificada do modelo mais próximo ou janela explícita. Sucesso mostra data/hora e singular, link abre o dia escolhido em Hoje. Helpers com datas reais e fuso; sem rota, flag ou migração nova. 73 unitários, seis E2E específicos e regressão integral com 98 aprovados/um ignorado, após instalar as dependências atualizadas.

- **2026-11-08 — R11 modelos/editor completo:** montagem/edição no pedido padrão e PC, soma/embalagem/predominante validados, quantidade de caixas separada, preview e preservação de item/preço histórico em ajuste só de quantidade. Totem aplica misturas do modelo/último pedido mantendo as seis etapas do Claude. E2E integral: 92 aprovados e um offline WebKit ignorado. Captura r14-depois-editor-misto inspecionada. Sem flags ou migração remota. Próximo R12 após checks no GitHub.

- **2026-11-08 — R11 modelos/backend:** 0016 aditiva, componentes em lote, guarda de editor antigo, CAS/auditoria, geração idempotente e defaults com misturas. Integração com 66 modelos, componente/base inativos, dados incompatíveis, snapshots, disputa de versão e banco até 0015 aprovada; 127 checks de segurança, backup/restauração com FKs, financeiro, mobile, operações e listagens aprovados localmente. Editor/ensaio E2E em validação na mesma branch; nenhuma aplicação remota.

- **2026-11-08 — R14 / Dependabot:** #2 confirmado ERESOLVE TypeScript 7; ignore apenas do major adicionado, aguardar regeneração sem forçar peers. #1 confirmado Dependency graph desativado, passo humano em docs/DEPENDABOT.md; manter revisão bloqueante e não integrar vermelho. Configuração validada por formatter; atualizações de pacotes/Actions ainda não integradas.

- **2026-11-08 — R14-4:** ajuda contextual e tutorial confirmam estimativa, escopo e consulta da operadora; autorização preservada. Lint/tipos, 122 checks de segurança e seis E2E Chromium/WebKit aprovados. E2E agora seleciona o summary explicitamente (o título também existe no diálogo) e aguarda Hoje carregar antes de navegar; nenhuma asserção de erro foi removida.

- **2026-11-08 — R14-3:** caixas equivalentes no CSV em duas casas quando fracionadas e inteiro quando exato. Integração mixed-reports valida 1.33/1.50 e inteiro, mantendo cabeçalhos e segurança CSV.

- **2026-11-08 — R14-2:** ranking omite partes zeradas e mantém quantidades positivas. Seis E2E de relatórios/custos aprovados em Chromium móvel/desktop e WebKit móvel; build Pages aprovado. Sem mudança de cálculo.

- **2026-11-08 — R14-1:** nome por snapshot com rótulo apenas quando necessário; metadados de variantes consultados em lote, sem N+1. Aplicado a relatório/CSV de itens, custo e pendências de compras. Tipagem e integrações mixed-reports/mixed-costs aprovadas, incluindo produto compartilhado e variante inativa. R14-2/3/4 e Dependabot na sequência.

- **2026-11-07 — R11-5:** custo de produção por composição no detalhe do pedido e compras por unidades simples/mistas, com ficha atual e arredondamento unitário já usado no simulador. Falta de ficha/custo/insumo ativo deixa total indisponível; zero cadastrado continua válido. Sem despesa/baixa/preço automático. Nova GET p1/order-costs/:id: 401 sem sessão, 404 fora da organização, operadora autorizada; matriz passou a 122. 71 unitários, integrações P1/mistas e 89 E2E aprovados, um offline WebKit preexistente ignorado. Achado visual reproduzido em 26af1d7 corrigido só no CSS móvel (fotos 120→118 px), mantendo fluxo e asserção. Capturas de custo/compras inspecionadas. CI/Segurança de R11-4 verdes antes do avanço main para f4230a6; custo segue o mesmo protocolo. Próximo: misturas em modelos recorrentes/editor do PC.

- **2026-11-07 — R11-4 restante:** relatórios por sabor somam unidades simples/mistas e ordenam por unidades; preservam snapshots e distribuem receita proporcionalmente por unidades com maior resto, sem duplicar caixa ou centavos. CSV de pedidos inclui composição e CSV por sabor distingue caixas de um sabor, unidades mistas e equivalentes. Sem rota nova/migração/flag alterada. Dois unitários, integrações P1 + mistos (incluindo banco até 0014), 117 verificações de segurança e três E2E Chromium/WebKit aprovados; captura r12-depois-relatorios-mistos inspecionada. Guias deixam de mandar desligar a montagem já ativada. Commit em branch para checks antes do main; próximo R11-5.

- **2026-11-07 — Sincronização 26af1d7 e próxima fase:** li integralmente o Histórico de 04/11 até 07/11 (3), na ordem solicitada, e SEGURANCA_AUDITORIA.md. Main atualizado por fast-forward de 92fab6f para 26af1d7. Árvore limpa, nenhum stash e nenhum commit exclusivo na branch local antiga `work`; não existe trabalho local pendente de rebase. Comparei as mudanças em Totem/Today/operations/mobile; a base da continuação é o código atual do Claude. Plano detalhado no fim deste arquivo, registrado antes de alterar código.

- **2026-11-02 — R11-6:** Regra comercial atualizada: caixa mista permitida, mesmo preço da embalagem, composição livre entre sabores ativos e total igual às unidades por caixa. Removida a pendência de confirmação na informação comercial e ajuda; README/plano distinguem regra vigente de montagem ainda não entregue. Documentação adiantada por ser independente; prioridade de retomada permanece R11-2. Nenhum cadastro, preço, flag ou banco real alterado.

- **2026-11-02 — R11-1:** Modelo/API de composição preparados, sem montagem na UI: 0015 aditiva, unidades por sabor vinculadas ao item, snapshots de nomes/peso/preço e leitura em lote. Escrita móvel/clássica na mesma transação/CAS; confirmação individual/lote revalida sabores. MIXED_BOXES_ENABLED ausente/false; não ativar antes de R11-2…5. Testes recusam 11/12, 13/12, pesos incompatíveis, duplicatas, dados externos e inativos; edição histórica, corrida de duas confirmações, migração sem mudar itens e backup com composição/FKs aprovados. 69 unitários, seis SQL, API (28), operações (14), móvel, listagem com 65 pais e backup aprovados. E2E completo: 80 aprovados/um offline WebKit ignorado; operações repetidas após revalidação. CI anterior detectou asserção antiga de texto de unidades após R10-1: corrigida para rótulo acessível e número visível, mantendo a verificação. Próximo R11-2 (montagem/modelos), sem afirmar a R11 completa.

- **2026-11-02 — R10-4:** Folha Novo lembrete com atalhos Hoje/Amanhã e 09:00/14:00/18:00 sincronizados com o seletor nativo; botão não envia formulário ao escolher um chip. Componentes reutilizáveis de atalhos. Quinze E2E R10/R9 aprovados em Chromium/WebKit, inclusive gravação de Amanhã às 18:00 como 21:00 UTC. Build/tipagem/lint/formatação aprovados. Captura r12-depois-lembrete-atalhos. R10 concluída; próximo R11-1.

- **2026-11-02 — R10-3:** Lembretes no Hoje com círculo acessível de 44 px, data/hora relativas a Fortaleza e toast temporário em vez de texto fixo no cartão. Conclusão mantém versão/autorização e lista atualizada. Oito unitários de datas aprovados, nove E2E de produção/lembrete/agenda/ICS aprovados; lint/tipagem/build/formatação. Captura r12-depois-lembrete-circulo inspecionada. Próximo R10-4.

- **2026-11-02 — R10-2:** Cabeçalho da entrega contém somente km/min de carro. Ajuda, explicação de trânsito e crédito ORS/OSM permanecem visíveis na folha Mapa e na rota do cliente. Três E2E aprovados em Chromium/WebKit verificam ausência de botões/links no resumo, crédito e ajuda na folha, cache e fallback. Capturas r12-depois-rota-* e mapa-creditos. Próximo R10-3.

- **2026-11-02 — R10-1:** Produção com sabor como título, embalagem/peso apenas quando há variantes distintas, números à direita em duas linhas e nome acessível com singular/plural. Ajuda visual 20 px sem fundo grande, preservando alvo de 44 px. Tipagem/build e três E2E aprovados (incluindo WebKit): variantes, quantidades e ajuda. Captura r12-depois-producao-compacta. Próximo R10-2.

- **2026-11-02 — R6-4:** Aviso no Hoje para administrador sem endereço/coordenadas da base, com link direto Empresa; nenhum bloqueio de operação. Some ao salvar, inclusive coordenadas zero; não aparece para operador. Passo incluído no roteiro simplificado além do detalhado. Três E2E aprovados com cadastro pela interface; captura r9-depois-aviso-base inspecionada. Regressão completa: 71 E2E aprovados, um offline WebKit já ignorado. Ponto estável de parada: retomar R6-5, depois R6-7/R6-8 e R7 atrás de PROSPECTS_ENABLED; nada remoto foi ativado.

- **2026-11-02 — R6-2:** Cache técnico aceita identificador de provedor futuro sem nova migração; somente ORS implementado. Folha Mapa mostra estimativa salva/fallback, endereço e três apps, com último aplicativo escolhido persistido localmente por usuário (sem destinos), destaque e troca sempre acessível. Mantém folha em todas as aberturas, escolha permitida pelo briefing; não usa SDK/tiles/rastreamento. Seis E2E WebKit/Chromium aprovados: URLs de endereço e coordenadas zero, recarga e isolamento de preferência, quatro atalhos e entrega existentes. Captura r9-depois-mapa-preferencia inspecionada. Próximo R6-4.

- **2026-11-02 — R6-1:** Rota ORS driving-car no Worker com cache/fila privados, estimativas em cliente/entrega, recálculo administrativo, snapshots e ordenação por minutos. Migração 0014 preparada; secret/variável e publicação só pelo responsável, guia FASE_R6_ROTAS. Limite interno 1000 por janela de 24 h, espaçamento 3,1 s, timeout e espera por falha; nenhuma consulta externa em GET. D1 efêmero aprovou cache/repetição, concorrência com mudança de base, orçamento, autorização/isolamento/FKs e falha sem perder cadastro. Três E2E (WebKit/Chromium) aprovados, capturas r9-depois-rota-*; 66 unitários, seis testes SQL, backup/restauração e campo aprovados, lint/tipagem/build/formatação. Provedor real não ativado/testado com chave; CI dos seis commits R9 confirmado success. Próximo R6-2.

- **2026-11-02 — R9-6:** Saudação sem nome cadastrado mostra chip Defina seu nome para Preferências, sem bloquear operação; desaparece após salvar. Guia de ativação atualizado. Espaço do Hoje preservado (limite 200 px), chip com alvo de 44 px e sem sugerir nomes fictícios. Inspeção visual corrigiu também a direção da linha do quadro Lembretes para h3/botão lado a lado. Build/tipagem/lint e nove E2E aprovados; dois WebKit repetidos com medida de alinhamento passaram. R9 concluída; próximo R6-1.

- **2026-11-02 — R9-5:** Menu de perfil com linhas de 52 px, ícone/texto e estilo fantasma uniforme; Fechar no cabeçalho e Sair por último, em perigo discreto. Logout, foco e passeio preservados. Build/tipagem/lint e 12 E2E de perfil/gestão/logout/operação aprovados; captura do menu. Próximo R9-6.

- **2026-11-02 — R9-4:** Hoje administrativo: KPIs (inclui corridas líquidas na semana atual) → produção com fotos/barras/caixas/unidades → fila de revisão → entregas → lembretes. Fila até 50 pendências de qualquer data, com limite explícito; confirmação em lotes de três, chaves por pedido/versão e resultados individuais. Nenhum pedido é selecionado automaticamente. Fotos e pendências hidratadas em lote; produção completa preservada acima de 200 cartões. Build/tipagem/lint, 14 integrações operacionais e nove E2E de ordem/isolamento/confirmação parcial/operação aprovados. Captura administrativa. Próximo R9-5.

- **2026-11-02 — R9-3:** Quadro Lembretes com h3 sans e botão tonal + Novo lembrete; criação em folha sem sair do Hoje. Data no fuso de João Pessoa/Fortaleza, validação nativa/servidor, bloqueio de duplo envio, idempotência por conteúdo e cancelamento sem gravação. Tela completa continua em Ver todos. Build/tipagem/lint e seis E2E (criar/cancelar/agenda/ICS) aprovados; capturas da folha e do quadro. Nenhum aviso é simulado; Web Push/ICS com alarme ficam para R6-7. Próximo R9-4.

- **2026-11-02 — R9-2:** Regra de título compacto estendida aos módulos de Mais: Agenda, Relatórios, lembretes, despesas, fichas, insumos, compras, ajuda, preferências, pedidos padrão, produtos, modelos e acessos; cabeçalho de Despesas/Corridas ajustado. H1 semântico e títulos de detalhes de cliente preservados; HelpTip retirado do h1 oculto para continuar acessível. Build/tipagem/lint e seis E2E de telas/operações passaram; capturas Agenda/Relatórios. Próximo R9-3.

- **2026-11-02 — R9-1:** Calendário mostra contagem visual apenas em dias com entrega, mantém contagem acessível e não simula zero enquanto carrega. Título do mês capitaliza só a primeira letra; cabeçalho alinhado em grade de sete colunas e setas regulares. Build/tipagem e três E2E de calendário aprovados; captura r9-depois-calendario. Sem alteração de schema/Cloudflare. Próximo R9-2.

- **2026-11-02 — R5-10:** Guia curto de homologação com backup/restauração local, runner de todas as pendentes, pré-checagem consolidada e uma alteração humana das seis flags de gestão. Catálogo permanece OFF por AGENTS §8; não interpreta “todas ON” como autorização para publicar catálogo. Workflow_dispatch preparado, somente main, ambiente homologacao-d1, permissão contents:read e token D1 limitado à conta; padrão só leitura, aplicação exige confirmação humana e bloqueios de FKs/histórico/schema. Nenhum secret/ambiente foi criado, workflow disparado ou banco remoto consultado/alterado. Base no roteiro de ativação adiantada da R6-4; aviso no Hoje ainda pendente. 66 unitários, lint/tipagem/formatação, sintaxe Node/YAML e 56 E2E aprovados, um offline WebKit já ignorado. Ponto estável de parada para preservar cota: retomar em R6-1; R6-3/R6-6 já cobertos por R8-6, restante R6 e R7 pendentes.

- **2026-11-02 — R5-9:** Photon usa User-Agent neutro BrigaderiaGestao/1.0; PLACES_USER_AGENT opcional só no Worker, com limite ASCII sem quebras de linha e fallback seguro. URL pessoal removida do cabeçalho. Guia explica o contato público da empresa na transferência, sem configurar variável remota. 63 unitários (inclui header HTTP padrão/configurado/inválido), tipagem/lint e integração de campo aprovados. Próximo R5-10.

- **2026-11-02 — R5-8:** E2E de espaço em 390×844 cobre primeiro cartão até 200 px conforme precedência R8, fonte alternativa, ausência de overflow, cinco sabores acima do rodapé, largura dos clientes e grade financeira. Anexa Hoje/Sabores ao relatório Playwright; seis E2E passaram nos três projetos. QA visual em design-qa.md e prancha conjunta; ação verde com ícone/altura 56 e nome longo sem aumentar a faixa da saudação. WebKit repetido após refinamento aprovado. CI de 51471c0 aprovou a correção de espaço anterior. Próximo R5-9.

- **2026-11-02 — R5-7:** Tile de Deslocamentos renomeado para Corridas, preservando a rota e todas as funcionalidades. Hifenização pt-BR sem quebra arbitrária nos tiles. Build/tipagem e três E2E com verificação de overflow em Mais e captura aprovados. Próximo R5-8.

- **2026-11-02 — R5-6:** ChoiceChips compartilhado aplicado à condição das vendas e aos eventos da agenda (cinco categorias mais Todos). Busca/lista de clientes e exportação com seis formatos preservadas. Build/tipagem/lint e seis E2E de CSV/ICS/relatórios/agenda aprovados. CI dos commits R8-6/7 revelou data quebrando em duas linhas por diferenças de fonte: chip do calendário deixou de reservar check de seleção e ganhou espaçamento explícito, data com largura flexível e WhatsApp sem quebra. Seis E2E de espaço/calendário passaram localmente com limite 200 preservado; nova CI será conferida. Próximo R5-7.

- **2026-11-02 — R5-5:** Financeiro com quatro cartões tocáveis em grade 2×2: recebido hoje, a receber, vencido e vence esta semana. Rótulos pequenos, valores em destaque e navegação/filtros preservados; sem alterar cálculo financeiro. Build/tipagem e três E2E com medida de linhas/larguras e capturas aprovados. Próximo R5-6.

- **2026-11-02 — R8-7:** Revisar pedido com seções Quando/Como/Quem leva/Pagamento em caixa alta, nomes de exibição/iniciais nos chips de entregador e atalhos Hoje/Amanhã/dia do pedido padrão antes do seletor nativo. Hora existente preservada nos atalhos e a do modelo restaurada ao escolher o padrão. Sem inventar horário comercial; sem horário prévio, o atalho usa a hora atual de Fortaleza. Fotos pessoais dependem da R6-5, sem imagens fictícias na UI real. Build/tipagem/lint e seis E2E de pedido/foco/revisão aprovados. Próximo R5-5.

- **2026-11-02 — R8-6:** Saudação por Fortaleza, atualização ao voltar ao app, chip/calendário mensal com contagens agregadas privadas, hoje/amanhã/data livre e navegação de mês. Agenda fora de hoje, voltar para hoje, reabertura/perfil limpa o dia; passado só concluídos, futuro sem ação de entregar. Produção identifica os dias escolhidos. API com uma agregação e saída sem PII. 60 unitários (inclui seis fronteiras horárias), integração de fronteira de mês/fuso/isolamento/autorização e 12 E2E de operação/calendário/fluxos passaram; três do calendário repetidos com pedido futuro real de fixture. Build/tipagem/lint aprovados. A saudação R8 aprovada ocupa espaço: limite do primeiro cartão do Hoje atualizado de 140 para 200 px (protótipo sem faixa de prévia ≈189 px), explicitando a precedência da R8 sobre R5-8. Cinco sabores continuam cabendo sem rolar. Próximo R8-7; sem migração/Cloudflare.

- **2026-11-02 — R8-5:** Botão do perfil com iniciais do nome cadastrado e alvo circular de 44 px; sem nome cadastrado usa ícone neutro, sem papel no botão. Nome e papel aparecem no menu, com acesso às preferências. Foto pessoal fica explicitamente para R6-5. Build/tipagem/lint e nove E2E de perfil/cabeçalho/campo/entrega aprovados. Captura r8-depois-perfil. Próximo R8-6.

- **2026-11-02 — R8-4:** Cartões de clientes em uma coluna e largura total no celular, inclusive na escolha do pedido; avatar 44 px e nome sem quebra forçada. Desktop preservado. Build/tipagem e três E2E com medida de largura/limites da tela aprovados; capturas atualizadas. Próximo R8-5.

- **2026-11-02 — R8-3:** DisclosureSummary compartilhado com ChevronDown Lucide; marcador nativo oculto inclusive no Safari, rotação e reduced-motion. Build/tipagem/lint e seis E2E de campo/fluxos aprovados (os três fluxos repetidos após ajustar o seletor ao summary visível). Capturas atualizadas. Próximo R8-4; nenhum dado/serviço remoto alterado.

- **2026-11-02 — R8-2:** Clientes/Mais/Financeiro sem título visual repetido no celular; h1 semântico preservado para leitor de tela e desktop intacto. Build/tipagem e três E2E dos fluxos/capturas passaram. Produzido e testado localmente, sem operação Cloudflare. Próximo R8-3.

- **2026-11-02 — R8-1:** cartão com avatar, hora Fortaleza/endereço, sabores/fotos em pílulas, condição/total, quatro ações iguais e ação verde de largura total. Mapa abre folha com três apps; 99 copia o destino. Recebimento combinado reutiliza saldo, CAS/idempotência e confirmação humana existentes. Ações secundárias recolhidas. API consulta fotos e condições em lote, sem N+1 ou migração. Build/tipagem/lint, contraste verde AA 5,27:1, 14 integrações operacionais e E2E de entrega/campo/operação/recebimento aprovados; regressão financeira conferida antes do envio. Capturas r8-depois-hoje/mapa. Pendente: km/min reais do R6-1 e preferência do mapa R6-2; a linha reta é explicitamente rotulada. Próximo R8-2.

- **2026-11-02 — R5-4:** lista/busca primeiro, cartões editáveis e conta/localização expansíveis. Novo cliente (inclusive atalho +) e edição em folha nativa; Escape/Cancelar descartam o rascunho e mantêm a lista. GPS por toque e câmera/galeria no início; foto WebP comprimida em memória, enviada só após salvar. O cadastro e a foto são duas operações: falha na foto informa que o cliente já foi salvo e orienta conferir/repetir no editor, sem recriar o cliente. CAS e idempotência existentes preservados. Build/tipagem/lint/formatação e 53 unitários aprovados; 53 E2E passaram nos três projetos; um teste offline WebKit já ignorado permanece assim. Capturas com dados DEMONSTRAÇÃO. Nenhuma migração/deploy/alteração no Cloudflare.

- **2026-11-02 — R5-2:** entregas primeiro para operadora, sem alterar a visão administrativa. Data móvel nativa no cabeçalho; chip de proximidade acessível. Doze E2E de operações/agenda passaram; fluxos R5 e recebimento R2 passaram nos três projetos. Build/tipagem/lint aprovados. Sem alteração remota; próximo R5-4.

- **2026-11-01 — R5-3:** seis E2E de pedido padrão/foco passaram nos três projetos; cinco cartões de 390×844 cabem acima da barra de ação sem rolar. 53 unitários, build/tipagem/lint e integração móvel/campo aprovados. Popularidade consultada em lote, isolada por organização; ordem manual local editável em Produtos, sem mudança de schema. Revisar mantém edição precisa de quantidades. Próximos: R5-2 e R5-4.

- **2026-11-01 — R5-12:** componente Button aplicado em toda a interface sem mudar handlers/validações; todos os 53 E2E executáveis e 52 unitários passaram. Capturas de Hoje/Sabores/Revisar/Clientes/Mais/Financeiro com dados DEMONSTRAÇÃO. Próximo: R5-3, depois R5-2 e R5-4.

- **2026-11-01 — R5-1:** revisão 0ffe98a incorporada por fast-forward; cabeçalho compacto e menu testados. Restam, nesta ordem, R5-12, R5-3, R5-2 e R5-4.

- **2026-11-01 — Verificação final R2/R3/R4/P1:** build, tipagem, lint e formatação aprovados; 50 unitários; todas as suítes de integração (API, 65 registros por listagem, R2, P1, financeiro, operações, móvel, campo, estoque, importação, backup, migrações e marca) passaram. 47 E2E aprovados nos três projetos; um offline WebKit permanece ignorado. Restauração adicional por Wrangler D1 local com FKs zero. Ajustes finais preservam condições financeiras quando omitidas em edição móvel, aguardam sua leitura antes de confirmar, restauram validade nativa dos campos e permitem mínimo zero explícito. Status do CI do commit publicado deve ser conferido em [Actions do main](https://github.com/felipeirineu/brigaderia-amor-zeloso/actions/workflows/ci.yml?query=branch%3Amain). Não foram executadas migrações/ativações remotas; aparelho físico/links externos reais ainda requerem homologação. P2 e transferência/Fase 6 continuam fora desta entrega.

- **2026-11-01 — P1-8/P1-9:** CSV/XLSX com prévia sem escrita e deduplicação concorrente, importação humana/idempotente. Exportação SQL de uma organização, fotos e eventos preservados, sessões/caches excluídos, snapshot único com CTEs de até cinco termos (limite real do D1 reproduzido). Integrações, 50 unitários e seis E2E de importação/backup aprovados. Ensaio ops:restore-check em D1 local novo: migrações 0001–0013, pending vazio, FKs zero. Guia P1_COMPLEMENTO.md e tutorial atualizados; flags false. Estoque 44d1d3c com CI 41321716827 aprovada. Regressão final/CI do último envio acompanhadas antes de encerrar.

- **2026-11-01 — P1-6:** R3/R4 enviadas, CI de f83918a aprovada (41321032479). Estoque por insumo/embalagem em milésimos, entradas/consumo/perda/ajuste/estorno, mínimo e bloqueio de troca da unidade com histórico. Integração de concorrência/negativo/idempotência/isolamento/FKs e três E2E de entrada/consumo/alerta aprovados. 0012 e P1_TOOLS_ENABLED false, sem consumo/despesa automáticos. Próximos: importação de clientes e exportação administrativa.

- **2026-11-01 — R4:** API a1518cf e telas privadas com GPS/câmera/perfis/transporte/deslocamento. Integração R4, R2/P1, API/listagens/financeiro/operação/migrações/marca aprovadas; 48 unitários. Rodada completa teve 35 E2E aprovados e três asserções antigas de zero inicial corrigidas para o contrato R3; repetição dos três passou, total 38 aprovados e um offline WebKit ignorado. CI anterior falhou primeiro por formatação e depois pela asserção antiga; ambas corrigidas, nova CI acompanhada. Guia FASE_R4.md, preflight estendido, flags MOBILE/FIELD false. Nenhum serviço pago ou banco remoto alterado.

- **2026-11-01 — R3:** modo simples, campos numéricos e fotos privados. 44 unitários, integração e seis E2E Chromium/WebKit passaram; build/tipagem validados. Uso físico e ativação pendentes.

- **2026-11-01 — R4-0:** entrega anterior enviada ao main (afbdb39) e CI 41316631301 aprovada antes do merge de 2fac3de. R4/R3 e README das fotos lidos integralmente. Interface e documentos de uso com redação neutra, Limão incluído como informação vigente; teste de regressão de atribuição pessoal. Canal de colaboração preservado até Fase 6.

- **2026-11-01 — Envio solicitado:** todos os itens R2-1…7 e P1-1/2/3/7/4/5 concluídos em commits locais até 8b5a9b0, com 42 unitários, integrações e 32 E2E aprovados (um offline WebKit ignorado). Envio ao main agora autorizado explicitamente; CI será acompanhada antes de integrar R3/R4. Flags e dados Cloudflare continuam intactos. Relatórios: REVISAO_R2.md e P1_ETAPAS.md.

- **2026-11-01 — Verificação consolidada R2/P1:** 42 unitários, 28 API base, 14 operacionais, oito grupos financeiros, migração R2 com extrato/membros/pagamento preenchidos, integrações dos seis P1 pedidos, seis SQLite, 65 produtos/65 pedidos, marca/AA aprovados. E2E completo: 32 aprovados e um offline WebKit já ignorado; todos os novos fluxos passaram nos três projetos. Runner D1 local, preflight e exportação/restauração de fixture em estado novo aprovaram nove migrações, contagens e zero violações. Planos e relatórios concluídos; alterações/commits somente locais, sem CI remota, push ou Cloudflare. Pendentes somente revisão Claude, homologação física e ativação pelo Felipe; estoque/importação e interface de backup continuam fora do escopo pedido.

- **2026-11-01 — P1-7/P1-4/P1-5:** despesas/estorno e fluxo registrado, depois insumos/ficha/preço por margem e lista bruta de compras implementados na ordem aprovada. Integrações de dinheiro, papel, unidades, arredondamento e dados ausentes aprovadas; E2E dos fluxos em Chromium mobile/desktop e WebKit aprovado. Nada compra, altera preço ou movimenta estoque automaticamente. Relatórios separados em docs/P1_ETAPAS.md. ATIVACAO.md concentra o guia e a ordem das flags; nada remoto.

- **2026-11-01 — P1-1/P1-2/P1-3:** agenda e ICS, lembretes manuais e relatórios/CSV implementados nesta ordem. Agenda/lembrete com integração e três E2E aprovados; relatórios com totais, ranking, CSV malicioso e parser independente aprovados. Relatórios por etapa em docs/P1_ETAPAS.md. Estruturas P1 preparadas nas migrações 0007–0009, sem dados/seeds; flags continuam OFF. Próximo: P1-7 e P1-4/5.

- **2026-11-01 — R2 técnica:** 132ba36 integrada ff-only. Migração 0006 preserva extratos e acrescenta crédito/anulação/recebimento combinado/índices virtuais. R2-1…6 implementados localmente; APIs base/financeira e R2 aprovadas. E2E Hoje em Chromium mobile/desktop e WebKit aprovado. Sem mutação remota, inclusive push, conforme “nada remoto”. Continuação local P1-1→P1-2→P1-3→P1-7→P1-4/5. Relatório em docs/REVISAO_R2.md.

- **2026-11-01 — Regressões finais de formulário:** troca de cliente limpa itens/data do modelo anterior e descarta resposta antiga de defaults; edição de taxa do pedido padrão mantém vírgula antes de validar preço. Três E2E financeiros e três operacionais repetidos em Chromium/WebKit passaram. Código, guia e resposta já enviados ao main; resultado final da nova CI deve ser conferido na aba Actions.

- **2026-11-01 — R1 e Fase 2B:** revisão `d13618c` integrada por fast-forward, sem conflito. R1-1…R1-7 atendidos conforme tabela acima. Núcleo financeiro/P0-4, B2B/P0-5 e tutorial entregues no código. Condições são snapshots; sinal/parciais/estorno usam eventos e alocações. CAS da conta/pedido impede pagamento concorrente acima do saldo; cliente com histórico financeiro não pode ser trocado. Fechamento usa data efetiva da entrega, não apenas data prometida. Flags OFF; nenhum dado, migração ou pagamento remoto foi alterado.

- **2026-11-01 — Testes R1/2B:** 36 unitários; 28 verificações API base; 14 operacionais; oito grupos financeiros; migração 0003–0005 com preservação; 65 produtos/65 pedidos; seis SQLite; marca/AA; build/tipos/lint/formato. E2E completo: 23 aprovados, um offline WebKit já ignorado; gestão, operação/lote e financeiro executados em WebKit e Chromium mobile/desktop. CRC Pix confere exemplo oficial BACEN 1D3D e Python independente. Preflight e exportação/restauração de fixture local em estado novo passaram, com zero FKs inválidas. Não equivalem a backup real ou iPhone físico. CI nova após push ainda não observada nesta redação.

- **2026-11-01 — Ativação e limites:** guia de iniciante em FASE_2A com comandos/saídas/erros e scripts sem acesso a PII na saída; backup fica fora do Git. Sem credenciais administrativas Cloudflare neste ambiente. Responsável precisa exportar/restaurar backup real, aplicar somente migrações pendentes e conferir contagens antes das flags. Conta limitada explicitamente a 1000 pedidos/eventos, resumo 5000 entregas, fechamento 200 pedidos; erro explícito ao exceder, sem saldo parcial silencioso. Estorno integral, não parcial; cobrança financeira editável na prévia, sem modelo financeiro persistente. P1-1/P1-2 são os próximos incrementos; P2 continua OFF.

- **2026-11-01 — Fase 2A concluída no código:** backend `4306c74` e interface `0b70037`. Estados/histórico/desfazer, Hoje por papel, recorrência semanal idempotente, entregador, WhatsApp assistido e base HelpTip/tour. Migração preservou dados de fixture e passou também no runner D1 local. Produção agrega todos os itens, inclusive no teste com 205 pedidos e limite de 200 cartões. Não houve escrita no D1 remoto ou envio de mensagem. `OPERATIONS_ENABLED=false`; ativar somente após backup/restauração ensaiada, 0003 e conferências. Relatórios detalhados: `docs/ENTREGA_TECNICA.md` e `docs/FASE_2A.md`.

- **2026-11-01 — Validação final:** 30 unitários, 28 verificações API base, 11 verificações API operacional, regressão da migração, volume com 65 pais/filhos, seis SQLite, ícones/AA, lint/formato/tipos/build passaram. E2E completo: 20 passaram e um offline WebKit permaneceu ignorado como na suíte anterior; login/gestão/operação WebKit executados e aprovados. Após ajustes visuais, seis E2E privados passaram novamente; após o agregado completo, três operacionais passaram. Pendentes: CI após push, iPhone/Android físicos, ativação remota e revisão do Claude. P0 financeiro/fechamentos e cadastros B2B avançados continuam na 2B; P1/P2 não foram declarados concluídos.

- **2026-11-01 — Marca/T-5:** PWA 192/512/maskable, apple-touch-icon, favicon e WebP derivados do logo autorizado; Lucide e tokens oficiais. Teste de dimensões/ICO e AA passou (marrom/creme 13,65:1, secundário 5,82:1, dourado escuro 5,91:1). Dourado original apenas decorativo.

- **2026-11-01 — T-1:** falha da linha 30 reproduzida em WebKit executado localmente. Correção restrita ao transporte HTTP de testes; mantém as verificações de JWT, organização, expiração e flags originais. E2E WebKit passou; não equivale a instalação Safari/iPhone físico. Dependências Debian verificadas foram extraídas em diretório local; launcher aponta para binário WebKit original com bibliotecas locais, sem desativar TLS.

- **2026-11-01 — T-2:** removido N+1, leitura em lotes de 90 IDs com organização obrigatória. 27 testes unitários passaram e integração com 65 produtos/65 pedidos passou. Nenhuma alteração de schema ou dados remotos.

- **2026-11-01 — Planejamento:** arquivos de colaboração e logo importados do branch Claude; briefing lido integralmente. Comercial e plano reescritos antes do código. T-1/T-2/marca antecedem a Fase 2A; financeiro e complementares preservados como fases futuras. Nenhuma dúvida acima bloqueia correções técnicas ou a base operacional aprovada. Sem conflito de autorização com AGENTS; sugestões comerciais não confirmadas permanecem pendentes, catálogo OFF.

## Relatório da etapa R5 solicitada

- **Produzido:** R5-1, R5-12, R5-3, R5-2 e R5-4, nessa ordem e em commits/pushes separados; capturas de referência atualizadas em `capturas/r5-depois-*`.
- **Testes executados:** build/tipagem, lint/formatação, 53 unitários; E2E Chromium móvel/desktop e WebKit móvel, incluindo espaço em 390×844, cadastro com GPS/foto, cancelamento, edição, atalho de cadastro, pedidos e recebimentos. Resultado consolidado final: 53 E2E aprovados, um offline WebKit previamente ignorado; 53 unitários aprovados.
- **Limitações:** câmera e instalação em aparelho físico ainda não homologadas; ordem manual de sabores é local ao navegador (popularidade é compartilhada). Foto pode falhar separadamente do cadastro, com aviso explícito e recuperação pelo editor existente.
- **Pendências:** demais itens R5-5 a R5-11 fora desta sessão; sincronização da ordem manual, homologação física e ativação continuam pendentes. As asserções de espaço necessárias aos itens desta entrega estão nos E2E, sem declarar toda a revisão visual R5-8 concluída. Nenhuma operação Cloudflare remota foi executada.

## R8 — plano e aceite

Revisões R6/R7/R8 e protótipo integrados em a8a4a90. Protótipo aberto em Chromium local a 390×844. Ordem: R8-1…7 → R5-5…10 → R6 → R7, um commit/push por item. Sem operação Cloudflare remota. Dados do protótipo não serão copiados.

Arquivos/aceite: Today, DeliveryActions, Button e API Today (R8-1: cartão compacto, fotos em lote, quatro ações e entrega com validação existente); CompactHeader/Management/CSS (R8-2…5: uma hierarquia móvel, Lucide, largura total, iniciais); Today/calendário/API e datas (R8-6: Fortaleza, contagem agregada, dia selecionado); Totem (R8-7: rótulos, entregador e atalhos de data). Capturas r8-depois-* e E2E móveis, sem retirar autorização/CAS/idempotência. Rotas/tempo e fotos pessoais só serão exibidos com dados efetivamente disponíveis.

## Relatório — R8 e complemento R5 (2026-11-02)

- **Produzido:** revisões R6/R7/R8 e protótipo integrados; R8-1…7 implementados na interface, com dependências reais de rota/foto explicitamente pendentes; R5-5…10 concluídos em commits/pushes individuais. Guia e workflow manual preparados, sem execução remota. Capturas `r8-depois-*`, comparação conjunta e `design-qa.md` disponíveis.
- **Testes executados:** 66 unitários; integração operacional (14 verificações), calendário agregado (fuso/mês, isolamento, autorização, ausência de PII), campo, contraste AA, build/tipagem/lint/formatação e sintaxe Node/YAML. Regressão completa final: 56 E2E passaram em Chromium móvel/desktop e WebKit móvel; um offline WebKit previamente ignorado. Guardas do runner executadas sem credenciais, encerrando antes de consultar D1. CI dos commits até 20359d1 aprovada; CI do último envio deve ser consultada no Actions do main.
- **Limitações:** sem iPhone/Android físico, fluxo remoto de ativação ou teste de token Cloudflare real. Km/min de carro, fotos pessoais, avisos push e visitas não foram preenchidos com dados do protótipo. Tipografia existente preservada, sem promessa de clone pixel a pixel. Preferência de mapa e WhatsApp em folha ainda pendentes da R6.
- **Pendências e retomada:** encerrar esta sessão em R5-10 para preservar a cota de validação/envio. Próximo **R6-1**, depois completar R6-2, R6-4 (aviso sem base), R6-5, R6-7 e R6-8; **R6-3 e R6-6 já cobertos**. Depois, R7-1…9 atrás de flag própria, com migração aditiva e testes de isolamento financeiro. R5-11 permanece proposta futura não bloqueante. Nenhuma migração, deploy, secret, conta paga ou configuração Cloudflare foram realizados pelo agente.

| Revisão atual | Status                                                     |
| ------------- | ---------------------------------------------------------- |
| R8-1          | Cartão entregue; km/min de rota dependem de R6-1.          |
| R8-2          | Entregue (limites e testes no histórico).                  |
| R8-3          | Entregue (limites e testes no histórico).                  |
| R8-4          | Entregue (limites e testes no histórico).                  |
| R8-5          | Entregue (limites e testes no histórico).                  |
| R8-6          | Entregue (limites e testes no histórico).                  |
| R8-7          | Interface entregue; fotos pessoais dependem de R6-5.       |
| R5-5          | Entregue; testes/limites no histórico.                     |
| R5-6          | Entregue; testes/limites no histórico.                     |
| R5-7          | Entregue; testes/limites no histórico.                     |
| R5-8          | Entregue; testes/limites no histórico.                     |
| R5-9          | Entregue; testes/limites no histórico.                     |
| R5-10         | Entregue; testes/limites no histórico.                     |
| R6            | R6-1/2/3/4/6 entregues. R6-5/7/8 pendentes; ver rodada R9. |
| R7            | Pendente após R6; nenhuma migração ou flag ativada.        |

## R9 — rodada atual

Revisão 52ec55f integrada por fast-forward. Plano antes do código: DayCalendar/workday/CSS (R9-1: contagem positiva e mês sem capitalizar preposição); títulos dos módulos em Mais (R9-2: manter semântica sem repetição visual); Reminders/Today (R9-3: criação em folha com validação/idempotência); Today/operations/finance (R9-4: valores → produção visual → confirmação individual/lote → entregas → lembretes); CompactHeader/CSS (R9-5: linhas uniformes e saída no fim); Today/guia (R9-6: definir nome sem bloquear a operação). Depois R6-1, R6-2, R6-4, R6-5, R6-7, R6-8 e R7 conforme briefing, sem ativação remota. Aceite: E2E móvel, capturas r9-depois-*, isolamento/auditoria/CAS mantidos, um commit e push por item. Protótipo usado apenas como referência visual; fixtures DEMONSTRAÇÃO independentes.

| Item R9     | Status                                                           |
| ----------- | ---------------------------------------------------------------- |
| R9-1        | Entregue; evidências/limites no histórico.                       |
| R9-2        | Entregue; evidências/limites no histórico.                       |
| R9-3        | Entregue; evidências/limites no histórico.                       |
| R9-4        | Entregue; evidências/limites no histórico.                       |
| R9-5        | Entregue; evidências/limites no histórico.                       |
| R9-6        | Entregue; evidências/limites no histórico.                       |
| R6 restante | R6-1/2/4 entregues; R6-3/6 anteriores. Retomar R6-5, depois 7/8. |
| R7          | Pendente após R6                                                 |

### Plano R6-1 antes do código

Implementar adaptador OpenRouteService driving-car (gratuito Standard), cache privado por coordenadas/base/provedor e fila persistida na migração aditiva 0014. `worker/routing.ts`, ganchos de gravação em index/field/management, contexto de rotas em lote e RouteInfo em cliente/entrega. Salvar local/base enfileira; uma rota por invocação, continuação humana da fila, sem consulta ao abrir telas. Recalcular somente administrador. Não configurar secret nem aplicar migração remota.

Aceite: chamada só no servidor, coordenadas sem nome/endereço no provedor, timeout/erros com linha reta rotulada, cache sem repetição, orçamento conservador e concorrência protegidos, mudança de base/destino nunca exibe rota antiga como atual, isolamento/autorização/FKs e mais de uma gravação testados em D1 efêmero. Fonte consultada: homepage ORS confirma chave Standard gratuita; FAQ oficial documenta 2000 direções/24 h e 40/min com janela móvel, e chave somente no servidor. Limite interno será inferior, sem garantia de cota disponível se a chave for usada fora deste app.

### Plano R6-2 antes do código

Completar DeliveryActions e utilitário de preferência local: folha mostra estimativa salva (ou linha reta), endereço, três links já existentes e último app escolhido por usuário, sem gravar destinos no navegador. Manter folha sempre disponível para trocar de aplicativo; abertura direta é opcional no briefing. Sem SDK/tiles, rastreamento ou consulta externa. Aceite: URLs com coordenadas e endereço codificados, preferência preservada após recarregar e isolada por usuário, WebKit/Chromium e captura.

### Plano R6-4 antes do código

Today/estilos/guia: aviso exclusivo do administrador quando campo está ativo mas faltam endereço/coordenadas da base, com link direto Empresa. Sem bloquear entregas, inventar distância ou pedir endereço no chat. Some depois de salvar um local válido; operador não vê configuração administrativa. Aceite: três cenários E2E e captura; roteiro existente de primeiro login mantido, inclusive no caminho simplificado.

### Relatório da rodada e ponto de retomada

- **Produzido:** R9-1…6; R6-1 (rota de carro com cache/fila e fallback), R6-2 (folha/preferência de mapas), R6-4 (aviso/roteiro da base). Um commit e push no main por item; capturas `r9-depois-*`, guia de rotas e notas em `design-qa.md`. Revisão do Claude integrada em 52ec55f, sem alterar o briefing/protótipo.
- **Testes executados:** lint, formatação, tipagem e build Pages; 66 unitários e seis SQL; integração de rotas em D1 efêmero com cache, concorrência, orçamento, falha, snapshots e isolamento; campo; backup/restauração local com FKs. E2E completo em Chromium móvel/desktop e WebKit móvel: **71 aprovados, um ignorado** (offline WebKit preexistente). Os três cenários da base também foram executados isoladamente. CI dos seis commits R9 e de R6-1/R6-2 confirmado aprovado; CI do último push acompanhado no fechamento da resposta.
- **Limitações:** estimativa ORS testada com provedor simulado, sem chave real nem ensaio físico. Ativação humana posterior: 0014 e configuração gratuita descritas em FASE_R6_ROTAS. Sem deploy, migração remota, secret ou mudança Cloudflare nesta rodada. Fallback continua explícito; push e fotos pessoais não foram simulados para preencher a UI.
- **Pendências/retomada:** parar após R6-4 para preservar validação/envio. Próximo **R6-5: fotos de perfil privadas** (compressão, câmera/galeria, troca própria e remoção administrativa, avatar/entregador/histórico). Depois **R6-7: lembretes Web Push e ICS com alarme**, incluindo ensaio Android/iPhone físicos que o agente não pode afirmar recebido neste ambiente; **R6-8: rolagem/WhatsApp em folha**. Em seguida **R7-1…9**, com visitas/amostras isoladas de venda/financeiro e flag `PROSPECTS_ENABLED` inicialmente desligada; nenhuma implementação/ativação dessa flag nesta rodada.

## Rodada R10 / R11 / R12 — plano e aceite

Revisões integradas por fast-forward em ecb6e6b. Ordem vigente: R10-1…4, R11-1…6 junto de R12-1…4, depois R6-5/7/8 e R7. Protótipo aberto em 390×844 nos fluxos Caixa mista e Quando; seus dados permanecem somente referência.

Antes do código R10: Today/CSS/HelpTip para compactar produção mantendo variantes distintas, unidades e singular/plural; RouteInfo/DeliveryActions para crédito e ajuda fora do cabeçalho de entrega; TodayReminders e feedback temporário acessível para círculo de conclusão e data relativa; ReminderSheet para atalhos de dia/hora sem remover entrada nativa. Aceite: E2E móvel Chromium/WebKit, capturas r12-depois-*, autorização/CAS/idempotência existentes preservados. Cada item terá commit e push próprio; nada remoto além do GitHub.

R11/R12: planejar modelo aditivo, snapshots e todos os consumidores antes de habilitar montagem; backend deve recusar composições inválidas e banco ainda não migrado continua com itens simples. Data usa Fortaleza, calendário agregado compartilhado sem dias passados, horário editável e sugestão identificada do modelo; confirmação abre agenda no dia escolhido. Documentar limites e próximo item se a rodada encerrar em ponto estável.

### Plano R11-1 antes do código — composição e compatibilidade

Migração aditiva 0015 cria `order_item_components` com FKs por organização/item/variante e snapshots de sabor/peso. Não altera linhas antigas. Modelo único de entrada para pedidos clássico/móvel: quantidade de caixas e componentes em unidades, soma igual à embalagem, sabores ativos, peso compatível e preço da embalagem lido no servidor. Combinações distintas podem usar a mesma embalagem; combinações idênticas exigem somar quantidade. Gravação de componentes na mesma transação/CAS/idempotência do pedido, sem consulta por componente.

Arquivos: shared/mixed, worker/mixed[-domain], schemas/mobile/management/listing, migração, registro do backup e testes isolados. Leituras hidratam composição em lote mesmo com montagem desligada. Introduzir `MIXED_BOXES_ENABLED` desligada por padrão; **não ativar enquanto R11-2…5 não estiverem concluídas**, pois produção/relatórios/custos e interface serão adaptados nas etapas seguintes. Clientes antigos que tentem editar pedido misto sem declarar suporte recebem conflito, evitando apagar composição silenciosamente. Esta etapa entrega o modelo e APIs, não a montagem da caixa na interface.

Aceite: recusar 11/12 e 13/12, negativos/duplicatas/inativos/outro tenant/peso incompatível; snapshots não mudam com renomeação/preço; duas caixas/composições da mesma embalagem; repetição/conflito/concorrência sem gravação parcial; banco anterior e pedidos antigos continuam funcionando. Backup/restauração com novas FKs; catálogo público continua negado.

### Estado vigente antes da continuação da caixa mista

| Item         | Status                                                                    |
| ------------ | ------------------------------------------------------------------------- |
| R10-1…4      | Entregues; capturas r12-depois-* e testes no histórico.                   |
| R11-1        | Modelo/API entregue, montagem desligada. Guia FASE_R11_CAIXA_MISTA.       |
| R11-2        | Próximo: montagem visual + modelos e geração semanal idempotente.         |
| R11-3        | Pendente: produção por unidades dos componentes.                          |
| R11-4        | Pendente: textos/WhatsApp/CSV/relatórios e ranking por unidades.          |
| R11-5        | Pendente: custo/ficha/compras por componentes.                            |
| R11-6        | Entregue; evidências/limites no histórico.                                |
| R12-1…4      | Pendentes: calendário mínimo/contagem, horário, sugestão, sucesso/agenda. |
| R6-5/7/8, R7 | Após R11/R12. Prospecção ainda não implementada/ativada.                  |

Ponto estável de parada da rodada: R11-1 entregue e bloqueada para uso real; R11-6 alinhada em commit próprio. Retomar **R11-2** na próxima sessão, antes da R6. `shared/mixed.ts` fornece tipos e chave canônica; `worker/mixed.ts` prepara/valida snapshots e composições; `item_id` e `composition_version: 1` protegem edições. As telas existentes não sabem editar composição; não remover esse bloqueio antes de adaptar os consumidores. O modelo recorrente tem UNIQUE por variante: planejar armazenamento aditivo para misturas distintas usando a mesma embalagem, sem reconstruir/apagar modelos atuais. `ScheduleShortcuts` pode ser reutilizado na R12; `DayCalendar` ainda precisa do limite de dias passados e Hoje precisa aceitar o dia do link de sucesso.

Produzido: quatro acabamentos e modelo/API aditivo. Testes executados: registrados acima, exclusivamente com fixtures de demonstração/D1 local. Limitações: sem E2E de montagem mista (UI não implementada), sem ativação/homologação física. Pendências: R11-2…5/R12 e depois R6/R7. Nenhum deploy, migração remota, variável/secret ou alteração Cloudflare pelo agente. O runner de pendentes foi mantido compatível com 0015; readiness do modelo não libera o recurso.

## Sincronização de 07/11/2026 — estado vigente e plano antes do código

### Leitura e compatibilidade

Histórico de 2026-11-04 até 2026-11-07 (3) e auditoria de segurança lidos integralmente. Sem alterações locais, stash ou commits inéditos em branches locais. O avanço para 26af1d7 foi fast-forward; nenhum rebase nem substituição de arquivos foi necessário. Não há conflito com AGENTS.md.

Meu relatório anterior deixava montagem, produção e ativação mista pendentes/desligadas. Esse estado foi superado pelas entregas e pela ativação autorizadas feitas com o Claude: preservar as etapas Cliente → Sabores → Quando → Entrega → Pagamento → Revisar, montagem/edição mista, base pelo sabor predominante, soma por sabor no Hoje, composição no cartão/WhatsApp, numeração, pagamentos e textos atuais. Não restaurar versões antigas de Totem.tsx, Today.tsx, operations.ts ou mobile.ts. As flags vigentes, Access e D1 da conta da brigaderia permanecem como estão; PUBLIC_CATALOG continua false. Nenhuma intervenção remota no Cloudflare ou nos dados reais.

### Próxima fase — R11-4 restante e R11-5

1. **R11-4, relatórios por sabor:** `worker/reports.ts`, helper de leitura de unidades/composição se necessário, `src/features/p1/Reports.tsx`, testes de integração de relatórios/mistos e E2E. Separar itens simples de componentes, somar unidades no sabor correto, preservar snapshots e ordenar ranking por unidades. Receita da caixa deve ser contada uma única vez; se distribuída por sabor, identificar como rateio proporcional por unidades e preservar cada centavo com desempate determinístico. Manter contagem de caixas inteiras separada de unidades mistas/equivalentes, sem fingir que uma fração foi vendida como embalagem inteira. CSV precisa expressar composição/critério e continuar protegido contra fórmulas. Sem nova rota nem migração prevista.
2. **R11-5, custo e compras:** `worker/recipes.ts`, helper de demanda por sabor, `worker/recipe-domain.ts`/`shared/costing.ts` conforme necessário; UI de custo estimado no detalhe de pedido e compras; `worker/p1.ts` apenas se houver rota de consulta nova. Custo misto é calculado pelas unidades de cada componente usando fichas/insumos cadastrados, com o mesmo critério monetário existente e arredondamento explícito. Nunca aplicar o custo de uma caixa inteira de cada sabor, assumir custo zero por ficha ausente ou criar despesa/baixa de estoque. Compras consolida demanda simples + mista e arredonda lotes/embalagens de compra conforme regra atual. Falta de ficha/insumo/custo gera estimativa indisponível, inclusive para sabor não predominante. Nova consulta privada, se necessária: `GET /api/p1/order-costs/:id`, permitida aos mesmos papéis que leem fichas; 401 sem sessão, 404 para outra organização, sem cache e sem gravações.
3. **Segurança e aceite:** toda rota nova entra em `tests/integration/security.mjs`; rota exclusiva de owner exige teste 403 para operadora. Neste escopo, consulta de custo não é exclusiva de owner. Fixtures DEMONSTRAÇÃO em D1 efêmero: unidades mistas e simples, arredondamento de centavos, snapshots após renomeação/preço, filtros/período/status, ranking, CSV seguro, custo/compra sem duplicação, ausência de ficha/insumo/custo, isolamento entre organizações, sem despesa/estoque implícitos e compatibilidade com banco anterior à composição. Lint/formato/tipos/build, testes unitários, integrações afetadas, matriz de segurança e E2E Chromium/WebKit quando alterada a UI.
4. **Entrega:** commits por item em branch de trabalho; CI e workflow Segurança verdes no SHA antes de avançar main para esse mesmo SHA. Nenhum deploy manual, alteração de flags ou migração remota. Conferir a validação do main depois do avanço. Os checks não substituem o ensaio físico nem os controles do painel indicados na auditoria.

### Ordem posterior preservada

Depois desta fase: misturas em modelos recorrentes/geração semanal e no editor do PC (comparar a preservação existente com composition_version 1); R12 na etapa Quando com calendário/contagem; R6-5 → R6-7 → R6-8 → R7. Actions do Node ficam por último, após conferir as propostas do Dependabot, sem misturar manutenção de infraestrutura com a correção de cálculos. O produto cadastrado por engano com sabores como variantes não autoriza migração ou remodelagem automática dos dados; manter a orientação registrada no histórico.

### Achado de validação antes do ajuste de CSS

A suíte completa local passou em 87 E2E e falhou em duas medições Chromium do R5: último cartão termina em 752,296875 px e rodapé começa em 750,375 px. Reproduzido exatamente numa cópia limpa de 26af1d7, com Chromium oficial 156 e com o Chromium 154 instalado. Não foi causado por alteração de Totem/Today/operations/mobile (esses quatro arquivos continuam sem diff). Corrigir apenas o tamanho das fotos da grade móvel em 2 px para preservar margem com métricas da fonte do sistema, mantendo 44 px dos controles, grade e fluxo atuais. Critério: a mesma asserção estrita passa em Chromium e WebKit; não adicionar tolerância ou ignorar teste.

## Relatório — continuação sincronizada de 07/11

- **Produzido:** sincronização e plano registrados antes do código; R11-4 restante (relatórios/ranking/CSV por composição) e R11-5 (consulta privada de custo e compras por sabor). Guias refletem a montagem já ativada, sem instrução para desligá-la. Consulta de custo aparece sob os itens do pedido e só carrega ao abrir a seção. O detalhe também identifica composições existentes e usa IDs de linha como chave, sem mudar o editor do PC.
- **Testes executados:** lint/formatação/tipagem/build; 71 unitários; integrações P1 (agenda, relatórios antigos/mistos, despesas, fichas/compras antigas/mistas), 122 verificações de segurança, compatibilidade até 0014, snapshots e isolamento. E2E integral: 89 aprovados, um offline WebKit ignorado. Chromium oficial 156 e WebKit móvel. Antes do ajuste de CSS houve duas falhas de medida; reprodução idêntica em cópia limpa de 26af1d7, ajuste sem tolerância no teste, 12 cenários relacionados e suíte completa aprovados em seguida. Capturas r12-depois-relatorios-mistos/custo-misto/compras-mistas.
- **Limitações:** custo usa fichas/insumos atuais e arredondamento por unidade, não custo histórico congelado. Não inclui entrega/despesas fora da ficha, não é lucro apurado. Compras usa lotes/embalagens inteiros; pode diferir do custo proporcional. Até 1000 pedidos/vendas e 10000 linhas de sabores, sem truncar silenciosamente. Nenhum ensaio em aparelho ou dado real nesta rodada; não foi executado ZAP manual nem alterado ruleset. CI e Segurança são acompanhados por SHA antes do avanço de main.
- **Pendências:** misturas em modelos recorrentes/geração semanal e editor de pedidos do PC; R12 na etapa Quando; R6-5/7/8 e R7; Actions Node por último (Dependabot já abriu proposta). Nenhuma flag, Access, D1 ou migração remota alterada. Totem.tsx, Today.tsx, operations.ts e mobile.ts permanecem sem diff contra 26af1d7.

| Próxima ordem     | Status vigente                                                          |
| ----------------- | ----------------------------------------------------------------------- |
| R11-4 restante    | Entregue: relatórios por unidades, composição no CSV e rateio exato.    |
| R11-5             | Entregue: estimativa de produção por composição e compras consolidadas. |
| Modelos/PC mistos | Próximo; preservar as misturas existentes e o fluxo do Claude.          |
| R12               | Depois: calendário com contagem na etapa Quando.                        |
| R6-5/7/8 e R7     | Na sequência já registrada; não iniciados nesta fase.                   |
| Actions Node      | Depois das funcionalidades, conferindo Dependabot.                      |

## R14 — plano antes do código (08/11/2026)

R14 lida integralmente; main sincronizado em 085255c, sem alterações locais. Aprovação R11-4/5 recebida. Sem conflito com o fluxo em etapas ou as alterações do Claude.

- **R14-1:** centralizar nome de exibição em `worker/flavor-lines.ts`, usando snapshots e uma consulta em lote para contar variantes ativas/identificar produto. Rótulo só quando há várias variantes ativas ou componentes do mesmo produto na mesma caixa. Aplicar a relatórios, custos, compras e CSV, sem mudar os totais nem agrupar variantes distintas. Aceite: sabores separados sem embalagem repetida, variantes do mesmo produto distinguíveis, snapshot após renomeação e compatibilidade pré-0015.
- **R14-2/3:** ranking sem contadores zerados em `Reports.tsx`; equivalentes no CSV com duas casas ou inteiro exato em `worker/reports.ts`. Aceite: 16/12 = 1.33 e 24/12 = 2, cenários simples/mistos e E2E móvel.
- **R14-4:** manter GET de custo liberado à operadora; reforçar ajuda contextual em `OrderCost.tsx` e tutorial, sem nova permissão. Matriz 401/404/200 permanece.
- **Dependabot #2:** log confirma ERESOLVE: TypeScript 7.0.2 contra peer <6.1.0. Adicionar ignore do major em `.github/dependabot.yml`, sem force/legacy-peer-deps. Aguardar regeneração do PR com demais atualizações; validar antes de integrar.
- **Dependabot #1:** log confirma “Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled”. Nenhum continue-on-error nem enfraquecimento do workflow. Passo humano: GitHub → Settings → Code security → Dependency graph → Enable; depois reexecutar o check do PR. Não fazer merge vermelho. O restante da atualização das Actions será validado no PR após isso.

Depois da R14: modelo aditivo de componentes recorrentes e editor do PC, com plano/aceite específico antes do código; R12; R6-5, R6-7, R6-8 e R7. Commits por item, CI + Segurança verdes no SHA antes do main; nenhuma flag ou configuração Cloudflare alterada.

### Plano antes do código — misturas recorrentes e editor do PC

- Migração **0016** aditiva: tabelas `recurring_mixed_items` e `recurring_mixed_components`, mantendo `recurring_items` para os itens simples e sem alterar modelos existentes. FKs por organização; várias combinações da mesma embalagem permitidas, combinação duplicada recusada. Somente aplicação local; ativação pelo workflow manual do responsável.
- `worker/recurring-mixed.ts`, `mixed.ts`, `operations-domain.ts`, `operations.ts`, `listing.ts`: leitura de todos os itens/componentes em lote, validação do catálogo em lote, guarda composition_version para não apagar misturas por editor antigo; CAS e auditoria do modelo preservados. Geração semanal cria snapshots de composição no mesmo batch que o pedido, com chave semanal idempotente. Modelo inválido/inativo é ignorado com motivo, sem bloquear os válidos. Sem consulta por modelo/componente nem nova rota.
- `mobile.ts`, `finance.ts`: padrões trazem as composições e só se declaram válidos quando os sabores estão ativos/compatíveis e o recurso disponível. Comparar com o fluxo atual do Claude; não substituir suas etapas. `Totem.tsx` só adapta a aplicação do modelo para carregar misturas, mantendo a montagem atual.
- `Recurring.tsx`, `Management.tsx` e componente compartilhado de composição: adicionar/editar unidades por sabor, quantidade de caixas separada, validação da soma/capacidade, base pelo sabor predominante e empate estável; usar IDs de item para preservar snapshots em ajustes. Modelos simples, pausa/reativação e editor sem 0016 continuam funcionando.
- Backup/preflight/lista de tabelas e guia R11 incluem 0016. Aceite em D1 efêmero: duas misturas da mesma base + simples, repetição/concorrência/CAS, inativo só ignora seu modelo, soma inválida/outro tenant/peso/embalagem/duplicata recusados, defaults, consulta com 65+ registros, produção/relatório/custo sem perder composição; restauração/FKs e compatibilidade com até 0015. E2E Chromium/WebKit para modelo, geração e edição no PC. Matriz de segurança existente cobre rotas reutilizadas; incluir novos casos de composição sem mudar papéis.

### Retorno Dependabot após publicar R14

R14-1…4 e ignore publicados no main em 7f80e49, depois de CI/Segurança verdes no SHA; ambos também passaram no main. Dependabot fechou #2 e criou **#3** sem TypeScript 7, mantendo TypeScript 6. A validação do #3 passou. #1 foi atualizado pelo bot, mas ambos continuam bloqueados por “Novas dependências no PR” (Dependency graph desligado). Passos enviados ao responsável e documentados em DEPENDABOT.md; não houve merge vermelho ou alteração de configuração. A varredura do bot também relatou unknown_error em @playwright/test, sem impedir a criação do #3; o PR gerado não muda esse pacote.

## Relatório — R14 e misturas recorrentes/PC (08/11)

- **Produzido:** quatro acabamentos R14 em commits separados; ignore do major TypeScript, diagnóstico/guia do Dependency graph e PR #2 substituído automaticamente pelo #3. Misturas em modelos, defaults, geração semanal, editor completo e repetição no Modo simples; migração aditiva 0016 e guia de ativação humano. Editor antigo não apaga misturas; quantidade mantém identidade/preço, troca de base usa preço atual. Nenhuma alteração das flags atuais.
- **Testes executados:** lint, formatação, tipagem, build Pages; 71 unitários; integrações de composições/modelos (66 válidos), banco até 0015, financeiro, mobile, operações, listagens; 127 checks de segurança; backup/restauração com FKs e seis testes SQL. E2E integral: 92 aprovados e um offline WebKit ignorado. Primeiro E2E novo encontrou seletor de combobox ambíguo e serialização indevida dos campos de snapshot; corrigidos com seleção pelo papel acessível e payload só com variant_id/units, mantendo testes de preservação e erro.
- **Limitações:** 0016 não aplicada remotamente; sem ensaio físico. Models têm os limites existentes de 100 por geração e 30 linhas, JSON da geração limitado para não exceder o orçamento; nenhuma consulta por modelo/componente. Composição do modelo usa catálogo atual na geração, enquanto pedidos gerados mantêm snapshots. PRs #1/#3 sem merge até Dependency graph e todos os checks verdes; o erro externo de Workers Builds não foi tratado alterando Cloudflare.
- **Pendências/ordem:** concluir validação/envio desta etapa → R12 → R6-5 → R6-7 → R6-8 → R7. O próximo plano detalhado será registrado antes de editar. Não há deploy manual, secret, migração remota ou mudança de Access/D1 nesta rodada.

### Plano antes do código — R12 (08/11)

`DayCalendar.tsx`: reutilizar a folha/contagem existente em Quando, com mínimo opcional de hoje; desabilitar dias/meses anteriores e respeitar o limite também na entrada alternativa, sem mudar a navegação histórica do Hoje. `Totem.tsx`: chips Hoje/Amanhã/Escolher data, seleção preserva horário; chips 09/14/18 e campo de outro horário; datetime-local apenas em alternativa recolhida. Modelo válido mais próximo sugere dia/hora, identificado e editável; janela do cliente só fornece horário quando está explicitamente em HH:mm ou intervalo HH:mm–HH:mm, sem interpretar texto livre. Sucesso mostra data/hora de Fortaleza, singular de caixa e link para o dia escolhido. `Today.tsx`: parâmetro de data validado, preservado ao voltar à tela; reset explícito continua voltando a hoje.

Sem nova rota, flag ou migração. Aceite: calendário com contagem >0, passado bloqueado, escolher data/hora → confirmar → Ver na agenda mostra o pedido no dia correto; sugestão de modelo editável, parâmetro inválido ignorado; E2E nos três projetos e regressão das etapas/Hoje. Guia e captura atualizados depois dos testes.

### Plano antes do código — R6-5

Migração aditiva 0017 cria `profile_photos` (BLOB ≤40 KB, versão, vínculo por organização/membership), sem tocar em nomes ou fotos de estabelecimentos. Recurso indisponível antes da migração; flags atuais preservadas. `worker/profile-photos.ts` e `field.ts`: GET/PUT/DELETE privados por usuário, no-store; cada pessoa só altera a própria, administrador também remove outra da mesma organização. CAS/idempotência/auditoria por p1Mutation; payload WebP validado e tamanho/dimensões limitados. Matriz 401/404 e 403 para remoção administrativa por operadora; nenhuma imagem em logs/bundle/SW.

`photo.ts`, `ProfileSettings.tsx`, `CompactHeader.tsx` e `FieldContext.tsx`: câmera/galeria, recorte central quadrado com prévia circular e confirmação antes de salvar; compressão WebP até256/40KB, cancelar descarta. Avatar privado no cabeçalho, escolhas de entregador e históricos de status/recebimento; iniciais/nome de exibição continuam como alternativa. Registro de tabelas/preflight/backup e guia de ativação incluem 0017. Aceite: upload/remoção/CAS/isolamento/owner em D1 efêmero, assinatura inválida/excesso/dimensões rejeitados, backup restaura foto, E2E câmera/galeria via arquivo sintético em Chromium/WebKit; ensaio físico não será afirmado.

## Relatório — R12 e validação combinada com Dependabot

- **Produzido:** R12-1…4 na etapa Quando, calendário compartilhado com contagem e mínimo, atalhos de dia/horário, sugestão de modelo/janela e sucesso → agenda no dia escolhido. Sem alterar as etapas do Claude. Relatório/guia/captura em FASE_R12_AGENDAMENTO.md. PRs #1/#3 integrados, #2 substituído; TypeScript 6 preservado. Modelos mistos/editor e R12 rebaseados sobre as dependências novas.
- **Testes executados:** npm ci, lint/formato/tipos/build, **73 unitários**, P1, composições/modelos, **127 verificações de segurança**, backup/restauração e **98 E2E aprovados / um ignorado** (offline WebKit preexistente). Calendário com contagem, passado bloqueado, janela explícita, data inválida, confirmação e agenda corretas em Chromium móvel/desktop e WebKit. Captura inspecionada. Validação remota acompanha o SHA da branch antes de avançar main.
- **Limitações:** nenhum ensaio físico, migração/deploy manual ou alteração Cloudflare. Modelos mistos dependem de 0016 aplicada pelo responsável; R12 não exige migração nova. Updater do bot relatou unknown_error de @playwright/test, mas não atualizou esse pacote nem impediu #3/CI; sem bypass.
- **Pendências:** R6-5 (plano acima) → R6-7 → R6-8 → R7. Fotos, Web Push e visitas ainda não são declarados entregues. Não ativar recursos pendentes por mudança de flags.

## Relatório — R6-5

- **Produzido:** fotos privadas por usuário/organização, preview/cancelar antes de enviar, ≤256 px/40 KB, avatar do cabeçalho, escolhas de entregador e históricos de status/recebimento. Usuário altera só sua foto, administrador remove outra; CAS, idempotência, auditoria, no-store/nosniff e fallback às iniciais. D1 BLOB convertido explicitamente para bytes HTTP, corrigindo também leitura da fachada. Migração 0017 aditiva e guia humano.
- **Testes executados:** lint/formato/tipos/build, **75 unitários**, campo/fotos (corpo >32 KB, formato/dimensões/tamanho/metadados, corrida de versão, repetição, own/owner/tenant, banco até0016), **139 checks de segurança**, backup/restauração com as fotos/FKs. E2E integral: **101 aprovados / um ignorado**, Chromium móvel/desktop e WebKit. Prévia PNG retangular convertida a WebP quadrado, cancelar sem gravar, salvar/ler, remoção administrativa e retorno às iniciais. Captura sintética inspecionada.
- **Limitações:** recorte central automático com prévia, sem editor livre de enquadramento. Não houve ensaio de câmera física ou publicação/migração remota. A opção aparece só após 0017; flags atuais permanecem preservadas. Nenhuma foto real em testes, logs ou Git.
- **Pendências:** R6-7 (Web Push/ICS com alarme, setup e validação física) → R6-8 → R7. Modelos/R12 já no main em fbbdb45, depois de CI/Segurança verdes; validação no main também acompanhada.

### Plano antes do código — R6-7

- Migração aditiva **0018**: preferências de aviso/destinatários dos lembretes, assinaturas privadas por aparelho/usuário/sessão e fila de entregas com chave única por revisão/aparelho. Sem alterar flags. Rotas privadas para estado/chave pública VAPID, assinatura/revogação própria e aviso de teste no aparelho atual; export .ics por lembrete com VALARM. Toda rota entra na matriz 401/404, e ações exclusivas de owner recebem 403 para operadora.
- `worker/push-config.ts`, `push.ts`, `push-delivery.ts`, `push-scheduler.ts`, `reminders.ts` e `calendar.ts`: biblioteca Web Crypto Web Push RFC8291/VAPID compatível com Apple, sem criptografia inventada. Segredos só em Env; chave pública por API autenticada, nunca privada no cliente/log. Endpoints de provedor HTTPS permitidos explicitamente, sem redirecionamentos/SSRF. Payload só título/horário, sem notas/contato. Limites de aparelhos, lote e timeout. Cron com claim atômico antes do envio e sem reenvio automático ambíguo (falha/incerto fica visível, .ics é alternativa); expiração/revogação cancela fila. Logout revoga a assinatura daquela sessão.
- **Pages não recebe Cron Trigger:** Worker agendador separado e arquivo exemplo não implantável por acidente; usa D1/VAPID configurados pelo responsável, intervalo de cinco minutos, lote pequeno compatível com Free. Nenhum deploy, cron real ou secret será criado pelo agente. Guia de geração local de chaves/ativação só depois dos testes. Envio de teste também exige escolha humana, nunca no carregamento do app.
- `ReminderSheet.tsx`, `Reminders.tsx`, `ReminderEditor` conforme necessário, `PushSettings.tsx`, `public/push-worker.js`, `vite.config.ts`: Na hora/15 min/1 h/1 dia/Outro horário/Não avisar; destinatários por nomes/fotos reais do perfil; pedido de permissão só ao escolher aviso/ativar; estado do aparelho e teste, revogar/desativar, iPhone instalado iOS16.4+ explicado em HelpTip. ICS privado com alarme no momento escolhido, sem envio a clientes.
- Aceite: D1 efêmero e provedor simulado, criptografia/decriptação interoperável, cron repetido/concorrente não duplica, concluído/arquivado/revogado não envia, 410 remove assinatura, sessão/tenant/SSRF, assinatura revogada ao logout; ICS com VALARM e escaping/UTC; E2E formulário/negação/alternativa e PWA. Android/iPhone físicos dependem de ativação humana e não serão declarados recebidos neste ambiente. Backup inclui metadados de lembrete, mas exclui assinaturas/fila/segredos; restauração não deve disparar avisos antigos.

### Sincronização de 09/11 — main f998585

Li as novas entradas do histórico de 08/11…09/11, R15/R16, informações comerciais e README de sabores. Fiz rebase dos dois commits locais da R6-7 sobre f998585; comparação explícita de Management/index preservou photoChoices/aliases, catálogo novo, nomes e aviso de álcool. Totem/operations novos permanecem intactos. Não há alteração de flags ou dados reais.

**Conflito de numeração:** o briefing R15 sugere 0018, mas nenhum SQL de kits existe no main. A R6-7 já implementada localmente usa **0018_reminder_push.sql**; a futura R15 deve usar **0019+**, sem renomear migração publicada. Não editei o briefing do Claude. A prioridade nova de kits foi registrada; não converti preços/regras de kits em seeds nem antecipei a calculadora da R16. Terminarei o ponto estável de validação/envio da R6-7 antes de iniciar outra mudança de modelo de dados.

## Relatório — R6-7 (09/11)

- **Produzido:** migração aditiva 0018, avisos por pessoa/aparelho/sessão, VAPID/AES128GCM, agendador separado com claim atômico e sem repetir tentativa incerta, opt-in humano, teste/revogação/logout. Folha Hoje e edição completa com horário/antecedência/livre e nomes/fotos dos responsáveis; círculo para concluir e reabrir o último concluído no próprio Hoje, com CAS; `.ics` privado com VALARM. HelpTip/tutorial, gerador local de chaves 0600 que recusa sobrescrita e guia manual com resultados/erros por passo. Catálogo/álcool/aliases do main f998585 preservados no rebase. Nenhuma flag, secret, deploy, cron real ou migração remota alterados.
- **Testes executados:** tipagem/lint/formato/build Pages, **81 unitários**, 28 checks de API, P1, mobile, push interoperável com assinatura/decriptação independente, cron repetido/concorrente, 410, SSRF/redirect, 5xx incerto sem retry, claim abandonado, cinco aparelhos, schema até0017/configuração ausente, metadados, CAS/idempotência e logout. **153 verificações de segurança**, backup/restauração com FKs e seis testes SQL. Gerador conferido em diretório temporário: chave válida, modo0600 e EEXIST preserva identidade. Regressão E2E: 104 aprovados, um ignorado e três falhas do seletor antigo de status em planning; seletor ajustado para a confirmação de salvamento. Reteste direcionado: **9 aprovados** nos três projetos, escolha humana/negação, orientação iPhone, ICS, envio de teste e desativação. Capturas usam somente demonstração e APIs de aparelho simuladas.
- **Limitações:** não houve recebimento físico Android/iPhone, medição de CPU/limites em produção ou ativação do Cron Trigger. Push precisa da aplicação publicada, 0018, VAPID iguais em Pages/agendador e ativação de cada aparelho. A confirmação do provedor não prova exibição na tela. Arquivo ICS depende de importação/alarme confirmado no calendário, sem sincronização automática. Claims incertos/falhos não são repetidos automaticamente para evitar duplicação. Guia [FASE_R6_LEMBRETES.md](../FASE_R6_LEMBRETES.md).
- **Pendências:** CI e Segurança devem aprovar o SHA final da branch antes do avanço do main e ser acompanhados também no main. Aceite físico R6-7 após ativação humana. **R6-8 e R7 continuam pendentes**; R7 permanece sem implementação/ativação de PROSPECTS_ENABLED. O briefing novo trouxe R15 com prioridade comercial e R16 depois dela; a próxima revisão deve reconciliar essa prioridade com a ordem anterior, reservando 0019+ para kits. Nada foi declarado entregue antecipadamente.

### Plano antes do código — R6-8

Vou seguir a ordem explícita da solicitação atual para os dois acabamentos restantes da R6, mantendo R15/R16 registradas sem remodelar kits nesta alteração. Management/NavigationScroll: voltar ao topo em mudança de rota; Agenda: voltar ao topo ao mudar a data; Totem já faz isso por etapa. Abrir/fechar folhas e +/- não alteram rota nem posição. DeliveryActions/DeliveryMessageSheet: WhatsApp abre folha no cartão, chips A caminho/Chegando/Entregue/Cobrança, prévia autenticada editável e link wa.me codificado; assinatura vem do perfil do usuário, sem nome inventado. Contato realizado segue opt-in separado/idempotente. Models/operations: novo modelo Chegando e assinatura, sem migração; Cobrança reutiliza o cálculo financeiro existente e limita o resumo ao pedido selecionado (order_id opcional na prévia de cobrança), sem incluir outros pedidos nem inventar saldo ou Pix. Sem financeiro ativo não há cobrança. Mensagens nunca são enviadas pelo servidor. Aceite: rolagem Hoje→Clientes em zero, folhas preservam posição, modelos/troca/edição/URLs, assinatura, cobrança sem saldo recusada, 401/404 das rotas existentes cobertas, Chromium/WebKit. Relatório/guia/captura após testar; checks do SHA da R6-7 seguem isolados na branch anterior antes do main.

## Relatório — R6-8

- **Produzido:** rolagem ao topo em mudança de rota e data da Agenda, mantendo folhas e +/- no ponto atual; Totem preserva o comportamento por etapa. WhatsApp no cartão abre folha com quatro chips, prévia editável, assinatura do nome de exibição e link codificado; sem nome, oferece cadastro antes de abrir. Chegando disponível também nos modelos/detalhe. Cobrança limitada ao pedido, pelo cálculo financeiro existente; sem saldo/Pix inventado e sem alterar pedido/financeiro. Contato realizado opt-in/idempotente. Perfil/campo desativados preservam o acesso anterior pelo detalhe. Guia FASE_R6_WHATSAPP.md.
- **Testes executados:** tipos/lint/build, **81 unitários**, operação (14 verificações existentes), financeiro e integração adicional de prévia por pedido: duas dívidas não se somam, quitado não cobra, pedido externo/inexistente e seleção ambígua recusados, nenhuma criação de evento pela prévia. Matriz **160 verificações**. **9 E2E aprovados** nos três projetos (novo fluxo, operação básica e R8), com rolagem medida, folha sem deslocamento, troca/edição/URL/assinatura, contato repetido e ausência de saldo; reteste do novo fluxo após limitar a cobrança ao pedido. Captura somente DEMONSTRAÇÃO.
- **Limitações:** WhatsApp físico e envio humano não ensaiados; o app só prepara a conversa. O nome é editável pelo perfil, não deduzido de e-mail. Não há migração/flag nova ou configuração Cloudflare alterada. A cobrança só contempla saldo cobrável pelo extrato existente (entregas/retiradas registradas), não promete pagamento ou cobrança de rascunho.
- **R6-7 publicada:** main avançou para **0871069** após CI **42600055405** e Segurança **42600055460** verdes no mesmo SHA; os checks do main também estão sendo acompanhados. Implementação de avisos entregue; ativação e aceite Android/iPhone físicos continuam manuais e pendentes.
- **Pendências:** validar CI/Segurança do SHA final R6-8 antes do main. **R7-1…9 ainda pendentes**, sem PROSPECTS_ENABLED ativada. R15/R16 novas estão registradas; conservar 0019+ para a próxima migração. Ponto estável da entrega será a R6 completa no código, com as limitações físicas da R6-5/R6-7 explicitadas, sem declarar visitas/kits/calculadora implementados.

## Plano antes do código — R15/R16/R17/R7 (12/11)

**Ordem confirmada:** R15 → R16 → R17 → R7. Cada parte implementada será distinguida da fase completa; não ativar recursos incompletos. Branch com CI e Segurança verdes no SHA exato antes do avanço do main, commits pequenos, nenhuma migração/deploy/configuração Cloudflare. Sem seeds de catálogo, custos ou clientes. Toda rota nova entra em security.mjs (401/404 e 403 para ações owner).

### R15 — kits, compatibilidade e telas

1. **Fundação 0019 (primeiro commit funcional):** tabelas próprias `kits` (peso final e de massa, unidades, preço em centavos, limite, embalagem opcional, ativo/versão) e `kit_settings` (limitar sabores ligado por padrão, CAS/auditoria). Sem criar produto/variante fictício para representar kit, sem alterar o catálogo real. API privada de cadastro/listagem/edição e configuração; owner escreve, operadora lê. Registro de schema/preflight/backup, tela de administração e guia. Sem 0019, telas existentes continuam e o novo cadastro informa indisponibilidade.
2. **Pedidos e recorrências:** extensão aditiva separada dos itens de 0015/0016, com snapshots de kit/composição por produto-sabor, preço e peso. Validar soma, capacidade, quantidade, ativo, organização e limite lido no servidor em toda gravação; preservar composições antigas ao só mudar quantidade. Nada de apagar/converter pedidos/modelos existentes. Adaptadores de leitura agrupam itens antigos e kits com origem explícita; todos os leitores (management/mobile/operations/recurring, defaults, Totem e editor PC) e os cálculos são verificados antes de habilitar vendas de kits.
3. **Telas/cálculos:** Kits separado de Sabores; Totem escolhe peso e capacidade antes da composição, contagem por sabor para kits grandes; mantém etapas Quando/Entrega/Pagamento/Revisar, snapshots, álcool e assinatura/telefone visível. Hoje/WhatsApp/relatórios/CSV/compras/custos usam sabor × peso; embalagem uma por kit, sem duplicar embalagem de receita. Embalagem/custo ausente é indisponível/aviso, nunca zero inventado. Clientes: estabelecimento/pessoa, kit padrão opcional, ocasião no pedido, pessoa sem sugestão de recorrência e sem prazo comercial. Preservar acesso operacional existente.
4. **Aceite R15:** integração legacy até0018 e migração com FKs/backup, kit25×15g/5 sabores válido; kit12/4 sabores recusado com limite ligado e aceito com limite desligado por owner; soma/tamanho/inativo/tenant/CAS/repetição; operadora403 no cadastro/configuração; preço/snapshot e embalagem; E2E Chromium/WebKit sob CSP real, sem inline/eval/externos. Sem declarar a R15 completa até fechar pedidos, recorrências, financeiro e relatórios.

**R17-6 junto à migração:** avaliar número persistido com sequência transacional por organização, preservando a numeração histórica e fallback em bancos antigos; incluir testes de concorrência/restauração antes de substituir COUNT nas leituras. Não criar coluna sem ligar corretamente todos os caminhos de inserção e backup.

### R16 — fichas por peso

Extensão aditiva das fichas: massa por receita, acabamento por doce/tamanho e custo por receita; pesos de massa editáveis no kit. Cálculo puro/testado de rendimento, escala de superfície marcada estimativa e custo/margem/preço por doce/kit; só confirmação salva sugestões. Preservar fichas/custos antigos e não mudar preço/despesa automaticamente. Testes do exemplo fictício do item 12 da R16, arredondamento, insumo sem preço indisponível, autorização owner e leitura operadora; E2E.

### R17 — revisão de segurança e uso

Importação owner de insumos CSV/XLSX com prévia, proteção contra fórmulas/limites, nome e confirmação individual para mudar preço existente; schema/ledger e testes próprios. Rascunho do Totem preservado por usuário/organização em memória ou sessionStorage só com IDs/quantidades, sem telefone/endereço/notas; restaurar depois de autenticar sem submeter sozinho. Remover /app, módulos/demo e testes exclusivos, mantendo manifesto/raiz privada. Avisos mostram expiração da sessão e guia explica logout/vencimento. Sessão deslizante é opcional e será incluída somente se simples e testável sem renovar acesso revogado. ZAP: executar alvo efêmero com headers reais; ligar fail_action apenas depois de relatório limpo, mantendo justificativas específicas em rules.tsv, sem ignorar alertas para forçar verde.

### R7 — visitas/amostras

Só após fases anteriores: contatos/prospecção, visitas/amostras, unidades de produção separadas de venda, custo estimado separado de receita, retorno WhatsApp assistido e conversão explícita em cliente; migração aditiva e PROSPECTS_ENABLED inicialmente desligada. Plano específico de tabelas/rotas/aceite antes da implementação; não ativar a flag ou misturar visitas com faturamento.

### Achado durante o teste CSP da R15-A (antes da correção)

O fluxo de login passa pelo Hoje, cujas barras de produção ainda tinham `style={{width:...}}` (Today.tsx). Essa era uma violação real potencial nas barras, corrigida separadamente. Os três avisos iniciais persistiram: a instrumentação apontou a criação dos três selects nativos no WebKit, em nós internos, sem style atribuído pelo componente. A nova tela usa ChoiceChips para tamanho/capacidade/embalagem, evitando o problema e reduzindo toques. Trocar a barra decorativa por progress com value/max e CSS externo, preservando contagens/layout e aria-hidden. Validar Hoje/R10 e a tela nova sob CSP real, sem bypass no fluxo. Apenas o contexto separado de fotografia usa bypassCSP documentado, pois o Playwright injeta body{} no WebKit ao fotografar. Nenhuma alteração em public/_headers.

## Relatório — R15-A: cadastro de kits e segurança CSP

- **Produzido:** sincronização 7d20cfd, plano de toda a fila, migração aditiva0019, cadastro/listagem/edição/inativação de kits, peso de massa opcional, vínculo com embalagem e configuração owner de limite. Operadora consulta; CAS, repetição e auditoria no servidor. Registro de tabelas/preflight/backup; tela em Mais → Kits, chips e campos numéricos comuns, guia FASE_R15_KITS.md. Sem produtos/variantes artificiais e sem seeds. Correção separada das barras inline do Hoje para progress/CSS externo.
- **Testes executados:** tipos/lint/formato/build Pages; **81 unitários**, seis testes SQL; **178 verificações de segurança**; integração de kits com disputa de versão/primeira configuração, replay, embalagem/unidade, custo desconhecido, snapshot antigo intacto, tenant/owner e fallback até0018. Backup/restauração com kit/configuração/FK da embalagem. **15 E2E aprovados** em Chromium móvel/desktop e WebKit (kits, R10 e cabeçalhos): criar/editar, regra persistida, consulta operadora, proporções da produção e zero violações CSP no novo fluxo. Captura fictícia inspecionada. Os testes iniciais expuseram contrato de insumos incorreto, seletor ambíguo e estado assíncrono do checkbox; corrigidos sem enfraquecer permissões. O diagnóstico CSP distinguiu a barra inline real e estilos internos de select no WebKit; não há bypass no fluxo funcional.
- **Limitações:** **R15 completa ainda não entregue**. O kit cadastrado não entra em pedidos/modelos/editor nesta parte; a tela informa isso. A regra de limite só valerá para pedidos com kits, sem alterar os registros legados. Custos por kit/R16, cliente pessoa/ocasião e relatórios por tamanho dependem da integração seguinte. R17-6 avaliada, mantendo COUNT até introduzir sequência com todos os caminhos de gravação/restauração testados. Nenhuma migração, deploy, secret, flag ou configuração remota executada.
- **Pendências e retomada:** passar CI/Segurança do SHA da branch antes de avançar main. Próximo R15-B: snapshots/composição de itens e modelos por kit, validação servidor do limite/soma/ativo/tenant, adaptação Totem/PC e leitores/calculadores, cliente pessoa/ocasião. Depois R16 → R17 → R7, conforme solicitação de 12/11. Não declarar 25 doces/5 sabores ou bloqueio de 4 sabores por pedido testados nesta etapa: só cadastro de capacidade/limite foi exercitado.

### Plano R15-B — antes de integrar itens de pedido

R15-A chegou ao main em e722867, com CI43252503160/Segurança43252502573 verdes na branch. Próxima migração0020 cria `kit_order_items` e `kit_order_components` com snapshots, separadas de `order_items`/`order_item_components`. Kit não ganha variante artificial e sabor é produto, não variante. Projeções SQL somente leitura normalizam os dois formatos para os leitores existentes, sem views persistentes que precisem de tratamento especial no backup; os writers continuam nas tabelas de origem. Banco até0019 usa as consultas antigas. Novos itens são marcados `kit_id`/`product_id`; esses IDs não serão enviados ao validador de variantes legado.

Preparação em lote de kit/configuração/produtos, validação de soma/capacidade/limite/ativo/tenant e snapshots; mudar só quantidade mantém preço/capacidade/composição histórica, trocar composição usa catálogo/preço atual. API só passa a criar itens de kit depois de leitores, confirmação e edição estarem ligados; não deixar pedidos invisíveis na listagem/produção/relatórios. Escrita de cabeçalho e itens em um mesmo batch/CAS. Adaptar childrenByParent/attachComponents e relatórios/produção para leituras unificadas, preservando fallback e as variantes dos registros antigos. Em seguida ligação às rotas de gestão/mobile, telas Totem/PC, recorrências e cálculos. Testes com pedidos de ambos os formatos, FK/backup, sem produtos/variantes virtuais e sem mutação de pedidos antigos.

### Checkpoint R15-B1 — modelo e helpers (ainda sem API de pedidos)

R15-A confirmada também no main: CI43253664575 e Segurança43253664505 verdes em e722867. O trabalho seguinte fica em `codex/r15-kit-order-model`, sem avançar o main nem aplicar0020 enquanto faltarem leitores/controllers/telas.

- **Produzido:** schema aditivo0020 (snapshots de kit e composição por produto-sabor), preparação em lote, validação pura da capacidade/soma/limite/ativo/tenant e projeções de leitura para formato legado+kit. Guard de escrita para o batch do cabeçalho; preço/composição históricos preservados ao mudar quantidade, nova composição usa catálogo/preço atual. Sem variante artificial. Sem views persistentes, simplificando restauração.
- **Testes executados:** tipos/lint, **85 unitários** (kit25/5, kit12/4 bloqueado ou liberado pela regra, soma, inativo, produto ausente, duplicidade, campo de peso indevido, quantidade inválida, snapshot). Helpers compilados para Node chamam o D1 efêmero real; ensaio de schema/projeções/guard/isolamento e fallback até0019. Backup/restauração com linhas de ambos os modelos e FKs é verificado na integração. Nenhum endpoint de teste foi introduzido no produto.
- **Limitações:** as projeções ainda não substituem todos os leitores e os controllers de pedidos não aceitam kit_items; não há criação de pedido com kits pela UI/API nesta branch. Isso evita publicar itens que as telas atuais omitam. Migração0020 permanece só na branch, sem ativação remota. Não declarar R15-B concluída.
- **Próximo:** childrenByParent/attachComponents, consultas de pedidos/Hoje/flavor-lines/defaults, guard dos editores legados; depois writers mobile/management, cliente/ocasião, Totem/PC, recorrências e custos/relatórios. Manter testes antigos e ligar o fluxo novo somente após cobrir os leitores. R16/R17/R7 seguem pendentes na ordem solicitada.

### R18 — cadastro ajustado sobre 5aede5c

- **Produzido:** 0020 amplia catálogo antes das referências; faixa 1–500 no SQL/Zod/composição, Outro no cadastro, sugestões de massa editáveis, avanço de capacidade sem preço e estado vazio com Insumos. 0019 intocada.
- **Testes executados:** sete SQL (catálogo existente/versões/configuração preservados), integração kits/modelo com D1 efêmero, 85 unitários, lint, tipos, build Pages e três E2E de cadastro/edição/customizados sob CSP real. Todos passaram.
- **Limitações / pendências:** R15-B continua em integração; este commit não libera venda de kits. R16 7–12 lida e incorporada ao plano; implementação somente após R15-B. Sem alteração remota de Cloudflare.

### R15-B2 — leitores e custos conectados (escrita pública ainda pendente)

- **Produzido:** listagem/detalhe/Hoje e WhatsApp incluem snapshots de kits e composição por produto, com `kit_id` explícito e sem anunciar kit como variante. Hidratação em lote; produção e relatório preservam pesos, capacidade e receita. Custos/compras procuram ficha ativa do produto no mesmo peso (ambiguidade ou ausência = indisponível). Embalagem vinculada ao snapshot entra uma vez por kit; custo do kit exclui `packaging_cents` da ficha, preservando a fórmula legada nos itens antigos. Ausência de embalagem é aviso, nunca custo zero. Editor antigo recusa com 409 um pedido com kits, antes de modificar itens/total.
- **Testes executados:** integração D1 com 66 pedidos e kits, legado + kit no mesmo pedido, leitura isolada por organização, produção por peso, relatório com rateio exato, WhatsApp, bloqueio do editor antigo, custo/compra de embalagem sem duplicação e backup/restauração/FKs. Regressão P1 completa, operações (14 checks), mobile, listagem 65/216, backup, 178 checks de segurança, 85 unitários, sete SQL, lint/tipos/build/formatação e 15 E2E (kits/mistos/R10) passaram. Captura `r18-depois-cadastro-kits.png` inspecionada, dados DEMONSTRAÇÃO.
- **Ponto de retomada:** ainda não há `kit_items` nos schemas/controllers públicos de escrita, nem montagem por kit em Totem/PC/recorrência. Não avançar este checkpoint isolado para main como R15-B completa. Próximo: ligar gravação combinada legado+kit em uma transação/CAS, recusa de editor sem versão de kit, validação na confirmação individual/lote e guardas de financeiro; depois modelos/geração/defaults, montagem Totem/PC, pessoa/estabelecimento e ocasião. A produção/relatório já separam capacidade para equivalentes; revisar a apresentação agregada sabor×peso quando houver duas capacidades no mesmo dia. Nenhuma rota nova foi aberta neste checkpoint.
- **R16:** somente planejamento atualizado aos itens 7–12 e números do exemplo. Não implementada; permanece após R15-B. Nenhum dado de custo real é semeado e nenhuma configuração Cloudflare foi alterada.

- **R15-B2, compatibilidade adicional:** fixture com duas variantes do mesmo produto/peso e fichas distintas confirma que kit com ficha ambígua permanece indisponível; item legado continua selecionando sua ficha pela variante e preserva o cálculo anterior. Integração, tipos e lint passaram. Commits da retomada: `4fae3a4` (R18) e `b1de1dd` (leitores), publicados na branch `codex/r15-kit-order-model`; main mantido em `5aede5c` até concluir a integração de escrita/telas descrita acima. Segurança de b1de1dd aprovada; os checks deste ajuste devem ser conferidos no SHA mais recente, não reaproveitar o resultado do anterior.

### R15-B3 — escrita autenticada clássica/móvel (telas ainda em integração)

- **Produzido:** `orders` e `mobile/orders` aceitam `kit_items` explícitos, inclusive pedidos só de kits e pedidos combinados com legado. Soma, atividade, limite por kit e configuração atual vêm do servidor; preço/capacidade/massa/embalagem/nome ficam em snapshots. Edição só de quantidade com `item_id` preserva snapshots. Gravação dos dois formatos usa o mesmo cabeçalho/transação/CAS/idempotência e valida o total combinado contra recebimentos. Sem estoque/despesa ou variante artificial. KIT com vários sabores respeita MIXED_BOXES_ENABLED, e a gravação exige P1 ativado. Nenhuma flag foi mudada.
- **Segurança/compatibilidade:** confirmação individual e lote reutilizam revalidação de kits/sabores ativos e soma histórica. Editor que omita `kit_items` recebe 409 se o pedido tiver kits. `mobile/defaults` retorna a composição dos kits, mas marca a repetição antiga inválida até integrar a tela, evitando repetir só a parte legada do pedido. Sem rota nova: são os endpoints privados existentes; os cenários de kit têm 401/tenant/CAS e testes próprios no comando `test:kits` do CI.
- **Testes:** testes D1 de criação clássica e móvel pela operadora, kit25×15g/5 sabores, kit12×30g/4 sabores recusado, soma incorreta/peso injetado recusados, concorrência 200/409, repetição idempotente, snapshot de preço, confirmação com sabor inativo, isolamento, FKs e nenhum SKU por kit. Regressão API (28 checks), mobile e operações (14 checks) passou. Leitores e backup com 66 pedidos também passaram. Lint/tipos, 85 unitários e 178 checks de segurança passaram; formatação também aprovada. CI/Segurança remotos devem ser conferidos no SHA deste commit.
- **Ainda pendente / ponto exato de retomada:** montar `KitItemsEditor` reutilizável, integrar Totem e editor PC (preservar seis etapas); migração seguinte para modelos/componentes de kit, geração em lote sem N+1 e defaults completos; pessoa/estabelecimento, kit padrão e ocasião; finalizar produção/relatórios por sabor×peso com equivalentes por capacidade. Depois R16 completa com os itens 7–12. Esta branch ainda não é a R15-B concluída e não deve avançar main até o conjunto estar pronto, com CI/Segurança no SHA final.

### Retomada 13/11 — a7a1c64 e montagem R15-B

Main `a7a1c64` incorporado por merge, sem conflitos e sem alterar as APIs de kits existentes. R16 atualizada no briefing: sacola de envio é 1 por pedido; cálculo por kit pressupõe um kit por pedido; exemplo iFood R$ 70,28 (exemplo fictício atualizado em 14/11). O commit também registra rendimento provisório de Caipirinha; não criar seeds ou assumir rendimento medido. R16 permanece posterior à R15-B.

Próxima entrega R15-B, antes de codificar: componente compartilhado `KitItemsEditor` e helpers de apresentação/preço histórico, integração nas etapas Sabores/Revisar do Totem e no editor PC, mantendo itens legados e todas as seis etapas. Arquivos: `src/components/KitItemsEditor.tsx`, hook de catálogo privado, `shared/kit-orders.ts`, `Totem.tsx`, `Management.tsx` e E2E de kit25×15g/cinco sabores, edição só de quantidade com preço histórico e pedido combinado. Aceite: selecionar peso/capacidade antes da composição; contagem em unidades, limite visível, Completar/Limpar, álcool, soma exata e confirmação real via API; nenhum estilo inline/CSP relaxada; preservar itens legados e permitir remoção explícita. Depois modelos/geração em lote, defaults, pessoa/ocasião e fechamento da R15-B. Checkpoint anterior `3b6a024`: CI e Segurança aprovados, 116 E2E passaram e um ignorado.

### R15-B4 — montagem no celular e editor PC

- **Produzido:** `KitItemsEditor` compartilhado com tamanho/capacidade, preço visível, contagem por sabor, limite efetivo, Completar/Limpar, aviso de álcool, soma exata, quantidades de kits e remoção explícita. Totem mantém as seis etapas; kits entram em Sabores e Revisar/total/payload, com itens legados preservados em expansão de Embalagens anteriores. Ordenação dos sabores reutiliza a preferência/estatística já existente. PC carrega e salva os dois formatos, preservando snapshot em alteração só de quantidade; mudar composição usa preço atual. O limite do servidor continua obrigatório.
- **Compatibilidade e CSP:** clientes/bancos anteriores seguem no fluxo legado; indisponibilidade 503 do módulo opcional não simula cadastro. Nenhum estilo inline, eval ou serviço externo. Contextos funcionais usam CSP real; só contexto separado para screenshot tem bypassCSP comentado. Corrigido deslocamento de botão no WebKit: a grade reserva lugar para OK, evitando que blur/remontagem da linha numérica cancele o toque em Salvar. A expansão usa DisclosureSummary, sem marcador triangular nativo.
- **Testes executados:** 86 unitários, tipos/lint/build/formatação, integração kits/snapshots/APIs e 178 checks de segurança passaram. Nove E2E direcionados de kits + fluxos legados passaram; os três ensaios de kits foram repetidos com teste adicional de alteração de composição e capturas (Chromium móvel/PC e WebKit móvel), todos verdes. Ensaio real de kit25×15g com cinco sabores, bloqueio visual do quarto sabor no kit12, confirmação, reabertura, edição PC de quantidade com preço histórico e troca de composição com preço atual. Capturas `r15-depois-pedido-kit.png` e `r15-depois-montagem-kit.png` inspecionadas; dados DEMONSTRAÇÃO.
- **Limitações / pendências:** esta é a montagem de pedidos, não a conclusão da R15 inteira. Continuar por kits em modelos/geração em lote sem N+1 e defaults completos (Repetir pedido de kit ainda protegido/desligado no retorno antigo), pessoa/estabelecimento, kit padrão e ocasião, acabamento da produção/relatórios por sabor×peso/equivalentes. A branch incorpora `a7a1c64`; main não avança enquanto a integração estiver incompleta. R16 permanece posterior, incluindo sacola iFood 1 por pedido e exemplo R$ 70,28 (exemplo fictício atualizado em 14/11). Sem deploy, migração ou configuração Cloudflare remota.

### R19-1 — índice de itens por pedido

Produzido: índice `kit_order_items_order(organization_id,order_id)` na 0020, ainda não aplicada fora dos testes. Sete testes SQL passaram; o plano SQLite de SELECT e DELETE usa o índice. Migração/backup/integração de kits continuam válidos. Sem aplicação remota.

### R19-4 — kit padrão do cliente no perfil

Produzido: `default_kit_id` opcional no JSON de perfil, sem nova tabela/rota. Valida kit da própria organização e atividade na mudança; permite preservar um padrão já arquivado ao editar outros dados. Campo omitido por editor antigo é preservado; null limpa explicitamente. CAS e auditoria do perfil existentes são mantidos. Escolha por chips em Dados do estabelecimento. Integrações de kits/perfil, financeiro, backup e 178 checks de segurança passaram. A adição rápida pela operadora é ligada no componente móvel no commit seguinte.

### R19-2/3/4/5 — montagem, textos e adição rápida

- **Produzido:** uma linha .mix-row por sabor, foto44/fallback, nome/álcool e −/contador/+, um único Completar com o sabor escolhido, Limpar no rodapé e desenho apenas até12. Cartão usa Quantos kits iguais, Editar sabores/Remover com nome acessível do kit. Kit padrão salvo vem selecionado; um toque no sabor soma um kit inteiro. Trocar kit expande as demais opções somente quando solicitado. A montagem mista começa no kit selecionado, e snapshots continuam preservados para ajuste só de quantidade. Padrão do catálogo é exclusivamente12×30 quando esse cadastro ativo existe, sem criar kits/preços.
- **R19-5:** aviso compacto em Kits e montagem quando houver produto com várias variantes ativas. A regra um produto por sabor fica sempre visível; nomes/detalhes ficam na expansão, sem bloquear variantes legítimas por tamanho nem convertê-las em sabores.
- **Testes executados:** seis E2E nos três projetos, incluindo salvar padrão na tela do cliente, recuperar no celular, trocar kit localmente, adicionar e confirmar um kit em um toque, montagem 25×15g com cinco sabores, limite3 do kit12, edição PC/preço histórico e composição/preço atual. CSP real no fluxo funcional; contexto separado de captura com bypassCSP comentado apenas por injeção CSS do screenshot WebKit. 86 unitários, tipos/lint/build/formatação; sete SQL com uso de índice em SELECT/DELETE; integrações kits/perfil (padrão externo/inativo, omissão preservada e limpeza explícita), financeiro, backup e 178 checks de segurança passaram. Capturas inspecionadas: r19-depois-toque-rapido e r19-depois-montagem-compacta, somente DEMONSTRAÇÃO.
- **Limitações / pendências:** não há ensaio em iPhone físico. A R19 encerra os cinco ajustes da revisão, mas R15-B inteira continua pendente de kits recorrentes/geração/defaults completos, tipo Pessoa/Estabelecimento, ocasião e consolidação sabor×peso/equivalentes. Manter branch até fechar esse conjunto e CI/Segurança aprovarem o SHA de avanço; R16 vem depois. Sem deploy, migração ou alteração de flags remota.

### Complemento R19-4 — modelo legado visível

Produzido: preenchimento por modelo antigo mantém Embalagens anteriores aberto, com itens/valores visíveis. Adição rápida por kit fica disponível quando não há seleção legada; combinar formatos continua possível pela montagem explícita. Nenhuma conversão de SKU, preço ou modelo é feita. Testado nos três projetos: modelo antigo de R$ 10,00 mantém esse valor mesmo com kit novo de preço diferente no catálogo. O restante da migração funcional de recorrências para kits continua pendente, como informado na R15-B.

- **Checagem R19:** o CI de 5afdf02 parou na formatação de uma cadeia de locator no teste novo. Correção apenas de estilo aplicada; format:check local passou. Segurança desse SHA passou; conferir CI e Segurança novamente no commit da correção, sem avançar main com check vermelho.

### Plano R15-B5 — recorrências e defaults com kits (14/11, antes do código)

Modelo: 0021 aditiva com `kit_recurring_items` e `kit_recurring_components`, snapshots do modelo e vínculos compostos por organização, índice de template; sem SKU artificial. As tabelas são dados de modelos/movimentos e seguem a limpeza de recurring_templates/produtos automaticamente; não entram em KEEP. Kits/configuração já são preservados. Incluir tabelas no backup/pré-checagem e testar limpeza/FKs. Gravação do modelo: lista `kit_items` explícita, guarda de editor antigo, CAS/auditoria e composição/limites/atividade no servidor; sem reprecificar pedidos antigos. Geração: carregar catálogo/configuração em lote, ignorar somente modelo inválido, snapshot de preço atual, idempotência semanal e nenhum N+1 para mais de60 modelos. Defaults: devolver os dois formatos, cliente moderno declara suporte a kits; cliente antigo não pode repetir apenas a parte legada. UI: reutilizar KitItemsEditor em Recurring e aplicar modelos/último pedido no Totem/PC, preservando seis etapas e preço corrente em novo pedido. Arquivos: 0021, kit-order-items/novo kit-recurring, recurring-mixed, operations/mobile/finance, registry/preflight, Recurring/Totem/Management e testes API/backup/cleanup/E2E. Critérios: kit25/5 sabores em modelo, geração 65+ pais sem exceder limite do D1, inativos/tenant/CAS, limite histórico em composição intocada, fallback de schema anterior, cliente antigo protegido, restauração e limpeza coerentes. Importação de Kits será extensão de ImportCatalog quando a R15 consolidar, não outro importador. R16 segue posterior.

### Relatório R15-B5 — recorrências com kits

- **Produzido:** geração semanal e edição de modelos com itens legados e kits, guarda de editor antigo, validação de atividade/soma/limites/organização, CAS e auditoria. Quantidade sem mudar composição conserva o modelo anterior; semana nova usa catálogo/preço atuais. Reutilização no Totem e no editor do PC, com declaração explícita de suporte a kits. Migração 0021, registro no backup e pré-checagem; guia atualizado sem ativação remota.
- **Testes executados:** 89 unitários, sete SQL, tipos/lint/build/formatação, suites de kits/recorrências/caixa mista/operações/mobile/backup/limpeza e 178 verificações de segurança passaram. Ensaio com 67 modelos e 66 pedidos por semana, repetição sem duplicar/reprecificar, isolamento, disputa CAS, inativo isolado, limite histórico, fallback até0020, restauração SQLite/FKs e limpeza local com KEEP. Quinze E2E direcionados passaram em Chromium móvel/PC e WebKit móvel (incluindo o importador do main). Mais três E2E finais passaram com PC e operadora em contextos separados, preenchimento por modelo e repetição do último pedido após arquivar o modelo, sem violações de CSP no fluxo móvel. Captura r15-depois-modelo-kit inspecionada, só com dados DEMONSTRAÇÃO.
- **Limitações:** sem iPhone físico e sem execução remota. O WebKit local emite style-src-attr ao criar select required com opção vazia, reproduzido fora do app numa página mínima sem React/estilos inline. A CSP não foi relaxada; o fluxo móvel de kits é exercitado separadamente do editor PC. CI e Segurança devem ser conferidos no SHA final publicado da branch.
- **Pendências:** pessoa/estabelecimento e pagamento aplicável; ocasião em Revisar/Hoje/WhatsApp; consolidar produção/compras/relatórios por sabor×peso e equivalentes por kit. R16 somente depois da R15-B; exemplo fictício vigente iFood R$ 70,28. Nada de deploy/migração/flags/limpeza no Cloudflare.

Antes do ensaio adicional de orçamento D1: instrumentar somente o helper de testes para contar preparações no handler real de geração (67 modelos), mantendo D1/SQL reais e sem rota de teste no produto. Aceite: no máximo45 preparações no handler, reservando cinco consultas para autenticação/roteamento dentro do teto50; validar também a repetição sem alterações.

Resultado do orçamento: o handler real de geração com67 modelos preparou39 consultas SQL, incluindo os batches; autenticação usa uma consulta adicional no roteador (teto50). O teste exige no máximo45, reservando cinco. Repetição retornou created=0, com os mesmos pedidos.

### Plano R15-B6 — pessoa/estabelecimento e ocasião (14/11, antes do código)

Main f645068 incorporado; li Histórico14/11(2)–(5) e a atualização de segurança. Repositório privado não muda a regra: nenhum custo/cliente real em docs, testes ou capturas. KEEP permanece reservado a cadastro/configuração; não criar outro importador (R17-1 já coberta). Rodar format:check antes dos envios, agrupar formatação no commit funcional. Push da branch roda Chromium móvel; antes de avançar main, disparar Validação da gestão manual no SHA da branch para os três navegadores, além de Segurança verde.

Modelo: 0022 aditiva com customers.customer_type (establishment/person, padrão establishment para todo legado) e orders.occasion (opcional, lista fechada). Nenhuma tabela nova/alteração de KEEP. Campos opcionais nos contratos antigos: omissão conserva o valor em edição; schema anterior continua atendendo as chamadas antigas, campos novos sem migração retornam503. Alterações atômicas no mesmo CAS/mutação/auditoria; hashes de idempotência incluem os campos novos.

Pessoa: nome/telefone opcional/endereço opcional/observações nas telas existentes; textos de estabelecimento apenas para esse tipo. Pessoa não recebe sugestão de modelo recorrente e não pode ter modelo novo; geração ignora eventual modelo antigo associado a pessoa. Pagamento na entrega ou adiantado, sem inventar sinal; servidor rejeita crédito e exige condição aplicável na confirmação com financeiro. Histórico financeiro existente permanece legível. Ocasião aparece no Revisar, Hoje e WhatsApp assistido, preservando snapshots e telefone opcional/visiblePhone.

Arquivos: 0022, shared/customer-order, schemas e helper de compatibilidade; management/mobile/finance/operations e defaults; Customers/Profile/Totem/editor PC/Today/OrderDetail, guia e testes de API/segurança/SQL/E2E. Sem rota nova: estender contratos privados já na matriz. Aceite: tipos/ocasiões persistem e não se perdem em editor antigo; tenant/CAS/idempotência; pessoa sem telefone e retirada; crédito/recorrência de pessoa bloqueados também na API; fallback schema0021, backup/restauração/limpeza; fluxo móvel sob CSP real. Depois conferir produção/compras/relatórios com mesmo sabor em dois pesos e equivalentes por kit; R16 só após fechar R15-B.

### Plano R15-B7 — conferência sabor × peso (antes do ajuste)

Conferir com duas composições do mesmo sabor em15g e30g, capacidades25 e12, compras/fichas por peso, embalagem uma vez por kit, custo sem repetir a embalagem da ficha, receita financeira sem duplicar centavos e CSV. Corrigir a divisão inteira na produção (frações de caixas equivalentes não podem virar zero) e mostrar tamanho/capacidade/equivalentes na tela de relatórios. Preservar rótulos das variantes históricas, sem converter cadastro antigo. Arquivos: operations, Reports/Today e ensaio integrado kit-size-analysis; sem nova rota/tabela/flag nem insumos reais. Acabamentos rápidos R19: Trocar kit ao lado da escolha, instrução acima dos sabores, contador visível; fotos já vêm do cadastro existente. Revalidar fluxo móvel/PC e CSP antes de publicar.

### Relatório R15-B6

Produzido: cadastro Pessoa/Estabelecimento, dados/condições conforme o tipo, ocasião opcional no celular/PC e leitura no Hoje/detalhe/WhatsApp; novos modelos recusam pessoa e geração ignora modelos antigos desse tipo. APIs preservam campos omitidos por editor antigo, CAS/idempotência e auditoria. Campo novo sem0022 retorna503; a interface mantém o fluxo anterior sem expor controles novos. Guia/tutorial e pré-checagem atualizados. Corrigida também a pré-checagem de Push, que indevidamente dependia das tabelas de kits.

Testes executados: APIs pessoa/ocasião, ausência de telefone/marcador, backup/restauração com os campos novos, CAS/tenant/idempotência, tipo e ocasião omitidos, pagamento/recorrência validados e fallback até0021. Integrações de kits (40 preparações SQL no handler de geração para67 modelos), financeiro, operações, mobile, limpeza, SQL e178 verificações de segurança passaram. Pessoa+kit+pagamento+ocasião e interface sem0022 passaram no Chromium móvel; WebKit móvel passou nos dois casos finais sob CSP real. O observador de CSP fica no fluxo novo/Hoje; o detalhe legado usa select nativo com o artefato WebKit já documentado. Captura somente DEMONSTRAÇÃO em contexto separado de fotografia.

Limitações/pendências: aparelho físico e ativação remota não executados. B7 ainda em andamento; R16 posterior. Checks remotos deverão aprovar o SHA final, com execução manual completa no branch conforme14/11(5).

### Relatório R15-B7

Produzido: divisão fracionária no Hoje, capacidade/peso/equivalentes visíveis no relatório, acabamentos de toque rápido da R19. Teste regressivo falhava (1 equivalente em vez de2) antes da correção e passa depois, com quatro linhas sabor×peso, capacidades25/12, custo/compra por peso, embalagem única e CSV; receita conserva os centavos. Testes: suites kits, P1, mistos e178 verificações de segurança;12 E2E Chromium/WebKit móveis incluindo fluxos antigos da produção, operação e R19. Capturas inspecionadas com dados DEMONSTRAÇÃO. Limitação: sem aparelho físico ou ativação remota. Pendência final R15: permitir cadastro de sabor para kits sem obrigar embalagem/preço artificiais, depois checks completos do SHA antes de qualquer avanço.

### Plano R15-B8 — sabor sem embalagem artificial (antes do código)

O editor legado ainda obriga variante/preço ao criar produto. Para completar a separação sabor/kit, permitir lista de embalagens vazia explicitamente só com catálogo privado de kits/P1 disponíveis. Produto continua nome/descrição/foto/ativo; não criar variante, peso, preço ou seed. Expor Somente sabor (para kits) na criação habilitada pela sessão; pedidos antigos e embalagens cadastradas continuam preservados. Arquivos: schemas/management, Products, testes de API e E2E. Aceite: owner cria sabor sem variante e monta kit com ele; operadora403, organização externa404, anônimo401; schema/flags anteriores recusam essa criação e mantêm fluxo legado; ficha ausente mostra aviso. Reutilizar importador atual futuramente, sem novo importador/rota. Sem tabela/KEEP/flag nova.

Correção do plano B8: a SPEC §2 permite que operador gerencie produtos. Preservo essa permissão na criação de sabor sem embalagem;403 continua para cadastro/configuração de kits, sem restrição nova nos produtos. Para fechar compatibilidade de ativação, a sessão também informa schema de itens/modelos de kits; Totem/PC/modelos só oferecem a montagem nova quando sua tabela existe. Banco0019 com catálogo cadastrado mantém a venda pelas embalagens anteriores até0020, e modelos até0021. Acrescentar ensaio de interface para esse caso, sem nova flag.

### Relatório final R15-B — implementação

| Item                                       | Estado no código                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kits e configuração (R15-1/5a/5b, R18/R19) | Entregues; cadastro owner, limites configuráveis, embalagem e tamanhos personalizados, sem seed.                                                                   |
| Sabor separado do kit (R15-2)              | Entregue; produto pode não ter embalagem antiga, sem variante/preço artificial. Permissões legadas da SPEC preservadas.                                            |
| Pedido e composição (R15-3/5/6/8)          | Entregues; snapshots, quantidades, limites/soma/atividade/tenant, preço histórico, álcool, Totem/PC e toque rápido com padrão editável.                            |
| Recorrências/defaults/repetição            | Entregues na B5; geração em lote, idempotência, inativo isolado, preço atual na semana nova e guarda de consumidor antigo.                                         |
| Compatibilidade/backup (R15-4)             | Entregues; migrações aditivas, legado e campos omitidos preservados, guardas de schema na interface e restauração com FKs.                                         |
| Produção/compras/custos/relatórios (R15-7) | Entregues; sabor×peso/capacidade, equivalentes fracionários e receita sem duplicar, ficha por peso e embalagem única; ausente/ambíguo é aviso, nunca zero suposto. |
| Pessoa/ocasião/pagamento (R15-9/10/11)     | Entregues; sem recorrência de pessoa; confirmação adiantado/na entrega, ocasião opcional no Revisar/Hoje/WhatsApp, telefone opcional.                              |
| Catálogo público (R15-12)                  | Desligado; flags não alteradas.                                                                                                                                    |
| R17-1 / KEEP                               | Importador atual preservado; extensão Kits avaliada, não duplicada. Nenhuma tabela nova nesta rodada; KEEP inalterado.                                             |
| R16                                        | Posterior; não implementada.                                                                                                                                       |

**Produzido:** migração0022, APIs/telas/guia/tutorial, regressão de divisão inteira, cadastro de sabor puro, compatibilidade dos bancos anteriores e capturas r15-depois-* exclusivamente DEMONSTRAÇÃO. Commits funcionais pequenos com formatação junto; mainf645068 incorporado e CI enxuto preservado.

**Testes executados localmente:**89 unitários, tipos/lint/build/formatação, API base, kits/modelos/recorrências e banco antigo, financeiro/operações/P1/mistos/mobile,178 verificações de segurança, limpeza e backup/restauração. Novo ensaio sabor×peso confere frações, centavos, CSV, ficha/compra por peso e embalagem única. E2E direcionados em Chromium/WebKit móveis cobrem pessoa, ocasião, sabor sem embalagem, recorrências, regressões do Hoje e UI anterior às migrações. A conferência final no GitHub deve usar execução manual nos três navegadores e Segurança no mesmo SHA; não substituir isso pelo push reduzido da branch.

**Limitações / pendências:** iPhone físico, revisão humana e ativação das migrações pelo responsável. Nenhum deploy, migração, flag ou limpeza remota foi executado. O custo de sabor sem ficha continua indisponível; a calculadora por massa é R16. Aba Kits do importador é uma extensão futura avaliada, sem conversão automática de planilha/preços. R17-6 (número persistido) permanece avaliada conforme guia anterior, sem coluna parcialmente ligada.

### Conferência manual completa — ajuste do teste legado

A execução manual43558822553 no4cc82b3 aprovou89 unitários, todas as suites de API/SQL/backup/limpeza/segurança e143 E2E, com1 ignorado. Falharam as três execuções do mesmo R11-4: o seletor procurava Beta/Alfa seguidos imediatamente por dois-pontos, mas a exibição agora inclui peso/capacidade. Faltou atualizar esse seletor junto da mudança. Corrigido mantendo as verificações de unidades/mistas/CSV e acrescentando peso, capacidade e equivalentes. Os três projetos passaram localmente após o ajuste. Nenhum comportamento de produção foi alterado nesse ajuste; repetir a execução manual completa no novo SHA antes de avançar main. Segurança de4cc82b3 aprovada no43558782952.

### Sincronização durante a validação — main0e4edb1

Li14/11(6): o responsável aplicou0016–0019 e concluiu a limpeza; o workflow descartável foi removido. Incorporei0e4edb1 preservando a remoção e o script/testes/KEEP para eventual reuso com nova aprovação. Nenhum arquivo da aplicação difere do c9298b2 por essa sincronização; não sobrescrevi Totem/Today/operations/mobile. A execução manual final deve validar o merge atualizado; a anterior é substituída pela concorrência do CI. Ao avançar main, avisar o responsável para executar Homologação D1 novamente, agora para as pendentes0020–0022, com backup conferido. Não executei nenhuma operação no banco real.

### Plano R16 — calculadora por peso (14/11, antes do código)

Atualizado por fast-forward do mainba64664; li14/11(7) e R16(1–12) por inteiro. R15 aprovada/publicada pelo Claude; preservei Pix/timeout de25min e a retirada do workflow descartável de limpeza. Não reaplicar R15 nem alterar flags. Próximas fases: R16 → R17 (item1 já feito) → R7.

Arquitetura: 0023 aditiva com fichas por peso vinculadas diretamente ao produto-sabor, referências relacionais aos insumos e configuração de custos/canal. Fichas anteriores/importação/custos de pedidos continuam intactos: a calculadora é consulta e não cria preço, pedido, estoque ou despesa. As quatro tabelas novas de cadastro/configuração entram em KEEP e no registro de backup/pré-checagem; limpar produtos vinculados deve recusar apagar cadastro protegido, não perder ficha. Nenhum seed de custos/fornecedores/clientes. Só defaults aprovados:16 doces, referência26g, adicional20% e divisor0,74; sugestões especiais editáveis/identificadas, sem gravar automaticamente.

Domínio: massa e gás/custos por receita; acabamento por doce e tamanho; massa total ou rendimento de referência e rendimentos medidos por tamanho. Estimativa de rendimento por divisão para baixo; acabamento proporcional ao peso^(2/3) apenas como sugestão, persistida só ao aceitar/salvar. Forminha configurada por tamanho (indicação nº4/5 sem criar insumo); opcionais unitários fora da ficha/padrão, selecionados só na simulação. Falta de preço, ficha, peso de massa, acabamento confirmado ou embalagem é indisponível, nunca zero suposto. Custos para cima ao centavo, adicional antes da margem; tabela/margem/sugestão e iFood em cálculos detalhados, inclusive1 sacola por pedido assumindo1 kit.

APIs privadas planejadas: p1/weight-recipes (GET/POST), p1/weight-recipes/:id (GET/PUT), p1/weight-recipes/:id/calculate (GET sem gravação), p1/costing-settings (GET/PUT). Operadora lê/simula; owner edita com CAS/idempotência/auditoria. Rotas novas entram na matriz de segurança:401, tenant404, escrita da operadora403. Referências por organização, supply.unit preservada quando em uso, validações/leituras em lote. Sem0023, UI anterior permanece disponível e campos novos ficam ocultos por capability da sessão.

Arquivos: migração0023, shared/weight-costing e testes, worker/weight-costing-domain/rotas/readiness, p1/p1-common/management/supplies, registro/preflight/KEEP; tela por peso ligada às Fichas atuais, ajuda/guia/relatório e testes API/E2E/segurança/backup/limpeza. Aceite: exemplo exclusivamente fictício(2000/16=125, kit12+200=1700, +20%=2040; iFood(5000+100+50+50)/0,74=7028);13/20/26g, rendimento17/15 editável, acabamento estimado confirmado, forminhas por tamanho, opcionais sem gravação implícita, desconhecido/inativo, excesso/CAS/tenant, legado e restauração. CI normal Chromium móvel; manual três perfis e Segurança no SHA final antes de avançar main. Sem deploy, migração ou conta paga remotos.

### Plano R17 — continuidade e retirada da Fase 0 (antes do código)

R16 publicada no main16bb4bb depois do CI manual completo e Segurança aprovados no branch próprio; iniciar R17 em `codex/r17-session-continuity`, sem avançar main antes dos checks. Item1 já atendido: importador preservado.

R17-2: guardar temporariamente no sessionStorage somente IDs e quantidades da seleção do Totem, vinculados ao usuário/organização; nunca nomes, endereço, notas, custos ou credenciais. Recuperação explícita depois do login, revalidando cliente/catálogo e obrigando revisar novamente data/entrega/pagamento. Limpar após sucesso, descarte ou logout explícito; falha de storage não bloqueia pedido. Não criar pedido automaticamente. Edição existente mantém leitura/CAS do servidor. Arquivos Totem, helper de rascunho, Management, testes puros/E2E de expiração/restauração/isolamento.

R17-3: simplificar App às rotas privadas/login/catálogo desligado, remover modules e testes exclusivos da demonstração. Manter manifesto/ícones, raiz→gestão, navegação acessível e shell offline sem cache privado. Preservar registro do service worker e mensagens honestas sem promessa offline de dados privados.

R17-5: GET push retorna validade da sessão de cada aparelho sem token/endpoint; tela mostra data até a qual avisos são válidos e explica logout/expiração. Mesmas rotas/matriz de segurança e testes de isolamento. R17-4 opcional será adiada para evitar renovar sessão/cookie de forma parcial. R17-6: registrar a avaliação já feita na R15, sem coluna parcialmente ligada; o número atual continua calculado. R17-7: conferir relatório da execução limpa com harness real antes de habilitar fail_action; regras ignoradas precisam continuar justificadas.

Aceite: expirar login na montagem não perde cliente/composição, armazenamento não contém dados pessoais/preços, outro usuário não acessa rascunho, salvar/descartar o apaga, nenhuma escrita offline/automática. Sem Fase0 em /app, manifesto/start_url preservados, push exibe validade real/segura. Testes locais e CI manual três perfis/Segurança no SHA final; nenhuma operação remota Cloudflare.

Evidência para R17-7: Segurança manual43652896643 no16bb4bb aprovada, inclusive ZAP local:0 FAIL,5 WARN novos,65 PASS,1 IGNORE. Avisos10027/10094/10109/90004/90005 ainda precisam de triagem com o relatório; não chamar esta execução de limpa nem habilitar fail_action cegamente. Mantida a configuração atual enquanto a R17 não os tratar. Sem contato com produção.

Triagem inicial do artefato ZAP:10027 aponta para trecho de URL `/maps/search/?api=1&query=...` no bundle, não comentário com segredo;10094 aponta para namespace XML público `org/officeDocument/2006/relationships/` da biblioteca de planilhas;10109 é a detecção da SPA.90005 lista Sec-Fetch-* ausentes nas requisições sintéticas do scanner, não headers que o app deva inventar na resposta; Origin/CSRF continuam validados.90004 agrupa ausência de COOP/COEP/CORP (baixo risco) e exige avaliar endurecimento/compatibilidade antes da execução limpa. Nenhuma regra nova foi ignorada sem justificativa, nem cabeçalho/política alterado nesta preparação.

### Fechamento da R16 — 14/11/2026

Main avançado deba64664 para16bb4bb somente depois das duas conferências no mesmo SHA: [Validação da gestão manual43652894147](https://github.com/felipeirineu/brigaderia-amor-zeloso/actions/runs/43652894147) aprovada com102 unitários, todas as suites de API/SQL/backup/limpeza e155 E2E nos três projetos; [Segurança manual43652896643](https://github.com/felipeirineu/brigaderia-amor-zeloso/actions/runs/43652896643) aprovada com gitleaks/npm audit/ZAP local. ZAP:0 falhas,5 avisos triados inicialmente acima; não confundir workflow verde com ausência de avisos. Os dois commits funcionais são9b9823b (domínio/API/testes) e16bb4bb (UI/guia/captura). A CI automática do main pode repetir a conferência conforme workflow vigente.

Produzido/testado conforme relatório R16 no topo e FASE_R16; limites permanecem:0023 não aplicada remotamente, receitas reais e dispositivo físico não homologados, nenhuma mudança de flag/deploy/limpeza executada pelo agente. Próxima fase preparada em `codex/r17-session-continuity` apenas com plano/triagem documental; R17-2/3/5/7 ainda sem alteração de código,4 opcional adiada,6 já avaliada,1 já atendida. R7 posterior.

### Sincronização antes da R17 — 15/11/2026

Li integralmente Histórico2026-11-15(1) e incorporei main20f3ba5 ao branch `codex/r17-session-continuity` por merge sem conflitos. A diferença própria em relação ao main permanece documental; não sobrescrevi as mudanças novas de Totem, Today, API ou endereços. Conforme comunicado pelo Claude, R16 aprovada e0023 já aplicada pelo responsável (23 aplicadas,0 pendentes,0 violações); a pendência de ativação descrita no fechamento de14/11 é histórica. Não executei operação remota.

Ajustes obrigatórios ao plano R17: preservar theme.css/Mascot nos usos existentes, barra sem backdrop-filter, sombra de uma camada e timeout WebKit60s. O rascunho guarda só IDs/quantidades e nunca restaura o aceite de pedido repetido: após recuperar cliente/composição, consultar novamente o dia e exigir a confirmação explícita vigente, sem aviso de repetição ao editar. Preservar ApiError(0) em português e a promessa de repetição segura somente com Idempotency-Key. Preservar os campos estruturados de Place, withAddress/deliveryAddress, reverse gratuito e sugestões Photon com limites atuais; não unificar customer_profiles/B2B nesta fase sem a aprovação prevista no briefing. Nenhum serviço pago, flag ou migração nova para esta sincronização.

Verificação desta etapa: árvore limpa antes do merge, merge sem conflitos, main incorporado como ancestral e revisão da diferença própria. Nenhuma alteração funcional da R17 implementada neste checkpoint; testes funcionais e CI manual completo ficam para a implementação, sem afirmar nova bateria executada na sincronização.

### Execução R17 — plano ajustado de15/11 (antes do código)

Main8f135a6 incorporado sem conflitos antes das alterações; li Histórico15/11(1), inclusive a orientação de kit padrão em massa (POST p1/kit-default, já presente no main, sem duplicar rota). Implementar2/3/5/7 no branch atual;1 e6 resolvidos,4 adiado. Não avançar main: revisão/publicação pelo Claude e responsável. Somente uma execução manual completa de três navegadores no SHA final; intermediários ficam no CI automático Chromium móvel.

Rascunho: seleção explícita de IDs/quantidades por usuário/organização no sessionStorage, sem textos/datas/preços/custos/endereço/credenciais; recuperar voluntariamente após autenticação e reler dados atuais. Confirmação de repetido nunca persistida, dia/entrega/pagamento revistos. Nenhuma escrita automática. Login/logout e falha de storage cobertos. Retirada da Fase0 preserva shell/service worker, skip-link, manifesto/ícones, raiz→gestão, login e catálogo bloqueado. Avisos usam validade da sessão do aparelho retornada pela rota existente, sem hashes de sessão/endpoints. Tokens theme.css em qualquer estilo novo, sem backdrop-filter. ZAP: triagem existente é base para corrigir endurecimento/justificar falsos positivos e validar antes de fail_action=true; sem serviços externos pagos.

Arquivos e aceites continuam os do plano R17 anterior, acrescentando testes de repetição após recuperação, CSP real e ausência de dados privados no storage. As alterações do main em Totem/api/endereço/tema/mascote/kit-default devem permanecer. Guia e relatório Produzido/Testes executados/Limitações/Pendências ao final. Nenhuma operação remota Cloudflare/D1.

### Fechamento técnico R17 —15/11

Main8f135a6 preservado; código e plano conforme relatório atual no topo. Continuidade validada com sessão realmente vencida no D1 local, recuperação de simples/misto/kit/edição e novo aceite do aviso de repetição. A edição conserva observação já salva porque vem da leitura autenticada, não do storage. O primeiro teste detectou probe eval do Zod: corrigido com jitless, sem alterar CSP; testes finais não usam bypass. Revogação do cron corrigida e testada sem envios reais. Baseline ZAP -a -j repetido no build estável, exit0 e zero FAIL/WARN, habilitando fail_action. Checar CI final no branch antes de qualquer publicação pelo Claude/responsável. Sem main/Cloudflare/D1 remoto pelo agente.

### Ajuste após Segurança bloqueante no GitHub —15/11

A execução43682500827 no53f9864 bloqueou corretamente um aviso90004: CORP ausente em `/api/auth/config`. `_headers` cobria arquivos, mas não o JSON do Worker. Corrigido no helper json de worker/security.ts com CORP same-origin, sem ignorar90004 nem mudar autenticação/CSP/cookies. API/matriz208 e teste de cabeçalhos cobrem essa resposta explicitamente. O CI manual dos três projetos ainda não havia sido disparado; continua reservado uma única vez ao SHA final corrigido.

Acrescentado ao teste principal um provedor HTTP efêmero de outra origem, com COOP/COEP, entre expiração e novo login. Chromium/WebKit preservaram e recuperaram a seleção após a troca de origem (6 E2E dirigidos passaram), e exigiram novamente o aceite de repetido. Isso não equivale a operar o SSO real da Cloudflare, que não foi acessado. API base/tipos/lint e208 verificações locais passaram após o ajuste. O resultado definitivo de Segurança será o do SHA corrigido, não o53f9864.

### Complemento da entrega R17 — mainfc75964 e três ajustes (antes do código)

Ambiente voltou a responder; branch limpo no4d6f3f3 antes da operação. Fetch de mainfc75964 e leitura integral Histórico15/11(2). Merge em revisão: conflito somente no App. Manter AppUpdate no layout da gestão como registrador único do SW, retirar RuntimeStatus/Fase0 e conservar o aviso offline sem duplicar registro. Preservar Paraíba/estabelecimentos primeiro, postcode e kit padrão em massa, tema/mascote/sem backdrop-filter e timeout WebKit. Regra de publicação automática vale para o Claude com CI/Segurança no mesmo SHA; Codex continua sem avançar main ou operar Cloudflare/D1.

Plano dos ajustes: mover Buscar cliente e Cadastrar cliente antes de customer-tiles no step0; limitar o seletor CSS para preservar profile-initials (e fallback de StaffAvatar); função pura compartilhada de iniciais que ignora de/da/do/das/dos/e e usa maiúsculas, aplicada a SiteAvatar/StaffAvatar/CompactHeader. Arquivos: App, componente offline sem SW, RuntimeStatus removido, Totem, styles, FieldContext/CompactHeader, shared/initials e testes. Não persistir iniciais nem criar cadastro real. Fixtures claramente DEMONSTRAÇÃO, sem nomes de clientes reais.

Aceite: AppUpdate original preservado e app-update.spec passando; SW/manifesto/ícones/raiz/login/catálogo/offline mantidos; lista longa deixa busca/cadastro antes dos cartões; com Voltar no cabeçalho, iniciais continuam visíveis; os três consumidores usam a mesma função, com conectivos/case/espaços/acentos cobertos. Regressão dirigida de rascunho/repetido/push/endereço/CEP/região. Executar uma única Validação da gestão manual (três navegadores) e Segurança no SHA final desta revisão, registrar relatório e deixar publicação ao Claude.

### Fechamento do complemento R17 — mainfc75964

Integração defc75964 preserva AppUpdate sem alteração de fonte/teste, Paraíba/estabelecimentos primeiro e CEP. Registro do SW centralizado no AppUpdate da gestão; RuntimeStatus removido, feedback offline separado. Busca/cadastro antes da lista, perfil visível com Voltar e iniciais compartilhadas conforme relatório atual no topo. Testes locais em Chromium/WebKit e cenário novo nos três projetos; nenhuma operação remota Cloudflare/D1 ou main. CI completo/Segurança devem validar o SHA final antes da revisão/publicação pelo Claude.

### Plano de encerramento T0 no fluxo por PR —15/11 (antes do código)

Fetch do main1d686e5 e leitura integral da FILA/AGENTS. FILA preservada, sem editar VEZ. A VEZ aponta T1, mas a tabela mantém T0 em andamento e a mensagem do responsável determina explicitamente T0 agora/T1 no próximo continue: sigo a instrução direta, sem iniciar T1. Os ajustes1–3 de T1 haviam sido feitos sob autorização anterior no a4f63f7; serão preservados nesse commit/branch local de reserva e retirados do diff funcional de T0. Itens4–5 de T1 não executados.

Incorporar o main atual; AppUpdate e seu teste original devem ficar idênticos ao main, com único registro de SW e sem Fase0. Separar somente as alterações de iniciais/CSS/lista e seus testes para T1, sem apagar o trabalho salvo. Atualizar guia/relatório e preservar formato da FILA de autoria exclusiva do Claude (exclusão no Prettier se necessária, sem mudar o arquivo). R17 segue com seleção mínima/novo aceite de repetido, validade/autorização de push e ZAP bloqueante. Para o fluxo sem dispatch manual, incluir o ZAP também na execução de Segurança do PR; manter alvo efêmero e ausência de operações remotas.

Aceite: regressão local de AppUpdate/PWA/rascunho/repetido/validade/permissões; T1 sem alterações funcionais no PR; FILA idêntica ao main. Push único consolidado e PR T0 para main, sem merge/sem CI manual. Relatório Produzido/Testes executados/Limitações/Pendências no PR e neste arquivo, checks do PR como evidência final. Se houver falha, seguir diagnóstico do Claude na fila e corrigir no mesmo PR. Não avançar fila, executar migração/banco real, catálogo, serviço pago, credenciais ou dados reais.
