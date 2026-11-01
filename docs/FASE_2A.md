# Fase 2A — Operação B2B no celular

## Produzido

- P0-3/T-3: migração `0003_operations.sql` reconstrói orders com estados completos, preservando todas as colunas anteriores, IDs, itens, versões e snapshots. Novas tabelas de histórico, recorrência e contato. `order_type` regular/recurring/event preparado; criação de eventos continua rejeitada pela API. Não há pagamentos/sinal implementados nesta entrega.
- Status: rascunho, aguardando confirmação, confirmado, produção, pronto, saída, entregue/retirado e cancelado. A UI destaca apenas a próxima ação. Histórico identifica usuário por ID e horário. Cancelamento exige motivo e confirmação; entrega/retirada oferece compensação auditável “Desfazer” por 10 segundos, somente ao autor e se o pedido não tiver mudado.
- P0-1/T-4: Hoje por papel, com fuso America/Fortaleza. Administrador vê produção de hoje/amanhã e valores previstos/entregues; operador vê entregas antes do resumo e ação de entregar diretamente no cartão. Produção agrega todos os pedidos do período, mesmo quando a lista de cartões é limitada a 200. Caixas, unidades, peso e variante vêm do snapshot. Recebido/saldo financeiro não são simulados.
- P0-2: modelos semanais por cliente/dia/hora, steppers de quantidade, pausa e geração idempotente de rascunhos, sem confirmação automática. Até 100 modelos ativos por geração; filhos e inserções processados em lote para respeitar o teto de consultas. Pedidos gerados preservam seu próprio preço mesmo quando o produto muda. Confirmação é individual e humana.
- P0-6: entrega/retirada, endereço como snapshot, entregador proprietário/esposa/motoboy e taxa. Registros antigos e novos sem escolha explícita ficam “A definir”; não são atribuídos ao proprietário automaticamente. A saída exige escolher entregador; motoboy exige nome. Taxa não cria despesa nem muda o valor cobrado automaticamente.
- P0-7 inicial: modelos editáveis de confirmação, a caminho, entregue, retirada e pós-venda; prévia editável, URL codificada e abertura explícita do WhatsApp. Registro de contato é manual, idempotente e não comprova envio. Cobrança/fechamento dependem da etapa financeira.
- HelpTip centralizado com 14 temas, diálogo/sheet com toque, Esc, foco e link à ajuda. Tour base por papel com cinco passos sobre elementos reais e Pular/Já sei; treino Exemplo exclusivamente em memória, sem POST ao D1. Conclusão do passeio guarda somente um marcador por papel em localStorage. Roteiros financeiros completos ainda pendentes.
- Navegação móvel Hoje/Pedidos/+/Clientes/Mais, logo autorizado, SVG Lucide, cartões e alvos de toque grandes. O + oferece somente novo pedido/cliente; recebimento e lembrete não são apresentados como prontos.

## Ativação protegida

O arquivo raiz mantém **`OPERATIONS_ENABLED=false`**. A gestão da Fase 1 continua disponível, incluindo registros já cadastrados. O servidor só habilita a operação se a flag for `true` **e** as cinco novas tabelas e o campo order_type existirem. Sem migração completa, as novas rotas retornam indisponível; a sessão continua no fluxo anterior. Catálogo permanece bloqueado na API e UI, independentemente da flag operacional.

O código foi testado localmente. A migração remota **não foi executada**: não há credenciais administrativas Cloudflare disponíveis nesta máquina. O snapshot local de testes não autoriza apagar ou recriar o banco remoto.

### Procedimento para o administrador antes de ativar

1. Pausar brevemente alterações na gestão e conferir a conta/nome/ID do banco em `wrangler.jsonc`.
2. Em uma máquina autenticada no Cloudflare, exportar backup para diretório privado **fora do Git**. Por exemplo, criar `.local` com acesso restrito e executar:

   ```bash
   npx wrangler d1 export brigaderia-amor-zeloso-homologacao --config wrangler.jsonc --remote --output .local/backup-antes-fase2.sql
   ```

   Não enviar o backup ao chat, colaboração, logs ou CI: pode conter dados pessoais. Arquivos `.local/` são ignorados pelo Git.

3. Conferir o backup e ensaiar a restauração em um banco separado/estado local vazio. Nunca importar sobre o banco usado diariamente. O teste automatizado de fixtures desta entrega não substitui esse ensaio com seu arquivo real.
4. Conferir `d1_migrations`: as migrações 0001/0002 já foram registradas pelo responsável durante a configuração inicial. Aplicar apenas a migração pendente pelo runner:

   ```bash
   npx wrangler d1 migrations apply brigaderia-amor-zeloso-homologacao --config wrangler.jsonc --remote
   ```

   Não colar fragmentos da reconstrução manualmente e não reaplicar 0001/0002. Se ocorrer erro, manter a flag OFF e inspecionar o estado antes de repetir; não executar DROP/reset por tentativa.

5. Executar `PRAGMA foreign_key_check;` (deve retornar zero violações) e conferir contagens de pedidos/itens e amostras de totais/versões contra o backup. A tabela d1_migrations deve registrar 0003. Não publicar essas amostras na colaboração.
6. Só então mudar `OPERATIONS_ENABLED` para a string `true` no `wrangler.jsonc`, salvar no Git e aguardar deploy Pages bem-sucedido. Fazer novo login/recarregar e conferir Hoje/Pedidos padrão nos dois papéis.
7. Testar um fluxo de homologação identificado como teste: gerar semana duas vezes, revisar/confirmar, produzir, entregar e desfazer. Conferir WhatsApp sem enviar mensagem real. Validar Android e iPhone físicos e a atualização/instalação do PWA.

Nenhum comando remoto acima foi executado pelo agente. Não há nova compra, gasto, domínio ou integração paga provisionada.

### Rollback

Desativar `OPERATIONS_ENABLED` mantendo o backend atual. Isso oculta as novas ações e preserva os registros; pedidos confirmados/encerrados não voltam a ser editáveis como rascunhos. Não voltar cegamente a um backend anterior que desconheça os novos estados e não remover tabelas/colunas com DROP para “desfazer”. Restauração de dados, se necessária, deve usar o backup/Time Travel com avaliação dos registros criados desde o ponto de retorno, em ambiente separado primeiro. Nenhum rollback remoto foi ensaiado nesta tarefa.

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
- Recorrência apenas semanal, sem confirmação em lote nesta etapa. Pode confirmar um a um.
- Quantidades são embalagens completas das variantes existentes. Mistura por unidade/sabor permanece a confirmar, sem remodelar pedidos já cadastrados.
- Recebimentos, pagamentos/sinal, saldo, condições/fechamentos, lembretes e campos B2B avançados ainda não estão entregues. Não há fila offline ou campanhas.
- Tour é a base de navegação/treino; os roteiros completos que incluem pagamento/ficha técnica dependem das próximas fases. A meta de pedido manual em três toques não foi declarada atingida.

## Pendências

Backup/restauração reais e migração/ativação remota, homologação física iPhone/Android, CI GitHub acompanhada e revisão do Claude. Próxima fase: P0-4 financeiro/fechamentos e P0-5 cadastros B2B rápidos, completando Hoje e mensagens de cobrança. P1/P2 continuam conforme o plano, sem ativação automática.
