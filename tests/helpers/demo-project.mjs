// Fixtures fictícias, criadas somente em D1 efêmero/local dos testes.
export async function demoProject(t) {
  const owner = await t.login('owner@example.test'),
    operator = await t.login('operator@example.test'),
    outside = await t.login('other@example.test');
  const call = async (
    path,
    data,
    method = 'POST',
    cookie = owner,
    key = crypto.randomUUID(),
  ) => {
    const r = await t.request(path, { cookie, method, data, key });
    if (!r.ok) throw Error(`${path}: ${r.status} ${await r.text()}`);
    return r.json();
  };
  const customer = (
    await call('customers', {
      name: 'Cliente DEMONSTRAÇÃO P1',
      phone: '+5511900000000',
    })
  ).id;
  const product = await call('products', {
    name: 'Produto DEMONSTRAÇÃO P1',
    variants: [
      {
        label: 'Embalagem fictícia',
        weight_grams: 10,
        units_per_box: 2,
        price_cents: 1000,
      },
    ],
  });
  const variant = (await call('products/' + product.id, undefined, 'GET'))
    .variants[0].id;
  const makeOrder = async (due = '2030-01-07T13:00:00.000Z', quantity = 2) => {
    const id = (
      await call('orders', {
        customer_id: customer,
        due_at: due,
        items: [{ variant_id: variant, quantity }],
      })
    ).id;
    await call(
      `orders/${id}/delivery`,
      { version: 1, delivery_type: 'pickup', courier: 'unassigned' },
      'PUT',
    );
    await call(`orders/${id}/status`, { version: 2, to: 'confirmed' });
    return id;
  };
  return { owner, operator, outside, call, customer, variant, makeOrder };
}
