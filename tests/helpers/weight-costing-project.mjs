import { demoProject } from './demo-project.mjs';
// Todos os valores deste projeto são fictícios; não vêm da planilha comercial.
export async function weightCostingProject(t) {
  const base = await demoProject(t),
    { call } = base,
    product = (await call('products', undefined, 'GET'))[0];
  const supply = async (name, cents, unit = 'unit', quantity = 1000) =>
    (
      await call('p1/supplies', {
        name: 'DEMONSTRAÇÃO ' + name,
        unit,
        pack_quantity_milli: quantity,
        pack_cost_cents: cents,
      })
    ).id;
  const ids = {
    dough: await supply('massa fictícia', 2000),
    liner: await supply('forminha nº4 fictícia', 0),
    liner5: await supply('forminha nº5 fictícia', 0),
    pack: await supply('caixa fictícia', 200),
    food: await supply('embalagem canal fictícia', 100),
    label: await supply('etiqueta fictícia', 50),
    bag: await supply('sacola fictícia', 50),
    extra: await supply('opcional fictício', 50),
    finish: await supply('acabamento fictício', 100, 'g', 100000),
  };
  const kits = [];
  for (const [weight, mass, capacity, price] of [
    [30, 26, 12, 5000],
    [15, 13, 25, 10000],
    [23, 20, 50, 20000],
  ])
    kits.push(
      (
        await call('p1/kits', {
          weight_grams: weight,
          dough_weight_grams: mass,
          units_per_kit: capacity,
          price_cents: price,
          max_flavors: weight === 30 ? 3 : 5,
          packaging_supply_id: ids.pack,
        })
      ).id,
    );
  const settings = {
    overhead_bps: 2000,
    ifood_divisor_bps: 7400,
    ifood_packaging_supply_id: ids.food,
    ifood_label_supply_id: ids.label,
    ifood_bag_supply_id: ids.bag,
    optional_supply_ids: [ids.extra],
    liners: [
      { weight_grams: 30, supply_id: ids.liner },
      { weight_grams: 15, supply_id: ids.liner5 },
      { weight_grams: 23, supply_id: ids.liner5 },
    ],
  };
  await call('p1/costing-settings', { version: 0, data: settings }, 'PUT');
  const data = {
    reference_yield: 16,
    reference_dough_milli: 26000,
    reference_confirmed: true,
    mass_milli: null,
    margin_bps: 0,
    measured: [],
    components: [
      { supply_id: ids.dough, group: 'dough', quantity_milli: 1000, sizes: [] },
    ],
  };
  const payload = { product_id: product.id, active: true, data };
  const recipe = (await call('p1/weight-recipes', payload)).id;
  return { ...base, product, ids, kits, settings, data, payload, recipe };
}
