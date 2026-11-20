# T14 — recuperação de tela e sugestões

A versão 1.1.0 recupera erros de renderização nas telas da gestão. O código curto permite identificar o ocorrido. O diagnóstico no navegador contém apenas código, versão, categoria da tela e tipo de erro. O relato é enviado somente depois de tocar em **Enviar**. Com **Incluir informações do aparelho** desmarcado, nenhum contexto acompanha a mensagem.

**Mais → Sugestões e problemas** está disponível aos perfis autorizados. Em **Recebidas**, administradores veem o que foi enviado pela própria organização, marcam mensagens como lidas e podem abrir o WhatsApp quando a pessoa cadastrou voluntariamente um número em **Mais → Preferências → Retorno sobre sugestões**.

## Ativar após a revisão

1. Publique a versão 1.1.0 antes da migração. O exportador de backup dessa versão reconhece as tabelas novas. Enquanto o schema não estiver pronto, a tela de erro funciona e as entradas do canal permanecem ocultas.
2. O responsável deve aprovar a migração `0028_feedback.sql`, guardar um backup privado com restauração conferida e aplicar a migração pelo procedimento autorizado para o banco. Se já houver dados reais, só use workflows cujas condições descrevem esse banco. O fluxo de homologação que declara **Somente dados de teste** não se aplica a um banco com dados reais. Confira zero migrações pendentes e zero violações de vínculos na pré-checagem.
3. Para usar o atalho opcional depois do envio, cadastre `FEEDBACK_WHATSAPP` como **secret** no Pages, no ambiente apropriado, com 12 a 13 dígitos incluindo país e DDD. Sem o secret ou com formato inválido, o botão fica oculto. O número entra apenas no link do WhatsApp recebido após o envio. O app deixa o envio final para a pessoa.
4. Para ligar os avisos de novas mensagens num projeto com Web Push já ativo, siga a etapa **Atualizar somente o agendador** do [guia de avisos](FASE_R6_LEMBRETES.md). Use **REPUBLICAR_AGENDADOR** para o código 1.1.0, preservando as chaves e as assinaturas existentes.
5. Com dados de demonstração, abra **Sugestões e problemas** com uma conta de operadora e envie uma mensagem. Com uma conta de administrador, confirme a entrada em **Recebidas** e marque como lida. Volte à conta da operadora para conferir **✓ Lida**. No celular do administrador, o aviso é genérico e abre a caixa após a autenticação.

Os avisos usam os aparelhos já inscritos no momento do envio. O agendador verifica mensagens ainda não lidas das últimas 24 horas e descarta a entrega se a autorização do aparelho ou a leitura mudar. Os backups incluem as mensagens e os telefones opcionais. A limpeza de dados de teste remove mensagens e avisos, preservando o telefone de retorno. A cópia da T13 exclui mensagens e telefones de retorno do banco de produção.
