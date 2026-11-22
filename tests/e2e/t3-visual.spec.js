import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { fortalezaDay } from '../../shared/workday.ts';

test('T3 cinco telas com tipografia, telefone e último cliente acessível', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
    fieldEnabled: true,
  });
  const contexts = [];
  const stage = process.env.T3_STAGE;
  try {
    const { call, makeOrder } = await demoProject(t);
    for (let n = 1; n <= 8; n++)
      await call('customers', {
        name: `Local DEMONSTRAÇÃO ${n}`,
        phone: '+551190000000' + n,
      });
    const id = await makeOrder(fortalezaDay() + 'T14:00:00-03:00');
    let order = await call('orders/' + id, undefined, 'GET');
    await call(
      'orders/' + id + '/delivery',
      {
        version: order.version,
        delivery_type: 'delivery',
        delivery_address: 'Destino DEMONSTRAÇÃO',
        courier: 'partner',
      },
      'PUT',
    );
    order = await call('orders/' + id, undefined, 'GET');
    for (const to of ['in_production', 'ready', 'out_for_delivery']) {
      await call('orders/' + id + '/status', { version: order.version, to });
      order = await call('orders/' + id, undefined, 'GET');
    }
    async function page(email) {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        extraHTTPHeaders: { 'Cf-Access-Jwt-Assertion': await t.token(email) },
      });
      contexts.push(ctx);
      const p = await ctx.newPage();
      await p.goto(t.url + '/api/access/start');
      return p;
    }
    const op = await page('operator@example.test');
    const admin = await page('owner@example.test');
    for (const [name, p, route, ready] of [
      ['hoje', op, '/gestao', '.order-card'],
      ['pedidos', admin, '/gestao/pedidos', '.panel'],
      ['novo-pedido', op, '/gestao/pedidos?novo=1', '.customer-tiles'],
      ['clientes', admin, '/gestao/clientes', '.customer-records article'],
      ['mais', op, '/gestao/mais', '.more-grid'],
    ]) {
      await p.goto(t.url + route);
      await expect(p.locator(ready).first()).toBeVisible();
      await p.evaluate(() => document.fonts.ready);
      if (stage)
        await p.screenshot({
          scale: 'css',
          path: `docs/colaboracao/capturas/t3-${stage}-${name}.png`,
        });
    }
    if (stage === 'antes') return;
    await admin.goto(t.url + '/gestao/clientes');
    const card = admin.locator('.customer-records article').first();
    await expect(card).toContainText('(11) 90000-0000');
    const name = card.getByRole('heading').first();
    const route = card
      .getByRole('button', { name: 'Calcular rota', exact: true })
      .locator('.az-button-label');
    expect(
      Math.abs((await route.boundingBox()).x - (await name.boundingBox()).x),
    ).toBeLessThanOrEqual(1);
    const font = await name.evaluate((el) => ({
      family: getComputedStyle(el).fontFamily,
      weight: getComputedStyle(el).fontWeight,
    }));
    expect(font.family).toContain('Figtree');
    expect(font.weight).toBe('600');
    await card
      .getByRole('button', {
        name: 'Editar Cliente DEMONSTRAÇÃO P1',
        exact: true,
      })
      .click();
    await expect(
      admin.getByLabel('Telefone (opcional)', { exact: true }),
    ).toHaveValue('+5511900000000');
    await admin.getByRole('button', { name: 'Cancelar', exact: true }).click();
    const last = admin.locator('.customer-records article').last();
    await last.scrollIntoViewIfNeeded();
    await admin.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const rect = await last.boundingBox();
    const nav = await admin.locator('.private-bottom-nav').boundingBox();
    expect(rect.y + rect.height).toBeLessThanOrEqual(nav.y);
    await admin.goto(t.url + '/gestao/produtos');
    const title = admin.getByRole('heading', {
      name: 'Novo produto',
      exact: true,
    });
    await expect(title).toBeVisible();
    expect(
      await title.evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain('Figtree');
    expect(await title.evaluate((el) => getComputedStyle(el).fontWeight)).toBe(
      '600',
    );
    await op.goto(t.url + '/gestao');
    await expect(op.locator('.order-card h3').first()).toBeVisible();
    expect(
      await op
        .locator('.order-card h3')
        .first()
        .evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain('Figtree');
    // Lembrete do nome: "Agora não" esconde até a próxima abertura do app.
    const reminder = op.getByRole('region', { name: 'Nome de exibição' });
    await expect(reminder).toBeVisible();
    await reminder
      .getByRole('button', { name: 'Agora não', exact: true })
      .click();
    await expect(reminder).toHaveCount(0);
    await op.reload();
    await expect(op.locator('.order-card h3').first()).toBeVisible();
    await expect(reminder).toHaveCount(0);
    expect(
      (await op.locator('.order-card').first().boundingBox()).y,
    ).toBeLessThanOrEqual(200);
    expect(
      await op.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await op.goto(t.url + '/gestao/mais');
    const footer = op.getByText(/^Versão /);
    await footer.scrollIntoViewIfNeeded();
    await op.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    expect(
      (await footer.boundingBox()).y + (await footer.boundingBox()).height,
    ).toBeLessThanOrEqual(
      (await op.locator('.private-bottom-nav').boundingBox()).y,
    );
  } finally {
    for (const ctx of contexts) await ctx.close();
    await t.dispose();
  }
});
