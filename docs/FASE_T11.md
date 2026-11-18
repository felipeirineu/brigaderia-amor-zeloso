# T11 — lembrete de backup e pasta fixa

Código **0.23.0**, para revisão pelo Claude. A T11 segue a prévia aprovada e não implementa a T12. Nenhuma migração, publicação, alteração de flags, credencial ou operação Cloudflare/D1 real foi executada pelo Codex.

## Produzido

Somente o administrador vê e altera o lembrete. Na tela de Backup escolhe **Toda semana** (padrão), **A cada 15 dias**, **Todo mês** ou **Não lembrar**, dia da semana e horário local; salva explicitamente. O padrão é segunda-feira às9h, no fuso America/Fortaleza.

O período é um mínimo em dias civis: sete, quinze ou um mês de calendário, limitando o dia ao fim do mês quando necessário. Depois dele, vale a primeira ocorrência do dia/horário escolhido. Um backup de segunda às10h não pula o aviso da segunda seguinte às9h. Quinze dias com um dia da semana fixo pode resultar em uma janela posterior ao15º dia; isso aparece na explicação da tela. Sem histórico, usa a janela da semana em que a configuração foi criada. O vencimento fica estável até mudar a configuração, confirmar outro backup ou adiar; salvar a mesma configuração não cria outro aviso.

Quando vence, o Hoje do administrador mostra **Está na hora de fazer o backup!**, último backup/dias ou Nenhum backup feito ainda, e as ações **Fazer backup** / **Lembrar mais tarde**. Adiar grava uma hora no servidor para toda a organização, com CAS/idempotência; não é uma preferência só do aparelho. Abas abertas atualizam no foco, por evento e a cada minuto; a comparação local do horário é atualizada a cada30s. O servidor valida o instante antes de aceitar um adiamento.

### Arquivo e confirmação

O SQL privado existente continua sendo o exportador. A migração0027 cria configuração/comprovantes e acrescenta a classificação de backup aos jobs de push; não muda pedidos, clientes ou custos. O último backup legado vem do evento `backup.export_requested`. Exportações novas só resolvem o lembrete após confirmar que o arquivo foi salvo:

- **Pasta fixa:** em navegador compatível do computador, Escolher pasta/Trocar pasta abre o seletor nativo. O handle fica no IndexedDB, separado por organização e perfil. A escrita precisa concluir `close()` antes da confirmação no servidor. Se o navegador pedir novamente, **Permitir acesso à pasta** explica e solicita a permissão por ação humana. **Usar Downloads** remove só o vínculo, nunca arquivos.
- **Download comum:** celular/Safari/sem API mantém o download. O navegador não informa ao app se o usuário realmente salvou; a mensagem é **Download solicitado** e o administrador escolhe **Já salvei o arquivo** depois de conferir. Não há salvamento verificado simulado.
- **Falha de rede/espaço/permissão:** não confirma nem atualiza o último backup. Se o arquivo foi gravado mas a confirmação falhou, **Atualizar lembrete** repete somente a confirmação com a mesma chave, sem baixar ou gravar outro arquivo.

O comprovante só nasce depois de gerar todo o SQL, é vinculado ao usuário/organização, dura15 minutos e tem uso único/idempotente. Um comprovante anterior não retrocede a data já registrada. Não é credencial, não aparece em URL e não é persistido no navegador. Os comprovantes não entram nos dados do SQL exportado; a configuração entra. Nenhum conteúdo do arquivo é enviado a outro serviço. Arquivos têm nomes distintos; colisão é recusada antes de abrir escrita. O app não apaga backups antigos.

A tela orienta guardar os **8 backups mais recentes**, cerca de dois meses, e explica o histórico de sete dias da Cloudflare e a necessidade de pasta privada. Mantenha mais arquivos se desejar. A confirmação de salvamento não substitui o ensaio de restauração local e a conferência de contagens/amostras.

### Aviso no celular

Reutiliza o agendador/VAPID já existente da T8, sem serviço novo. Com avisos ativados pelo administrador no aparelho, envia uma vez por vencimento/adiamento/aparelho. A notificação oferece **Fazer backup** e **Lembrar em1 h**; o segundo comando relê versão/chave, faz POST autenticado e atualiza as janelas abertas. Se a sessão expirou ou o lembrete mudou, abre Backup para ação humana, sem afirmar que adiou.

O claim ocorre antes de chamar o provedor. Cron concorrente/repetido não duplica. Mudança de configuração, conclusão, revogação, sessão expirada ou perda do papel de administrador bloqueiam/cancelam a entrega; autorização e papel são conferidos novamente antes do envio. Um envio incerto não é repetido automaticamente. O lote continua limitado a cinco tentativas e usa consultas em lote, sem N+1 por organização/aparelho. O conteúdo é só o aviso e a data do backup, sem clientes, telefone, custos ou notas.

A interface só aparece com o schema completo; sem0027, o backup anterior e os lembretes comuns continuam funcionando. A configuração entra em `KEEP` do script de limpeza. Esse script não foi executado contra banco real.

## Ativação pelo responsável, depois da revisão

**Apenas preparar estes passos não os executa.** Não mude flags. A aplicação deve estar na0.23.0 antes de aplicar0027, porque o exportador anterior não conhece as tabelas novas.

1. **Publicação do código:** aguarde CI completo e Segurança do PR verdes, revisão/publicação do Claude e a atualização do app. Esperado: versão0.23.0; o novo lembrete ainda fica oculto sem a migração. Se não atualizar, use o aviso de versão nova ou reabra o app.
2. **Backup anterior à migração:** em Mais → Backup privado → Fazer backup agora, salve o SQL em pasta privada e confira/ensaie a restauração local pelo guia de operação. Não envie o arquivo ao GitHub ou ao chat. Se o download ou a conferência falhar, pare; não aplique a migração.
3. **Pré-checagem somente leitura:** GitHub → Actions → **Homologação D1 (manual)** → Run workflow → main → **PRE_CHECAGEM**, confirmação desmarcada. Esperado: só0027 pendente e nenhuma violação. Se houver outras pendências ou erro, peça revisão antes de continuar.
4. **Aprovação e aplicação:** a0027 muda o banco real e exige autorização explícita do responsável. O workflow atual, em APLICAR_PENDENTES, exige confirmar **“Somente dados de teste, gravações pausadas e backup restaurado/conferido fora do GitHub”**. Só use esse modo se todas essas condições forem verdadeiras. Se já há dados reais, não marque uma declaração falsa nem limpe dados para satisfazê-la: use o procedimento de migração aprovado para esse banco.

   Alternativa de terminal para um administrador, **somente depois da aprovação, backup/conferência e pausa das gravações**, no checkout do main publicado e com a conta Cloudflare correta já autenticada:

   ```bash
   npx wrangler d1 migrations list DB --remote --config wrangler.jsonc
   ```

   Esperado: somente `0027_backup_reminders.sql` pendente. Se aparecer outra migração, pare. Se não houver pendentes, não reaplique SQL.

   ```bash
   npx wrangler d1 migrations apply DB --remote --config wrangler.jsonc
   ```

   Esperado:0027 aplicada. Rode novamente a PRE_CHECAGEM:27 aplicadas, nenhuma pendente e nenhuma violação. Se houver erro, não repita comandos de limpeza ou SQL manual; preserve o backup e peça revisão.

5. **Conferir o app:** reabra Backup como administrador. Esperado: frequência Toda semana, segunda9h por padrão e os controles da pasta. Operadora não vê o recurso. Salve a configuração desejada; não use dados reais em capturas de teste.
6. **Agendador:** se a T8 já foi ativada com sucesso, Actions → **Ativar lembretes (manual)** → main → **VERIFICAR**; depois, com autorização do responsável, **REPUBLICAR_AGENDADOR**, confirmo marcado. Esperado: mesmo Worker/cron/chaves, código novo publicado. Não use ATIVAR de novo em uma identidade existente. Se as chaves ainda não foram configuradas, siga primeiro o [guia da T8](FASE_R6_LEMBRETES.md); o cartão e o arquivo funcionam sem push.
7. **Aparelhos:** em Preferências → Avisos neste aparelho, o administrador ativa e testa os próprios avisos. No iPhone: app instalado e iOS16.4+. Quando um lembrete estiver vencido, confira Fazer backup/Adiar e a atualização do Hoje. Não envie aviso a clientes nem invente dados para provar uma integração real.

## Testes executados

Resultados finais e quantidades estão no relatório T11 de `docs/colaboracao/CODEX_PARA_CLAUDE.md` e na descrição do PR. Há unidades de calendário, preservação de arquivos e ações do service worker; integração em D1 efêmero com restauração, autorização/CAS/comprovantes/cron; E2E com relógio, dois aparelhos, pasta/IndexedDB/permissão simulados e erro de escrita/rede. Capturas `t11-*` usam somente DEMONSTRAÇÃO.

## Limitações e pendências

- Aplicação da0027 e republicação do agendador são ações futuras do responsável, não feitas nesta entrega. O workflow atual continua com sua confirmação exclusiva de dados de teste; não foi adaptado para produção com dados reais.
- Períodos são mínimos arredondados para a janela escolhida. O horário na interface depende do relógio do aparelho; o servidor/cron usam seu próprio relógio e validam os comandos. Cron de cinco minutos e políticas do sistema podem atrasar avisos.
- Sem teste em aparelho físico. Alguns sistemas não exibem ações na notificação; tocar nela abre Backup. Avisos já entregues em outro aparelho podem continuar no histórico do sistema; o backend recusa comandos de um vencimento antigo.
- A pasta fixa depende da API/permissão do navegador. Sem ela há download normal e confirmação humana; não é possível verificar automaticamente o salvamento do sistema. Se sair da página antes dessa confirmação, faça um novo backup para atualizar o lembrete.
- CI completo/Segurança do PR e revisão do Claude ainda precisam concluir antes da publicação. Nenhuma operação remota Cloudflare/D1 foi feita pelo Codex.
