import { expect, test } from '@playwright/test';
import { fortalezaDay, shiftDay } from '../../shared/workday.ts';
import { demoProject } from '../helpers/demo-project.mjs';
import { runtime } from '../helpers/runtime.mjs';

test('T20 seleciona o dia, muda a data, entrega e desfaz em lote', async ({
  browser,
}, info) => {
  const desktop = info.project.name === 'chromium-desktop';
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
  });
  const context = await browser.newContext({
    viewport: desktop
      ? { width: 1366, height: 860 }
      : { width: 390, height: 844 },
    hasTouch: !desktop,
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, operator, customer, variant } = await demoProject(t);
    const extra = (
      await call('customers', { name: 'Retirada DEMONSTRAÇÃO T20' })
    ).id;
    const today = fortalezaDay();
    const first = await call(
      'mobile/orders',
      {
        customer_id: customer,
        due_at: today + 'T14:00:00Z',
        items: [{ variant_id: variant, quantity: 1 }],
        delivery: {
          delivery_type: 'delivery',
          delivery_address: 'Rua DEMONSTRAÇÃO T20',
          courier: 'partner',
        },
      },
      'POST',
      operator,
    );
    const second = await call(
      'mobile/orders',
      {
        customer_id: extra,
        due_at: today + 'T17:00:00Z',
        items: [{ variant_id: variant, quantity: 2 }],
        delivery: { delivery_type: 'pickup', courier: 'unassigned' },
      },
      'POST',
      operator,
    );
    const page = await context.newPage();
    const criticalErrors = [];
    page.on('pageerror', (err) => criticalErrors.push(err.message));
    await page.goto(t.url + '/api/access/start');
    await page.goto(t.url + '/gestao/pedidos');
    const list = page.locator('.batch-order-list');
    const bar = list.getByRole('complementary', { name: 'Ações em lote' });
    const dialog = page.getByRole('dialog');
    const selectDay = async () => {
      await list
        .getByRole('button', { name: 'Selecionar', exact: true })
        .click();
      await list.getByRole('checkbox', { name: 'Todos do dia' }).check();
      await expect(bar).toContainText('2 pedidos selecionados');
    };
    const capture = async (name) => {
      if (
        process.env.T20_CAPTURE === '1' &&
        (desktop || info.project.name === 'chromium-mobile')
      ) {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path:
            'docs/colaboracao/capturas/t20-' +
            (desktop ? 'desktop-' : '') +
            name +
            '.png',
          animations: 'disabled',
        });
      }
    };
    if (!desktop) {
      const card = list
        .locator('[data-batch-order]')
        .filter({ hasText: 'Cliente DEMONSTRAÇÃO P1' });
      await card.dispatchEvent('pointerdown', {
        pointerType: 'touch',
        clientX: 100,
        clientY: 300,
      });
      await expect(bar).toContainText('1 pedido selecionado');
      await list.getByRole('button', { name: 'Cancelar seleção' }).click();
    }
    await selectDay();
    await capture('selecao');
    await bar.getByRole('button', { name: 'Mudar data', exact: true }).click();
    await dialog.getByRole('button', { name: 'Amanhã' }).click();
    await expect(dialog).toContainText('11:00');
    await expect(dialog).toContainText('14:00');
    await capture('data');
    await dialog.getByRole('button', { name: /^Mudar 2 pedidos para/ }).click();
    await bar.getByRole('button', { name: 'Desfazer' }).waitFor();
    const read = (id) => call('orders/' + id, undefined, 'GET');
    expect((await read(first.id)).due_at).toBe(
      shiftDay(today, 1) + 'T14:00:00.000Z',
    );
    expect((await read(second.id)).due_at).toBe(
      shiftDay(today, 1) + 'T17:00:00.000Z',
    );
    await bar.getByRole('button', { name: 'Desfazer' }).click();
    await expect(list.getByText('2 pedidos restaurados.')).toBeVisible();
    expect((await read(first.id)).due_at.slice(0, 10)).toBe(today);
    await selectDay();
    await bar.getByRole('button', { name: 'Marcar entregue' }).click();
    await expect(dialog).toContainText('Confirmado → Entregue');
    await expect(dialog).toContainText('Confirmado → Retirado');
    await capture('etapas');
    await dialog
      .getByRole('button', { name: 'Marcar 2 como entregues' })
      .click();
    await bar.getByRole('button', { name: 'Desfazer' }).waitFor();
    expect((await read(first.id)).status).toBe('delivered');
    expect((await read(second.id)).status).toBe('picked_up');
    await bar.getByRole('button', { name: 'Desfazer' }).click();
    await expect(list.getByText('2 pedidos restaurados.')).toBeVisible();
    expect((await read(first.id)).status).toBe('confirmed');
    expect((await read(second.id)).status).toBe('confirmed');
    expect(criticalErrors).toEqual([]);
  } finally {
    await context.close();
    await t.dispose();
  }
});
