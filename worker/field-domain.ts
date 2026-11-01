import { z } from 'zod';
import { instagramProfile } from '../shared/field';
export const placeSchema = z
  .object({
    name: z.string().trim().max(120).default(''),
    address: z.string().trim().max(1000).default(''),
    neighborhood: z.string().trim().max(150).default(''),
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
  );
