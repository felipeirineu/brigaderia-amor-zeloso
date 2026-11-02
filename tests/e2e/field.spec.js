import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('R4 localização por toque, foto privada, perfil e despesa após entrega', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    fieldEnabled: true,
    placesProvider: true,
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['geolocation'],
    geolocation: { latitude: 0, longitude: 0 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, customer, variant, operator } = await demoProject(t);
    const place = {
      name: 'Local DEMONSTRAÇÃO',
      address: 'Endereço DEMONSTRAÇÃO',
      neighborhood: '',
      latitude: 0,
      longitude: 0,
      instagram: '@perfil.demonstracao',
    };
    await call('field/company', { data: place, version: 0 }, 'PUT');
    await call(
      'field/customers/' + customer,
      { data: place, version: 0 },
      'PUT',
    );
    const now = new Date().toISOString();
    const id = (
      await call('mobile/orders', {
        customer_id: customer,
        due_at: now,
        items: [{ variant_id: variant, quantity: 2 }],
        delivery: {
          delivery_type: 'delivery',
          delivery_address: place.address,
          courier: 'partner',
        },
      })
    ).id;
    let order = await call('orders/' + id, undefined, 'GET');
    for (const to of ['in_production', 'ready', 'out_for_delivery']) {
      await call('orders/' + id + '/status', { version: order.version, to });
      order = await call('orders/' + id, undefined, 'GET');
    }
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/preferencias');
    await p
      .getByLabel('Nome de exibição', { exact: true })
      .fill('Entregas DEMONSTRAÇÃO');
    await p.getByRole('button', { name: 'Salvar nome de exibição' }).click();
    await expect(
      p.getByText('Nome atualizado.', { exact: true }),
    ).toBeVisible();
    await p.goto(t.url + '/gestao/clientes');
    await p.getByRole('button', { name: 'Novo cliente', exact: true }).click();
    await p.getByLabel('Nome', { exact: true }).fill('Novo local DEMONSTRAÇÃO');
    await p.getByLabel('Telefone', { exact: true }).fill('11900000001');
    await p.getByText('Endereço e Instagram', { exact: true }).click();
    await p
      .getByLabel('Endereço do estabelecimento', { exact: true })
      .fill('Destino DEMONSTRAÇÃO');
    await p
      .getByRole('button', { name: 'Usar minha localização', exact: true })
      .click();
    await expect(p.getByLabel('Latitude', { exact: true })).toHaveValue('0');
    const buffer = await sharp({
      create: { width: 400, height: 200, channels: 3, background: '#321d10' },
    })
      .png()
      .toBuffer();
    await p
      .getByLabel('Galeria do novo cliente', { exact: true })
      .setInputFiles({
        name: 'fachada-demonstracao.png',
        mimeType: 'image/png',
        buffer,
      });
    await expect(
      p.getByText('Foto pronta. Será enviada ao salvar o cliente.', {
        exact: true,
      }),
    ).toBeVisible();
    await p
      .getByRole('button', { name: 'Salvar cliente', exact: true })
      .click();
    const card = p.locator('article').filter({
      has: p.getByRole('heading', {
        name: 'Novo local DEMONSTRAÇÃO',
        exact: true,
      }),
    });
    await expect(card).toBeVisible();
    await expect(
      p.getByText('Cliente e foto salvos.', { exact: true }),
    ).toBeVisible();
    await expect(
      card
        .getByRole('button', {
          name: 'Editar Novo local DEMONSTRAÇÃO',
          exact: true,
        })
        .locator('img'),
    ).toBeVisible();
    await card.getByText('Conta e localização', { exact: true }).click();
    await card
      .getByRole('link', { name: 'Localização, foto e Instagram' })
      .click();
    await p.getByLabel('Escolher da galeria', { exact: true }).setInputFiles({
      name: 'fachada-demonstracao.png',
      mimeType: 'image/png',
      buffer,
    });
    await expect(
      p.getByText('Foto comprimida salva.', { exact: true }),
    ).toBeVisible();
    await p.goto(t.url + '/gestao');
    await expect(
      p.getByRole('button', {
        name: 'Abrir menu de Entregas DEMONSTRAÇÃO',
        exact: true,
      }),
    ).toBeVisible();
    await expect(p.locator('.order-card')).not.toContainText(
      'Entregas DEMONSTRAÇÃO',
    );
    const uber = p.getByRole('link', { name: 'Abrir Uber', exact: true });
    await expect(uber).toHaveAttribute('href', /dropoff%5Blatitude%5D=0/);
    await expect(p.getByText(/km em linha reta/).first()).toBeVisible();
    await p
      .getByRole('button', { name: 'Marcar entregue', exact: true })
      .click();
    const sheet = p.getByRole('dialog', {
      name: 'Quanto custou a corrida?',
      exact: true,
    });
    await expect(sheet).toBeVisible();
    await sheet.getByLabel('Valor pago (R$)', { exact: true }).fill('1000');
    await sheet.getByLabel('Valor pago (R$)', { exact: true }).press('Enter');
    await sheet
      .getByRole('button', { name: 'Registrar despesa paga', exact: true })
      .click();
    await expect(sheet).not.toBeVisible();
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const expenses = await call(
      `p1/expenses?from=${day}&to=${day}`,
      undefined,
      'GET',
      operator,
    );
    expect(expenses.spent_cents).toBe(1000);
    const caches = await p.evaluate(async () => {
      const keys = await Promise.all(
        (await window.caches.keys()).map(async (k) =>
          (await (await window.caches.open(k)).keys()).map(
            (r) => new URL(r.url).pathname,
          ),
        ),
      );
      return keys.flat();
    });
    expect(caches.some((p) => p.startsWith('/api/'))).toBe(false);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
