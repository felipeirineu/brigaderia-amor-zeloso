export const statuses = [
  'draft',
  'awaiting_confirmation',
  'confirmed',
  'in_production',
  'ready',
  'out_for_delivery',
  'delivered',
  'picked_up',
  'cancelled',
] as const;
export type Status = (typeof statuses)[number];
export const statusLabels: Record<Status, string> = {
  draft: 'Rascunho',
  awaiting_confirmation: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  in_production: 'Em produção',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  picked_up: 'Retirado',
  cancelled: 'Cancelado',
};
export function nextStatuses(status: Status, type: string): Status[] {
  const allowed: Record<Status, Status[]> = {
    draft: ['awaiting_confirmation', 'confirmed', 'cancelled'],
    awaiting_confirmation: ['draft', 'confirmed', 'cancelled'],
    confirmed: ['in_production', 'awaiting_confirmation', 'cancelled'],
    in_production: ['ready', 'cancelled'],
    ready:
      type === 'pickup'
        ? ['picked_up', 'cancelled']
        : ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered', 'cancelled'],
    delivered: [],
    picked_up: [],
    cancelled: [],
  };
  return allowed[status] ?? [];
}

export type MessageKind =
  'confirmation' | 'on_the_way' | 'delivered' | 'pickup' | 'after_sale';

// Mesma janela na UI e servidor; timestamps epoch evitam parsing na comparação.
export const UNDO_SECONDS = 30;
