# Fase 2A — Operação B2B no celular

## Produzido

- P0-3/T-3: migração `0003_operations.sql` reconstrói orders com estados completos, preservando todas as colunas anteriores, IDs, itens, versões e snapshots. Novas tabelas de histórico, recorrência e contato. `order_type` regular/recurring/event preparado; criação de eventos continua rejeitada pela API. Não há pagamentos/sinal implementados nesta entrega.
- Status: rascunho, aguardando confirmação, confirmado, produção, pronto, saída, entregue/retirado e cancelado. A UI destaca apenas a próxima ação. Histórico identifica usuário por ID e horário. Cancelamento exige motivo e confirmação; entrega/retirada oferece compensação auditável “Desfazer” por 30 segundos (R1-5), somente ao autor e se o pedido não tiver mudado.
- P0-1/T-4: Hoje por papel, com fuso America/Fortaleza. Administrador vê produção de hoje/amanhã e valores previstos/entregues; operador vê entregas antes do resumo e ação de entregar diretamente no cartão. Produção agrega todos os pedidos do período, mesmo quando a lista de cartões é limitada a 200. Caixas, unidades, peso e variante vêm do snapshot. Recebido/saldo financeiro não são simulados.
- P0-2: modelos semanais por cliente/dia/hora, steppers de quantidade, pausa e geração idempotente de rascunhos, sem confirmação automática. Até 100 modelos ativos por geração; filhos e inserções processados em lote para respeitar o teto de consultas. Pedidos gerados preservam seu próprio preço mesmo quando o produto muda. Confirmação é humana, individual ou por seleção revisada na R1.
- P0-6: entrega/retirada, endereço como snapshot, entregador proprietário/esposa/motoboy e taxa. Registros antigos e novos sem escolha explícita ficam “A definir”; não são atribuídos ao proprietário automaticamente. A saída exige escolher entregador; motoboy exige nome. Taxa não cria despesa nem muda o valor cobrado automaticamente.
- P0-7 inicial: modelos editáveis de confirmação, a caminho, entregue, retirada e pós-venda; prévia editável, URL codificada e abertura explícita do WhatsApp. Registro de contato é manual, idempotente e não comprova envio. Cobrança/fechamento dependem da etapa financeira.
- HelpTip centralizado com 14 temas, diálogo/sheet com toque, Esc, foco e link à ajuda. Tour base por papel com cinco passos sobre elementos reais e Pular/Já sei; treino Exemplo exclusivamente em memória, sem POST ao D1. Conclusão do passeio guarda somente um marcador por papel em localStorage. Roteiros financeiros completos ainda pendentes.
- Navegação móvel Hoje/Pedidos/+/Clientes/Mais, logo autorizado, SVG Lucide, cartões e alvos de toque grandes. O + oferece somente novo pedido/cliente; recebimento e lembrete não são apresentados como prontos.

## Ativação protegida

O arquivo raiz mantém **`OPERATIONS_ENABLED=false`**. A gestão da Fase 1 continua disponível, incluindo registros já cadastrados. O servidor só habilita a operação se a flag for `true` **e** as cinco novas tabelas e o campo order_type existirem. Sem migração completa, as novas rotas retornam indisponível; a sessão continua no fluxo anterior. Catálogo permanece bloqueado na API e UI, independentemente da flag operacional.

O código foi testado localmente. A migração remota **não foi executada**: não há credenciais administrativas Cloudflare disponíveis nesta máquina. O snapshot local de testes não autoriza apagar ou recriar o banco remoto.

### Ativação — passos curtos no Windows (PowerShell)

Faça isto no seu computador. Não envie backup, chave Pix, senha ou token pelo chat. Os comandos com `--remote` abaixo usam o banco online; o agente **não os executou**. A pré-checagem só lê metadados/contagens. A restauração de ensaio só usa um banco local separado. Como a R1 acrescenta a migração 0004 e a 2B acrescenta 0005, use sempre o código atualizado.

**1. Preparar o terminal.** Instale Git e Node.js 24 se ainda não tiver. Abra o PowerShell e execute, um comando de cada vez:

```powershell
git --version
node --version
npm --version
```

Esperado: três números de versão; Node deve começar por `v24` ou ser compatível (mínimo 22.12). Se aparecer “não reconhecido”, instale o programa correspondente, feche e reabra o terminal. Se o Windows bloquear `npm.ps1`, use `npm.cmd` e `npx.cmd` no lugar de `npm`/`npx`; não desative a política de segurança do computador.

**2. Baixar o projeto.** Em uma pasta pessoal, execute:

```powershell
git clone https://github.com/felipeirineu/brigaderia-amor-zeloso.git
cd brigaderia-amor-zeloso
npm ci
```

Esperado: download concluído e dependências instaladas. Se já tiver essa pasta, entre nela e use `git switch main` e `git pull --ff-only origin main`; não clone por cima. Se houver arquivos modificados ou erro de atualização, pare e preserve os arquivos, sem `reset --hard`. Se `npm ci` falhar, confira Node/rede e copie somente a mensagem de erro sem dados pessoais.

**3. Entrar no Cloudflare.**

```powershell
npx wrangler login
npx wrangler whoami
```

Esperado: o navegador pede autorização para Wrangler; depois o terminal mostra a conta correta. Confira a conta usada no projeto. Se falhar, conclua o login no navegador e tente `whoami` novamente. Não copie tokens nem a saída com e-mail para a colaboração.

**4. Parar os cadastros por alguns minutos e conferir o banco.** Avise quem usa a gestão para não alterar registros até o passo 9. Abra `wrangler.jsonc` no GitHub e confira o banco `brigaderia-amor-zeloso-homologacao`, ID terminado em `b20f`. Então:

```powershell
npm run ops:preflight -- --remote brigaderia-amor-zeloso-homologacao
```

Esperado: JSON com `mode: "remoto"`, nomes das migrações, contagens e `foreign_key_violations: 0`. Guarde o resultado em arquivo privado para comparar depois. Nesta etapa é normal `schema_operations_ready`/`schema_finance_ready` serem `false` e haver 0003/0004/0005 pendentes. Se 0003 já estiver aplicada, somente 0004/0005 devem estar pendentes. **Se 0001 ou 0002 aparecerem pendentes em um banco já cadastrado, pare**: o histórico precisa ser conciliado com o schema por quem configurou o banco. Não reaplique essas duas por tentativa. Se ocorrer erro ou violações de FK, pare e mantenha as flags desligadas; confira conta, nome e login, sem apagar tabelas.

**5. Fazer backup.**

```powershell
New-Item -ItemType Directory -Force .local
npx wrangler d1 export brigaderia-amor-zeloso-homologacao --config wrangler.jsonc --remote --output .local/backup-antes-fase2.sql
Get-Item .local/backup-antes-fase2.sql
```

Esperado: exportação concluída e arquivo com tamanho maior que zero. A pasta `.local` é ignorada pelo Git, mas **contém dados privados**: mantenha no computador pessoal protegido e não envie ao GitHub/chat. Se o nome já existir, preserve-o e use outro nome/data nos comandos seguintes. Se der erro ou o arquivo estiver vazio, não avance. Backup incompleto não é backup válido.

**6. Ensaiar a restauração fora do banco online.**

```powershell
npm run ops:restore-check -- .local/backup-antes-fase2.sql
```

Esperado: “Restauração LOCAL concluída”, zero violações e as mesmas contagens de clientes, produtos, variantes, pedidos e itens vistas no passo 4. O script cria um diretório novo `.local/restore-check-...`; não importa sobre o banco online nem sobre outro ensaio. Migrações pendentes devem corresponder ao estado do backup. Se falhar ou houver diferença, preserve o backup e pare antes da migração; nunca “teste restaurar” em cima do banco online.

**7. Aplicar somente as migrações pendentes.**

```powershell
npx wrangler d1 migrations list brigaderia-amor-zeloso-homologacao --config wrangler.jsonc --remote
```

Esperado: apenas migrações novas ainda ausentes (0003, 0004 e/ou 0005). Se listar 0001/0002, pare conforme passo 4. Se a lista estiver correta e o backup foi restaurado com sucesso:

```powershell
npx wrangler d1 migrations apply brigaderia-amor-zeloso-homologacao --config wrangler.jsonc --remote
```

Confirme `y` quando perguntado. Esperado: cada migração com símbolo de sucesso. Se não houver migrações pendentes, não é preciso reaplicar. Se ocorrer erro, **não cole pedaços do SQL, não execute DROP e não tente reset**. Mantenha as flags OFF, execute a pré-checagem do próximo passo e peça análise do estado antes de repetir.

**8. Conferir o resultado.**

```powershell
npm run ops:preflight -- --remote brigaderia-amor-zeloso-homologacao
```

Esperado: `pending: []`, `foreign_key_violations: 0`, `schema_operations_ready: true` e `schema_finance_ready: true`; as contagens de clientes/produtos/variantes/pedidos/itens devem ser iguais às do passo 4. As tabelas novas começam vazias, sem pagamentos inventados. Se algo diferir, mantenha OFF e investigue antes de retomar os cadastros. A pré-checagem não valida valores de vendas; confira amostras no painel privado contra o backup, sem publicar seus dados.

**9. Ativar no GitHub e aguardar publicação.** No repositório, branch `main`, abra `wrangler.jsonc` e clique no lápis. Troque somente:

```json
"OPERATIONS_ENABLED": "true",
"FINANCE_ENABLED": "true"
```

Mantenha `PUBLIC_CATALOG_ENABLED: "false"`, o banco e o Access como estão. Salve com mensagem “Ativar operação e financeiro após migrações”. Se quiser primeiro testar só a operação, deixe `FINANCE_ENABLED: "false"` e ative depois. Espere Cloudflare → Workers & Pages → brigaderia-amor-zeloso → Deployments mostrar o commit novo com sucesso. Não basta o site antigo continuar abrindo. Se a build falhar, deixe as flags OFF enquanto o erro é corrigido; não altere o banco para resolver erro de build.

**10. Validar e liberar o uso.** Abra o site, aceite a atualização do PWA se oferecida, saia e entre novamente. Esperado: Hoje e Pedidos padrão; com financeiro ativo, Mais → Financeiro e links de conta no cliente. Use registros identificados como DEMONSTRAÇÃO para conferir geração repetida sem duplicar, revisão/confirmação, entrega/desfazer, recebimento parcial, estorno e cobrança sem envio real. Faça os ensaios em Android e iPhone físicos. Não cadastre uma chave Pix fictícia na empresa real: sem chave, a cobrança deve funcionar sem Pix. Confira os registros anteriores antes de liberar novos cadastros. Se surgir erro, preserve os registros, desative a função conforme rollback e anote a mensagem/etapa sem dados pessoais.

Os scripts não ativam flags, não enviam mensagens, não registram pagamentos e não fazem migrações remotas. Nesta entrega o agente testou apenas bancos locais/efêmeros; login Cloudflare administrativo, exportação e migração remotos continuam pendentes.

### Rollback

Desativar `FINANCE_ENABLED` e/ou `OPERATIONS_ENABLED` mantendo o backend atual. Se já houver recebimentos, não operar pedidos pela versão antiga enquanto o financeiro estiver OFF: preserve os dados e resolva a falha antes de retomar alterações financeiras/status. Isso oculta as novas ações e preserva os registros; pedidos confirmados/encerrados não voltam a ser editáveis como rascunhos. Não voltar cegamente a um backend anterior que desconheça os novos estados e não remover tabelas/colunas com DROP para “desfazer”. Restauração de dados, se necessária, deve usar o backup/Time Travel com avaliação dos registros criados desde o ponto de retorno, em ambiente separado primeiro. Nenhum rollback remoto foi ensaiado nesta tarefa. Desligar flags não desfaz migrações nem estorna pagamentos.

## Testes executados

- Lint, Prettier, typecheck e build Pages passaram.
- Vitest: 30 testes passaram (schemas, estados, mensagens, lotes e segurança da API base).
- API da Fase 1: 28 verificações de integração workerd/D1 passaram.
- Listagens: 65 produtos e 65 pedidos com filhos e isolamento entre organizações passaram; teste unitário limita a três consultas filhas e 91 parâmetros para 200 pais.
- Migração: pedido/itens já preenchidos mantiveram todas as colunas anteriores, preço, nome histórico, nota, versão e chaves; FKs ficaram válidas. Capacidade operacional foi OFF antes da migração e ON depois, com a flag de teste habilitada.
- API operacional: 11 verificações passaram, incluindo transições, CSRF/autorização de base, idempotência, histórico/desfazer, taxa sem gasto, geração semanal e snapshots de preço, WhatsApp, e produção completa com 205 pedidos apesar da lista limitada a 200 cartões.
- SQLite em memória: seis testes passaram. O runner `npm run db:migrate:local` aplicou a migração 0003 com sucesso no D1 local (15 comandos); nenhum comando remoto foi executado.
- Marca: dimensões PWA/touch/favicon, formato ICO e contraste AA passaram. Ver `IDENTIDADE_VISUAL.md`.
- E2E completo: 20 passaram em Chromium mobile/desktop e WebKit mobile; um teste de offline permaneceu explicitamente ignorado no WebKit, como na suíte original. Login/gestão e operação foram executados e aprovados no WebKit.
- Após inspeção visual, os seis E2E privados foram repetidos e passaram com layout de botões corrigido e entregas priorizadas para operador. Depois do agregado de produção completo, os três E2E operacionais também passaram.

Todos os dados usados nesses testes são fixtures identificadas como DEMONSTRAÇÃO em D1 efêmero/local. Nenhuma mensagem real foi enviada. WebKit Linux não equivale a iPhone físico.

## Limitações

- Lista de cartões: 200 por janela de dois dias; aviso de limite é exibido. Produção e valores agregados não são truncados.
- Modelos: até 100 ativos por geração, até 30 variantes por modelo e limite de payload. Variantes/clientes inativos não geram novos pedidos silenciosamente válidos; revisar o aviso de variante ou pausar o modelo.
- Recorrência apenas semanal, com confirmação individual ou em lote dos pedidos revisados (R1).
- Quantidades são embalagens completas das variantes existentes. Mistura por unidade/sabor permanece a confirmar, sem remodelar pedidos já cadastrados.
- Recebimentos, pagamentos/sinal, saldo, condições/fechamentos, lembretes e campos B2B avançados ainda não estão entregues. Não há fila offline ou campanhas.
- Tour é a base de navegação/treino; os roteiros completos que incluem pagamento/ficha técnica dependem das próximas fases. A meta de pedido manual em três toques não foi declarada atingida.

## Pendências

Backup/restauração reais e migração/ativação remota, homologação física iPhone/Android, CI GitHub acompanhada e revisão do Claude. Próxima fase: P0-4 financeiro/fechamentos e P0-5 cadastros B2B rápidos, completando Hoje e mensagens de cobrança. P1/P2 continuam conforme o plano, sem ativação automática.

## Revisão R1

R1-1 gera modelos válidos e lista ignorados com atalho; R1-2 copia entregador padrão do modelo; R1-3 reabre confirmed → awaiting_confirmation com motivo antes da produção, permitindo a edição normal e nova confirmação; R1-4 confirma seleção revisada com validação e resultado por pedido em grupos de três para D1 Free. R1-5 usa constante compartilhada de 30 s. R1-6 separa as telas operacionais. R1-7 mantém created_at epoch em order_status_events para comparação da janela no servidor, convertendo para exibição; tabelas novas financeiras usam ISO. Não há comparação lexical entre os dois formatos. Com pagamentos ativos, cancelar/arquivar pedido recebido exige estorno e reduzir total abaixo do recebido é bloqueado.

### Relatório da revisão R1

- **Produzido:** R1-1…R1-7 conforme seção acima, entregador padrão, seleção revisada em lote e guia/scripts de ativação.
- **Testes executados:** 14 verificações operacionais, regressão de migração 0003–0005, E2E de recorrência/lote nos três projetos e suíte completa descrita em FASE_2B.md. Undo permitido aos 20 s e rejeitado aos 31 s.
- **Limitações:** reabrir exige motivo e nova confirmação; não reabre produção/encerrados. Lotes em grupos de três; não confirma por geração automática. WebKit não equivale a iPhone físico.
- **Pendências:** backup/restauração e migrações reais, ativação das flags, homologação em aparelhos e revisão do Claude. Nenhum cadastro remoto foi alterado nesta revisão.
