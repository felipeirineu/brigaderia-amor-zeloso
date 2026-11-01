import { z } from 'zod';
import { statuses } from '../shared/order-state';
export { nextStatuses, statusLabels, type Status } from '../shared/order-state';
export const transitionSchema = z
  .object({
    version: z.number().int().positive(),
    to: z.enum(statuses),
    reason: z.string().trim().max(500).default(''),
  })
  .strict();
export const deliverySchema = z
  .object({
    version: z.number().int().positive(),
    delivery_type: z.enum(['delivery', 'pickup']),
    delivery_address: z.string().trim().max(1000).default(''),
    courier: z.enum(['unassigned', 'owner', 'partner', 'courier']),
    courier_name: z.string().trim().max(100).default(''),
    courier_fee_cents: z.number().int().min(0).max(100000000).default(0),
  })
  .strict()
  .refine(
    (v) => v.courier !== 'courier' || v.courier_name.length > 0,
    'Informe o nome do motoboy.',
  );
export const recurringSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    customer_id: z.uuid(),
    weekday: z.number().int().min(1).max(7),
    time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    notes: z.string().trim().max(2000).default(''),
    delivery_type: z.enum(['delivery', 'pickup']).default('delivery'),
    delivery_address: z.string().trim().max(1000).default(''),
    courier: z
      .enum(['unassigned', 'owner', 'partner', 'courier'])
      .default('unassigned'),
    courier_name: z.string().trim().max(100).default(''),
    courier_fee_cents: z.number().int().min(0).max(100000000).default(0),
    active: z.boolean().default(true),
    version: z.number().int().positive().optional(),
    items: z
      .array(
        z
          .object({
            variant_id: z.uuid(),
            quantity: z.number().int().min(1).max(10000),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict()
  .refine(
    (v) => new Set(v.items.map((i) => i.variant_id)).size === v.items.length,
    'Variante duplicada.',
  )
  .refine(
    (v) => v.courier !== 'courier' || !!v.courier_name,
    'Informe o nome do motoboy.',
  );
export const daySchema = z.iso.date();
export function addDays(day: string, count: number) {
  return new Date(Date.parse(day + 'T12:00:00Z') + count * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function businessDay() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function utcStart(day: string) {
  return `${day}T03:00:00.000Z`;
}
export const templates = {
  confirmation:
    'Olá, {cliente}! Pedido {numero_pedido}: {itens}. Total: {total}. Combinado para {data} às {hora}. Pode confirmar?',
  on_the_way:
    'Olá, {cliente}! O pedido {numero_pedido} saiu para entrega. Destino: {endereco}.',
  delivered:
    'Olá, {cliente}! Registramos a entrega do pedido {numero_pedido}. Obrigado!',
  pickup:
    'Olá, {cliente}! O pedido {numero_pedido} está pronto para retirada. Horário combinado: {data} às {hora}.',
  after_sale:
    'Olá, {cliente}! Como foi sua experiência com o pedido {numero_pedido}? Agradecemos seu retorno.',
} as const;
export type MessageKind = keyof typeof templates;
export function interpolate(content: string, fields: Record<string, string>) {
  const result = content.replace(/\{([^{}]+)\}/g, (_match, key: string) => {
    if (!fields[key]?.trim()) throw new Error(`Informação pendente: ${key}.`);
    return fields[key];
  });
  if (/[{}]/.test(result))
    throw new Error('Modelo contém campos não preenchidos.');
  if (!result.trim()) throw new Error('Mensagem vazia.');
  return result;
}
