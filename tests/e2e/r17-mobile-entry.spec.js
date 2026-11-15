import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

// Fixtures DEMONSTRAÇÃO; testa posição útil no celular e os três consumidores das iniciais.
test('Novo pedido prioriza busca/cadastro e preserva iniciais com Voltar visível', async ({
  browser,
}) => {
  test.setTimeout(60000);
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    fieldEnabled: true,
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
    const { call, operator } = await demoProject(t);
    const display = 'Equipe do TESTE DEMONSTRAÇÃO',
      customerName = 'Loja do EXEMPLO DEMONSTRAÇÃO';
    await call(
      'field/profile',
      { display_name: display, version: 0 },
      'PUT',
      operator,
    );
    await call('customers', { name: customerName });
    for (let n = 0; n < 14; n++)
      await call('customers', {
        name: 'Cliente DEMONSTRAÇÃO ' + String(n).padStart(2, '0'),
      });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    const back = p
      .locator('#mobile-header-actions')
      .getByRole('button', { name: 'Voltar uma etapa', exact: true });
    await expect(back).toBeVisible();
    const initials = p.locator('.profile-menu-trigger .profile-initials');
    await expect(initials).toHaveText('ET');
    await expect(initials).toBeVisible();
    const search = p.getByRole('searchbox', {
        name: 'Buscar cliente',
        exact: true,
      }),
      create = p.getByRole('link', { name: 'Cadastrar cliente', exact: true }),
      tiles = p.locator('.customer-tiles .customer-tile');
    await expect(tiles).toHaveCount(16);
    await expect(search).toBeInViewport();
    await expect(create).toBeInViewport();
    const first = await tiles.first().boundingBox(),
      s = await search.boundingBox(),
      b = await create.boundingBox();
    expect(s.y + s.height).toBeLessThanOrEqual(first.y);
    expect(b.y + b.height).toBeLessThanOrEqual(first.y);
    await search.fill(customerName);
    await expect(tiles).toHaveCount(1);
    await expect(tiles.locator('.initial-avatar').last()).toHaveText('LE');
    await tiles.click();
    await expect(p.locator('.totem-customer')).toHaveText(customerName);
    await expect(back).toBeVisible();
    await expect(initials).toBeVisible();
    // D1 efêmero com imagem sintética inválida: exercício real de onError, sem interceptar SW ou relaxar CSP.
    const user = (await call('session', undefined, 'GET', operator)).user_id;
    await t.db
      .prepare(
        'INSERT INTO profile_photos(organization_id,id,photo,version,mutation_id) VALUES(?,?,?,1,?)',
      )
      .bind(t.org, user, new Uint8Array([0]), crypto.randomUUID())
      .run();
    await p.reload();
    await expect(back).toBeVisible();
    const fallback = p.locator('.profile-menu-trigger span.staff-avatar');
    await expect(fallback).toHaveText('ET');
    await expect(fallback).toBeVisible();
    await p
      .getByRole('button', { name: 'Abrir menu de ' + display, exact: true })
      .click();
    await expect(
      p.getByRole('dialog', { name: 'Menu da gestão' }),
    ).toBeVisible();
  } finally {
    await c.close();
    await t.dispose();
  }
});
