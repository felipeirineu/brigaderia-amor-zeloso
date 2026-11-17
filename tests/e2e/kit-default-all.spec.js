import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

// Administrador aplica um kit como padrão de todos os estabelecimentos com um
// toque e confirmação; operadora não vê o botão.
test('kit padrão em todos os estabelecimentos com confirmação', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
  });
  const ctx = (email) =>
    t.token(email).then((token) =>
      browser.newContext({
        viewport: { width: 390, height: 844 },
        extraHTTPHeaders: { 'Cf-Access-Jwt-Assertion': token },
      }),
    );
  const c = await ctx('owner@example.test'),
    op = await ctx('operator@example.test');
  try {
    const { call, customer } = await demoProject(t);
    const kit = await call('p1/kits', {
      weight_grams: 30,
      units_per_kit: 12,
      price_cents: 1234,
      max_flavors: 3,
      packaging_supply_id: null,
    });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/kits');
    const button = p.getByRole('button', {
      name: 'Usar Kit 12 · 30 g como padrão em todos os estabelecimentos',
      exact: true,
    });
    // Cancelar a confirmação não muda nada.
    await button.click();
    await p
      .getByRole('dialog', { name: 'Tem certeza?', exact: true })
      .getByRole('button', { name: 'Cancelar', exact: true })
      .click();
    const kitOf = async () =>
      (
        await call(
          'finance/customers/' + customer + '/profile',
          undefined,
          'GET',
        )
      ).data.default_kit_id ?? null;
    expect(await kitOf()).toBeNull();
    await button.click();
    await p
      .getByRole('dialog', { name: 'Tem certeza?', exact: true })
      .getByRole('button', { name: 'Confirmar', exact: true })
      .click();
    await expect(
      p.getByText('Kit 12 · 30 g agora é o padrão de 1 estabelecimento.', {
        exact: true,
      }),
    ).toBeVisible();
    expect(await kitOf()).toBe(kit.id);

    const o = await op.newPage();
    await o.goto(t.url + '/api/access/start');
    await o.goto(t.url + '/gestao/kits');
    await expect(
      o.getByRole('heading', { name: 'Kit 12 · 30 g', exact: true }),
    ).toBeVisible();
    await expect(
      o.getByRole('button', { name: /como padrão em todos/ }),
    ).toHaveCount(0);
  } finally {
    await c.close();
    await op.close();
    await t.dispose();
  }
});
