# R6-5 — Fotos privadas de perfil

No menu do perfil, **Trocar foto** abre Preferências → Sua foto de perfil. Escolha **Tirar foto** ou **Escolher da galeria**. O recorte central é quadrado, com prévia circular; somente **Salvar foto de perfil** envia a imagem. **Cancelar foto** descarta a prévia. O nome de exibição continua independente da foto.

O navegador reduz para até 256×256 px e WebP de no máximo 40 KB, sem enviar a imagem original ou seus metadados. Confira o enquadramento antes de salvar. Se o navegador não gerar WebP, a tela informa o erro e preserva a foto atual; não afirma ter salvo. Câmera e galeria foram exercitadas com arquivos sintéticos em Playwright; permissões/câmera física ainda precisam de teste no aparelho.

Cada pessoa altera/remove somente a própria foto. O administrador também vê **Fotos da equipe** e pode remover outra foto. O administrador não envia uma nova foto em nome de outra pessoa. Sem foto, aparecem iniciais e nome de exibição. O avatar é usado no cabeçalho, na escolha do entregador e nos históricos de status/recebimento. Erro de carregamento volta às iniciais.

## Privacidade e validação

`GET`, `PUT` e `DELETE /api/field/profile-photos/:id` exigem sessão; outra organização recebe 404, alteração de outra pessoa recebe 403, exceto remoção administrativa. GET usa image/webp, no-store e nosniff; nenhuma foto entra no bundle, no service worker, em logs ou no Git. Contexto da equipe devolve apenas presença/versão, sem imagem. Upload/remover têm CAS, idempotência e auditoria sem conteúdo da imagem.

Servidor valida assinatura/tamanho RIFF/WebP, dimensões quadradas ≤256, consistência de cabeçalho e proíbe animação/EXIF/XMP. Cliente comprime e remove metadados. A conversão de BLOB em bytes também corrige a leitura das fotos de estabelecimento. Backup privado inclui fotos de perfil, com restauração/FKs testadas; não enviar esse backup ao GitHub ou ao chat.

## Ativação pelo responsável

Não há flag nova. As atuais permanecem como estão; catálogo público segue desligado.

1. Confirmar CI e Segurança verdes no main e seguir backup/restauração do [guia de manutenção](ATIVACAO.md). Pausar gravações durante a manutenção.
2. GitHub → Actions → **Homologação D1 (manual)** → Run workflow → main → **PRE_CHECAGEM**. Esperado: 0016 (se ainda pendente) e 0017 listadas. Não reaplicar 0001–0015 manualmente. Se houver erro de FK ou migração inesperada, parar e analisar o relatório sem dados pessoais.
3. Após conferir backup e o guia, executar **APLICAR_PENDENTES**, atendendo à confirmação exigida pelo workflow. Esperado: tabelas novas e pré-checagem final verde, incluindo `schema_profile_photos_ready: true`. Se falhar, não executar SQL avulso; usar PRE_CHECAGEM para diagnóstico e preservar o backup.
4. Reabrir a sessão do app. **Trocar foto** aparece quando a migração está disponível. Testar primeiro com imagem de demonstração, conferir prévia/cancelamento/salvamento, leitura em outro aparelho autorizado e remoção. Se a opção não aparecer, conferir pré-checagem e recarregar a sessão, sem mudar flags.

Antes de 0017, o contexto continua funcionando sem fotos de perfil e a rota responde 503. Nenhuma migração ou configuração remota foi executada pelo agente.
