import { expect, it } from 'vitest';
import { customerSchema, orderSchema, productSchema } from './schemas';
import { parsePrice } from '../src/features/api';

it('converte preço por embalagem em centavos sem float de cobrança', () => {
  expect(parsePrice('42,00')).toBe(4200);
  expect(parsePrice('0,01')).toBe(1);
  for (const value of ['1.234,00', '-1', '1,234', 'NaN', '1e2'])
    expect(() => parsePrice(value)).toThrow();
});
it('normaliza telefone e rejeita organização enviada pelo cliente', () => {
  expect(
    customerSchema.parse({
      name: 'Cliente DEMONSTRAÇÃO',
      phone: '(11) 90000-0000',
    }).phone,
  ).toBe('+5511900000000');
  expect(
    customerSchema.safeParse({ name: 'Teste DEMO', phone: '123' }).success,
  ).toBe(false);
  expect(
    customerSchema.safeParse({
      name: 'Teste DEMO',
      phone: '+5511900000000',
      organization_id: 'other',
    }).success,
  ).toBe(false);
});
it('rejeita quantidade/preço negativos e valores fracionários', () => {
  for (const cents of [-1, 0.1, Infinity])
    expect(
      productSchema.safeParse({
        name: 'DEMO',
        variants: [
          {
            label: 'DEMO',
            weight_grams: 10,
            units_per_box: 2,
            price_cents: cents,
          },
        ],
      }).success,
    ).toBe(false);
  expect(
    orderSchema.safeParse({
      customer_id: crypto.randomUUID(),
      due_at: '2030-01-01T00:00:00Z',
      items: [{ variant_id: crypto.randomUUID(), quantity: 0 }],
    }).success,
  ).toBe(false);
});
it('normaliza o prazo para UTC e impede item duplicado', () => {
  const id = crypto.randomUUID();
  const value = {
    customer_id: crypto.randomUUID(),
    due_at: '2030-01-01T10:00:00-03:00',
    items: [{ variant_id: id, quantity: 1 }],
  };
  expect(orderSchema.parse(value).due_at).toBe('2030-01-01T13:00:00.000Z');
  expect(
    orderSchema.safeParse({ ...value, items: [...value.items, ...value.items] })
      .success,
  ).toBe(false);
});
