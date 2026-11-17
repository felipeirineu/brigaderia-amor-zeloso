# R6-7 — Avisos de lembretes e calendário

A folha **Novo lembrete**, no Hoje, permite escolher quando lembrar, o horário do aviso e os responsáveis pelos nomes/fotos do perfil. **Na hora**, **15 min**, **1 h**, **1 dia** e **Outro horário** definem o mesmo instante usado no push e no arquivo do calendário. **Não avisar** salva apenas o compromisso. Editar, concluir, reabrir e arquivar preserva as preferências quando não são alteradas.

No Hoje, o círculo conclui e a confirmação oferece reabrir o último lembrete concluído sem sair da tela; a lista completa permite reabrir os demais. Alterações concorrentes são recusadas em vez de sobrescritas.

Cada responsável ativa os próprios aparelhos em **Perfil → Preferências → Avisos neste aparelho**. A permissão só é solicitada por uma escolha explícita de aviso para si ou pelo botão de ativação. **Enviar aviso de teste** confirma a aceitação pelo serviço; conferir o recebimento na tela do aparelho. Pode-se desativar este ou outro aparelho da própria conta. Sair da conta revoga as assinaturas daquela sessão; um aviso que já foi despachado pode chegar depois da saída.

No iPhone é necessário **iOS 16.4+ e app instalado na Tela de Início**. Android/Chrome permite navegador ou app instalado. Economia de bateria, permissões e rede podem atrasar/bloquear avisos. O cron verifica a cada cinco minutos, não garante um segundo exato. O título e o horário aparecem na notificação, inclusive na tela bloqueada; evite dados sensíveis no título. Notas e contatos não vão no payload. Nenhuma mensagem é enviada a clientes.

**Adicionar ao calendário do celular** baixa um `.ics` privado com o compromisso e o alarme absoluto escolhido. Abra o arquivo no calendário, confira o alarme e salve. O aplicativo de calendário pode pedir confirmação ou ignorar alarmes importados; confira no aparelho. Não há sincronização automática: após editar/concluir o lembrete, substitua/remova também o evento importado. O mesmo UID/SEQUENCE ajuda calendários que suportam atualização. Ao escolher Não avisar, o arquivo não contém alarme.

## Ativação pelo GitHub, em passos curtos (T8)

**O código da T8 não executa a ativação.** O responsável usa o workflow depois da revisão/publicação e com CI e Segurança do main verdes. Não é preciso terminal, ver ou copiar chaves VAPID. Não muda as flags, o catálogo nem as tabelas. Pages não executa Cron Trigger: o agendador separado `amor-zeloso-lembretes` usa a mesma conta e o mesmo banco, com cron de cinco minutos. Não há serviço pago integrado.

Este procedimento pressupõe as migrações do recurso já aplicadas e conferidas pelo fluxo de homologação. Ele **não aplica migrações nem consulta dados do D1**. Se a prontidão do banco não estiver confirmada, interrompa e peça a conferência habitual; não rode novamente os SQL antigos.

### 1. Preparar a permissão da Cloudflare (uma vez)

1. Abra a Cloudflare → perfil → **API Tokens**.
2. No token usado pela homologação, mantenha as permissões existentes e permita, na conta da brigaderia: **Workers Scripts: Edit** e **Cloudflare Pages: Edit**.
3. Salve. Não publique o token em comentários, capturas, logs ou chat.

**Esperado:** token com acesso à conta correta e às duas permissões. Se a interface não permitir editar o token existente, o administrador deve substituí-lo nos ambientes que o usam; não tente revelar um secret pelo GitHub. A verificação abaixo confirma acesso de leitura aos dois serviços; não faz uma escrita só para provar a permissão Edit.

### 2. Preparar o ambiente do GitHub (uma vez)

1. No repositório, abra **Settings → Environments → New environment**.
2. Nome: **`lembretes-push`**.
3. Em **Environment secrets**, cadastre **`CLOUDFLARE_API_TOKEN`**, usando o mesmo token da homologação guardado de forma privada. Se o valor só existe como secret do GitHub, ele não pode ser revelado: peça ao administrador a configuração do novo ambiente. Chaves VAPID não entram aqui.
4. Em **Environment variables**, cadastre **`CLOUDFLARE_ACCOUNT_ID`**, com o mesmo identificador da conta de homologação.
5. Ainda em variables, cadastre **`APP_URL`** = `https://brigaderia-amor-zeloso.pages.dev/` (o endereço HTTPS do aplicativo). Não use e-mail, credenciais ou parâmetros nessa URL.

**Esperado:** um secret e duas variables com esses nomes. Se faltar algo, o workflow para com uma mensagem de configuração, antes de gerar chaves.

### 3. Verificar, sem alterar nada

1. Abra **Actions → Ativar lembretes (manual) → Run workflow**.
2. Branch: **main**. Em **mode**, deixe **VERIFICAR**. A confirmação pode ficar desmarcada.
3. Clique no botão de execução e abra o resultado da etapa **Verificar ou configurar os lembretes**.

**Esperado:** acesso de leitura a Pages/Workers confirmado, somente os nomes dos secrets de produção e do agendador, existência do Worker/cron e próximo passo. Na primeira ativação é normal o agendador não existir. Nenhuma chave é gerada; não há escrita, publicação ou arquivo de chave.

**Se der erro:** confira conta, nome do projeto, variável APP_URL e permissões. Não prossiga para ATIVAR enquanto a verificação estiver falhando. Se disser que já existe configuração VAPID, não a regenere. Se o trio estiver completo nos dois destinos, a identidade já existe; use apenas VERIFICAR ou REPUBLICAR_AGENDADOR conforme o próximo passo. Configuração incompleta requer revisão humana, sem copiar valores.

### 4. Ativar uma única vez

1. No mesmo workflow, escolha **main → ATIVAR**.
2. Marque **confirmo** depois de conferir o guia e a conta.
3. Execute e aguarde o resultado.

**Esperado:** os três nomes `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` presentes como secrets tanto no Pages (produção) quanto no Worker; agendador e cron `*/5 * * * *` presentes; mensagem de configuração concluída. O subject é a APP_URL HTTPS. As chaves são geradas em memória, mascaradas pelo canal `::add-mask::` do Actions e enviadas por stdin ao Wrangler. Não são argumentos de comando, arquivo de chave, artefato ou mensagem de log. Não é necessário vê-las ou copiá-las.

ATIVAR recusa qualquer nome VAPID já existente, mesmo se houver apenas uma configuração parcial ou a pública estiver em variável comum. Isso evita trocar a identidade de aparelhos já inscritos. Sem confirmação, recusa antes de consultar a conta.

**Se der erro depois de começar:** não repita ATIVAR. O Pages e o Worker são serviços separados, sem uma transação única; uma parte pode ter sido concluída. Rode somente VERIFICAR e peça revisão humana se a configuração estiver incompleta. O workflow não apaga secrets nem faz rollback/regeneração automática. Não copie erros brutos ou chaves. Se a única pendência for propagação do cron, aguarde alguns instantes e rode VERIFICAR novamente.

### 5. Republicar o Pages

Pelo fluxo habitual de publicação do projeto Pages, solicite um novo build de produção. O próximo publish normal do main também serve. O workflow de ativação não publica o aplicativo Pages.

**Esperado:** com banco pronto e nova publicação, **Preferências → Avisos neste aparelho** oferece ativação. Se continuar indisponível, confira o resultado do VERIFICAR, o ambiente de produção e o build publicado; não troque as chaves.

### 6. Testar em cada aparelho

1. Abra o aplicativo com a conta da pessoa responsável.
2. Em **Perfil → Preferências → Avisos neste aparelho**, ative os avisos.
3. Toque em **Enviar aviso de teste** e confira o recebimento.
4. Repita em cada aparelho. No iPhone: iOS16.4+ e aplicativo instalado na Tela de Início.

**Esperado:** aviso no aparelho correto. Depois, crie um lembrete DEMONSTRAÇÃO para alguns minutos adiante e confira título, horário, responsável e abertura no dia certo. Confira também `.ics`, concluir/reabrir e sair da conta. Se falhar, confira permissão do navegador, instalação do iPhone e rede; use o calendário como alternativa. Não reenvie em loop. O cron verifica a cada cinco minutos e não garante entrega pontual. Esses testes físicos são do responsável e continuam pendentes até serem feitos.

### Atualizar somente o agendador depois da ativação

No workflow, escolha **main → REPUBLICAR_AGENDADOR**, marque confirmo e execute. Ele exige o Worker e o trio de secrets já presentes nos dois destinos; publica o código/binding DB/cron configurado, preservando as chaves. Não gera nem grava secrets. Ao final, faz a mesma verificação de metadados. Se houver configuração parcial, pare e peça revisão; não use ATIVAR como reparo.

### Alternativa técnica pelo terminal

Somente para um administrador que prefere o procedimento manual e guarda a identidade em local privado. O caminho principal acima dispensa estes passos. **Não gere outra identidade se já houver VAPID em algum destino.**

1. Na pasta atualizada do projeto, execute `npm ci` e `node scripts/create-push-keys.mjs https://brigaderia-amor-zeloso.pages.dev/`. Esperado: arquivo privado `.local/push-secrets.json`, sem chaves no terminal. EEXIST significa reutilizar a identidade anterior; não apagar/regenerar. Esse helper local grava um arquivo privado por escolha do administrador; o workflow não usa esse arquivo.
2. Cadastre os três campos como Secret no Pages de produção e republice pelo fluxo habitual, sem colocar a privada em VITE_, código ou variável pública.
3. Copie `worker/push-scheduler.wrangler.example.jsonc` para `.local/push-scheduler.wrangler.jsonc`; confira nome e id do mesmo DB em `wrangler.jsonc` e preencha a cópia. Preserve o caminho `../worker/push-scheduler.ts` e o cron. Execute `npx wrangler deploy --dry-run --config .local/push-scheduler.wrangler.jsonc`. Esperado: bundle local e binding DB correto, sem publicar. Se houver erro, pare.
4. Após conferir a conta, execute `npx wrangler deploy --config .local/push-scheduler.wrangler.jsonc` e `npx wrangler secret bulk .local/push-secrets.json --config .local/push-scheduler.wrangler.jsonc`. Confira Worker, secrets e cron no painel e faça o teste em cada aparelho. Se falhar, desabilite o cron pelo painel até a revisão; não regenere as chaves.

Para interromper envios: desabilitar o Cron Trigger, remover os secrets do Pages e revogar os aparelhos. Preservar tabelas/migrações; não apagar dados nem reverter o schema para desativar o recurso. Avisos já aceitos pelo provedor podem chegar depois.

## Garantias e limites

- AES128GCM/RFC8291 e VAPID por biblioteca Web Crypto, com decriptação independente e assinatura verificadas nos testes locais. Chave pública só por API autenticada; privada somente em Env.
- Assinaturas por organização/pessoa/sessão, no máximo cinco aparelhos ativos; endpoints HTTPS de provedores explícitos, sem seguir redirects. Estado não revela endpoint/chave privada. Revogação usa CAS/idempotência/auditoria, sem conteúdo sensível.
- Claim atômico antes do envio, chave única lembrete/revisão/aparelho e cinco tentativas por execução. Cron repetido/concorrente não duplica. Resposta 404/410 revoga assinatura; 3xx/4xx falha; 5xx/erro/timeout é incerto. Nenhuma tentativa falha/incerta é repetida automaticamente, pois o provedor pode ter aceitado o envio. A alternativa é calendário ou escolha humana de um novo aviso/horário. Reabrir sem mudar título/horário/destinatário não reenvia.
- O agendador usa lote de cinco, timeout de dez segundos e poucas consultas, para manter margem no D1 Free. O intervalo permite até 1.440 tentativas por dia, além dos testes manuais. Conferir métricas reais de CPU, D1 e requisições no plano gratuito; não houve medição em produção. Filas extensas podem atrasar mais que cinco minutos. Não há serviço pago integrado.
- Backup de negócio inclui configurações/destinatários dos lembretes, mas não assinaturas, fila, ledger push, sessões ou secrets. Nova assinatura não dispara automaticamente lembretes anteriores à restauração/ativação. Usuários precisam ativar novamente os aparelhos. Dados de cliente e endpoints não são cacheados pelo service worker.

## Validação local

`npm run test:push` usa workerd/D1 efêmeros, chaves temporárias e provedores simulados. Testa interoperabilidade criptográfica, cron repetido/concorrente, 410, redirecionamento bloqueado, erro ambíguo sem retry, recuperação de claim, limites, ausência de schema/configuração e logout. A matriz `npm run test:security` cobre todas as rotas novas. Playwright simula somente as APIs de aparelho: não equivale a recebimento físico nem ativa push de produção.

## R17-5 — validade dos avisos por aparelho

Em **Preferências → Avisos neste aparelho**, “Avisos ativos neste aparelho até” mostra data/hora de Fortaleza da sessão vinculada. A validade vem do servidor, não de contagem local de30 dias. Sair da conta, vencer a sessão ou revogar acesso interrompe o vínculo; um envio já despachado pode ainda chegar. Após entrar novamente, confira a ativação nesse aparelho. Assinaturas sem sessão válida deixam de aparecer como ativas. O calendário (.ics) permanece alternativa por escolha humana; push não tem entrega pontual garantida. A sessão não é renovada automaticamente nesta rodada.
