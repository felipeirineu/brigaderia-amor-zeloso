import { expect, test } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
test('Hoje mantém contexto: saldo pré-preenchido, chips, entrega/recebimento e undo conjunto', async ({
  browser,
}) => {
  const t = await runtime({ browserHTTP: true, financeEnabled: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const cookie = await t.login('owner@example.test');
    const api = async (path, data, method = 'POST') => {
      const r = await t.request(path, {
        cookie,
        method,
        data,
        key: crypto.randomUUID(),
      });
      expect(r.ok, `${path} ${r.status}`).toBe(true);
      return r.json();
    };
    const c = await api('customers', {
        name: 'Cliente DEMONSTRAÇÃO Hoje R2',
        phone: '+5511900000000',
      }),
      p = await api('products', {
        name: 'Produto DEMONSTRAÇÃO',
        variants: [
          {
            label: 'Fictícia',
            weight_grams: 10,
            units_per_box: 2,
            price_cents: 1000,
          },
        ],
      }),
      v = (await api('products/' + p.id, undefined, 'GET')).variants[0].id;
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const o = await api('orders', {
      customer_id: c.id,
      due_at: day + 'T13:00:00Z',
      items: [{ variant_id: v, quantity: 1 }],
    });
    await api(
      `finance/orders/${o.id}/terms`,
      {
        version: 1,
        terms: {
          mode: 'delivery',
          cycle: 'fixed_days',
          fixed_days: [15, 31],
          base_date: '',
          week_end: 7,
          due_days: null,
        },
      },
      'PUT',
    );
    await api(
      `orders/${o.id}/delivery`,
      { version: 2, delivery_type: 'pickup', courier: 'unassigned' },
      'PUT',
    );
    for (const [i, to] of ['confirmed', 'in_production', 'ready'].entries())
      await api(`orders/${o.id}/status`, { version: 3 + i, to });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(t.url + '/login');
    await page.getByRole('link', { name: 'Entrar com acesso seguro' }).click();
    await expect(
      page.getByRole('heading', { name: 'Hoje', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Recebi R$', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Recebimento rápido' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByLabel('Valor recebido (R$)')).toHaveValue('10,00');
    await sheet.getByRole('button', { name: 'Dinheiro', exact: true }).click();
    await sheet
      .getByRole('button', { name: 'Entregue e recebido', exact: true })
      .click();
    await expect(sheet).toHaveCount(0);
    await expect(page).toHaveURL(t.url + '/gestao');
    await page
      .getByRole('button', {
        name: 'Desfazer entrega e recebimento',
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'desfeitos' }),
    ).toContainText('Entrega e recebimento desfeitos');
    await page.getByRole('button', { name: 'Recebi R$', exact: true }).click();
    await expect(sheet.getByLabel('Valor recebido (R$)')).toHaveValue('10,00');
    await sheet.getByLabel('Valor recebido (R$)').fill('3,00');
    await sheet.getByRole('button', { name: 'Registrar', exact: true }).click();
    await expect(sheet).toHaveCount(0);
    await expect(
      page.getByRole('status').filter({ hasText: 'Recebimento registrado' }),
    ).toBeVisible();
    const account = await api(`finance/customers/${c.id}`, undefined, 'GET');
    expect(account.received_cents).toBe(300);
    expect(account.orders[0].status).toBe('ready');
  } finally {
    await context.close();
    await t.dispose();
  }
});
