# R7b — Visitas e amostras (0.14.0)

Entrega preparada para revisão. Durante o trabalho, o main foi atualizado para c211d36: conforme a FILA, a0024 foi aplicada pelo responsável e os Contatos foram ligados na0.13.1. Essa configuração foi preservada, sem nova ativação pelo Codex. O Codex não aplicou migração, não acessou o banco real e não alterou a flag de prospecção. R7b cobre R7-3/4/5; estimativa de custo das amostras, modelos de mensagem e relatório de conversão continuam na R7c.

## Como usar após a ativação

1. **Clientes → Contatos → Agendar visita.** O contato vem escolhido. Confira a data/hora, marque unidades por sabor e acrescente observação se precisar. Fotos cadastradas aparecem junto dos sabores. São unidades avulsas, sem preço de venda ou caixa fictícia.
2. O peso é opcional: vem da embalagem quando existe um único peso conhecido; pode ser corrigido ou apagado. Sem informação aparece **Peso a definir**. Não é assumido peso comercial. Nesta etapa não há cálculo de custo das amostras.
3. **Agendar visita** grava o planejamento e o mostra no Hoje e na Agenda, com filtro próprio e exportação ICS privada. O administrador vê **Amostras para visitas**, separadas das caixas vendidas, hoje/amanhã ou nos dias selecionados. Apenas visitas agendadas de contatos ativos demandam produção; cancelar ou registrar retira essa demanda. Nenhum estoque é consumido automaticamente.
4. No cartão, **Mapa** abre os aplicativos de navegação; **WhatsApp** abre uma conversa para envio humano; **Uber** abre o destino e **99** copia o endereço. Não solicitam corrida, não enviam mensagem e não geram despesa.
5. Depois da visita, toque **Registrar visita**. Confira quando aconteceu, **Quem foi**, unidades realmente deixadas, observação e próximo passo. A sugestão de retorno é de três dias, editável; pode ser apagada. Se um sabor planejado foi desativado depois, ele aparece identificado e ainda pode ser registrado como amostra histórica. Não pode ser acrescentado a novos agendamentos.
6. **Salvar registro da visita** registra o evento sem cobrança. O acompanhamento passa a Amostra entregue ou Retornar quando não houve amostras; Não teve interesse e Virou cliente são preservados. O registro permanece ligado ao mesmo cadastro após a conversão. Não cria pedido, saldo, recebimento, lembrete, corrida ou despesa sozinho.
7. Após salvar, há duas ofertas separadas:
   - **Criar lembrete de retorno** abre o formulário com título, contato e data. Em **Avisar no celular**, escolha o aviso desejado e autorize o aparelho, quando solicitado. Só **Salvar lembrete** grava; Cancelar não grava. A entrega de Web Push depende da permissão e do aparelho; o módulo existente também permite exportação ICS com aviso.
   - **Registrar corrida de prospecção** abre o formulário de custo pago. Confira meio de transporte, trecho, quem foi, data, valor e forma de pagamento. Só **Registrar despesa paga** grava a corrida e, acima de zero, a despesa **Prospecção**. Zero registra somente o deslocamento. **Pular** não grava. Não vincula pedidos fictícios; o vínculo é com a visita. Correção usa o estorno já existente, respeitando autor/dia e permissão do administrador.
8. Em **Visitas e amostras**, consulte ou edite uma visita pendente e cancele com motivo. Registro concluído não é sobrescrito pela interface. Histórico do contato inclui visitas mesmo depois de virar cliente. Listagens aceitam até 200 visitas; use **Filtrar visitas por período** se precisar reduzir a consulta. Em conflito de versão, feche e atualize antes de repetir; a interface oferece esse caminho sem gravar novamente.

A quantidade planejada pode diferir da quantidade deixada. Não são criados movimentos de estoque ou perdas para a diferença. A R7c tratará as estimativas de custo; esta entrega não atribui custo zero ao que ainda não foi calculado.

## Ativação pelo responsável, depois da revisão

Não rodar estes passos antes da publicação aprovada. Não disparar CI manual para revisar esta entrega: o PR já executa Validação e Segurança.

1. **Claude revisa e publica o código.** Esperado: CI/Segurança verdes; a gestão anterior continua funcionando sem0025. Banco até0024 mantém R7a, e esconde R7b. Se houver falha na gestão, não aplicar migração nem mudar flag.
2. **Responsável faz backup e ensaia a restauração fora do GitHub.** Esperado: arquivo legível, contagens e FKs conferidas. Não enviar SQL, dados reais ou capturas privadas para o repositório/chat. Sem restauração conferida, pare.
3. **GitHub → Actions → Homologação D1 (manual) → Run workflow → main → PRE_CHECAGEM.** Esperado: lista de pendentes mostra0025 e, se ainda pendente,0024. Se houver migração inesperada, banco diferente, erro de acesso ou FK, peça revisão antes de prosseguir.
4. **Somente com autorização do responsável**, usar o mesmo workflow em **APLICAR_PENDENTES**. As migrações são aplicadas em ordem:0024 antes de0025. A0025 cria somente tabelas e índices, sem exemplos e sem converter/apagar dados. O input `backup_verified` atualmente diz “Somente dados de teste”. Se houver dados reais, não declarar uma condição falsa: o responsável precisa revisar o procedimento antes de executar. Em erro, não reaplicar SQL manualmente e manter a função sem ativação.
5. **Rodar PRE_CHECAGEM novamente.** Esperado:0024/0025 aplicadas, tabelas `prospect_visits`, `prospect_visit_records` e `prospect_visit_trips` presentes e zero violações de FK. Claude confere. Qualquer inconsistência impede a ativação.
6. **A flag é decisão do responsável.** R7b reutiliza `PROSPECTS_ENABLED`, sem ligar nada automaticamente. Se a R7a já tiver sido ativada com aprovação, ela continua funcionando; R7b só aparece quando0025 também estiver pronta. O Codex não modifica flags de ativação.

A ativação no banco real precisa do responsável; o PR de código não é autorização para migração, limpeza ou uso de dados reais.

## Preservação e verificação local

Agendamentos e registros entram no KEEP e no backup. O vínculo operacional entre corrida e visita acompanha a limpeza dos deslocamentos de teste; a visita e suas amostras permanecem. A limpeza opcional de clientes continua bloqueada ao alcançar histórico protegido. Não retirar essas proteções para contornar erro.

```bash
npm run test:visits
npm run test:security
npm run test:backup
npm run test:cleanup
npm run test:migrations
npm run build:pages
```

Somente D1 efêmero/SQLite local e fixtures DEMONSTRAÇÃO. Inclui isolamento, CAS/idempotência, estados terminais preservados, amostras planejadas de sabor desativado, visitas após conversão, mais de60 registros sem N+1, backup/restauração, KEEP e compatibilidade até0023/0024/flag desligada. As capturas `r7b-*` também são fictícias.
