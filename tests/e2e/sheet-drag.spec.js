import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

// Arrastar a folha para baixo fecha (pelo mesmo "cancel" do Esc); arraste
// curto volta ao lugar; rolar o conteúdo não fecha.
test('folha fecha arrastando para baixo e volta com arraste curto', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    await demoProject(t);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes');
    const sheet = p.getByRole('dialog', { name: 'Novo cliente', exact: true });
    const open = async () => {
      await p
        .getByRole('button', { name: 'Novo cliente', exact: true })
        .click();
      await expect(sheet).toBeVisible();
      await p.waitForTimeout(450); // animação de subida
    };
    const drag = async (distance, steps) => {
      const box = await sheet.boundingBox();
      const x = box.x + box.width / 2,
        y = box.y + 12;
      await p.mouse.move(x, y);
      await p.mouse.down();
      await p.mouse.move(x, y + distance, { steps });
      await p.mouse.up();
    };

    await open();
    await drag(40, 20); // curto e devagar: não fecha
    await p.waitForTimeout(300);
    await expect(sheet).toBeVisible();
    expect(await sheet.evaluate((d) => d.style.transform)).toBe('');

    await drag(220, 10); // longo: fecha
    await expect(sheet).toBeHidden();

    await open();
    await p.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  } finally {
    await c.close();
    await t.dispose();
  }
});
