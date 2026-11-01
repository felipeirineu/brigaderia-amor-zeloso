export const helpTexts = {
  recurring: {
    title: 'Pedido padrão',
    text: 'Guarde os itens que um cliente costuma pedir e o dia da semana. O modelo não é uma venda e pode ser pausado.',
  },
  generate: {
    title: 'Gerar pedidos da semana',
    text: 'Escolha a segunda-feira. Serão criados rascunhos para os modelos ativos; gerar a mesma semana novamente não duplica. Modelos inválidos são listados sem bloquear os válidos. Revise e selecione os pedidos para confirmar em lote ou um a um.',
  },
  status: {
    title: 'Status do pedido',
    text: 'O botão principal mostra o próximo passo. Entrega e pagamento são coisas diferentes; cancelar exige motivo e não apaga o histórico.',
  },
  payment: {
    title: 'Condição de pagamento',
    text: 'Adiantado, na entrega ou a prazo definem quando cobrar. Quando o financeiro estiver ativado, a condição é copiada para o pedido; não equivale a recebimento. A prazo exige vencimento configurado.',
  },
  closing: {
    title: 'Fechamento',
    text: 'Agrupa entregas e pagamentos do cliente em um período. Quando o financeiro estiver ativado, escolha semanal, mensal, dias fixos ou 14 dias. Feche após terminar o período; o extrato preserva entregas, pagamentos e saldo.',
  },
  balance: {
    title: 'Saldo / a receber',
    text: 'Saldo considera pagamentos válidos, não apenas pedidos cadastrados. Com o financeiro ativado, recebimentos parciais e sinais reduzem o saldo; estornos o recompõem. Previsto, entregue e recebido são valores diferentes.',
  },
  composition: {
    title: 'Composição da caixa',
    text: 'A quantidade do pedido é de embalagens. Unidades produzidas são embalagens × unidades por embalagem; caixa mista depende de confirmação dos proprietários.',
  },
  production: {
    title: 'Produzir hoje',
    text: 'Soma unidades por produto e variante dos pedidos confirmados ou em produção, pelo prazo de hoje ou amanhã. Não desconta estoque automaticamente.',
  },
  courier: {
    title: 'Entregador e taxa',
    text: 'Escolha proprietário, esposa ou motoboy. A taxa informada é um registro operacional: não cria despesa nem altera o preço do pedido automaticamente.',
  },
  profit: {
    title: 'Lucro estimado',
    text: 'Receita menos custos estimados não equivale ao dinheiro em caixa. Custos e lucro serão tratados na etapa financeira.',
  },
  recipe: {
    title: 'Ficha técnica',
    text: 'Registra ingredientes e rendimento para estimar custos. O módulo ainda será implementado; nenhuma receita foi inferida a partir de fotos.',
  },
  stock: {
    title: 'Estoque mínimo',
    text: 'É o limite para avisar sobre reposição. Controle de estoque e movimentos auditáveis serão implementados em etapa própria.',
  },
  whatsapp: {
    title: 'WhatsApp assistido',
    text: 'Confira e edite o texto antes de abrir a conversa. O aplicativo não envia sozinho; “contato realizado” é somente uma anotação manual.',
  },
  roles: {
    title: 'Papéis de acesso',
    text: 'Administrador gerencia acessos e a operação. Operador atende clientes, pedidos e entregas; não autoriza usuários. As permissões são conferidas no servidor.',
  },
} as const;
export type HelpTopic = keyof typeof helpTexts;
