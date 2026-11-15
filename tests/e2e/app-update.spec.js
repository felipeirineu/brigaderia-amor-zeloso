import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

// A gestão registra o service worker sozinha (antes só as telas de
// demonstração faziam), para o aviso "Atualizar" poder aparecer no app
// instalado. Sem versão nova, nenhum aviso é mostrado.
test('gestão registra o atualizador do app sem aviso falso', async ({
  browser,
}) => {
  const t = await runtime({ browserHTTP: true, mobileEnabled: true });
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
    await p.goto(t.url + '/gestao');
    await expect(p.locator('.today-greeting')).toBeVisible();
    await expect
      .poll(() =>
        p.evaluate(async () =>
          Boolean(await navigator.serviceWorker.getRegistration()),
        ),
      )
      .toBe(true);
    await expect(p.locator('.app-update')).toHaveCount(0);
  } finally {
    await c.close();
    await t.dispose();
  }
});
