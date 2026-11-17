# R7c — Custos, retorno e relatório de prospecção (0.15.0)

Escopo: R7-6, R7-7 e R7-9. Preparado em branch para revisão; sem publicação, ativação ou acesso ao banco real pelo Codex. A configuração aprovada no main foi preservada. R7d fica para a próxima tarefa da fila.

## Uso

1. Em **Visitas e amostras** ou no cartão do Hoje, depois de registrar uma visita, abra **Custos e despesas das amostras**. A seção só consulta o custo quando aberta. Ela mostra as unidades, estimativa pela ficha atual, pendências e corridas líquidas de estornos.
2. **Estimativa não é pagamento.** Nada é lançado ao agendar, registrar uma visita ou consultar custos. O administrador pode abrir **Registrar despesa de amostras**, informar valor efetivamente pago, data, forma e observação e confirmar. O valor começa vazio. Não relance ingredientes ou despesas já registrados. O lançamento fica em **Despesas → Amostras e prospecção**. A operadora consulta, mas não registra essa despesa.
3. Para corrigir, use o estorno com motivo em **Despesas**. A ligação original permanece no histórico. Depois do estorno, o custo utilizado volta à estimativa; um novo pagamento pode ser registrado com nova conferência. Uma despesa ativa por visita, com controle de versão, estimativa e repetição.
4. No botão **WhatsApp** da visita, escolha **Obrigada pela visita**, **O que achou das amostras?** ou **Tabela de preços**. Confira/edite a prévia e abra o WhatsApp para enviar pessoalmente. Agradecimento exige visita registrada; opinião exige amostras registradas. Sem telefone ou nome de exibição, a folha orienta o cadastro. A prévia não grava envio, campanha ou contato. Os textos ficam apenas na memória enquanto a folha está aberta.
5. **Tabela de preços** usa os kits/embalagens ativos com preços positivos cadastrados, com até 30 opções. Não inventa Pix nem liga o catálogo público. Para outras opções, a mensagem convida a conversar.
6. **Mais → Prospecção**, ou **Relatórios → Ver relatório de prospecção**: escolha as datas para conferir visitas efetivamente registradas, amostras por sabor/peso, conversão, tempo e custos.

## Como os números são calculados

- **Estimativa unitária:** ficha ativa por peso (R16) quando há uma única massa conhecida para o tamanho, pelos kits ativos ou medições cadastradas. Inclui acabamento, forminha e adicional configurado de custos. Não presume caixa de venda, iFood, fundo/pétala ou outros opcionais. Sem ficha R16, usa a ficha P1-4 compatível com sabor/peso, excluindo a embalagem de venda. Sem peso, ficha, insumo ativo/custo, ou com massa ambígua, o custo fica **Indisponível**, com subtotal conhecido e orientação. Zero cadastrado continua sendo zero; ausência não vira zero.
- Estimativas consultam **as fichas atuais**, não reconstituem o custo histórico dos insumos. A confirmação guarda uma cópia da estimativa e da observação junto do vínculo com a despesa. Não altera o registro imutável das amostras.
- **Custo utilizado da visita:** pagamento de amostras registrado e não estornado, quando existe; caso contrário, estimativa. Soma corridas líquidas dessa visita uma única vez. Não soma pagamento e estimativa das mesmas amostras. Estimativa sem pagamento não entra no fluxo de caixa.
- **Visitas do período:** data em que a visita aconteceu, no fuso de Fortaleza, e não a data do agendamento. Visitas canceladas/agendadas sem registro não contam.
- **Conversão do grupo visitado:** contatos únicos que receberam visita no período e converteram depois dessa visita até o fim da data final, divididos pelos contatos únicos visitados. Repetir a visita não multiplica o denominador.
- **Conversões no período:** conversões cuja data está no intervalo, com visita anterior registrada, mesmo que em outro mês. Conversões sem visita anterior são mostradas separadamente.
- **Tempo médio:** dias corridos da primeira visita registrada até a conversão, apenas para os convertidos do período com visita anterior.
- **Custo médio de aquisição:** custo utilizado das visitas anteriores à conversão desses convertidos, incluindo visitas de outros períodos, dividido pelo número de convertidos com visita anterior. Não mistura o custo dos contatos ainda sem conversão com esse denominador. Sem conversões, média indisponível; custo incompleto permanece indisponível, com subtotal conhecido separado.
- O relatório usa pagamentos e estornos **conhecidos agora**, inclusive correções feitas depois do período selecionado. Não é extrato de caixa nem retrato contábil de uma data passada.
- **Sabor associado à conversão:** contatos únicos que receberam aquele sabor no período e converteram até a data final; um mesmo contato pode ter provado vários sabores. O destaque soma contatos distintos por sabor, sem duplicar quem provou pesos diferentes. Não indica causa da conversão. A lista detalha sabor × peso.
- Consultas em lote, sem uma consulta por visita/sabor: limites explícitos de 1.000 visitas/conversões no período e 2.000 visitas históricas de aquisição; exceder pede reduzir o período. Fichas, kits e insumos mantêm os limites existentes do cadastro.

## Ativação pelo responsável, depois da revisão

Não executar estes passos antes da publicação aprovada. O PR já executa CI completo e Segurança; não disparar CI manual.

1. **Claude revisa e publica o código com CI/Segurança verdes.** Antes da 0026, R7a/b continuam funcionando. Custos/retorno/relatório ficam escondidos sem erro. Se houver falha na gestão, não prosseguir.
2. **Responsável faz backup privado e confere a restauração.** Resultado esperado: arquivo legível, contagens e chaves estrangeiras conferidas. Nunca enviar SQL, dados ou capturas reais ao GitHub/chat. Sem restauração conferida, pare.
3. **GitHub → Actions → Homologação D1 (manual) → Run workflow → main → PRE_CHECAGEM.** Resultado esperado: migração `0026_prospect_sample_expenses.sql` pendente e, se ainda não aplicada, 0025. Banco correto e zero violações de FK. Se houver migração inesperada, erro de acesso ou violação, pare e peça revisão.
4. **Só com autorização do responsável**, no mesmo workflow escolha **APLICAR_PENDENTES**. A ordem é 0024 → 0025 → 0026. A 0026 cria somente a tabela de vínculo visita–despesa e seu índice, sem exemplos e sem converter/apagar dados. Não declare uma condição falsa no input `backup_verified` (“Somente dados de teste”): se houver dados reais, o responsável precisa revisar o procedimento antes. Se falhar, não tentar SQL manual; peça revisão.
5. **PRE_CHECAGEM novamente.** Resultado esperado: 0026 aplicada, tabela `prospect_sample_expenses` presente, zero pendentes esperadas e zero violações de FK. Claude confere antes do uso.
6. **Flags ficam como aprovadas.** R7c reutiliza `PROSPECTS_ENABLED`, com gestão/financeiro/P1 prontos; o código não liga flag. Se essas funções já estiverem aprovadas e ligadas, R7c aparece quando o schema estiver pronto. Não mudar flags para contornar uma falha.

O Codex preparou/testou o SQL apenas em bancos efêmeros. O PR não autoriza migração, limpeza ou uso de dados reais.

## Backup e limpeza

A tabela nova entra no backup/restauração da organização. Ela é **operacional**: acompanha a despesa na limpeza de testes por suas chaves estrangeiras. Não entra no KEEP, pois isso impediria remover despesas de teste. Visitas, registros de amostras e histórico do contato continuam protegidos pelo KEEP. A limpeza não é operação autorizada nesta entrega.

## Verificação local

```bash
npm run test:prospect-costs
npm run test:security
npm run test:backup
npm run test:cleanup
npm run test:migrations
npm run build:pages
npm run test:e2e -- tests/e2e/prospect-costs.spec.js tests/e2e/visits.spec.js
```

Somente fixtures DEMONSTRAÇÃO em D1 efêmero/SQLite local. Capturas `docs/colaboracao/capturas/r7c-*` são fictícias, sob os cabeçalhos/CSP reais do app.
