# T17 — entrega realizada e vencimentos

Em **Novo pedido → Revisar**, marque **Já foi entregue** para registrar uma entrega que já aconteceu. Informe a data e a hora em João Pessoa. O app usa esse horário na movimentação e nos relatórios. Com o financeiro ativo, deixe o valor a receber ou selecione a forma, o valor e a data do recebimento que já ocorreu. A confirmação registra tudo de uma vez. O pedido não entra na produção e o estoque continua manual.

**Na próxima entrega** está disponível para pessoas e estabelecimentos. O pedido concluído entra em **A receber** sem vencimento. O app usa a data da primeira entrega efetiva posterior para esse cliente. Uma retirada, uma entrega planejada ou uma entrega de outro cliente não libera o vencimento. Desfazer a entrega seguinte recalcula a data. Se houver outra entrega posterior válida, ela passa a ser a referência. Efetuar uma entrega não registra o recebimento da dívida anterior.

**Dia do mês**, em **Pagar**, vale para pagamentos a prazo. O vencimento é o primeiro dia escolhido depois do fechamento. Se fechou em 15 de novembro e o dia escolhido é 10, o vencimento é 10 de dezembro. Se o mês não tiver o dia escolhido (por exemplo, 30 em fevereiro), o vencimento é o último dia desse mês, como na fatura do cartão; por isso 31 vale como último dia de cada mês (ajuste do Claude na integração). Os prazos existentes em dias continuam valendo.

A versão 1.2.0 usa as colunas e eventos já disponíveis. A T17 dispensa migração. Em caso de reversão de versão depois de gravar as condições novas, preserve o suporte a esses valores no servidor para que registros novos continuem legíveis.
