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
      create = p.getByRole('link', {
        name: 'Cadastrar novo cliente',
        exact: true,
      }),
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

// D1 efêmero; nenhum serviço de endereço externo ou dado real.
test('Cancelar modelo e descartar localização não grava alterações', async ({
  browser,
}) => {
  test.setTimeout(60000);
  const t = await runtime({
    browserHTTP: true,
    fieldEnabled: true,
    mobileEnabled: true,
    p1Enabled: true,
    financeEnabled: true,
  });
  const ctx = await browser.newContext({
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, customer } = await demoProject(t);
    const before = await call('message-templates', undefined, 'GET');
    const p = await ctx.newPage();
    let writes = 0;
    p.on('request', (r) => {
      if (r.method() === 'PUT') writes++;
    });
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/mensagens');
    await p
      .getByRole('button', { name: 'Editar modelo Confirmação', exact: true })
      .click();
    await p.getByLabel('Texto do modelo').fill('Texto DEMONSTRAÇÃO não salvo');
    await p
      .getByRole('button', { name: 'Cancelar edição', exact: true })
      .click();
    await expect(p.getByLabel('Texto do modelo')).toHaveCount(0);
    await p
      .getByRole('button', { name: 'Editar modelo Confirmação', exact: true })
      .click();
    await expect(p.getByLabel('Texto do modelo')).toHaveValue(
      before.find((t) => t.kind === 'confirmation').content,
    );
    // O cancelamento também funciona quando o texto foi todo apagado.
    await p.getByLabel('Texto do modelo').fill('');
    await p
      .getByRole('button', { name: 'Cancelar edição', exact: true })
      .click();
    expect(await call('message-templates', undefined, 'GET')).toEqual(before);
    const fieldBefore = await call('field/context', undefined, 'GET');
    await p.goto(t.url + '/gestao/clientes/' + customer + '/local');
    await expect(
      p.getByRole('link', { name: 'Voltar para Clientes', exact: true }),
    ).toBeVisible();
    const street = p.getByLabel('Rua/Avenida', { exact: true });
    await street.fill('Rua DEMONSTRAÇÃO não salva');
    await p
      .getByRole('button', { name: 'Descartar alterações', exact: true })
      .click();
    await expect(street).toHaveValue('');
    await expect(
      p.getByRole('button', { name: 'Descartar alterações', exact: true }),
    ).toHaveCount(0);
    expect(await call('field/context', undefined, 'GET')).toEqual(fieldBefore);
    expect(writes).toBe(0);
    await p
      .getByRole('link', { name: 'Voltar para Clientes', exact: true })
      .click();
    await expect(p).toHaveURL(/\/gestao\/clientes$/);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});

test('Folha de cliente contém a rolagem e busca não passa para outro cadastro', async ({
  browser,
  browserName,
  isMobile,
}) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
    fieldEnabled: true,
    mobileEnabled: true,
    p1Enabled: true,
    financeEnabled: true,
    placesProvider: true,
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, customer } = await demoProject(t);
    const second = (await call('customers', { name: 'Outro DEMONSTRAÇÃO' })).id;
    for (let n = 0; n < 12; n++)
      await call('customers', { name: 'Local DEMONSTRAÇÃO ' + n });
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes');
    await p
      .getByRole('button', {
        name: 'Editar Cliente DEMONSTRAÇÃO P1',
        exact: true,
      })
      .click();
    const sheet = p.getByRole('dialog', {
      name: 'Editar cliente',
      exact: true,
    });
    await sheet.getByText('Endereço e Instagram', { exact: true }).click();
    const search = sheet.getByRole('searchbox', {
      name: 'Buscar endereço ou estabelecimento',
    });
    await search.fill('Local DEMONSTRAÇÃO');
    await expect(
      sheet.getByRole('list', { name: 'Sugestões de endereço' }),
    ).toBeVisible();
    await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await p
      .getByRole('button', { name: 'Editar Outro DEMONSTRAÇÃO', exact: true })
      .click();
    await sheet.getByText('Endereço e Instagram', { exact: true }).click();
    await expect(search).toHaveValue('');
    await expect(
      sheet.getByRole('list', { name: 'Sugestões de endereço' }),
    ).toHaveCount(0);
    await search.fill('Outro DEMONSTRAÇÃO');
    await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await p.getByRole('button', { name: 'Novo cliente', exact: true }).click();
    const fresh = p.getByRole('dialog', { name: 'Novo cliente', exact: true });
    await fresh.getByText('Endereço e Instagram', { exact: true }).click();
    await expect(
      fresh.getByRole('searchbox', {
        name: 'Buscar endereço ou estabelecimento',
      }),
    ).toHaveValue('');
    await expect(
      fresh.getByRole('list', { name: 'Sugestões de endereço' }),
    ).toHaveCount(0);
    const y = await p.evaluate(() => window.scrollY);
    expect(
      await p.evaluate(
        () => getComputedStyle(document.documentElement).overflowY,
      ),
    ).toBe('hidden');
    await fresh.locator(':scope > .sheet-body').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await fresh.getByRole('button', { name: 'Cancelar', exact: true }).focus();
    // Wheel não existe no protocolo do WebKit móvel. PageDown tenta rolar
    // no limite da folha em todos os projetos, sem simular um gesto sem efeito.
    await p.keyboard.press('PageDown');
    if (!(browserName === 'webkit' && isMobile)) {
      await fresh.hover();
      await p.mouse.wheel(0, 1000);
    }
    await p.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    expect(await p.evaluate(() => window.scrollY)).toBe(y);
    await fresh.getByRole('button', { name: 'Fechar', exact: true }).click();
    // No editor dedicado a chave também muda ao trocar o cliente.
    await p.goto(t.url + '/gestao/clientes/' + customer + '/local');
    await p
      .getByRole('searchbox', { name: 'Buscar endereço ou estabelecimento' })
      .fill('Busca DEMONSTRAÇÃO');
    await p
      .getByRole('link', { name: 'Voltar para Clientes', exact: true })
      .click();
    const card = p.locator('article').filter({
      has: p.getByRole('heading', {
        name: 'Outro DEMONSTRAÇÃO',
        exact: true,
      }),
    });
    await card.getByText('Conta e localização', { exact: true }).click();
    await card
      .getByRole('link', { name: 'Localização, foto e Instagram' })
      .click();
    await expect(p).toHaveURL(new RegExp(second + '/local$'));
    await expect(
      p.getByRole('searchbox', { name: 'Buscar endereço ou estabelecimento' }),
    ).toHaveValue('');
    await expect(
      p.getByRole('list', { name: 'Sugestões de endereço' }),
    ).toHaveCount(0);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
