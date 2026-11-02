import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const capture = async (p, name, info) => {
  if (process.env.R12_CAPTURE === '1' && info.project.name === 'webkit-mobile')
    await p.screenshot({
      path: `docs/colaboracao/capturas/r12-depois-${name}.png`,
    });
};
test('R10-1 produção compacta preserva variantes e quantidades', async ({
  browser,
}, info) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    fieldEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, customer, makeOrder } = await demoProject(t);
    await makeOrder(new Date().toISOString(), 1);
    const product = await call('products', {
      name: 'Sabor com variantes DEMONSTRAÇÃO',
      variants: [
        {
          label: 'Embalagem A DEMONSTRAÇÃO',
          weight_grams: 10,
          units_per_box: 3,
          price_cents: 1000,
        },
        {
          label: 'Embalagem B DEMONSTRAÇÃO',
          weight_grams: 20,
          units_per_box: 4,
          price_cents: 1500,
        },
      ],
    });
    const variants = (await call('products/' + product.id, undefined, 'GET'))
      .variants;
    for (const v of variants)
      await call('mobile/orders', {
        customer_id: customer,
        due_at: new Date().toISOString(),
        items: [{ variant_id: v.id, quantity: 1 }],
        delivery: { delivery_type: 'pickup', courier: 'owner' },
      });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    const list = p.locator('.production-list');
    await expect(list.locator('li')).toHaveCount(3);
    const simple = list
      .locator('li')
      .filter({ hasText: 'Produto DEMONSTRAÇÃO P1' });
    await expect(simple.locator('strong').first()).toHaveText(
      'Produto DEMONSTRAÇÃO P1',
    );
    await expect(simple.locator('.production-variant')).toHaveCount(0);
    await expect(simple.locator('.production-counts')).toHaveAttribute(
      'aria-label',
      '1 caixa · 2 unidades',
    );
    await expect(list.locator('.production-variant')).toHaveCount(2);
    await expect(list.locator('.production-variant')).toHaveText([
      'Embalagem A DEMONSTRAÇÃO · 10 g/un.',
      'Embalagem B DEMONSTRAÇÃO · 20 g/un.',
    ]);
    const help = p.locator('.production-dashboard h2').getByRole('button');
    expect(
      await help.evaluate((e) => getComputedStyle(e).backgroundColor),
    ).toBe('rgba(0, 0, 0, 0)');
    expect((await help.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await list.scrollIntoViewIfNeeded();
    await capture(p, 'producao-compacta', info);
  } finally {
    await c.close();
    await t.dispose();
  }
});

test('R10-3 lembrete tem data relativa, círculo e feedback temporário', async ({
  browser,
}, info) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call } = await demoProject(t);
    const { fortalezaDay } = await import('../../shared/workday.ts');
    const day = fortalezaDay();
    await call('p1/reminders', {
      title: 'Lembrete DEMONSTRAÇÃO R10',
      notes: '',
      customer_id: null,
      due_at: day + 'T12:16:00Z',
    });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    const panel = p.locator('.today-reminders');
    await expect(panel).toContainText('Hoje · 09:16');
    await expect(panel).not.toContainText('Lembrete salvo com histórico.');
    const circle = panel.getByRole('button', {
      name: 'Concluir lembrete Lembrete DEMONSTRAÇÃO R10',
      exact: true,
    });
    await expect(circle).toHaveText('');
    expect((await circle.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await expect(circle.locator('svg')).toBeVisible();
    await panel.scrollIntoViewIfNeeded();
    await capture(p, 'lembrete-circulo', info);
    await circle.click();
    await expect(p.locator('.feedback-toast')).toHaveText(
      'Lembrete concluído.',
    );
    await expect(circle).toHaveCount(0);
    await expect(p.locator('.feedback-toast')).toHaveCount(0, {
      timeout: 6000,
    });
  } finally {
    await c.close();
    await t.dispose();
  }
});
