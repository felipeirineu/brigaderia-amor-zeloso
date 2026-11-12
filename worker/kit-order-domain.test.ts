import { expect, it } from 'vitest';
import { prepareKitItems, type KitFlavor } from './kit-order-domain';
import type { Kit } from '../shared/kits';
import type { KitItemInput } from '../shared/kit-orders';
function fixture(capacity = 25, max = 5) {
  const kit: Kit = {
    id: crypto.randomUUID(),
    weight_grams: 15,
    dough_weight_grams: 13,
    units_per_kit: capacity,
    price_cents: 12345,
    max_flavors: max,
    packaging_supply_id: null,
    active: 1,
    version: 1,
  };
  const flavors: KitFlavor[] = Array.from({ length: 6 }, (_, i) => ({
    id: crypto.randomUUID(),
    name: `Sabor DEMONSTRAÇÃO ${i}`,
    description: '',
    photo_key: null,
    active: 1,
  }));
  const item: KitItemInput = {
    kit_id: kit.id,
    quantity: 2,
    components: flavors
      .slice(0, 5)
      .map((p) => ({ product_id: p.id, units: 5 })),
  };
  return { kit, flavors, item };
}
it('kit25 de 15g aceita cinco sabores, snapshots independentes de variantes e aviso de álcool', () => {
  const { kit, flavors, item } = fixture();
  flavors[0].photo_key = 'caipirinha';
  const [snapshot] = prepareKitItems([item], [], [kit], flavors, true);
  expect(snapshot.unit_price_cents).toBe(12345);
  expect(snapshot.units_per_kit).toBe(25);
  expect(snapshot.weight_grams).toBe(15);
  expect(snapshot.components.reduce((n, c) => n + c.units, 0)).toBe(25);
  expect(snapshot.components[0].contains_alcohol).toBe(1);
  flavors[1].name = 'Nome DEMONSTRAÇÃO alterado';
  expect(snapshot.components[1].product_name).toBe('Sabor DEMONSTRAÇÃO 1');
});
it('kit12 recusa quatro sabores com limite ligado e aceita com limite desligado', () => {
  const { kit, flavors, item } = fixture(12, 3);
  item.components = flavors
    .slice(0, 4)
    .map((p) => ({ product_id: p.id, units: 3 }));
  expect(() => prepareKitItems([item], [], [kit], flavors, true)).toThrow(
    'até 3',
  );
  expect(
    prepareKitItems([item], [], [kit], flavors, false)[0].components,
  ).toHaveLength(4);
});
it('recusa soma inválida, inativo, sabor externo, duplicidade e peso por componente', () => {
  const { kit, flavors, item } = fixture();
  expect(() =>
    prepareKitItems(
      [{ ...item, components: item.components.slice(0, 4) }],
      [],
      [kit],
      flavors,
      true,
    ),
  ).toThrow('soma');
  expect(() =>
    prepareKitItems([item], [], [{ ...kit, active: 0 }], flavors, true),
  ).toThrow('ativo');
  expect(() =>
    prepareKitItems([item], [], [kit], flavors.slice(1), true),
  ).toThrow('não encontrado');
  expect(() =>
    prepareKitItems(
      [item],
      [],
      [kit],
      [{ ...flavors[0], active: 0 }, ...flavors.slice(1)],
      true,
    ),
  ).toThrow('ativos');
  expect(() => prepareKitItems([item, item], [], [kit], flavors, true)).toThrow(
    'Combine',
  );
  expect(() =>
    prepareKitItems(
      [{ ...item, components: [...item.components, item.components[0]] }],
      [],
      [kit],
      flavors,
      false,
    ),
  ).toThrow();
  expect(() =>
    prepareKitItems(
      [
        {
          ...item,
          components: [
            { ...item.components[0], weight_grams: 30 },
            ...item.components.slice(1),
          ],
        } as KitItemInput,
      ],
      [],
      [kit],
      flavors,
      true,
    ),
  ).toThrow();
  expect(() =>
    prepareKitItems([{ ...item, quantity: 0 }], [], [kit], flavors, true),
  ).toThrow();
});
it('quantidade mantém identidade/preço/composição histórica; editar composição usa preço atual', () => {
  const { kit, flavors, item } = fixture();
  const [old] = prepareKitItems([item], [], [kit], flavors, false);
  const changedKit = { ...kit, price_cents: 22222, max_flavors: 3 };
  const [quantity] = prepareKitItems(
    [{ ...item, item_id: old.id, quantity: 3 }],
    [old],
    [changedKit],
    flavors,
    true,
  );
  expect(quantity.id).toBe(old.id);
  expect(quantity.unit_price_cents).toBe(12345);
  expect(quantity.components).toEqual(old.components);
  const composition = {
    ...item,
    item_id: old.id,
    components: [{ product_id: flavors[0].id, units: 25 }],
  };
  const [replaced] = prepareKitItems(
    [composition],
    [old],
    [changedKit],
    flavors,
    true,
  );
  expect(replaced.id).not.toBe(old.id);
  expect(replaced.unit_price_cents).toBe(22222);
  expect(() =>
    prepareKitItems(
      [{ ...item, item_id: crypto.randomUUID() }],
      [old],
      [kit],
      flavors,
      true,
    ),
  ).toThrow('neste pedido');
});
