# R12 — Data e horário do pedido

A etapa **Quando** mantém o fluxo Cliente → Sabores → Quando → Entrega → Pagamento → Revisar.

- **Hoje** e **Amanhã** mudam o dia e preservam o horário escolhido.
- **Escolher data** abre a mesma folha do Hoje, com contagem de entregas. Dias anteriores a hoje ficam indisponíveis, inclusive na entrada alternativa. O calendário do Hoje continua permitindo consultar o histórico.
- Depois de escolher outra data, o chip mostra o dia e fica selecionado. A contagem é a consulta existente do Hoje; se falhar, a folha informa indisponibilidade em vez de inventar capacidade.
- Chips **09:00**, **14:00** e **18:00**, mais **Outro horário**, continuam editáveis. **Digitar data e horário** é uma alternativa recolhida, fora do caminho principal. A etapa bloqueia continuar quando data/horário estão inválidos ou o dia já passou.
- O modelo ativo válido com próxima ocorrência mais próxima sugere itens, dia e horário. A sugestão é identificada; os demais modelos continuam disponíveis na etapa Sabores. Sem modelo válido, uma janela explícita HH:mm ou HH:mm–HH:mm pode sugerir seu horário inicial. Texto livre como “Manhã” não é interpretado.
- No sucesso, data/hora e quantidade aparecem com singular/plural. **Ver na agenda de…** abre o dia escolhido em Hoje/Agenda, usando data civil de Fortaleza. Parâmetro de data inválido é ignorado; voltar explicitamente a Hoje continua disponível.

## Validação

E2E em Chromium móvel/desktop e WebKit móvel: contagem >0 no calendário, dia passado bloqueado, sugestão alterada, escolha de horário, confirmação e pedido no dia correto; janela explícita, entrada alternativa inválida e link inválido. Helpers testam datas inexistentes/ano bissexto, formato de horário e rótulo sem depender do fuso do aparelho. Captura `r12-depois-calendario-pedido.png` usa dados de demonstração.

Não exige migração, flag ou serviço externo novo. As restrições de edição, confirmação, segurança e financeiro continuam no servidor. Não foi realizado ensaio físico nesta rodada.
