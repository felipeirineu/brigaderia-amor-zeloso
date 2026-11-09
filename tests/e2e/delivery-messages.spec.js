import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { reviewProject } from '../helpers/review-r5-project.mjs';
test('R6-8 navegação volta ao topo, folha preserva posição e WhatsApp é assistido', async ({
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
    const operator = await t.login('operator@example.test');
    expect(
      (
        await t.request('field/profile', {
          cookie: operator,
          method: 'PUT',
          key: crypto.randomUUID(),
          data: { display_name: 'Operadora DEMONSTRAÇÃO', version: 0 },
        })
      ).ok,
    ).toBe(true);
    for (let i = 0; i < 7; i++)
      await call('mobile/orders', {
        customer_id: customer,
        due_at: new Date().toISOString(),
        items: [{ variant_id: variants[0].id, quantity: 1 }],
        delivery: {
          delivery_type: 'delivery',
          delivery_address: 'Endereço DEMONSTRAÇÃO',
          courier: 'partner',
        },
      });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await expect(p.locator('.order-card')).toHaveCount(8);
    const nav = p.getByRole('navigation', { name: 'Atalhos do celular' });
    await p.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
    );
    expect(await p.evaluate(() => scrollY)).toBeGreaterThan(300);
    await nav.getByRole('link', { name: 'Clientes', exact: true }).click();
    await expect.poll(() => p.evaluate(() => scrollY)).toBe(0);
    await nav.getByRole('link', { name: 'Hoje', exact: true }).click();
    const card = p.locator('.order-card').last();
    await card
      .getByRole('button', { name: 'WhatsApp', exact: true })
      .scrollIntoViewIfNeeded();
    const before = await p.evaluate(() => scrollY);
    await card.getByRole('button', { name: 'WhatsApp', exact: true }).click();
    const sheet = p.getByRole('dialog', {
      name: 'WhatsApp · Cliente DEMONSTRAÇÃO R5',
      exact: true,
    });
    await expect(
      sheet.getByLabel('Confira e edite antes de abrir'),
    ).toHaveValue(/saiu para entrega/);
    await expect(
      sheet.getByLabel('Confira e edite antes de abrir'),
    ).toHaveValue(/Operadora DEMONSTRAÇÃO/);
    expect(await p.evaluate(() => scrollY)).toBe(before);
    await sheet.getByRole('button', { name: 'Chegando', exact: true }).click();
    await expect(
      sheet.getByLabel('Confira e edite antes de abrir'),
    ).toHaveValue(/Estamos chegando/);
    await sheet.getByRole('button', { name: 'Entregue', exact: true }).click();
    await expect(
      sheet.getByLabel('Confira e edite antes de abrir'),
    ).toHaveValue(/Registramos a entrega/);
    const text =
      'Mensagem editada DEMONSTRAÇÃO & teste +\nOperadora DEMONSTRAÇÃO';
    await sheet.getByLabel('Confira e edite antes de abrir').fill(text);
    const href = await sheet
      .getByRole('link', { name: 'Abrir no WhatsApp', exact: true })
      .getAttribute('href');
    expect(new URL(href).hostname).toBe('wa.me');
    expect(new URL(href).searchParams.get('text')).toBe(text);
    await sheet
      .getByRole('button', {
        name: 'Marcar contato realizado (opcional)',
        exact: true,
      })
      .click();
    await expect(sheet.getByRole('status')).toContainText(
      'Sem comprovação de envio',
    );
    await sheet
      .getByRole('button', {
        name: 'Marcar contato realizado (opcional)',
        exact: true,
      })
      .click();
    expect(
      (await t.db.prepare('SELECT COUNT(*) n FROM contact_events').first()).n,
    ).toBe(1);
    await sheet.getByRole('button', { name: 'Cobrança', exact: true }).click();
    await expect(sheet.getByRole('alert')).toContainText('Não há saldo');
    await expect(
      sheet.getByRole('link', { name: 'Abrir no WhatsApp', exact: true }),
    ).toHaveCount(0);
    await sheet.getByRole('button', { name: 'A caminho', exact: true }).click();
    await expect(
      sheet.getByLabel('Confira e edite antes de abrir'),
    ).toHaveValue(/saiu para entrega/);
    if (
      process.env.R6_MESSAGE_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    )
      await sheet.screenshot({
        path: 'docs/colaboracao/capturas/r6-depois-whatsapp-cartao.png',
      });
    await sheet
      .getByRole('button', { name: 'Fechar WhatsApp', exact: true })
      .click();
    await expect.poll(() => p.evaluate(() => scrollY)).toBe(before);
    expect(
      (await call('orders', undefined, 'GET')).every(
        (o) => o.status === 'confirmed',
      ),
    ).toBe(true);
    expect(
      (await t.db.prepare('SELECT COUNT(*) n FROM payment_events').first()).n,
    ).toBe(0);
  } finally {
    await c.close();
    await t.dispose();
  }
});
