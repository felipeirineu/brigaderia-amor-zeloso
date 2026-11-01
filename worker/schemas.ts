import { z } from 'zod';
const text = (max: number) => z.string().trim().max(max);
export const phone = z
  .string()
  .transform((s) => s.replace(/[\s().-]/g, ''))
  .transform((s) =>
    /^\d{10,11}$/.test(s) ? `+55${s}` : s.startsWith('55') ? `+${s}` : s,
  )
  .pipe(
    z
      .string()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        'Telefone inválido; informe DDD e número ou E.164.',
      ),
  );
export const customerSchema = z
  .object({
    name: text(120).min(1),
    phone,
    email: z.union([z.email().max(254), z.literal('')]).default(''),
    notes: text(1000).default(''),
    active: z.boolean().default(true),
    version: z.number().int().positive().optional(),
  })
  .strict();
export const variantSchema = z
  .object({
    id: z.uuid().optional(),
    label: text(100).min(1),
    weight_grams: z.number().int().min(1).max(100000),
    units_per_box: z.number().int().min(1).max(10000),
    price_cents: z.number().int().min(0).max(100000000),
    active: z.boolean().default(true),
  })
  .strict();
export const productSchema = z
  .object({
    name: text(120).min(1),
    description: text(2000).default(''),
    active: z.boolean().default(true),
    variants: z.array(variantSchema).min(1).max(30),
    version: z.number().int().positive().optional(),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.variants.filter((i) => i.id).map((i) => i.id)).size ===
      v.variants.filter((i) => i.id).length,
    'Variantes duplicadas.',
  );
export const orderSchema = z
  .object({
    customer_id: z.uuid(),
    template_id: z.uuid().optional(),
    due_at: z.iso
      .datetime({ offset: true })
      .transform((s) => new Date(s).toISOString()),
    notes: text(2000).default(''),
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
      .max(50),
    version: z.number().int().positive().optional(),
  })
  .strict()
  .refine(
    (v) => new Set(v.items.map((i) => i.variant_id)).size === v.items.length,
    'Combine as quantidades da mesma variante.',
  );
export const memberSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    role: z.enum(['owner', 'operator']),
  })
  .strict();
