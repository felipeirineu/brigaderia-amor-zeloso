import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('R6-1 rota salva nos cartões e linha reta explícita sem provedor', async ({
  browser,
}, info) => {
  let requests = 0;
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    fieldEnabled: true,
    routingProvider: async () => {
      requests++;
      return Response.json({
        routes: [{ summary: { distance: 6400, duration: 960 } }],
      });
    },
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, customer, variant } = await demoProject(t);
    const place = {
      name: 'Local DEMONSTRAÇÃO',
      address: 'Endereço DEMONSTRAÇÃO',
      neighborhood: '',
      instagram: '',
      latitude: 0,
      longitude: 0,
    };
    await call('field/company', { data: place, version: 0 }, 'PUT');
    await call(
      'field/customers/' + customer,
      { data: { ...place, longitude: 1 }, version: 0 },
      'PUT',
    );
    await call('mobile/orders', {
      customer_id: customer,
      due_at: new Date().toISOString(),
      items: [{ variant_id: variant, quantity: 1 }],
      delivery: {
        delivery_type: 'delivery',
        delivery_address: place.address,
        courier: 'owner',
      },
    });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    const route = p.locator('.order-card .route-info').first();
    await expect(route).toContainText('6,4 km · 16 min de carro');
    await route
      .getByRole('button', { name: 'Ajuda: Rota de carro', exact: true })
      .click();
    await expect(
      p.getByRole('dialog', { name: 'Rota de carro', exact: true }),
    ).toContainText('não acompanha trânsito em tempo real');
    await p.getByRole('button', { name: 'Fechar ajuda', exact: true }).click();
    if (process.env.R9_CAPTURE === '1' && info.project.name === 'webkit-mobile')
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r9-depois-rota-entrega.png',
      });
    await p.goto(t.url + '/gestao/clientes');
    await expect(p.locator('.route-info').first()).toContainText('6,4 km');
    await expect(
      p.getByRole('button', { name: 'Recalcular rota', exact: true }),
    ).toBeVisible();
    expect(requests).toBe(1);
    if (process.env.R9_CAPTURE === '1' && info.project.name === 'webkit-mobile')
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r9-depois-rota-cliente.png',
      });
    // Cadastro muda, a estimativa perde validade; UI não mostra o valor antigo.
    await t.db.prepare('DELETE FROM route_cache').run();
    await p.reload();
    await expect(p.locator('.route-info').first()).toContainText(
      'km em linha reta',
    );
    await expect(
      p.getByRole('button', { name: 'Calcular rota', exact: true }),
    ).toBeVisible();
    expect(requests).toBe(1);
    if (process.env.R9_CAPTURE === '1' && info.project.name === 'webkit-mobile')
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r9-depois-rota-fallback.png',
      });
  } finally {
    await c.close();
    await t.dispose();
  }
});
