import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { reviewProject } from '../helpers/review-r5-project.mjs';
const capture = async (page, name, info) => {
  if (process.env.R9_CAPTURE === '1' && info.project.name === 'webkit-mobile')
    await page.screenshot({
      path: `docs/colaboracao/capturas/r9-depois-${name}.png`,
    });
};
test('R9 calendário sem zeros e cabeçalho alinhado', async ({
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
    await reviewProject(t);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.getByRole('button', { name: 'Escolher dia', exact: true }).click();
    const sheet = p.getByRole('dialog', {
      name: 'Escolher dia de trabalho',
      exact: true,
    });
    await expect(sheet.locator('.calendar-grid small')).toHaveCount(1);
    await expect(sheet.locator('.calendar-grid small')).toHaveText(['1']);
    const title = await sheet.locator('.calendar-month h2').textContent();
    expect(title).toMatch(/^[A-ZÁÉÍÓÚÂÊÔ][a-zçáéíóúâêôãõ]+ de \d{4}$/);
    expect(
      await sheet
        .locator('.calendar-month h2')
        .evaluate((e) => getComputedStyle(e).textTransform),
    ).toBe('none');
    const weekdays = await sheet.locator('.calendar-weekdays').boundingBox(),
      grid = await sheet.locator('.calendar-grid').boundingBox();
    expect(weekdays.width).toBeCloseTo(grid.width, 0);
    await capture(p, 'calendario', info);
    await sheet
      .getByRole('button', { name: 'Fechar calendário', exact: true })
      .click();
    for (const path of [
      'agenda',
      'relatorios',
      'lembretes',
      'despesas',
      'fichas',
      'insumos',
      'compras',
      'ajuda',
      'preferencias',
      'recorrentes',
      'produtos',
      'mensagens',
      'deslocamentos',
    ]) {
      await p.goto(t.url + '/gestao/' + path);
      const heading = p.locator('h1');
      await expect(heading).toHaveClass(/mobile-context-title/);
      expect((await heading.boundingBox()).height).toBe(1);
      if (['agenda', 'relatorios'].includes(path)) await capture(p, path, info);
    }
    await p.goto(t.url + '/gestao');
    const before = p.url();
    await p.getByRole('button', { name: 'Novo lembrete', exact: true }).click();
    const reminder = p.getByRole('dialog', {
      name: 'Novo lembrete',
      exact: true,
    });
    await expect(reminder).toBeVisible();
    await reminder
      .getByLabel('Título do lembrete', { exact: true })
      .fill('Retornar DEMONSTRAÇÃO R9');
    await capture(p, 'novo-lembrete', info);
    await reminder
      .getByRole('button', { name: 'Salvar lembrete', exact: true })
      .click();
    await expect(reminder).toBeHidden();
    expect(p.url()).toBe(before);
    await expect(
      p.getByRole('heading', { name: 'Retornar DEMONSTRAÇÃO R9', exact: true }),
    ).toBeVisible();
    await p.getByRole('button', { name: 'Novo lembrete', exact: true }).click();
    await p
      .getByRole('dialog', { name: 'Novo lembrete', exact: true })
      .getByLabel('Título do lembrete', { exact: true })
      .fill('Cancelado DEMONSTRAÇÃO R9');
    await p.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(
      p.getByRole('heading', {
        name: 'Cancelado DEMONSTRAÇÃO R9',
        exact: true,
      }),
    ).toHaveCount(0);
    await capture(p, 'lembretes-hoje', info);
  } finally {
    await c.close();
    await t.dispose();
  }
});
