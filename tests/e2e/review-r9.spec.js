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
  } finally {
    await c.close();
    await t.dispose();
  }
});
