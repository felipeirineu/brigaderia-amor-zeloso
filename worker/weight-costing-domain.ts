import { z } from 'zod';
const positive = z.number().int().min(1).max(1000000000000),
  size = z.number().int().min(1).max(500);
export const weightRecipeSchema = z
  .object({
    product_id: z.uuid(),
    active: z.boolean().default(true),
    version: z.number().int().positive().optional(),
    data: z
      .object({
        reference_yield: z.number().int().min(1).max(1000000).default(16),
        reference_dough_milli: positive.default(26000),
        reference_confirmed: z.boolean(),
        mass_milli: positive.nullable(),
        margin_bps: z.number().int().min(0).max(9500),
        measured: z
          .array(
            z
              .object({
                weight_grams: size,
                dough_milli: positive,
                yield_units: z.number().int().min(1).max(1000000),
              })
              .strict(),
          )
          .max(100),
        components: z
          .array(
            z
              .object({
                supply_id: z.uuid(),
                group: z.enum(['dough', 'batch', 'finish']),
                quantity_milli: z.number().int().min(0).max(1000000000000),
                sizes: z
                  .array(
                    z
                      .object({
                        weight_grams: size,
                        quantity_milli: z
                          .number()
                          .int()
                          .min(0)
                          .max(1000000000000),
                        estimated: z.boolean(),
                      })
                      .strict(),
                  )
                  .max(100),
              })
              .strict(),
          )
          .min(1)
          .max(50),
      })
      .strict(),
  })
  .strict()
  .refine(
    (v) => v.data.components.some((c) => c.group === 'dough'),
    'Informe insumos da massa.',
  )
  .refine(
    (v) =>
      new Set(v.data.components.map((c) => c.group + ':' + c.supply_id))
        .size === v.data.components.length,
    'Insumo repetido no mesmo grupo.',
  )
  .refine(
    (v) =>
      v.data.components.every((c) =>
        c.group === 'finish'
          ? c.sizes.length > 0 && c.quantity_milli === 0
          : c.quantity_milli > 0 && c.sizes.length === 0,
      ),
    'Informe quantidades e ao menos um tamanho por acabamento.',
  )
  .refine(
    (v) =>
      v.data.components.every(
        (c) =>
          new Set(c.sizes.map((s) => s.weight_grams)).size === c.sizes.length,
      ),
    'Tamanho de acabamento repetido.',
  )
  .refine(
    (v) =>
      new Set(v.data.measured.map((m) => `${m.weight_grams}/${m.dough_milli}`))
        .size === v.data.measured.length,
    'Rendimento medido repetido.',
  );
export const costingSettingsSchema = z
  .object({
    version: z.number().int().min(0),
    data: z
      .object({
        overhead_bps: z.number().int().min(0).max(100000),
        ifood_divisor_bps: z.number().int().min(1).max(10000),
        ifood_packaging_supply_id: z.uuid().nullable(),
        ifood_label_supply_id: z.uuid().nullable(),
        ifood_bag_supply_id: z.uuid().nullable(),
        optional_supply_ids: z.array(z.uuid()).max(50),
        liners: z
          .array(
            z
              .object({ weight_grams: size, supply_id: z.uuid().nullable() })
              .strict(),
          )
          .max(100),
      })
      .strict(),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.data.optional_supply_ids).size ===
      v.data.optional_supply_ids.length,
    'Opcional repetido.',
  )
  .refine(
    (v) =>
      new Set(v.data.liners.map((s) => s.weight_grams)).size ===
      v.data.liners.length,
    'Forminha repetida para o tamanho.',
  )
  .refine(
    (v) =>
      !v.data.liners.some(
        (l) => l.supply_id && v.data.optional_supply_ids.includes(l.supply_id),
      ),
    'Forminha não pode ser também opcional.',
  );
