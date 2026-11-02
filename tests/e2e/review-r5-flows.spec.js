import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { reviewProject } from '../helpers/review-r5-project.mjs';
test('R5 telas móveis com ações compartilhadas', async ({
  browser,
}, testInfo) => {
  const t = await runtime({
      browserHTTP: true,
      financeEnabled: true,
      p1Enabled: true,
      mobileEnabled: true,
      fieldEnabled: true,
      toolsEnabled: true,
    }),
    c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
  try {
    await reviewProject(t);
    const p = await c.newPage();
    const capture = async (name) => {
      if (
        (process.env.R5_CAPTURE === '1' || process.env.R8_CAPTURE === '1') &&
        testInfo.project.name === 'webkit-mobile'
      )
        await p.screenshot({
          path: `docs/colaboracao/capturas/${process.env.R8_CAPTURE ? 'r8' : 'r5'}-depois-${name}.png`,
        });
    };
    await p.goto(t.url + '/api/access/start');
    await expect(p.locator('.order-card')).toBeVisible();
    await expect(p.getByLabel('Dia de trabalho no celular')).toBeVisible();
    expect(
      (await p.locator('.order-card').first().boundingBox()).y,
    ).toBeLessThanOrEqual(140);
    const reminder = p.getByRole('heading', { name: 'Lembretes até este dia' });
    if (await reminder.count())
      expect((await reminder.boundingBox()).y).toBeGreaterThan(
        (await p.locator('.order-card').first().boundingBox()).y,
      );
    await capture('hoje');
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO R5', exact: true })
      .click();
    await expect(p.locator('.flavor-card')).toHaveCount(5);
    await expect(p.locator('.flavor-add').first()).toBeEnabled();
    await expect(p.locator('.flavor-add').first()).toHaveAccessibleName(
      /Tradicional/,
    );
    await expect(
      p.getByRole('navigation', { name: 'Atalhos do celular' }),
    ).toBeHidden();
    await expect(p.locator('.totem-bar')).not.toContainText('0,00');
    const footer = await p.locator('.totem-bar').boundingBox();
    for (const card of await p.locator('.flavor-card').all()) {
      const box = await card.boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(footer.y);
    }
    await capture('sabores');
    await p.locator('.flavor-add').first().click();
    await p.getByRole('button', { name: /Revisar pedido/ }).click();
    await expect(
      p.getByRole('heading', { name: 'Revise seu pedido' }),
    ).toBeVisible();
    await capture('revisar');
    for (const [path, name] of [
      ['clientes', 'clientes'],
      ['mais', 'mais'],
      ['financeiro', 'financeiro'],
    ]) {
      await p.goto(t.url + '/gestao/' + path);
      await expect(
        p.getByRole('heading', {
          name:
            path === 'mais'
              ? 'Mais'
              : path === 'clientes'
                ? 'Clientes'
                : 'Financeiro',
          exact: true,
        }),
      ).toBeVisible();
      expect(
        (await p.locator('.mobile-context-title').boundingBox()).height,
      ).toBe(1);
      if (path === 'clientes')
        await expect(
          p.getByRole('button', {
            name: 'Editar Cliente DEMONSTRAÇÃO R5',
            exact: true,
          }),
        ).toBeVisible();
      await capture(name);
      if (path === 'clientes') {
        await expect(p.getByRole('dialog')).toBeHidden();
        await expect(p.getByLabel('Buscar por nome')).toBeVisible();
        await expect(
          p.locator('summary:visible').first().locator('.disclosure-chevron'),
        ).toBeVisible();
        expect(
          await p
            .locator('summary:visible')
            .first()
            .evaluate((e) => getComputedStyle(e).listStyleType),
        ).toBe('none');
        await p
          .getByRole('button', { name: 'Novo cliente', exact: true })
          .click();
        const sheet = p.getByRole('dialog', {
          name: 'Novo cliente',
          exact: true,
        });
        await expect(sheet).toBeVisible();
        const locate = await sheet
          .getByRole('button', { name: 'Usar minha localização', exact: true })
          .boundingBox();
        const field = await sheet
          .getByLabel('Nome', { exact: true })
          .boundingBox();
        expect(locate.y).toBeLessThan(field.y);
        await expect(
          sheet.getByRole('button', { name: 'Tirar foto', exact: true }),
        ).toBeVisible();
        await expect(
          sheet.getByLabel('Câmera do novo cliente'),
        ).toHaveAttribute('capture', 'environment');
        await capture('cliente-formulario');
        await sheet
          .getByLabel('Nome', { exact: true })
          .fill('Rascunho DEMONSTRAÇÃO');
        await p.keyboard.press('Escape');
        await expect(sheet).toBeHidden();
        await expect(
          p.getByRole('button', {
            name: 'Editar Rascunho DEMONSTRAÇÃO',
            exact: true,
          }),
        ).toHaveCount(0);
        await p
          .getByRole('button', {
            name: 'Editar Cliente DEMONSTRAÇÃO R5',
            exact: true,
          })
          .click();
        await expect(
          p.getByRole('dialog', { name: 'Editar cliente', exact: true }),
        ).toBeVisible();
        await expect(p.getByLabel('Nome', { exact: true })).toHaveValue(
          'Cliente DEMONSTRAÇÃO R5',
        );
        await p.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await p.goto(t.url + '/gestao/clientes?novo=1');
        await expect(
          p.getByRole('dialog', { name: 'Novo cliente', exact: true }),
        ).toBeVisible();
        await p.getByRole('button', { name: 'Fechar', exact: true }).click();
        await expect(p).not.toHaveURL(/novo=1/);
      }
    }
  } finally {
    await c.close();
    await t.dispose();
  }
});
