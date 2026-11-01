// Somente D1 efêmero: nomes e valores fictícios DEMONSTRAÇÃO.
export async function reviewProject(t) {
  const owner = await t.login('owner@example.test');
  const call = async (path, data, method = 'POST') => {
    const r = await t.request(path, {
      cookie: owner,
      method,
      data,
      key: crypto.randomUUID(),
    });
    if (!r.ok) throw Error(path + ': ' + r.status + ' ' + (await r.text()));
    return r.json();
  };
  const customer = (
    await call('customers', {
      name: 'Cliente DEMONSTRAÇÃO R5',
      phone: '11900000001',
    })
  ).id;
  const variants = [];
  for (const [key, name] of [
    ['cajuzinho', 'Cajuzinho'],
    ['casadinho', 'Casadinho'],
    ['coco', 'Côco'],
    ['limao', 'Limão'],
    ['tradicional', 'Tradicional'],
  ]) {
    const p = await call('products', {
      name: name + ' DEMONSTRAÇÃO',
      photo_key: key,
      variants: [
        {
          label: 'Caixa DEMONSTRAÇÃO',
          weight_grams: 10,
          units_per_box: 2,
          price_cents: 1234,
        },
      ],
    });
    variants.push({
      key,
      ...(await call('products/' + p.id, undefined, 'GET')).variants[0],
    });
  }
  await call('mobile/orders', {
    customer_id: customer,
    due_at: new Date().toISOString(),
    items: [
      {
        variant_id: variants.find((v) => v.key === 'tradicional').id,
        quantity: 1,
      },
    ],
    delivery: {
      delivery_type: 'delivery',
      delivery_address: 'Endereço DEMONSTRAÇÃO',
      courier: 'partner',
    },
  });
  return { call, customer, variants };
}
