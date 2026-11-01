# Plano de execução — prioridades vigentes

Referência de contexto: `docs/colaboracao/CLAUDE_PARA_CODEX.md`. AGENTS.md e regras de segurança continuam obrigatórios. Fazer commits pequenos e relatórios por etapa; preservar registros e preços históricos já existentes. Interface pt-BR mobile-first, papéis owner/operator, dados financeiros em centavos, organização validada no servidor. Catálogo público, eventos e gravação offline continuam desligados. Não criar gastos nem enviar mensagens automaticamente.

## Base entregue — Fases 0 e 1

PWA, demonstração pública, gestão privada Access/D1, clientes/produtos/rascunhos, snapshots, auditoria e isolamento. Login real validado em homologação; dados de teste já existem no D1 remoto. Não apagar ou substituir o banco. Testes de dispositivos reais e backup/restauração seguem necessários.

## Primeira entrega técnica — antes da Fase 2

- T-1: reproduzir/corrigir WebKit mobile no harness, mantendo JWT, HttpOnly, Secure e __Host- em produção. Testar o fluxo completo no motor WebKit; teste não substitui iPhone físico.
- T-2: listagens sem consultas por registro. Buscar pais/filhos em lote respeitando o teto de consultas e sem misturar organizações; teste com mais de 60 pais e filhos.
- T-5 + marca: usar logo aprovado; gerar PWA 192/512, maskable com margem segura, apple-touch-icon 180, favicon e imagem otimizada. Tokens #321D10/#F9ECD7/#B8915B, contraste AA, lucide-react. Fontes locais/system-ui, sem CDN; manter a legibilidade.

Aceite: lint, formato, tipos, build, integração D1 e E2E Chromium/WebKit; migrações históricas imutáveis; limitações reais explicitadas.

## Fase 2A — P0 operacional no celular (iniciar agora)

1. P0-3 / T-3: reconstrução versionada de orders para remover CHECK draft preservando cabeçalho, itens, IDs, versões e preços. Máquina de estados completa no servidor; próxima ação principal na UI, cancelamento com motivo, histórico por autor/hora. Tipo regular/recurring/event modelado, criação event bloqueada até fase própria.
2. P0-1 / T-4: tela Hoje por papel e fuso America/Fortaleza. Proprietário: produção hoje/amanhã por variante (unidades/caixas), próximos pedidos e valores previstos/entregues; operador: entregas do dia, mapa, WhatsApp e próxima ação. Não chamar rascunhos de faturamento nem simular recebido antes de pagamentos.
3. P0-2: modelos recorrentes por cliente, dias/itens configuráveis, geração semanal idempotente de rascunhos, quantidades ajustáveis; confirmação sempre humana, nunca automática.
4. P0-6: entrega/retirada, endereço como snapshot e entregador proprietário/esposa/motoboy (nome/taxa). Taxa registrada não cria despesa; despesas dependem da fase financeira e de confirmação.
5. P0-7: mensagem editável, modelos sem placeholders pendentes, abertura explícita wa.me e registro manual de contato. Sem envios ou confirmação de entrega da mensagem.
6. Ajuda: HelpTip acessível com textos centralizados, diálogo/sheet no celular, Esc/toque fora, foco restaurado. Central Mais → Ajuda, guias e base de tour por papel; treino somente no frontend rotulado Exemplo, sem POST ao D1.
7. Navegação móvel Hoje · Pedidos · + · Clientes · Mais; ações indisponíveis não aparecem como entregues. Alvos 44px, steppers, estados vazios úteis.

Aceite: regressão de migração com pedidos existentes; estados e isolamento testados, recorrência repetida sem duplicar, WhatsApp só por clique, nenhum gasto automático ou gravação offline. Aplicação remota da migração exige backup e conferência do ambiente. Publicação do código deve ser compatível com banco ainda não migrado ou feita após ativação controlada; não interromper a gestão existente.

## Fase 2B / próxima entrega — completar P0

- P0-4: conta por estabelecimento, condições adiantado/entrega/a prazo, fechamento semanal/quinzenal/mensal, extrato e cobrança assistida. Pagamentos como eventos, parciais e sinal, quitação de pedido/fechamento, idempotência, estorno/auditoria, saldo e vencimento reais. Pix só após chave configurada pelos proprietários.
- P0-5: campos B2B opcionais e cadastro/pedido rápido com padrão (meta de até 3 toques após cliente). Fechar a meta de toques somente após ensaio real; não inventar endereço, consentimento ou regra de crédito.
- P0-1 completo: Recebi R$, contas vencidas e a receber somente depois do modelo financeiro testado.
- Desfazer ações frequentes: evento compensatório auditável/versão, com janela curta; nunca apagar histórico ou permitir regressão arbitrária. Se a implementação não oferecer desfazer, documentar confirmação provisória e rever antes de homologação.

## P1 — etapas seguintes

- P1-1: agenda semanal/mensal e exportação ICS.
- P1-2: lembretes manuais no Hoje.
- P1-3: relatórios desktop, vendas/aging/rankings e comparação, CSV seguro, PDF se viável sem custo.
- P1-4: fichas técnicas, custo/rendimento e simulador de margem/preço estimado.
- P1-5: lista de compras dos confirmados, sem movimentação implícita.
- P1-6: estoque/embalagens auditáveis, mínimo, sem débito duplicado/negativo silencioso.
- P1-7: despesas, caixa e lucro estimado, taxas de motoboy apenas com confirmação.
- P1-8: importação CSV/Excel com preview/deduplicação e confirmação, apenas fixtures fictícias até receber planilhas autorizadas.
- P1-9: backup/exportação do administrador e restauração ensaiada em ambiente separado.

Cada grupo exige relatório com Produzido, Testes executados, Limitações e Pendências, além de resumo em CODEX_PARA_CLAUDE.md.

## P2 — módulos desligados por padrão

- P2-1: eventos/festas. Modelo order_type preparado na 2A, sinal em pagamentos na 2B; UI, agenda e estados específicos depois. Servidor bloqueia criação event enquanto flag OFF.
- P2-2: catálogo público OFF na UI/API, somente dados explicitamente aprovados ao ativar.
- P2-3: Web Push, iPhone apenas PWA instalado iOS 16.4+; sem prometer notificações antes de implementar.
- P2-4: fila offline restrita só após sincronização robusta, idempotência e testes. Até lá, ocultar dados privados offline e bloquear escritas.

## Homologação e entrega

Testar Android Chrome/iPhone Safari físicos, instalação, navegação com dois usuários, backup/restauração, custos/limites atuais, transferência de contas, LGPD, retenção e rollback. Atualizar marca e informações comerciais pelo cadastro, mantendo as informações vigentes. Não ativar recursos pagos, domínio, catálogo ou marketing sem autorização.

## Revisão R1 e Fase 2B — execução autorizada em 2026-11-01

Antes da codificação: integrar R1 do Claude, preservar dados remotos e migrações históricas.

1. R1-6: separar Operations por tela e utilitários, sem alterar comportamento. Arquivos: src/features/operations/. Aceite: tipos/lint/E2E operacional.
2. R1-1: gerar válidos e listar ignorados por modelo/motivo, com edição na UI. Aceite: modelo inativo não bloqueia outro; repetir não duplica.
3. R1-2: migração 0004 para entregador padrão no modelo, snapshot no pedido, edição mantida. Aceite: motoboy exige nome, migração preserva legado.
4. R1-3: alternativa conservadora confirmed → awaiting_confirmation com motivo; sem regressão após produção. Aceite: versão, auditoria e novo aceite humano.
5. R1-4: seleção explícita dos pedidos gerados, confirmação única na UI e validação individual no servidor, resposta por pedido; lotes limitados para D1 Free. R1-5: constante compartilhada de 30 segundos. R1-7: documentar epoch para janela de undo.
6. Ativação: guia para iniciante com comandos/saídas/erros; scripts somente leitura para schema, migrações, FKs e contagens, sem PII. Não executar no remoto sem credenciais e backup.
7. Fase 2B: migração 0005, flag financeira independente OFF e detecção de schema; perfis B2B/condições por cliente e exceção/snapshot por pedido. Datas de fechamento semanais, mensais, dias fixos ou blocos de 14 dias; prazo explícito obrigatório a prazo. Pagamentos positivos em centavos, sinal, parciais e estorno compensatório, chaves idempotentes e exclusão mútua por versão da conta. Fechamentos imutáveis agrupam entregas sem duplicar. Extrato, saldo e aging verdadeiros. Pix vazio por padrão, apenas administrador configura; cobrança somente prévia e link humano, BR Code com CRC testado. Novos pedidos preenchem modelo/endereço/entregador/condição privados, sempre revisáveis. Ajuda financeira com treino em memória.

Arquivos 2B: worker/finance*, shared/finance*, database/migrations/0005*, Management/operations e src/features/finance/, testes unitários/integração/E2E, scripts/ops-preflight.mjs e relatórios. Aceite: isolamento/CSRF, idempotência, concorrência, nenhum pagamento acima de saldo, estorno auditado, pagamentos independentes de entrega, períodos em limites de mês/ano/quinzena, zero dados privados em público/offline, sem despesas nem envio automático. Medir caminho de três toques apenas com modelo válido; não afirmar a meta universalmente.


## Resultado da R1/2B (2026-11-01)

R1-1…R1-7 implementados/documentados. A Fase 2B entregou o núcleo P0-4, campos/padrões B2B P0-5, Hoje financeiro e tutorial, conforme docs/FASE_2B.md. Exceção de condição é definida antes de confirmar; registros legados não recebem condição inventada. Toques e uso físico ainda pendentes de homologação. Próximos incrementos: ativação remota com backup e, depois, P1-1 agenda/ICS e P1-2 lembretes. Limites de volume, estorno integral, ausência de integração bancária e itens fora do escopo estão explícitos no relatório. Catálogo e demais módulos P2 continuam OFF.

## R2 e módulos P1 — plano de 2026-11-01 (somente local)

Revisão 132ba36 integrada com ff-only. Não aplicar migrações, alterar flags ou dados no Cloudflare; preparar código, testes locais e guia para administrador. Sem seeds reais, mensagens automáticas, catálogo ou gastos provisionados.

1. R2-4: permissão de estorno por autor/dia civil America/Fortaleza; administrador pode corrigir outros registros. Aceite: operador próprio hoje permitido, outro autor/outro dia negado, CSRF/isolamento preservados.
2. R2-1: bottom sheet acessível no Hoje, saldo/versões lidos do servidor, chips e valor/data pré-preenchidos; ação combinada entrega+recebimento em uma transação, undo conjunto até 30 s. Mesmas regras de transição e CAS conta/pedido. Arquivos: worker/finance*, operations/Today, finance/QuickReceipt e migração 0006. Aceite: repetição/concorrência, transição inválida, desfazer conjunto e contexto da rota preservado.
3. R2-2: crédito não alocado, uso humano nos próximos pedidos, histórico de alocação, estorno apenas do disponível (sem desfazer dinheiro já alocado). Aceite: saldo nunca negativo, uso não conta como novo recebimento, retentativa/conflito e permissão auditados.
4. R2-3: anulação por administrador com motivo/evento, membros preservados em histórico e liberados no vínculo ativo; bloquear enquanto pagamentos vinculados impedirem a correção. Aceite: re-fechamento sem duplicar membros e sem apagar extratos.
5. R2-5/6/7: resumo recebido/vencido/semana com filtros; colunas geradas virtuais e índices de condição/periodicidade antes de relatórios; ATIVACAO.md como índice e flags em ordem (operação → financeiro → P1), migrações históricas preservadas.
6. P1-1: agenda semana/mês de prazos de pedidos/produção, fechamentos/vencimentos e exportação ICS privada, com escaping, folding UTF-8, UID estável e datas no fuso do negócio. Sem URLs públicas com dados privados.
7. P1-2: lembretes manuais privados, prazo, concluir/reabrir/arquivar com versão/auditoria e idempotência, visíveis no Hoje e agenda. Migração 0007.
8. P1-3: vendas entregues por período, cliente/sabor/condição, ranking e aging; CSV com proteção de fórmulas, aspas, separadores e quebras, contagens/limites explícitos. Não misturar previsto com recebido. Sem PDF prometido nesta etapa.
9. P1-7: despesas registradas somente por ação humana, eventos de estorno e fluxo de caixa de recebimentos/despesas por período. Sem pagar, criar conta paga, débito automático ou inferir taxa como despesa. Migração 0008.
10. P1-4/P1-5: insumos/preços por unidade de referência, fichas e rendimento, custo e sugestão com margem explícita; lista de compras a partir dos confirmados e receitas vinculadas, sem estoque/compra automática. Migração 0009. Falta de ficha/custo é avisada, não vira custo zero/lucro inventado.

P1 usa flag independente P1_ENABLED=false e verificação das tabelas. Cada etapa terá commit, testes de regras/integração/E2E adequados e relatório com Produzido, Testes executados, Limitações e Pendências. Histórico/status no arquivo Codex, preservando os arquivos de autoria Claude. Homologação física e ativação permanecem com administrador.


## Fechamento local da R2/P1

Todos os ajustes R2-1…7 e módulos P1-1, P1-2, P1-3, P1-7, P1-4/P1-5 solicitados foram implementados nesta ordem de etapas. Relatórios e limitações por módulo em docs/REVISAO_R2.md e docs/P1_ETAPAS.md; status/histórico na resposta ao Claude. Guia único ATIVACAO.md. Operação/financeiro/P1 e catálogo permanecem OFF no arquivo raiz. Nada remoto, inclusive push/CI remota, executado. Revisão, homologação física, backup/migrações/ativação reais com administrador; P1-6/8/9 e P2 não foram iniciados automaticamente.


## R4-0, R3 e R4 — próxima execução

CI afbdb39 aprovada antes de integrar 2fac3de. R4-0 primeiro: texto neutro em UI/documentos de uso, sabores vigentes com Limão; teste de regressão de nome na UI. Depois R3: ativos privados com foto editável, campos numéricos em centavos/inteiros, fluxo simples por passos e preferência local; testes WebKit/Chromium. R4: localização por gesto/provedor gratuito com rate limit/cache/atribuição, foto privada comprimida, Instagram, base privada/distância honesta, links de transporte, deslocamento e despesa como eventos e perfis com nome de exibição. Sem migrações/flags Cloudflare pelo agente. Commits/push por etapa e CI acompanhada. Arquivos: componentes, Management/Today/Totem, worker de campo/transporte/perfil, migração aditiva 0010 e testes/guia.

Fase 6: antes da transferência, arquivar/remover docs/colaboracao e auditar referências pessoais remanescentes. Não remover o canal durante o desenvolvimento.

### Execução R4 — localização e deslocamentos

Arquivos: migração 0011 (sites, perfis de exibição, base, cache/rate limit e deslocamentos), `shared/field.ts`, `worker/field*.ts`, telas privadas de clientes, Hoje, pedidos e configurações. Critérios: geolocalização por toque único; sugestões revisáveis por Photon/OSM com cache e limite global; fotos comprimidas e privadas; base vazia até cadastro; nomes pelo perfil; links manuais; deslocamento e despesa na mesma transação, idempotência, compensação e autorização por autor/dia; rateio identificado como estimativa. Testes isolados de organizações, permissões, limites, FKs, concorrência e regressão. Flags móveis e de campo desligadas por padrão. Nenhuma alteração de banco remoto.

### Complemento P1-6 / P1-8 / P1-9

Sequência após R4: estoque manual em milésimos da unidade do insumo, sem saldo negativo, movimentos entrada/consumo/perda/ajuste/estorno com motivo e versão; nunca baixar pela previsão. Importação de clientes CSV/XLSX com limite, prévia sem escrita e deduplicação por telefone normalizado; confirmação individual/servidor, sem atualizar existentes por importação. Exportação SQL completa dos dados da organização (inclui fotos), somente administrador, excluindo sessões/credenciais/caches e com restauração local isolada. Arquivos: migração 0012, worker/tools*.ts, shared/import*.ts, telas p1/Stock, Import e Backup, scripts/testes isolados. Nova flag P1_TOOLS_ENABLED=false exige schema completo; nenhum arquivo real ou serviço externo será acessado. Aceite: concorrência/CAS, idempotência, isolamento, quantidades decimais exatas, fórmulas de planilha não executadas, duplicatas não inseridas, exportação restaurada com FKs/contagens iguais e sem credenciais; tutorial e guia de ativação atualizados. Relatórios/despesas/fichas P1 existentes permanecem validados.

### Situação após R3/R4 e complemento P1

R4-0, R3-1…9, R4-1…7 e P1-1…9 implementados no código, com as limitações por módulo em FASE_R3.md, FASE_R4.md, P1_ETAPAS.md e P1_COMPLEMENTO.md. Estoque é manual/agregado; importação é somente de clientes; backup é SQL privado com restauração separada. Migrações 0010–0013 são aditivas. Flags MOBILE/FIELD/P1_TOOLS e catálogo permanecem false. Histórico anterior de fases preserva o que estava adiado em cada rodada; o status vigente está no canal CODEX_PARA_CLAUDE. Homologação física e ativação remota ainda são do administrador.
