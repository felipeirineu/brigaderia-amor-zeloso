import { expect, test } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';

test('gestão privada: login, cadastros, duas sessões, snapshots e logout', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const t = await runtime({ browserHTTP: true, operationsEnabled: false });
  const owner = await browser.newContext({
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  const operator = await browser.newContext({
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const page = await owner.newPage();
    const second = await operator.newPage();
    await page.goto(t.url + '/gestao');
    await expect(
      page.getByRole('heading', { name: 'Gestão restrita' }),
    ).toBeVisible();
    await page.goto(t.url + '/login');
    await page.getByRole('link', { name: 'Entrar com acesso seguro' }).click();
    await expect(
      page.getByRole('heading', { name: 'Visão geral' }),
    ).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Gestão privada' })
      .getByRole('link', { name: 'Clientes', exact: true })
      .click();
    await page
      .getByLabel('Nome', { exact: true })
      .fill('Cliente DEMONSTRAÇÃO E2E');
    await page.getByLabel('Telefone', { exact: true }).fill('(11) 90000-0000');
    await page
      .getByRole('button', { name: 'Salvar cliente', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Cliente DEMONSTRAÇÃO E2E' }),
    ).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Gestão privada' })
      .getByRole('link', { name: 'Produtos', exact: true })
      .click();
    await page
      .getByLabel('Nome do produto', { exact: true })
      .fill('Produto DEMONSTRAÇÃO E2E');
    await page
      .getByLabel('Nome da variante', { exact: true })
      .fill('Caixa fictícia');
    await page.getByLabel('Peso por unidade (g)', { exact: true }).fill('10');
    await page.getByLabel('Unidades por embalagem', { exact: true }).fill('2');
    await page
      .getByLabel('Preço da embalagem (R$)', { exact: true })
      .fill('12,34');
    await page
      .getByRole('button', { name: 'Salvar produto', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Produto DEMONSTRAÇÃO E2E' }),
    ).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Gestão privada' })
      .getByRole('link', { name: 'Pedidos', exact: true })
      .click();
    await page
      .getByRole('combobox', { name: 'Cliente', exact: true })
      .selectOption({ label: 'Cliente DEMONSTRAÇÃO E2E' });
    await page
      .getByLabel('Data e hora combinadas (João Pessoa)', { exact: true })
      .fill('2030-01-01T10:00');
    await page
      .getByRole('combobox', { name: 'Variante', exact: true })
      .selectOption({ index: 1 });
    await page
      .getByLabel('Quantidade de embalagens', { exact: true })
      .fill('2');
    await page
      .getByRole('button', { name: 'Salvar pedido', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Cliente DEMONSTRAÇÃO E2E' }),
    ).toBeVisible();
    await expect(page.locator('.record-list')).toContainText('24,68');
    await second.goto(t.url + '/login');
    await second
      .getByRole('link', { name: 'Entrar com acesso seguro' })
      .click();
    await expect(
      second.getByRole('heading', { name: 'Visão geral' }),
    ).toBeVisible();
    await expect(
      second.getByRole('link', { name: 'Acessos', exact: true }),
    ).toHaveCount(0);
    await second
      .getByRole('navigation', { name: 'Gestão privada' })
      .getByRole('link', { name: 'Pedidos', exact: true })
      .click();
    await expect(
      second.getByRole('heading', { name: 'Cliente DEMONSTRAÇÃO E2E' }),
    ).toBeVisible();
    await second.reload();
    await expect(second.locator('.record-list')).toContainText('24,68');
    await page
      .getByRole('navigation', { name: 'Gestão privada' })
      .getByRole('link', { name: 'Produtos', exact: true })
      .click();
    await page
      .getByRole('button', {
        name: 'Editar Produto DEMONSTRAÇÃO E2E',
        exact: true,
      })
      .click();
    await page
      .getByLabel('Preço da embalagem (R$)', { exact: true })
      .fill('99,99');
    await page
      .getByRole('button', { name: 'Salvar produto', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText('Alteração salva');
    await second.reload();
    await expect(second.locator('.record-list')).toContainText('24,68');
    await second
      .getByRole('navigation', { name: 'Gestão privada' })
      .getByRole('link', { name: 'Visão geral', exact: true })
      .click();
    await expect(second.locator('.panel')).toContainText([
      '1 pedidos em rascunho',
    ]);
    await operator.setOffline(true);
    await expect(
      second.getByRole('heading', { name: 'Sem conexão' }),
    ).toBeVisible();
    await expect(
      second.getByText('Cliente DEMONSTRAÇÃO E2E', { exact: true }),
    ).toHaveCount(0);
    await operator.setOffline(false);
    await expect(
      second.getByRole('heading', { name: 'Visão geral' }),
    ).toBeVisible();
    const cachePaths = await second.evaluate(async () => {
      const names = await caches.keys();
      return (
        await Promise.all(
          names.map(async (name) =>
            (await (await caches.open(name)).keys()).map(
              (r) => new URL(r.url).pathname,
            ),
          ),
        )
      ).flat();
    });
    expect(cachePaths.some((p) => p.startsWith('/api/'))).toBe(false);
    const storage = await second.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    }));
    expect(storage).toEqual({ local: 0, session: 0 });
    expect(t.serverCookies.length).toBeGreaterThan(1);
    expect(
      t.serverCookies.every(
        (cookie) =>
          cookie.startsWith('__Host-session=') &&
          cookie.includes('HttpOnly; Secure; SameSite=Lax'),
      ),
    ).toBe(true);
    const cookie = await operator.cookies(t.url);
    expect(cookie.find((c) => c.name === 'fixture-session')?.httpOnly).toBe(
      true,
    );
    const changed = await page.request.post(t.url + '/api/access/login', {
      headers: {
        Origin: t.url,
        'Cf-Access-Jwt-Assertion': await t.token('other@example.test'),
      },
      data: {},
    });
    expect(changed.status()).toBe(200);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(
      page.getByRole('heading', { name: 'Produto DEMONSTRAÇÃO E2E' }),
    ).toHaveCount(0);
    await expect(page.getByText('Nenhum produto cadastrado.')).toBeVisible();
    await Promise.all([
      second.waitForURL('**/cdn-cgi/access/logout'),
      second.getByRole('button', { name: 'Sair', exact: true }).click(),
    ]);
    await second.goto(t.url + '/gestao');
    await expect(
      second.getByRole('heading', { name: 'Gestão restrita' }),
    ).toBeVisible();
  } finally {
    await owner.close();
    await operator.close();
    await t.dispose();
  }
});
