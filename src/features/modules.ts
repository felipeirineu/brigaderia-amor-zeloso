export const modules = [
  {
    slug: 'clientes',
    title: 'Clientes',
    symbol: '◎',
    description: 'Organize contatos e acompanhe o histórico de cada cliente.',
    phase: 1,
  },
  {
    slug: 'produtos',
    title: 'Produtos',
    symbol: '◇',
    description:
      'Reúna produtos, variantes e informações comerciais confirmadas.',
    phase: 1,
  },
  {
    slug: 'pedidos',
    title: 'Pedidos',
    symbol: '▤',
    description: 'Acompanhe cada pedido, do rascunho à conclusão.',
    phase: 1,
  },
  {
    slug: 'producao',
    title: 'Produção',
    symbol: '◷',
    description: 'Planeje receitas, ingredientes e a rotina de produção.',
    phase: 4,
  },
  {
    slug: 'entregas',
    title: 'Entregas',
    symbol: '→',
    description: 'Organize entregas e retiradas com horários combinados.',
    phase: 2,
  },
  {
    slug: 'financeiro',
    title: 'Financeiro',
    symbol: '▥',
    description: 'Acompanhe recebimentos, despesas e resultados estimados.',
    phase: 3,
  },
  {
    slug: 'configuracoes',
    title: 'Configurações',
    symbol: '⚙',
    description: 'Prepare a identidade e as regras do negócio.',
    phase: 1,
  },
] as const;

// Fixtures exclusivas do frontend de demonstração; nunca são sementes do banco.
export const demoSteps = [
  {
    id: 'DEMO-01',
    title: 'Conhecer a navegação',
    detail: 'Explore as áreas do sistema, ainda sem cadastros.',
    status: 'Disponível',
  },
  {
    id: 'DEMO-02',
    title: 'Confirmar informações da empresa',
    detail: 'Identidade original e regras comerciais aguardam validação.',
    status: 'Pendente',
  },
  {
    id: 'DEMO-03',
    title: 'Preparar acesso seguro',
    detail: 'Login e persistência serão implementados na Fase 1.',
    status: 'Planejado',
  },
];
