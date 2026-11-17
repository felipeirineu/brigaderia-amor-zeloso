# T9 — Revisões da interface (0.21.0)

Entrega para revisão em `codex/t9-interface-refinements`, a partir do main e939ec8. A prévia aprovada `docs/colaboracao/previas/t9-foto-produto.png` orienta o seletor de foto. Sem migração, alteração de flags, ativação de notificações ou operações Cloudflare/D1.

## O que mudou

1. **Sabores:** nomes centralizados também ao quebrar linha, em cartões e montagem. Nomes futuros recebem o mesmo estilo; não há novo corte por reticências.
2. **Confirmações:** as19 chamadas nativas de confirm passam pela folha **Tem certeza?**, com o mesmo texto, Cancelar e ação em danger. Nenhuma API da ação é chamada antes da aprovação. Escape, fechar/gesto, navegação, pagehide, estado Sem conexão detectado e expiração/desmontagem cancelam a pendência. Uma segunda solicitação enquanto a folha está aberta não aprova nem duplica a primeira. O foco inicial é Cancelar e retorna ao controle de origem quando ele ainda existe.
3. **Arquivar produto:** botão visível somente para administrador em tela larga (acima de700px). O servidor exige administrador independentemente da largura ou do que o navegador enviar. DELETE e tentativas de arquivar por active=false em POST/PUT são protegidos; edição comum de produto ativo continua permitida à operação. Tenant, versões/CAS, histórico e validações existentes são preservados.
4. **Ativo:** Clientes e Produtos têm ajuda explicando presença nas listas/novos pedidos, arquivamento com histórico e reativação. O botão de ajuda fica fora do label do checkbox, para manter seu nome acessível e evitar alternância acidental.
5. **Escolha do cliente:** Cadastrar novo cliente e título Lista de clientes antes dos cartões.
6. **Clientes/Contatos:** intervalo de20px (space5), na mesma linha central.
7. **Agenda/Prospecção:** textos dizem “no horário local”. Cálculos e exportações continuam no fuso de negócio; não foi trocada a timezone.
8. **Foto do produto:** Sugerir foto pelo nome/Sem foto em par; grade de três, cartões quadrados iguais, foto redonda, nomes inteiros e centralizados em até duas linhas para as opções atuais; contorno dourado e visto na escolhida. Não há gravação antes de salvar o produto. Grade com largura limitada no computador para preservar a compacidade.
9. **Mensagens:** ajuda com texto Ajuda e ícone; editar substitui o conteúdo do cartão escolhido pelo formulário, com foco no texto. Cancelar retorna ao cartão sem salvar e restaura o foco ao botão de edição.
10. **Preferências:** foto/inicial centralizada; ajuda dos avisos à direita do título, na mesma linha.
11. **Como criar pedidos:** Modo simples é padrão em qualquer perfil/tamanho de tela. Lista completa é a alternativa, preservando full já salvo. auto antigo, ausência e valores inválidos passam a simples sem guardar dados de pedido. A preferência continua por aparelho/perfil como antes. “Automático” de Aparência é outra preferência e continua disponível. No seletor do pedido completo, o rótulo é Sabor; identificadores e payloads da API não mudaram.
12. **Versão:**0.21.0 e notas correspondentes. Novidades continua oculta antes da1.0.0.

## Confirmação e permissões

A folha usa o componente compartilhado help-sheet e acompanha os temas, CSP e gestos existentes. A escolha é uma Promise aguardada em cada consumidor; o contrato estático recusa a volta de confirm nativo ou uma chamada askConfirmation sem await. O provider existe somente na gestão autenticada e cancela pendências ao sair dessa área.

Os prompts de preenchimento de motivo/valor que já existiam permanecem nativos: esta tarefa substitui as confirmações, preservando o preenchimento e os motivos exigidos. Não foram removidas validações, idempotência, CAS ou auditoria do servidor.

A largura da tela serve apenas à apresentação. A API não confia em viewport, CSS ou papel enviado pelo cliente; usa o perfil da sessão. Outra organização continua recebendo404, sem revelar o produto. Sem sessão recebe401; operação do mesmo tenant recebe403 ao tentar arquivar. O administrador recebe o comportamento anterior, preservando o registro.

## Evidências e testes

`docs/colaboracao/capturas/t9-*.png` usa somente fixtures DEMONSTRAÇÃO, em390×844. São oito pares antes/depois (foto sem escolha/escolhida, clientes, mensagens, preferências, modos, escolha de cliente e nome longo), mais imagens depois da confirmação, ajuda de mensagens e título dos avisos. Antes foi capturado na0.20.0; não repetir `T9_CAPTURE=antes` na entrega atual.

```bash
npm run build:pages
npm test -- --maxWorkers=2
npm run lint
npm run format:check
npm run test:api
npm run test:security
npm run test:brand
npx playwright test tests/e2e/t9-interface.spec.js
```

Para repetir as imagens atuais: `T9_CAPTURE=depois npx playwright test tests/e2e/t9-interface.spec.js --project=chromium-mobile`. Cancelamento/expiração e aprovação são verificados por requisições e estado do D1 efêmero, não apenas pelo fechamento visual da folha.

Regressões de editor completo escolhem Lista completa explicitamente, aguardando o botão. As de skeleton escolhem o modo antes de reter a API; não esperam um seletor que não existe dentro do assistente simples. Seletores de rolagem usam o corpo direto da folha; auditoria de geometria considera grupos visíveis, excluindo a nova confirmação fechada e ajudas fechadas. As verificações originais continuam presentes.

## Limitações e pendências

Testes locais em navegadores simulados, sem aparelho físico nesta sessão. Não foram executadas ações sobre clientes ou produtos reais. Os motivos ainda podem abrir o prompt nativo, conforme o escopo acima. A confirmação não substitui a autorização no servidor nem garante que uma operação pendente de rede já tenha sido concluída; as proteções anteriores de CAS/idempotência permanecem.

Aguardar CI completo + Segurança automáticos do PR e revisão/publicação pelo Claude. Sem CI manual, merge ou avanço do main pelo Codex. Cadastro de kits e ativação real de notificações continuam com o responsável, fora desta entrega.
