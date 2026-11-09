import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { pushKeys, receiver } from '../helpers/push-project.mjs';
test('R6-7 aviso só por escolha humana, calendário privado, teste e revogação', async ({
  browser,
}, info) => {
  const vapid = await pushKeys(),
    device = await receiver();
  let sent = 0;
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    fieldEnabled: true,
    vapid,
    pushProvider: async () => {
      sent++;
      return new Response(null, { status: 201 });
    },
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
      { display_name: 'Operadora DEMONSTRAÇÃO', version: 0 },
      'PUT',
      operator,
    );
    // Simula apenas as APIs de aparelho; servidor/autorização/D1 e envio são reais no runtime local.
    await c.addInitScript(
      ({ subscription, publicKey }) => {
        let current = null,
          permission = 'default';
        window.__pushRequests = 0;
        Object.defineProperty(navigator, 'standalone', { value: true });
        class DemoNotification {
          static get permission() {
            return permission;
          }
          static async requestPermission() {
            window.__pushRequests++;
            permission = 'granted';
            return permission;
          }
        }
        Object.defineProperty(window, 'Notification', {
          value: DemoNotification,
          configurable: true,
        });
        Object.defineProperty(window, 'PushManager', {
          value: class {},
          configurable: true,
        });
        const key = Uint8Array.from(
          atob(publicKey.replaceAll('-', '+').replaceAll('_', '/')),
          (c) => c.charCodeAt(0),
        ).buffer;
        const manager = {
          getSubscription: async () => current,
          subscribe: async () => {
            current = {
              ...subscription,
              options: { applicationServerKey: key },
              toJSON: () => subscription,
              unsubscribe: async () => {
                current = null;
                return true;
              },
            };
            return current;
          },
        };
        Object.defineProperty(navigator, 'serviceWorker', {
          value: {
            getRegistration: async () => ({ active: {}, pushManager: manager }),
            addEventListener: () => {},
            register: async () => ({}),
          },
          configurable: true,
        });
      },
      { subscription: device.subscription, publicKey: vapid.publicKey },
    );
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await expect(
      p.getByRole('heading', { name: 'Entregas do dia', exact: true }),
    ).toBeVisible();
    expect(await p.evaluate(() => window.__pushRequests)).toBe(0);
    await p.getByRole('button', { name: 'Novo lembrete', exact: true }).click();
    const sheet = p.getByRole('dialog', { name: 'Novo lembrete', exact: true });
    await sheet
      .getByLabel('Título do lembrete', { exact: true })
      .fill('Lembrete DEMONSTRAÇÃO aviso');
    await sheet
      .getByRole('button', { name: '15 min antes', exact: true })
      .click();
    await expect(sheet.getByRole('status')).toContainText(
      'Avisos ativados neste aparelho.',
    );
    expect(await p.evaluate(() => window.__pushRequests)).toBe(1);
    await sheet.getByRole('button', { name: 'Os dois', exact: true }).click();
    if (
      process.env.R6_PUSH_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    ) {
      await sheet.screenshot({
        path: 'docs/colaboracao/capturas/r6-depois-lembrete-destinatarios.png',
      });
      await sheet.evaluate((el) => {
        el.scrollTop = 0;
      });
      await sheet.screenshot({
        path: 'docs/colaboracao/capturas/r6-depois-lembrete-aviso.png',
      });
    }
    await sheet
      .getByRole('button', { name: 'Salvar lembrete', exact: true })
      .click();
    await expect(sheet).toHaveCount(0);
    const row = p
      .locator('.today-reminder-row')
      .filter({ hasText: 'Lembrete DEMONSTRAÇÃO aviso' });
    await expect(row).toContainText('Aviso:');
    await expect(row).toContainText('Operadora DEMONSTRAÇÃO');
    const download = p.waitForEvent('download');
    await row
      .getByRole('button', {
        name: 'Adicionar ao calendário do celular',
        exact: true,
      })
      .click();
    const file = await download;
    const { readFile } = await import('node:fs/promises');
    expect(await readFile(await file.path(), 'utf8')).toContain('BEGIN:VALARM');
    await p
      .getByRole('button', {
        name: 'Abrir menu de Equipe DEMONSTRAÇÃO',
        exact: true,
      })
      .click();
    await p
      .getByRole('link', {
        name: 'Nome de exibição e preferências',
        exact: true,
      })
      .click();
    const settings = p.locator('#avisos');
    await expect(settings).toContainText('Avisos ativados neste aparelho.');
    await settings
      .getByRole('button', { name: 'Enviar aviso de teste', exact: true })
      .click();
    await expect(settings.getByRole('status')).toContainText(
      'Teste enviado ao serviço.',
    );
    expect(sent).toBe(1);
    await settings
      .getByRole('button', { name: 'Desativar neste aparelho', exact: true })
      .click();
    await expect(settings).toContainText('Avisos desativados neste aparelho.');
    expect(
      (await call('p1/push', undefined, 'GET')).subscriptions,
    ).toHaveLength(0); // Sessão de fixture e navegador são do mesmo usuário.
    await p.evaluate(() =>
      Object.defineProperty(window.Notification, 'permission', {
        value: 'denied',
      }),
    );
    await settings
      .getByRole('button', {
        name: 'Ativar avisos neste aparelho',
        exact: true,
      })
      .click();
    await expect(settings.getByRole('alert')).toContainText(
      'Permissão de avisos não concedida',
    );
    expect(await p.evaluate(() => window.__pushRequests)).toBe(1);
  } finally {
    await c.close();
    await t.dispose();
  }
});
test('R6-7 iPhone no navegador orienta instalar e mantém alternativa de calendário', async ({
  browser,
}) => {
  const vapid = await pushKeys();
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    fieldEnabled: true,
    vapid,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    await demoProject(t);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/preferencias');
    await p
      .locator('#avisos')
      .getByRole('button', {
        name: 'Ativar avisos neste aparelho',
        exact: true,
      })
      .click();
    await expect(p.locator('#avisos').getByRole('alert')).toContainText(
      'Tela de Início',
    );
    expect(
      (
        await (
          await t.request('p1/push', {
            cookie: await t.login('owner@example.test'),
          })
        ).json()
      ).subscriptions,
    ).toHaveLength(0);
  } finally {
    await c.close();
    await t.dispose();
  }
});
