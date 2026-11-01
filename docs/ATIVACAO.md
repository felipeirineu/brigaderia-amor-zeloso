# Ativação — índice único para o administrador

**O agente não ativa nada remoto nesta rodada.** O código está no main; confira o CI do commit que será ativado antes de usar o painel. Nunca enviar backups, dados de clientes, chave Pix ou tokens ao chat/GitHub.

Use o [guia Windows com comandos, resultado esperado e o que fazer se der erro](FASE_2A.md#ativação--passos-curtos-no-windows-powershell). Mantenha este checklist aberto:

- [ ] Código correto no main e build de teste aprovada; Node/Git/Wrangler funcionando no computador.
- [ ] Login Cloudflare na conta e banco corretos; ninguém cadastrando durante backup/migração.
- [ ] `npm run ops:preflight -- --remote brigaderia-amor-zeloso-homologacao`: conferir migrações/contagens e zero FKs. A saída não contém dados pessoais.
- [ ] Exportar backup para `.local/` fora do Git. Arquivo maior que zero não basta: restaurar em ambiente separado com `npm run ops:restore-check -- .local/backup-antes-fase2.sql` e comparar contagens.
- [ ] Se 0001/0002 aparecerem pendentes em banco já preenchido, parar e reconciliar o histórico; não reaplicar por tentativa.
- [ ] Aplicar pelo runner apenas as pendentes, na ordem. **0003** status/pedidos padrão; **0004** entregador padrão; **0005** financeiro; **0006** revisão R2 (crédito/anulação/índices); **0007** lembretes; **0008** despesas; **0009** fichas/insumos; **0010** fotos/pedido simples; **0011** locais/perfis/deslocamentos; **0012** estoque; **0013** importações de clientes.
- [ ] Rodar a pré-checagem novamente: `pending: []`, zero FKs, contagens anteriores preservadas e schema_operations/finance/p1_ready true. Conferir amostras privadas, sem publicar dados.
- [ ] Primeiro `OPERATIONS_ENABLED=true`; FINANCE/P1 false. Deploy correto e teste de login/status/geração.
- [ ] Depois `FINANCE_ENABLED=true`, somente com 0005/0006 conferidas. Deploy correto e teste de saldo/sinal/crédito/estorno/recebimento rápido/desfazer com DEMONSTRAÇÃO.
- [ ] Por último `P1_ENABLED=true`, somente com 0007–0009. Deploy correto e teste de agenda/ICS/lembretes/CSV/despesas/ficha/compras.
- [ ] Depois MOBILE_ENABLED=true (0010) e FIELD_ENABLED=true (0011), um deploy/teste por vez, conforme [R4](FASE_R4.md). Configure a base e o nome de exibição na gestão; não editar dados no bundle.
- [ ] Por último P1_TOOLS_ENABLED=true, com 0012/0013 e schema_tools_ready true. Testar estoque/importação/backup seguindo [Complemento P1](P1_COMPLEMENTO.md).
- [ ] Catálogo continua OFF; não cadastrar chave Pix de exemplo na conta real, não enviar mensagem real nos ensaios.
- [ ] Homologar Android/iPhone físicos e importação de arquivos em aplicativos autorizados; liberar cadastros somente depois das conferências.

## Se houver erro

Pare na etapa que falhou. Preserve backup, banco e registros. Nunca colar fragmentos do rebuild, executar DROP/reset ou importar backup em cima do banco usado diariamente por tentativa. O guia detalhado descreve o resultado e o erro de cada comando. Falha de build não se corrige apagando dados.

## Como desligar

No mesmo `wrangler.jsonc`, salvar primeiro `P1_TOOLS_ENABLED=false`, depois `FIELD_ENABLED=false`, depois `MOBILE_ENABLED=false` e `P1_ENABLED=false`, um deploy por etapa e aguardar deploy. Isso oculta módulos P1; não estorna despesas, apaga lembretes ou desfaz fichas. Depois, se necessário, `FINANCE_ENABLED=false`; por último `OPERATIONS_ENABLED=false`. Se já houver dinheiro/status registrados, pausar alterações enquanto corrige a causa. Não retornar a backend antigo que desconheça os eventos.

Flags não fazem rollback de dados. Restauração/Time Travel exigem avaliação de registros posteriores e ensaio separado, realizados pelo responsável. Nada é apagado automaticamente. A pré-checagem apenas lê; o script de restauração só escreve em um estado **local novo**.
