import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('R5 cabeçalho compacto e menu acessível', async ({ browser }) => {
  const t = await runtime({ browserHTTP: true, operationsEnabled: true }),
    c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
  try {
    await demoProject(t);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    const header = p.locator('header.compact-header');
    await expect(header).toBeVisible();
    expect((await header.boundingBox()).height).toBeLessThanOrEqual(56);
    await expect(p.locator('.private-brand')).toBeHidden();
    await expect(p.locator('.tour-invite')).toBeHidden();
    await p.getByRole('button', { name: /Abrir menu de/ }).click();
    const menu = p.getByRole('dialog', { name: 'Menu da gestão' });
    await expect(
      menu.getByRole('link', { name: 'Ajuda', exact: true }),
    ).toBeVisible();
    await menu.getByRole('button', { name: 'Conhecer o app' }).click();
    await expect(
      p.getByRole('dialog', { name: 'Passeio guiado' }),
    ).toBeVisible();
    await p.getByRole('button', { name: 'Já sei' }).click();
    await expect(
      p.getByRole('button', { name: /Abrir menu de/ }),
    ).toBeFocused();
  } finally {
    await c.close();
    await t.dispose();
  }
});
