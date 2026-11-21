export const helpTexts = {
  customerActive: {
    title: 'Cliente ativo',
    text: 'Marcado: o cliente aparece nas listas e em novos pedidos. Desmarcado: fica arquivado (some das listas, mas o histórico e os pedidos continuam guardados). Dá para reativar depois.',
  },
  productActive: {
    title: 'Produto ativo',
    text: 'Marcado: o produto aparece nas listas e em novos pedidos. Desmarcado: fica arquivado (some das listas, mas o histórico e os pedidos continuam guardados). Dá para reativar depois.',
  },
  visits: {
    title: 'Contatos e visitas de apresentação',
    text: 'Contato é um estabelecimento que ainda não compra. O cadastro e o histórico são privados.',
    steps: [
      'Cadastre em Clientes → Contatos ou + → Nova visita → Novo contato. O nome basta; telefone e endereço podem vir depois.',
      'Em + → Nova visita, busque um contato ou cliente e escolha data, horário e amostras em unidades.',
      'No Hoje, use Mapa, WhatsApp, Uber ou copie o endereço para 99. As amostras entram na produção separadas das vendas.',
      'Depois toque em Registrar visita: confira amostras deixadas, quem foi, quando aconteceu e próximo passo.',
      'Retorne por lembrete ou WhatsApp, sempre por ação sua. Nada envia mensagem, cria despesa ou registra corrida sozinho.',
      'Quando o contato começar a comprar, toque em Virou cliente. O histórico continua no mesmo cadastro.',
      'Para cliente atual, escolha uma visita de novos sabores/opções. Isso não altera o funil nem converte novamente.',
    ],
  },
  route: {
    title: 'Rota de carro',
    text: 'Estimativa entre a base e o destino, calculada uma vez e salva; não acompanha trânsito em tempo real. A rota no aplicativo de mapas parte do local atual do aparelho e pode levar outro tempo. Sem estimativa válida, a distância em linha reta é identificada. Abertura de telas não consulta o provedor. Confira o destino antes de sair.',
  },
  recurring: {
    title: 'Pedido padrão',
    text: 'Para estabelecimentos, guarde os itens habituais e o dia da semana. O modelo não é uma venda e pode ser pausado. Para pessoa, faça um pedido avulso.',
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
    text: 'Adiantado, na entrega ou a prazo definem quando cobrar. Quando o financeiro estiver ativado, a condição é copiada para o pedido; não equivale a recebimento. A prazo exige vencimento configurado e é para estabelecimentos. Para pessoa, escolha adiantado ou na entrega; condição não registra recebimento.',
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
    text: 'A quantidade do pedido é de embalagens. Unidades produzidas são embalagens × unidades por embalagem; a composição de cada caixa deve somar todas as suas unidades.',
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
    text: 'Receita menos custos estimados não equivale ao dinheiro em caixa. A ficha calcula custos estimados; o fluxo mostra recebimentos menos despesas registrados, sem afirmar saldo bancário ou lucro.',
  },
  recipe: {
    title: 'Ficha técnica',
    text: 'Registra ingredientes e rendimento para estimar custos. Com P1 ativado, cadastre insumos e custos informados, sem inferir receitas a partir de fotos. Custo ausente deixa a estimativa pendente. Na Calculadora por peso, cadastre a massa e os custos por receita, confirme o acabamento de cada tamanho e configure forminhas e canal iFood. Opcionais e margem podem ser simulados sem alterar preços, pedidos, despesas ou estoque.',
  },
  backupRetention: {
    title: 'Por quanto tempo guardar os backups',
    text: 'A Cloudflare já guarda sozinha o histórico dos últimos 7 dias. O backup semanal cobre o que for mais antigo que isso. Guarde pelo menos os 8 backups mais recentes (cerca de 2 meses). Os arquivos têm dados de clientes: guarde em pasta privada, nunca em grupo, chat ou link público. O app não apaga arquivos antigos.',
  },
  orderPayment: {
    title: 'Como o cliente paga',
    text: 'Escolha quando este pedido será cobrado. A escolha aparece no Financeiro, para saber o que falta receber; ela não registra o pagamento.',
    steps: [
      'A definir: ainda não combinado. O pedido fica sem data de cobrança até você escolher.',
      'Adiantado: o cliente paga antes de receber os doces, por exemplo por Pix ao fazer o pedido.',
      'Na entrega: o cliente paga quando recebe os doces.',
      'A prazo (só estabelecimentos): as entregas do período se acumulam e são cobradas juntas num fechamento semanal, quinzenal (dia 15 e fim do mês) ou mensal.',
      'Pagar no fechamento: a cobrança vence no dia em que o período fecha. 7 ou 15 dias depois: o cliente ganha esse prazo extra após o fechamento.',
      'Para gerar o fechamento e cobrar pelo WhatsApp, abra a conta do cliente no Financeiro. O padrão de cada cliente também muda lá.',
    ],
  },
  push: {
    title: 'Avisos no celular',
    text: 'Ative somente se quiser receber lembretes neste aparelho. No iPhone, é preciso iOS 16.4 ou mais recente e o app instalado na Tela de Início; no Android/Chrome pode funcionar no navegador. A permissão só é pedida ao ativar ou escolher um aviso. O título e horário aparecem na notificação, que pode atrasar alguns minutos. Se não funcionar, use Adicionar ao calendário do celular e confira o alarme na importação. Sair da conta revoga os avisos desta sessão; um aviso já despachado pode chegar.',
  },
  orderCost: {
    title: 'Custo estimado do pedido',
    text: 'Administrador e operador podem consultar esta estimativa. Usa fichas e preços de insumos atuais, com arredondamento por unidade e composição de cada caixa. Não é custo histórico nem lucro apurado; entrega e despesas fora da ficha não entram. Sem ficha ou custo conhecido, fica indisponível. Não cria despesas nem movimenta estoque.',
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
