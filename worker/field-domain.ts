import { z } from 'zod';
import { instagramProfile, withAddress } from '../shared/field';
export const placeSchema = z
  .object({
    name: z.string().trim().max(120).default(''),
    address: z.string().trim().max(1000).default(''),
    street: z.string().trim().max(200).default(''),
    number: z.string().trim().max(20).default(''),
    no_number: z.boolean().default(false),
    complement: z.string().trim().max(120).default(''),
    neighborhood: z.string().trim().max(150).default(''),
    city: z.string().trim().max(120).default(''),
    reference: z.string().trim().max(200).default(''),
    latitude: z.number().min(-90).max(90).nullable().default(null),
    longitude: z.number().min(-180).max(180).nullable().default(null),
    instagram: z
      .string()
      .max(200)
      .default('')
      .transform((s, ctx) => {
        try {
          return instagramProfile(s);
        } catch {
          ctx.addIssue({ code: 'custom', message: 'Perfil inválido.' });
          return z.NEVER;
        }
      }),
  })
  .strict()
  .refine(
    (p) => (p.latitude === null) === (p.longitude === null),
    'Informe as duas coordenadas.',
  )
  // Com campos separados, a linha única é sempre montada no servidor.
  .transform((p) => withAddress(p));
