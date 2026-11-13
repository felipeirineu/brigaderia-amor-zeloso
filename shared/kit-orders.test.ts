import { expect, it } from 'vitest';
import {
  kitItemPrice,
  kitSnapshotInput,
  type KitItemSnapshot,
} from './kit-orders';
it('quantidade preserva preço histórico; mudar composição ou kit usa tabela atual', () => {
  const snapshot: KitItemSnapshot = {
    id: 'item-demo',
    kit_id: 'kit-demo',
    quantity: 1,
    weight_grams: 15,
    dough_weight_grams: 13,
    units_per_kit: 25,
    unit_price_cents: 1000,
    packaging_supply_id: null,
    components: [
      {
        product_id: 'sabor-demo',
        units: 25,
        product_name: 'DEMONSTRAÇÃO',
        photo_key: null,
        contains_alcohol: 0,
      },
    ],
  };
  const catalog = [{ id: snapshot.kit_id, price_cents: 2000 }];
  expect(
    kitItemPrice({ ...kitSnapshotInput(snapshot), quantity: 3 }, catalog, [
      snapshot,
    ]),
  ).toBe(1000);
  expect(
    kitItemPrice(
      {
        ...kitSnapshotInput(snapshot),
        components: [{ product_id: 'outro-demo', units: 25 }],
      },
      catalog,
      [snapshot],
    ),
  ).toBe(2000);
  expect(
    kitItemPrice(
      { kit_id: 'inexistente', quantity: 1, components: [] },
      catalog,
    ),
  ).toBeNull();
});
