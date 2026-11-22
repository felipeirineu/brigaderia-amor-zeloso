import { z } from 'zod';
import { fortalezaDay } from './workday';

export const feedbackLabels = {
  suggestion: 'Sugestão',
  problem: 'Problema',
  praise: 'Elogio',
};
export const feedbackPages = {
  hoje: 'Hoje',
  pedidos: 'Pedidos',
  clientes: 'Clientes',
  produtos: 'Produtos',
  agenda: 'Agenda',
  financeiro: 'Financeiro',
  mais: 'Mais',
  ajuda: 'Ajuda',
  sugestoes: 'Sugestões e problemas',
  recebidas: 'Recebidas',
  preferencias: 'Preferências',
  estoque: 'Estoque',
  backup: 'Backup',
  recorrentes: 'Pedidos padrão',
  visitas: 'Visitas',
  deslocamentos: 'Corridas',
  despesas: 'Despesas e fluxo',
  lembretes: 'Lembretes',
  prospeccao: 'Prospecção',
  fichas: 'Fichas técnicas',
  insumos: 'Insumos',
  compras: 'Compras',
  empresa: 'Empresa',
  acessos: 'Acessos',
  mensagens: 'Modelos de WhatsApp',
  novidades: 'Novidades',
  'importar-clientes': 'Importar clientes',
  'importar-cadastro': 'Importar cadastro',
  relatorios: 'Relatórios',
  kits: 'Kits',
  novo: 'Novo pedido',
  gestao: 'Gestão',
} as const;
export function feedbackPage(path: string): keyof typeof feedbackPages {
  const [, root, part] = path.split(/[?#]/, 1)[0].split('/');
  if (root !== 'gestao') return 'gestao';
  if (!part) return 'hoje';
  return Object.hasOwn(feedbackPages, part)
    ? (part as keyof typeof feedbackPages)
    : 'gestao';
}

export const errorCode = /^E-\d{4}-[0-9A-F]{4}$/;
export function makeErrorCode(now: Date, uuid: string) {
  const [, month, day] = fortalezaDay(now).split('-');
  return `E-${day}${month}-${uuid.slice(0, 4).toUpperCase()}`;
}

export const feedbackContext = z
  .object({
    version: z.string().regex(/^\d{1,4}\.\d{1,4}\.\d{1,4}$/),
    system: z.enum(['Android', 'iPhone', 'Computador']),
    page: z.enum(feedbackPagesKeys()),
    error_code: z.string().regex(errorCode).optional(),
  })
  .strict();

function feedbackPagesKeys() {
  return Object.keys(feedbackPages) as [
    keyof typeof feedbackPages,
    ...(keyof typeof feedbackPages)[],
  ];
}

export const feedbackForm = z
  .object({
    kind: z.enum(['suggestion', 'problem', 'praise']),
    message: z.string().trim().min(1).max(2000),
    context: feedbackContext.optional(),
  })
  .strict();
export type FeedbackContext = z.infer<typeof feedbackContext>;
export type FeedbackKind = keyof typeof feedbackLabels;
