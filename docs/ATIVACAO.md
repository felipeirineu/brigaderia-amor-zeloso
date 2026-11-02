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

## Identificação da busca de endereços (R5-9)

O Worker envia ao Photon `BrigaderiaGestao/1.0` por padrão, sem URL pessoal. Na transferência, o administrador pode configurar a variável **PLACES_USER_AGENT** no Worker/Pages com o identificador e o contato público da própria empresa (até 200 caracteres ASCII, sem quebras de linha). É uma identificação pública enviada ao provedor; não colocar e-mail pessoal, token ou segredo. O campo é opcional e não vai para o navegador. Se estiver ausente ou inválido, usa o valor neutro. Nenhuma variável remota foi alterada nesta entrega.

## Caminho curto de homologação — somente dados de teste (R5-10)

Este caminho foi **preparado, não executado**. Use quando o login da Fase 1 já funciona, o binding aponta para o banco de homologação e o responsável confirma que não há dados reais de clientes. Com dados reais ou dúvida, use o caminho gradual acima. O catálogo público continua desligado em todos os caminhos.

1. **Pausar cadastros e fazer backup no computador.** No PowerShell, dentro da pasta do projeto:

   ```powershell
   New-Item -ItemType Directory -Force .local
   npx wrangler login
   npx wrangler d1 export brigaderia-amor-zeloso-homologacao --remote --output .local/antes-homologacao.sql
   npm run ops:restore-check -- .local/antes-homologacao.sql
   ```

   Esperado: login na conta correta, arquivo exportado e restauração **local nova** com contagens coerentes e zero violações. Se falhar, pare; não avance só porque o arquivo existe. Não publique esse SQL nem o coloque em artefatos do GitHub.

2. **Conferir o histórico e aplicar todas as pendentes de uma vez:**

   ```powershell
   npx wrangler d1 migrations list brigaderia-amor-zeloso-homologacao --remote
   npx wrangler d1 migrations apply brigaderia-amor-zeloso-homologacao --remote
   ```

   Confira a lista antes de confirmar o segundo comando. No banco já usado, se **0001/0002** aparecerem pendentes, **pare e reconcilie o histórico conforme FASE_2A**; não tente recriar tabelas existentes. O runner usa os arquivos de `database/migrations` (atualmente 0001–0013), em ordem, e não reaplica as registradas. Se houver erro, pare: migrações anteriores podem ter sido aplicadas; preserve banco e backup.

3. **Uma pré-checagem consolidada após o runner:**

   ```powershell
   npm run ops:preflight -- --remote brigaderia-amor-zeloso-homologacao
   ```

   Esperado: `pending: []`, `foreign_key_violations: 0`, campos `schema_*_ready: true` e `generated_condition_columns: true`. Compare contagens com o backup; mudanças estruturais não justificam perder clientes/pedidos. Se divergir, não ative as flags e não importe o backup por cima do banco por tentativa.

4. **Uma única alteração de configuração, feita pelo responsável.** No `wrangler.jsonc`, mudar juntas para `"true"` as seis flags de gestão: `OPERATIONS_ENABLED`, `FINANCE_ENABLED`, `P1_ENABLED`, `MOBILE_ENABLED`, `FIELD_ENABLED`, `P1_TOOLS_ENABLED`. Manter `PUBLIC_CATALOG_ENABLED="false"`, `ACCESS_*`, binding e IDs. Revisar o diff, fazer **um commit** e aguardar o deploy associado ao GitHub. Esperado: build aprovada; se falhar, preserve os dados e corrija a build/configuração. As flags deste repositório **não foram mudadas nesta entrega**.

5. **Após login de administrador, cadastrar a base em Configurações/Mais → Empresa.** Buscar o endereço ou usar “Usar minha localização” estando no local. Conferir o endereço e a distância de um cliente de teste. O endereço fica somente na interface/D1; nunca no código, nos docs ou no chat. Sem localização válida, o app não deve inventar distância.

6. **Testar antes de liberar cadastros.** Em iPhone e Android: entrar com e-mail, abrir Hoje/calendário, cadastrar cliente de teste, conferir foto/localização, criar/revisar pedido, passar por produção/entrega, registrar recebimento e desfazer no prazo. Conferir financeiro e CSV/ICS sem enviar mensagens reais. Abrir Mapa/Uber/99 apenas para conferir o destino; não solicitar corrida no ensaio. Se algo falhar, pausar cadastros e usar o guia da fase correspondente. Avisos push e prospecção ainda não estão entregues.

## Alternativa sem Node/Wrangler no Windows: workflow manual preparado

O workflow **“Homologação D1 (manual)”** só aparece em **Actions** e **nunca roda por push/PR**. Não foi disparado pelo agente. Ele não faz deploy, muda flags ou exporta backup.

Uma vez, o administrador deve criar no GitHub o ambiente **`homologacao-d1`**, restringi-lo ao `main` e configurar aprovação por responsável. Nesse ambiente:

- Variável `CLOUDFLARE_ACCOUNT_ID`: ID da conta correta.
- Secret `CLOUDFLARE_API_TOKEN`: token Cloudflare com **Account → D1 → Edit**, limitado à conta do banco. Essa permissão pode alcançar os bancos D1 dessa conta; não é uma permissão por tabela. Não adicionar Workers/Pages Edit, permissões de cobrança nem usar a chave global. Guardar o token somente como secret, revogar após o uso se não for mais necessário.

Depois, em **Actions → Homologação D1 (manual) → Run workflow**, escolher **main**:

1. `PRE_CHECAGEM` é o padrão: faz só leitura, mostrando migrações pendentes, contagens e violações, sem dados pessoais. Erro de credencial/configuração exige corrigir o ambiente; não colar token no chat.
2. Para aplicar, primeiro cumprir o backup/restauração local do passo 1, confirmar que há só dados de teste e pausar cadastros. Escolher `APLICAR_PENDENTES`, marcar a confirmação e aprovar a execução no ambiente. O runner pré-checa automaticamente, bloqueia histórico inicial inconsistente/FKs inválidas, aplica as pendentes em ordem e faz a conferência consolidada. Falha em qualquer passo encerra sem ativar flags; migrações anteriores bem-sucedidas podem permanecer aplicadas.
3. Após resultado verde e contagens conferidas, seguir os passos 4–6 acima. O GitHub não recebe o backup: não há upload de SQL/artefato pelo workflow. Os logs mostram apenas metadados e contagens.

Sem secret ou ambiente configurados, o workflow encerra com orientação; não use outro banco para “testar se funciona”. A criação do ambiente, secret, aprovação e qualquer operação remota ficam a cargo do administrador. Não foram realizadas nesta rodada.

Após o primeiro login de cada pessoa, tocar em **Defina seu nome** no Hoje (ou perfil → Nome de exibição e preferências), informar o nome usado pela equipe e salvar. Esperado: saudação com o nome, iniciais no avatar e chip oculto. Se não salvar, verificar a mensagem e a conexão; a operação continua disponível sem nome. Não inserir um nome de demonstração em conta real.
