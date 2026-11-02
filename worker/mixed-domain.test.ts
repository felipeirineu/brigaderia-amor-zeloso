import { expect, it } from 'vitest';
import { itemInputSchema, uniqueItems } from './mixed-domain';
const a = '00000000-0000-4000-8000-000000000001',
  b = '00000000-0000-4000-8000-000000000002';
it('composição canônica aceita linhas distintas e recusa repetir a mesma mistura ou o mesmo item histórico', () => {
  const one = {
    variant_id: a,
    quantity: 1,
    components: [
      { variant_id: a, units: 8 },
      { variant_id: b, units: 4 },
    ],
  };
  expect(
    uniqueItems([one, { ...one, components: [...one.components].reverse() }]),
  ).toBe(false);
  expect(uniqueItems([one, { variant_id: a, quantity: 2 }])).toBe(true);
  expect(
    uniqueItems([
      { ...one, item_id: b },
      { variant_id: a, item_id: b, quantity: 2 },
    ]),
  ).toBe(false);
});
it('entrada não aceita snapshot ou preço do cliente nem componentes vazios/duplicados/fracionários', () => {
  const base = { variant_id: a, quantity: 1 };
  expect(
    itemInputSchema.safeParse({ ...base, unit_price_cents: 1 }).success,
  ).toBe(false);
  for (const components of [
    [],
    [{ variant_id: a, units: 0 }],
    [{ variant_id: a, units: 1.5 }],
    [
      { variant_id: a, units: 6 },
      { variant_id: a, units: 6 },
    ],
  ])
    expect(itemInputSchema.safeParse({ ...base, components }).success).toBe(
      false,
    );
  expect(
    itemInputSchema.safeParse({
      ...base,
      components: [{ variant_id: a, units: 12 }],
    }).success,
  ).toBe(true);
});
