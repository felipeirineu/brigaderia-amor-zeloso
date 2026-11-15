import { z } from 'zod';
// O frontend opera sob CSP estrita: nem o probe de Function do parser pode rodar.
// Este módulo só é importado pelo navegador e seus testes; servidor não é alterado.
z.config({ jitless: true });
const count = z.number().int().min(1).max(10000);
const component = z.object({ variant_id: z.uuid(), units: count }).strict();
export const orderDraftSchema = z
  .object({
    customer_id: z.uuid(),
    order_id: z.uuid().nullable(),
    items: z
      .array(
        z
          .object({
            variant_id: z.uuid(),
            quantity: count,
            item_id: z.uuid().optional(),
            components: z.array(component).min(1).max(100).optional(),
          })
          .strict(),
      )
      .max(200),
    kit_items: z
      .array(
        z
          .object({
            kit_id: z.uuid(),
            quantity: count,
            item_id: z.uuid().optional(),
            components: z
              .array(z.object({ product_id: z.uuid(), units: count }).strict())
              .min(1)
              .max(100),
          })
          .strict(),
      )
      .max(200),
  })
  .strict();
export type OrderDraft = z.infer<typeof orderDraftSchema>;
export const draftKey = (scope: string) => 'az-order-draft:' + scope;
export function parseDraft(raw: string | null): OrderDraft | null {
  if (!raw || raw.length > 32768) return null;
  try {
    const value = orderDraftSchema.safeParse(JSON.parse(raw));
    return value.success ? value.data : null;
  } catch {
    return null;
  }
}
export function draftRaw(scope: string): string {
  try {
    return scope ? (sessionStorage.getItem(draftKey(scope)) ?? '') : '';
  } catch {
    return '';
  }
}
export function readDraft(scope: string) {
  return parseDraft(draftRaw(scope));
}
export function clearDraft(scope: string) {
  try {
    sessionStorage.removeItem(draftKey(scope));
  } catch {
    /* Navegador pode impedir armazenamento. */
  }
  window.dispatchEvent(new Event('order-draft-changed'));
}
/** Whitelist estrita: nunca persistir o corpo do pedido nem dados pessoais/financeiros. */
export function storeDraft(scope: string, draft: OrderDraft) {
  if (!scope) return;
  const value = orderDraftSchema.safeParse(draft);
  if (!value.success) return;
  const raw = JSON.stringify(value.data);
  if (raw.length > 32768) return;
  try {
    sessionStorage.setItem(draftKey(scope), raw);
  } catch {
    return;
  }
  window.dispatchEvent(new Event('order-draft-changed'));
}
