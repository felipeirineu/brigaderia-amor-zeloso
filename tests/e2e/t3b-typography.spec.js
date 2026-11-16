import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { fortalezaDay } from '../../shared/workday.ts';

// Somente fixtures DEMONSTRAÇÃO em D1 efêmero, sob a CSP de produção.
test('T3b títulos de página serifados e nome inteiro sem quebrar palavras no Hoje', async ({
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
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, variant } = await demoProject(t);
    const fullName =
      'Cliente DEMONSTRAÇÃO com várias palavras para conferir o nome completo';
    const { id: customer } = await call('customers', { name: fullName });
    const { id } = await call('orders', {
      customer_id: customer,
      due_at: fortalezaDay() + 'T14:00:00-03:00',
      items: [{ variant_id: variant, quantity: 1 }],
    });
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
    for (const to of [
      'confirmed',
      'in_production',
      'ready',
      'out_for_delivery',
    ]) {
      await call('orders/' + id + '/status', { version: order.version, to });
      order = await call('orders/' + id, undefined, 'GET');
    }
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.evaluate(() => document.fonts.ready);
    async function serif(locator) {
      await expect(locator).toBeVisible();
      expect(
        await locator.evaluate((el) => getComputedStyle(el).fontFamily),
      ).toContain('DM Serif Display');
      expect(
        await locator.evaluate((el) => getComputedStyle(el).fontWeight),
      ).toBe('400');
    }
    await serif(p.locator('.today-greeting h2'));
    const title = p.locator('.order-card h3').filter({ hasText: fullName });
    await expect(title).toHaveText(fullName);
    await expect(title).toHaveAttribute('title', fullName);
    expect(
      await title.evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain('Figtree');
    expect(await title.evaluate((el) => getComputedStyle(el).fontWeight)).toBe(
      '600',
    );
    const layout = await title.evaluate((el) => {
      const text = el.firstChild;
      const start = text.textContent.indexOf('DEMONSTRAÇÃO');
      const range = document.createRange();
      range.setStart(text, start);
      range.setEnd(text, start + 'DEMONSTRAÇÃO'.length);
      const lines = [...range.getClientRects()].map((r) => Math.round(r.top));
      const style = getComputedStyle(el);
      return {
        lines: [...new Set(lines)],
        height: el.getBoundingClientRect().height,
        line: parseFloat(style.lineHeight),
        wrap: style.overflowWrap,
        clamp: style.webkitLineClamp,
      };
    });
    expect(layout.lines).toHaveLength(1);
    expect(layout.wrap).toBe('normal');
    expect(layout.clamp).toBe('2');
    expect(layout.height).toBeLessThanOrEqual(layout.line * 2 + 1);
    const status = p
      .locator('.order-card')
      .filter({ has: p.getByRole('heading', { name: fullName, exact: true }) })
      .locator('.delivery-status');
    await expect(status).toBeVisible();
    const a = await title.boundingBox(),
      b = await status.boundingBox();
    expect(a.x + a.width).toBeLessThanOrEqual(b.x);
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.T3B_CAPTURE === '1')
      await p.screenshot({
        path: 'docs/colaboracao/capturas/t3b-depois-hoje.png',
        scale: 'css',
      });
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await serif(
      p.getByRole('heading', { name: 'Escolha o cliente', exact: true }),
    );
    if (process.env.T3B_CAPTURE === '1')
      await p.screenshot({
        path: 'docs/colaboracao/capturas/t3b-depois-novo-pedido.png',
        scale: 'css',
      });
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await p.locator('.flavor-add').click();
    const next = () => p.getByRole('button', { name: /^Continuar/ }).click();
    await next();
    await serif(
      p.getByRole('heading', { name: 'Quando entregar?', exact: true }),
    );
    await p.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await p.getByRole('button', { name: '09:00', exact: true }).click();
    await next();
    await serif(
      p.getByRole('heading', { name: 'Como vai chegar?', exact: true }),
    );
    await p.getByRole('button', { name: /^Retirada/ }).click();
    await next();
    await serif(
      p.getByRole('heading', { name: 'Como vai pagar?', exact: true }),
    );
    await p.getByRole('button', { name: 'Na entrega', exact: true }).click();
    await next();
    await serif(
      p.getByRole('heading', { name: 'Revise e confirme', exact: true }),
    );
    await p
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await serif(
      p.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    );
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
