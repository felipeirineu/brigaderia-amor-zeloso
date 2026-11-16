# R7a — Contatos e conversão em cliente (0.13.0)

Código preparado para revisão; nenhuma ativação remota foi executada pelo Codex. Esta etapa entrega somente contatos, acompanhamento e conversão. Visitas, amostras na produção, lembretes de visita, despesas e relatórios pertencem às R7b/R7c.

## Uso após ativação

1. Em **Clientes**, selecione **Contatos** e toque **Novo contato**. Informe o nome; telefone é opcional. Pessoa de contato, origem e observações são campos livres. Localização, foto e Instagram usam o mesmo cadastro já existente.
2. O cartão mostra a etapa e o próximo passo; sem data, aparece **a definir**. Em **Atualizar acompanhamento**, escolha a etapa, ajuste a data e toque **Salvar acompanhamento**. A etapa Amostra entregue é um registro humano do funil nesta fase; não registra unidades nem movimenta produção/estoque.
3. **Histórico do contato** consulta os últimos 50 eventos; os anteriores permanecem no banco/backup. Alterações recebem autor/data e controle de versão. Se outra pessoa alterar o contato, atualize antes de repetir.
4. **Virou cliente** converte o mesmo cadastro, preservando localização/foto/Instagram, observações e histórico. Abre as condições do cliente e oferece criar pedido padrão/primeiro pedido. Estabelecimento/pessoa de contato são reaproveitados, sem sobrescrever um perfil já configurado. Nenhum pedido é criado automaticamente. Pessoas têm apenas pedido avulso, como na regra existente.
5. Um contato Não teve interesse pode ser arquivado em **Conta e localização**; o histórico é preservado. **Incluir arquivados** permite consultar e editar/reativar. Exclusão física não faz parte desta etapa.

Contatos ainda não convertidos ficam fora da seleção de vendas; as APIs de pedidos/modelos também recusam esse uso. Não há mensagem, lembrete, despesa, recebimento ou registro de visita automático.

## Ativação pelo responsável — ordem obrigatória

**1. Revisar e publicar o código.** Claude confere o PR e CI/Segurança e publica no main. Resultado esperado: a gestão segue funcionando com `PROSPECTS_ENABLED=false`, mesmo com banco até 0023; Contatos não aparece. Se a gestão falhar, não aplique migração nem altere a flag; informe o erro para revisão.

**2. Fazer backup e ensaiar restauração.** O responsável baixa o backup administrativo e confere a restauração fora do GitHub. Não enviar SQL, dados reais, credenciais ou capturas privadas ao repositório/chat. Resultado esperado: arquivo legível, contagens e vínculos conferidos. Se não houver backup restaurado e conferido, pare antes da aplicação.

**3. Rodar a pré-checagem existente.** GitHub → Actions → **Homologação D1 (manual)** → Run workflow → branch **main** → modo **PRE_CHECAGEM**. Resultado esperado: lista de pendentes identifica `0024_prospects.sql`. Se houver outras pendências, falha de conexão/permissão ou banco diferente do pretendido, peça revisão ao responsável; não execute SQL manual para contornar.

**4. Aplicar pendentes somente com autorização do Felipe.** No mesmo workflow, modo **APLICAR_PENDENTES**. A migração só acrescenta `customers.kind`, duas tabelas e índices; não remove/converte cadastros e não inclui exemplos. O campo `backup_verified` deve ser marcado apenas quando suas condições forem verdadeiras. A descrição atual desse campo menciona “Somente dados de teste”; se houver dados reais ou a descrição não se aplicar, pare para o Felipe revisar o procedimento, sem declarar uma condição falsa. Resultado esperado: execução verde com 0024 aplicada uma vez. Se falhar, mantenha flag desligada e encaminhe o erro; não reaplique manualmente.

**5. Rodar PRE_CHECAGEM novamente.** Resultado esperado: 0024 aplicada, tabelas `prospect_details`/`prospect_events` presentes e nenhuma violação de chave estrangeira. Claude confere o resultado; se não estiver consistente, não ative.

**6. Decidir ativação.** Ligar `PROSPECTS_ENABLED` é decisão do Felipe (`VEZ: FELIPE` na fila, pelo Claude). O Codex entrega ambas as configurações com `false`. Nem o workflow de migração nem o CI ligam a flag. Após autorização e publicação da configuração pelo fluxo responsável, homologar com cadastro autorizado de teste em ambiente apropriado; não cadastrar exemplos no banco real automaticamente.

## Backup, limpeza e testes locais

`prospect_details` e `prospect_events` entram no exportador e no conjunto KEEP. Limpeza padrão de testes preserva contatos/histórico. A opção de limpar clientes passa a ser recusada por alcançar tabelas protegidas (mesmo vazias), exigindo revisão humana do plano; não remover a proteção para prosseguir.

```bash
npm run test:prospects
npm run test:security
npm run test:backup
npm run test:cleanup
npm run test:migrations
```

Esses testes usam D1 efêmero/SQLite local e dados DEMONSTRAÇÃO. Incluem banco até 0023, flag desligada, autorização, CAS/idempotência/concorrência, conversão, preservação de foto/local/histórico, backup/restauração e ausência de movimentos financeiros. Nenhum comando acima acessa D1 remoto. O CI completo é o automático do PR; não disparar manualmente para esta entrega.
