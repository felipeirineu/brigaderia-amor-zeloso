import { z } from 'zod';
import { emptyTerms } from '../shared/finance';
const text = (n: number) => z.string().trim().max(n);
export const termsSchema = z
  .object({
    mode: z.enum(['unset', 'advance', 'delivery', 'credit']),
    cycle: z.enum(['weekly', 'monthly', 'fixed_days', 'fourteen_days']),
    fixed_days: z.array(z.number().int().min(1).max(31)).min(1).max(31),
    base_date: z.union([z.iso.date(), z.literal('')]),
    week_end: z.number().int().min(1).max(7),
    due_days: z.number().int().min(0).max(365).nullable(),
  })
  .strict()
  .refine(
    (t) => t.mode !== 'credit' || t.due_days !== null,
    'Informe o prazo após fechamento.',
  )
  .refine(
    (t) => t.mode !== 'credit' || t.cycle !== 'fourteen_days' || !!t.base_date,
    'Informe a data-base.',
  )
  .refine(
    (t) => new Set(t.fixed_days).size === t.fixed_days.length,
    'Dias repetidos.',
  );
export const profileSchema = z
  .object({
    establishment: text(120),
    responsible: text(120),
    address: text(600),
    neighborhood: text(120),
    reference: text(200),
    delivery_days: z.array(z.number().int().min(1).max(7)).max(7),
    delivery_window: text(100),
    courier: z.enum(['unassigned', 'owner', 'partner', 'courier']),
    courier_name: text(100),
    courier_fee_cents: z.number().int().min(0).max(100000000),
    terms: termsSchema,
  })
  .strict()
  .refine(
    (p) => p.courier !== 'courier' || !!p.courier_name,
    'Informe o nome do motoboy.',
  );
export const paymentSchema = z
  .object({
    version: z.number().int().positive(),
    order_id: z.uuid().optional(),
    closing_id: z.uuid().optional(),
    kind: z.enum(['payment', 'deposit']),
    amount_cents: z.number().int().positive().max(1000000000),
    method: z.enum(['pix', 'cash', 'debit', 'credit', 'transfer', 'other']),
    paid_on: z.iso.date(),
  })
  .strict()
  .refine(
    (d) => !!d.order_id !== !!d.closing_id,
    'Selecione pedido ou fechamento.',
  );
export const pixSchema = z
  .object({
    type: z.enum(['none', 'cpf', 'cnpj', 'email', 'phone', 'random']),
    key: text(254),
    receiver: text(25),
    city: text(15),
  })
  .strict()
  .superRefine((v, c) => {
    const invalid = (msg: string) =>
      c.addIssue({ code: 'custom', message: msg });
    if (v.type === 'none') {
      if (v.key) invalid('Apague a chave ao desativar Pix.');
      return;
    }
    if (!v.key || !v.receiver || !v.city)
      invalid('Preencha chave, recebedor e cidade.');
    if (v.type === 'email' && !z.email().safeParse(v.key).success)
      invalid('E-mail inválido.');
    if (v.type === 'phone' && !/^\+[1-9]\d{7,14}$/.test(v.key))
      invalid('Telefone Pix deve estar em E.164.');
    if (v.type === 'cpf' && !/^\d{11}$/.test(v.key))
      invalid('CPF deve ter 11 dígitos.');
    if (v.type === 'cnpj' && !/^\d{14}$/.test(v.key))
      invalid('CNPJ deve ter 14 dígitos.');
    if (v.type === 'random' && !z.uuid().safeParse(v.key).success)
      invalid('Chave aleatória inválida.');
  });
export const readTerms = (raw: string | null | undefined) =>
  raw ? termsSchema.parse(JSON.parse(raw)) : emptyTerms();
/** CRC-16/CCITT-FALSE, init FFFF, poly 1021, sem reflexão. */
export function crc16(value: string) {
  let crc = 0xffff;
  for (const b of new TextEncoder().encode(value)) {
    crc ^= b << 8;
    for (let j = 0; j < 8; j++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
const ascii = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 .-]/g, '')
    .trim();
const tlv = (id: string, value: string) => {
  const n = new TextEncoder().encode(value).length;
  if (n > 99) throw new Error('Campo Pix excede 99 bytes.');
  return id + String(n).padStart(2, '0') + value;
};
export function pixCode(settings: z.infer<typeof pixSchema>, amount: number) {
  if (settings.type === 'none' || !settings.key) return null;
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new Error('Valor Pix inválido.');
  const name = ascii(settings.receiver),
    city = ascii(settings.city);
  if (!name || !city) throw new Error('Nome/cidade Pix inválidos.');
  const payload =
    tlv('00', '01') +
    tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', settings.key)) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', (amount / 100).toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', name) +
    tlv('60', city) +
    tlv('62', tlv('05', '***')) +
    '6304';
  return payload + crc16(payload);
}
