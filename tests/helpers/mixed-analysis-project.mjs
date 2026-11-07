// Apenas fixtures fictícias, sem cadastro ou consulta de dados remotos.
import { demoProject } from './demo-project.mjs';
export async function mixedAnalysisProject(t) {
  const base = await demoProject(t),
    { call, customer } = base,
    variants = [];
  for (const [name, price] of [
    ['Alfa DEMONSTRAÇÃO', 1001],
    ['Beta DEMONSTRAÇÃO', 2003],
    ['Gama DEMONSTRAÇÃO', 3007],
  ]) {
    const p = await call('products', {
      name,
      variants: [
        {
          label: 'Caixa DEMONSTRAÇÃO',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: price,
        },
      ],
    });
    const product = await call('products/' + p.id, undefined, 'GET');
    variants.push({ ...product.variants[0], name, product_id: p.id });
  }
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const order = await call('mobile/orders', {
    customer_id: customer,
    due_at: day + 'T15:00:00Z',
    composition_version: 1,
    items: [
      {
        variant_id: variants[0].id,
        quantity: 2,
        components: variants.map((v, i) => ({
          variant_id: v.id,
          units: [8, 3, 1][i],
        })),
      },
      { variant_id: variants[1].id, quantity: 1 },
    ],
    delivery: { delivery_type: 'pickup', courier: 'partner' },
    terms: null,
  });
  const deliver = async (id) => {
    for (const to of ['in_production', 'ready', 'picked_up']) {
      const o = await call('orders/' + id, undefined, 'GET');
      await call('orders/' + id + '/status', { version: o.version, to });
    }
  };
  return { ...base, variants, day, order: order.id, deliver };
}
