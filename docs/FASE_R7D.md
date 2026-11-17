# R7d — Nova visita, clientes atuais e ajuda (0.16.0)

Preparado para revisão em branch. Somente a R7d da fila, sem migração nova, alteração de flags, catálogo público, serviço pago ou operação remota no Cloudflare/D1.

## Agendar pelo botão +

1. Toque no **+ → Nova visita**. A opção aparece quando as visitas já estiverem disponíveis na gestão.
2. Em **Buscar contato ou cliente**, procure pelo nome ou telefone e toque no cadastro. A busca reúne os dois grupos; as demais telas de clientes/pedidos mantêm seus filtros anteriores. A lista mostra até 12 resultados por vez: refine a busca para encontrar outros nomes.
3. Se ainda não estiver cadastrado, toque em **Novo contato**. Preencha o nome; telefone e endereço são opcionais. O endereço usa os campos e sugestões existentes. **Salvar contato** confirma o cadastro; a visita só é salva na confirmação seguinte. Cancelar a visita depois não apaga um contato que você já confirmou.
4. Confira o objetivo: **Apresentação** para contato novo ou **Novos sabores/opções** para cliente atual. O sistema define o grupo a partir do cadastro; não é um campo livre.
5. Escolha **Hoje**, **Amanhã** ou **Escolher data**, e 09:00, 14:00 ou 18:00. O campo **Quando visitar (João Pessoa)** continua disponível para outro dia/horário, inclusive um agendamento antigo que precise ser registrado depois. Abrir o calendário não confirma o formulário.
6. Se quiser, expanda **Amostras planejadas (opcional)** e marque unidades por sabor e o peso conhecido. Não são caixas nem venda. Acrescente observação e toque em **Agendar visita**.
7. O cartão aparece no **Hoje** do dia escolhido e na **Agenda**. A tela aberta se atualiza após salvar. O atalho existente em Contatos e a página Visitas e amostras continuam funcionando.

A busca do agendamento aceita contatos e clientes ativos. Não mostra cadastros de outra organização. Sem telefone, o marcador interno nunca é exibido ou usado em links.

## Registrar e retornar

- Contato: **Registrar visita** guarda as amostras, quem foi, quando aconteceu, observação e próximo passo; acompanha o funil como antes. **Virou cliente** preserva o histórico.
- Cliente atual: o cartão diz **Visita a cliente** e **Novos sabores/opções**. O registro guarda as mesmas informações, mas **não cria nem altera funil, conversão ou cadastro do cliente**. Não cria pedido, cobrança, despesa ou lembrete.
- As amostras planejadas de ambos os grupos entram na produção em unidades, separadas das vendas. Lembrete, corrida, despesa e WhatsApp continuam ações humanas posteriores.
- Custos e modelos do WhatsApp da R7c também funcionam nas visitas a cliente atual quando o schema 0026 estiver pronto. As regras de pagamento explícito, permissões, prévia e estorno continuam as mesmas.

## Relatório

**Mais → Prospecção** mostra total de visitas realizadas, **Visitas a contatos** e **Visitas a clientes atuais**. As visitas de relacionamento têm seu próprio quadro de custo utilizado; não entram no denominador de conversão, no sabor associado à aquisição ou no custo para conquistar cliente.

A classificação é guardada no JSON do agendamento e preservada ao editar/registrar. Converter um contato depois não reclassifica suas visitas antigas. As visitas criadas antes desta entrega, sem o novo campo, continuam como visitas a contatos — era o único grupo permitido na época. Novas visitas a esse cliente convertido são relacionamento. Não há conversão ou regravação em massa de dados.

A R7c continua usando fichas atuais e pagamentos/estornos conhecidos agora; consulte [FASE_R7C.md](FASE_R7C.md) para os limites, fórmulas e pendências da 0026. O período aceita até 1.000 visitas somando os dois grupos; o histórico de aquisição continua limitado a 2.000 visitas anteriores à conversão.

## Ajuda

- Ícone **?** em **Clientes → Contatos** e na folha de agendamento.
- **Ajuda → Contatos e visitas de apresentação**: cadastro, agendamento, unidades, registro, retorno humano, conversão e visita a cliente atual.
- **Conhecer o app / Refazer passeio** inclui **Visitas de apresentação** quando o recurso estiver disponível. O passeio não agenda nem envia nada.

## Publicação e banco

O Claude revisa o PR e confere o CI completo + Segurança automáticos antes de publicar. O Codex não avança o main nem dispara CI manual.

Esta entrega **não precisa de nova migração**. Preserva as flags aprovadas. Banco sem 0025 continua escondendo visitas; sem 0026, a R7d funciona com visitas e deixa custos/modelos/relatório da R7c escondidos como antes. Conforme a FILA atualizada em `0ccdf68`, a 0026 foi aplicada e conferida pelo responsável. O Codex não executou essa operação. Este PR não executa nem autoriza operação real.

Nenhuma tabela nova para KEEP/backup. Agendamentos e registros continuam nas tabelas protegidas existentes, com os novos campos JSON incluídos no backup.

## Verificação local

```bash
npm run test:visit-entry
npm run test:visits
npm run test:prospect-costs
npm run test:security
npm run test:backup
npm run test:cleanup
npm run build:pages
npm run test:e2e -- tests/e2e/visit-entry.spec.js tests/e2e/visits.spec.js tests/e2e/prospect-costs.spec.js
```

Fixtures e capturas `r7d-*` exclusivamente DEMONSTRAÇÃO, em bancos efêmeros e sob os cabeçalhos/CSP do app.
