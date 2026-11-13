import { z } from 'zod';
import { containsAlcohol } from '../shared/alcohol';
import type { Kit } from '../shared/kits';
import {
  kitCompositionKey,
  type KitItemInput,
  type KitItemSnapshot,
} from '../shared/kit-orders';
import { HttpError } from './security';
export const kitItemSchema = z
  .object({
    item_id: z.uuid().optional(),
    kit_id: z.uuid(),
    quantity: z.number().int().min(1).max(10000),
    components: z
      .array(
        z
          .object({
            product_id: z.uuid(),
            units: z.number().int().min(1).max(500),
          })
          .strict(),
      )
      .min(1)
      .max(500),
  })
  .strict()
  .refine(
    (i) =>
      new Set(i.components.map((c) => c.product_id)).size ===
      i.components.length,
    'Sabor repetido.',
  );
export interface KitFlavor {
  id: string;
  name: string;
  description: string;
  photo_key: string | null;
  active: number;
}
export function prepareKitItems(
  input: KitItemInput[],
  old: KitItemSnapshot[],
  kits: Kit[],
  flavors: KitFlavor[],
  limitFlavors: boolean,
): KitItemSnapshot[] {
  input = z.array(kitItemSchema).max(50).parse(input);
  if (
    input.length > 50 ||
    new Set(input.map(kitCompositionKey)).size !== input.length ||
    new Set(input.filter((i) => i.item_id).map((i) => i.item_id)).size !==
      input.filter((i) => i.item_id).length
  )
    throw new HttpError(
      400,
      'Combine kits iguais e revise os identificadores dos itens.',
    );
  const kitById = new Map(kits.map((k) => [k.id, k])),
    flavorById = new Map(flavors.map((p) => [p.id, p]));
  return input.map((item) => {
    const prior = item.item_id
      ? old.find((i) => i.id === item.item_id)
      : undefined;
    if (item.item_id && !prior)
      throw new HttpError(404, 'Item de kit não encontrado neste pedido.');
    const kit = kitById.get(item.kit_id);
    if (!kit) throw new HttpError(404, 'Kit não encontrado.');
    if (!kit.active) throw new HttpError(400, 'Escolha um kit ativo.');
    for (const c of item.components) {
      const flavor = flavorById.get(c.product_id);
      if (!flavor) throw new HttpError(404, 'Sabor não encontrado.');
      if (!flavor.active)
        throw new HttpError(400, 'Escolha somente sabores ativos.');
    }
    // Quantidade isolada preserva preço/composição e não reaplica o limite histórico.

    if (prior && kitCompositionKey(prior) === kitCompositionKey(item)) {
      if (
        prior.components.reduce((n, c) => n + c.units, 0) !==
        prior.units_per_kit
      )
        throw new HttpError(
          409,
          'Composição histórica inconsistente. Revise o kit.',
        );
      return {
        ...prior,
        quantity: item.quantity,
        components: prior.components.map((c) => ({ ...c })),
      };
    }

    if (item.components.reduce((n, c) => n + c.units, 0) !== kit.units_per_kit)
      throw new HttpError(400, 'A soma dos sabores precisa completar o kit.');
    if (limitFlavors && item.components.length > kit.max_flavors)
      throw new HttpError(
        400,
        `Este kit aceita até ${kit.max_flavors} sabores.`,
      );
    if (item.components.length > kit.units_per_kit)
      throw new HttpError(400, 'Quantidade de sabores maior que o kit.');
    const components = item.components.map((c) => {
      const flavor = flavorById.get(c.product_id);
      if (!flavor) throw new HttpError(404, 'Sabor não encontrado.');
      if (!flavor.active)
        throw new HttpError(400, 'Escolha somente sabores ativos.');
      return {
        ...c,
        product_name: flavor.name,
        photo_key: flavor.photo_key,
        contains_alcohol: +containsAlcohol(
          flavor.photo_key,
          flavor.name,
          flavor.description,
        ),
      };
    });
    return {
      id: crypto.randomUUID(),
      kit_id: kit.id,
      quantity: item.quantity,
      weight_grams: kit.weight_grams,
      dough_weight_grams: kit.dough_weight_grams,
      units_per_kit: kit.units_per_kit,
      unit_price_cents: kit.price_cents,
      packaging_supply_id: kit.packaging_supply_id,
      components,
    };
  });
}
