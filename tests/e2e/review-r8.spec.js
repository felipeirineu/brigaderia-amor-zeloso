import { fortalezaDay, shiftDay } from '../../shared/workday.ts';
import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { reviewProject } from '../helpers/review-r5-project.mjs';
test('R8 cartão compacto, quatro atalhos e entrega validada no servidor', async ({
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
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, customer, variants } = await reviewProject(t);
    const profile = await t.request('field/profile', {
      cookie: await t.login('operator@example.test'),
      method: 'PUT',
      key: crypto.randomUUID(),
      data: { display_name: 'Equipe DEMONSTRAÇÃO', version: 0 },
    });
    expect(profile.ok).toBe(true);
    let order = (await call('orders', undefined, 'GET'))[0];
    for (const to of ['in_production', 'ready', 'out_for_delivery']) {
      await call(`orders/${order.id}/status`, { version: order.version, to });
      order = await call('orders/' + order.id, undefined, 'GET');
    }
    await call('mobile/orders', {
      customer_id: customer,
      due_at: shiftDay(fortalezaDay(), 1) + 'T12:00:00Z',
      items: [{ variant_id: variants[0].id, quantity: 1 }],
      delivery: {
        delivery_type: 'delivery',
        delivery_address: 'Endereço DEMONSTRAÇÃO',
        courier: 'partner',
      },
    });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    const avatar = p.getByRole('button', {
      name: 'Abrir menu de Equipe DEMONSTRAÇÃO',
      exact: true,
    });
    await expect(avatar).toHaveText('ED');
    await avatar.click();
    await expect(
      p.getByRole('dialog', { name: 'Menu da gestão' }),
    ).toContainText('Operador');
    if (process.env.R8_CAPTURE === '1' && info.project.name === 'webkit-mobile')
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r8-depois-perfil.png',
      });
    await p.getByRole('button', { name: 'Fechar menu', exact: true }).click();
    await p.getByRole('button', { name: 'Escolher dia', exact: true }).click();
    const calendar = p.getByRole('dialog', {
      name: 'Escolher dia de trabalho',
      exact: true,
    });
    await expect(
      calendar.getByRole('button', { name: /, 1 entregas/ }).first(),
    ).toBeVisible();
    if (process.env.R8_CAPTURE === '1' && info.project.name === 'webkit-mobile')
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r8-depois-calendario.png',
      });
    await calendar.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await expect(p.locator('.compact-title')).toHaveText('Agenda');
    await expect(
      p.getByRole('button', { name: 'Marcar entregue', exact: true }),
    ).toHaveCount(0);
    await expect(p.locator('.order-card')).toContainText('Agendada');
    await expect(
      p.getByRole('button', { name: 'Voltar para hoje', exact: true }),
    ).toBeVisible();
    await p
      .getByRole('button', { name: 'Voltar para hoje', exact: true })
      .click();
    await expect(p.locator('.compact-title')).toHaveText('Hoje');
    const card = p.locator('.order-card').first();
    await expect(card).toBeVisible();
    await expect(card.locator('.delivery-icon-row .az-button')).toHaveCount(4);
    await expect(card.locator('.delivery-flavor img')).toBeVisible();
    await expect(
      card.getByRole('button', { name: 'Marcar entregue', exact: true }),
    ).toBeVisible();
    expect(
      await card
        .getByRole('button', { name: 'Marcar entregue', exact: true })
        .evaluate((e) => getComputedStyle(e).backgroundColor),
    ).toBe('rgb(43, 122, 73)');
    if (process.env.R8_CAPTURE === '1' && info.project.name === 'webkit-mobile')
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r8-depois-hoje.png',
      });
    await card.getByRole('button', { name: 'Mapa', exact: true }).click();
    const map = p.getByRole('dialog', { name: /Rota até/ });
    await expect(map).toBeVisible();
    await expect(
      map.getByRole('link', { name: 'Google Maps', exact: true }),
    ).toHaveAttribute(
      'href',
      /destination=Endere%C3%A7o%20DEMONSTRA%C3%87%C3%83O&travelmode=driving/,
    );
    await expect(
      map.getByRole('link', { name: 'Mapas do iPhone', exact: true }),
    ).toHaveAttribute('href', /dirflg=d/);
    if (process.env.R8_CAPTURE === '1' && info.project.name === 'webkit-mobile')
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r8-depois-mapa.png',
      });
    await map.getByRole('button', { name: 'Fechar mapa', exact: true }).click();
    await expect(
      card.getByRole('button', { name: 'Mapa', exact: true }),
    ).toBeFocused();
    await card
      .getByRole('button', { name: 'Marcar entregue', exact: true })
      .click();
    await expect(
      p.getByRole('dialog', { name: 'Quanto custou a corrida?', exact: true }),
    ).toBeVisible();
    expect((await call('orders/' + order.id, undefined, 'GET')).status).toBe(
      'delivered',
    );
  } finally {
    await c.close();
    await t.dispose();
  }
});
