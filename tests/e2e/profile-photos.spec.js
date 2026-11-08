import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('R6-5 foto privada com prévia/cancelamento, avatar e remoção da equipe', async ({
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
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, operator } = await demoProject(t);
    await call(
      'field/profile',
      { display_name: 'Equipe DEMONSTRAÇÃO', version: 0 },
      'PUT',
    );
    await call(
      'field/profile',
      { display_name: 'Operador DEMONSTRAÇÃO', version: 0 },
      'PUT',
      operator,
    );
    const person = (await call('session', undefined, 'GET', operator)).user_id;
    const otherPhoto = await sharp({
      create: { width: 64, height: 64, channels: 3, background: '#321d10' },
    })
      .webp()
      .toBuffer();
    await call(
      'field/profile-photos/' + person,
      { version: 0, base64: otherPhoto.toString('base64') },
      'PUT',
      operator,
    );
    const file = {
      name: 'retrato-demonstracao.png',
      mimeType: 'image/png',
      buffer: await sharp({
        create: { width: 800, height: 400, channels: 3, background: '#b8915b' },
      })
        .png()
        .toBuffer(),
    };
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await expect(
      p.getByRole('heading', { name: 'Entregas do dia', exact: true }),
    ).toBeVisible();
    await p
      .getByRole('button', {
        name: 'Abrir menu de Equipe DEMONSTRAÇÃO',
        exact: true,
      })
      .click();
    await p.getByRole('link', { name: 'Trocar foto', exact: true }).click();
    const panel = p.locator('#foto-perfil');
    await expect(
      panel.getByLabel('Tirar foto de perfil', { exact: true }),
    ).toHaveAttribute('capture', 'user');
    await panel
      .getByLabel('Escolher foto da galeria', { exact: true })
      .setInputFiles(file);
    const preview = panel.getByAltText('Prévia da sua foto', { exact: true });
    await expect(preview).toBeVisible();
    expect(
      await preview.evaluate((img) => [img.naturalWidth, img.naturalHeight]),
    ).toEqual([256, 256]);
    await panel
      .getByRole('button', { name: 'Cancelar foto', exact: true })
      .click();
    await expect(preview).toHaveCount(0);
    const own = (await call('session', undefined, 'GET')).user_id;
    expect(
      (
        await t.request('field/profile-photos/' + own, {
          cookie: await t.login('owner@example.test'),
        })
      ).status,
    ).toBe(404);
    await panel
      .getByLabel('Escolher foto da galeria', { exact: true })
      .setInputFiles(file);
    await panel
      .getByRole('button', { name: 'Salvar foto de perfil', exact: true })
      .click();
    await expect(panel.getByRole('status')).toContainText('Foto atualizada.');
    const avatar = p.locator('.profile-menu-trigger img');
    await expect(avatar).toBeVisible();
    await expect
      .poll(() => avatar.evaluate((img) => img.naturalWidth))
      .toBe(256);
    if (
      process.env.R6_PHOTO_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    )
      await panel.screenshot({
        path: 'docs/colaboracao/capturas/r6-depois-foto-perfil.png',
      });
    await panel.getByText('Fotos da equipe', { exact: true }).click();
    await panel
      .getByRole('button', {
        name: 'Remover foto de Operador DEMONSTRAÇÃO',
        exact: true,
      })
      .click();
    await expect(panel.getByRole('status')).toContainText('Foto removida.');
    expect(
      (await call('field/context', undefined, 'GET')).staff.find(
        (s) => s.id === person,
      ).has_photo,
    ).toBe(0);
    await panel
      .getByRole('button', { name: 'Remover minha foto', exact: true })
      .click();
    await expect(avatar).toHaveCount(0);
    await expect(p.locator('.profile-initials')).toContainText('ED');
  } finally {
    await c.close();
    await t.dispose();
  }
});
