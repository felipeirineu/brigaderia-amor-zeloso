import { z } from 'zod';
import { compositionKey, type ItemInput } from '../shared/mixed';
export const itemInputSchema = z
  .object({
    item_id: z.uuid().optional(),
    variant_id: z.uuid(),
    quantity: z.number().int().min(1).max(10000),
    components: z
      .array(
        z
          .object({
            variant_id: z.uuid(),
            units: z.number().int().min(1).max(10000),
          })
          .strict(),
      )
      .min(1)
      .max(50)
      .refine(
        (c) => new Set(c.map((x) => x.variant_id)).size === c.length,
        'Sabor repetido na composição.',
      )
      .optional(),
  })
  .strict();
export const uniqueItems = (items: ItemInput[]) =>
  new Set(items.map(compositionKey)).size === items.length &&
  new Set(items.filter((i) => i.item_id).map((i) => i.item_id)).size ===
    items.filter((i) => i.item_id).length;
