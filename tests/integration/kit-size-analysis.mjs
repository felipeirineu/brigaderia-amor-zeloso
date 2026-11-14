// Somente valores/cadastros DEMONSTRAÇÃO, sem referência à planilha privada.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  mixedEnabled: true,
});
try {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
  }).format(new Date());
  const { call, customer } = await demoProject(t);
  const a = (await call('products', undefined, 'GET'))[0];
  const b = (
    await call('products', {
      name: 'Sabor B DEMONSTRAÇÃO',
      variants: [
        {
          label: '15g DEMONSTRAÇÃO',
          weight_grams: 15,
          units_per_box: 25,
          price_cents: 1000,
        },
        {
          label: '30g DEMONSTRAÇÃO',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: 2000,
        },
      ],
    })
  ).id;
  await call(
    'products/' + a.id,
    {
      name: a.name,
      version: a.version,
      variants: [
        {
          id: a.variants[0].id,
          label: a.variants[0].label,
          price_cents: a.variants[0].price_cents,
          active: true,
          weight_grams: 15,
          units_per_box: 25,
        },
        {
          label: '30g DEMONSTRAÇÃO',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: 2000,
        },
      ],
    },
    'PUT',
  );
  const products = await call('products', undefined, 'GET');
  const ingredient = (
    await call('p1/supplies', {
      name: 'Insumo DEMONSTRAÇÃO análise',
      unit: 'unit',
      pack_quantity_milli: 1000,
      pack_cost_cents: 100,
    })
  ).id;
  const packaging = (
    await call('p1/supplies', {
      name: 'Embalagem DEMONSTRAÇÃO análise',
      unit: 'unit',
      pack_quantity_milli: 1000,
      pack_cost_cents: 321,
    })
  ).id;
  for (const p of products)
    for (const v of p.variants)
      await call('p1/recipes', {
        name: `Ficha DEMONSTRAÇÃO ${p.name} ${v.weight_grams}g`,
        variant_id: v.id,
        yield_units: v.weight_grams === 15 ? 10 : 12,
        packaging_cents: 999,
        labor_cents: 0,
        overhead_cents: 0,
        margin_bps: 0,
        components: [{ supply_id: ingredient, quantity_milli: 1000 }],
      });
  const k15 = (
    await call('p1/kits', {
      weight_grams: 15,
      units_per_kit: 25,
      price_cents: 11111,
      max_flavors: 5,
      packaging_supply_id: packaging,
    })
  ).id;
  const k30 = (
    await call('p1/kits', {
      weight_grams: 30,
      units_per_kit: 12,
      price_cents: 7777,
      max_flavors: 3,
      packaging_supply_id: packaging,
    })
  ).id;
  const id = (
    await call('mobile/orders', {
      customer_id: customer,
      due_at: day + 'T13:00:00Z',
      items: [],
      kit_items: [
        {
          kit_id: k15,
          quantity: 2,
          components: [
            { product_id: a.id, units: 15 },
            { product_id: b, units: 10 },
          ],
        },
        {
          kit_id: k30,
          quantity: 1,
          components: [
            { product_id: a.id, units: 6 },
            { product_id: b, units: 6 },
          ],
        },
      ],
      delivery: { delivery_type: 'pickup', courier: 'unassigned' },
      terms: null,
    })
  ).id;
  const today = await call('today?date=' + day, undefined, 'GET');
  assert.equal(today.production.length, 4);
  const rows15 = today.production.filter((r) => r.weight_grams === 15),
    rows30 = today.production.filter((r) => r.weight_grams === 30);
  assert.deepEqual(
    rows15.map((r) => r.units).sort((a, b) => a - b),
    [20, 30],
  );
  assert.deepEqual(
    rows30.map((r) => r.units),
    [6, 6],
  );
  assert.equal(
    rows15.reduce((n, r) => n + r.boxes, 0),
    2,
    'equivalentes por capacidade25',
  );
  assert.equal(
    rows30.reduce((n, r) => n + r.boxes, 0),
    1,
    'equivalentes por capacidade12',
  );
  const costs = await call('p1/order-costs/' + id, undefined, 'GET');
  assert.deepEqual(costs.missing, []);
  assert.equal(
    costs.estimated_cost_cents,
    1571,
    '500+108 em ingredientes,3 embalagens de321; não repetir999 da ficha',
  );
  const shopping = await call(
    `p1/shopping?from=${day}&to=${day}`,
    undefined,
    'GET',
  );
  assert.deepEqual(shopping.missing, []);
  assert.equal(
    shopping.items.find((s) => s.supply_id === ingredient).required_milli,
    7000,
    'cinco lotes15g e dois lotes30g',
  );
  assert.equal(
    shopping.items.find((s) => s.supply_id === packaging).required_milli,
    3000,
  );
  await call('orders/' + id + '/status', { version: 1, to: 'in_production' });
  await call('orders/' + id + '/status', { version: 2, to: 'ready' });
  await call('orders/' + id + '/status', { version: 3, to: 'picked_up' });
  const report = await call(
    `p1/reports?from=${day}&to=${day}`,
    undefined,
    'GET',
  );
  assert.equal(report.products.length, 4);
  assert.equal(
    report.products.reduce((n, r) => n + r.total_cents, 0),
    2 * 11111 + 7777,
  );
  assert.equal(
    report.products
      .filter((r) => r.weight_grams === 15)
      .reduce((n, r) => n + r.units, 0),
    50,
  );
  assert.equal(
    report.products
      .filter((r) => r.weight_grams === 30)
      .reduce((n, r) => n + r.units, 0),
    12,
  );
  const csv = await t.request(
    `p1/reports.csv?from=${day}&to=${day}&kind=products`,
    { cookie: await t.login('owner@example.test') },
  );
  assert.equal(csv.status, 200);
  const text = await csv.text();
  assert.match(text, /Caixas equivalentes/);
  assert.match(text, /"15";"25"/);
  assert.match(text, /"30";"12"/);
  console.log(
    'OK R15 agregações:4 linhas sabor×peso, capacidade25/12 e frações, rateio sem perder centavos, fichas/compras por peso e embalagem única.',
  );
} finally {
  await t.dispose();
}
