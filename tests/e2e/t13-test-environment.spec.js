import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { reviewProject } from '../helpers/review-r5-project.mjs';

for (const appEnvironment of ['teste', 'producao'])
  test(`T13 faixa e WhatsApp na sessão de ${appEnvironment}`, async ({
    browser,
  }, info) => {
    const t = await runtime({
      appEnvironment,
      browserHTTP: true,
      financeEnabled: true,
      p1Enabled: true,
      mobileEnabled: true,
      fieldEnabled: true,
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
    try {
      await reviewProject(t);
      const operator = await t.login('operator@example.test');
      const profile = await t.request('field/profile', {
        cookie: operator,
        method: 'PUT',
        key: crypto.randomUUID(),
        data: { display_name: 'Operadora DEMONSTRAÇÃO', version: 0 },
      });
      expect(profile.ok).toBe(true);
      if (appEnvironment === 'teste') {
        const push = await t.request('p1/push/subscriptions', {
          cookie: operator,
          method: 'POST',
          key: crypto.randomUUID(),
          data: {},
        });
        expect(push.status).toBe(503);
      }
      let whatsapp = 0;
      await context.route('https://wa.me/**', (route) => {
        whatsapp++;
        return route.fulfill({
          body: 'DEMONSTRACAO: redirecionamento interceptado',
          contentType: 'text/plain; charset=utf-8',
        });
      });
      const page = await context.newPage();
      await page.goto(t.url + '/api/access/start');
      const action = page
        .locator('.order-card')
        .getByRole('button', { name: 'WhatsApp', exact: true });
      await expect(action).toBeVisible();
      const banner = page.getByRole('complementary', {
        name: 'Ambiente de teste',
      });
      if (appEnvironment === 'teste')
        await expect(banner).toHaveText(
          'AMBIENTE DE TESTE · dados não são reais',
        );
      else await expect(banner).toHaveCount(0);

      const capture =
        process.env.T13_CAPTURE === '1' &&
        appEnvironment === 'teste' &&
        info.project.name === 'chromium-mobile';
      if (capture)
        await page.screenshot({
          path: 'docs/colaboracao/capturas/t13-faixa.png',
        });

      await action.click();
      const sheet = page.getByRole('dialog', {
        name: 'WhatsApp · Cliente DEMONSTRAÇÃO R5',
        exact: true,
      });
      if (appEnvironment === 'producao') {
        await expect(
          sheet.getByRole('link', { name: 'Abrir no WhatsApp', exact: true }),
        ).toHaveAttribute('href', /^https:\/\/wa\.me\//);
        return;
      }
      const open = sheet.getByRole('button', {
        name: 'Abrir no WhatsApp',
        exact: true,
      });
      const confirm = page.getByRole('dialog', {
        name: 'Tem certeza?',
        exact: true,
      });
      await open.click();
      await expect(confirm).toContainText(
        'Você está no ambiente de teste. Abrir o WhatsApp mesmo assim?',
      );
      if (capture)
        await page.screenshot({
          path: 'docs/colaboracao/capturas/t13-whatsapp.png',
          animations: 'disabled',
        });
      await confirm
        .getByRole('button', { name: 'Cancelar', exact: true })
        .click();
      await expect(confirm).not.toBeVisible();
      expect(whatsapp).toBe(0);

      await open.click();
      await confirm
        .getByRole('button', { name: 'Abrir o WhatsApp', exact: true })
        .click();
      await expect(page).toHaveURL(/^https:\/\/wa\.me\//);
      expect(whatsapp).toBe(1);
      await page.goto(t.url + '/gestao/preferencias');
      await expect(
        page.getByText('Avisos desativados no ambiente de teste', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Ativar avisos neste aparelho' }),
      ).toHaveCount(0);
    } finally {
      await context.close();
      await t.dispose();
    }
  });
