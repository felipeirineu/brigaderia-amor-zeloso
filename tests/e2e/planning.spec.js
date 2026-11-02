import { selectWorkday } from '../helpers/select-workday.mjs';
import { expect, test } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('agenda privada, ICS e lembrete visível/concluído no Hoje', async ({
  browser,
}) => {
  const t = await runtime({
      browserHTTP: true,
      financeEnabled: true,
      p1Enabled: true,
    }),
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
  try {
    const { makeOrder } = await demoProject(t);
    await makeOrder();
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(t.url + '/login');
    await page.getByRole('link', { name: 'Entrar com acesso seguro' }).click();
    await page.goto(t.url + '/gestao/lembretes');
    await page.getByLabel('Título do lembrete').fill('Ligar · DEMONSTRAÇÃO');
    await page
      .getByLabel('Quando lembrar (João Pessoa)')
      .fill('2030-01-07T10:00');
    await page
      .getByRole('button', { name: 'Salvar lembrete', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText('Lembrete salvo');
    await page.goto(t.url + '/gestao/agenda');
    await page.getByLabel('Data de referência').fill('2030-01-07');
    await expect(
      page.getByRole('heading', {
        name: 'Lembrete · Ligar · DEMONSTRAÇÃO',
        exact: true,
      }),
    ).toBeVisible();
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar agenda ICS' }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('agenda-amor-zeloso.ics');
    await page.goto(t.url + '/gestao');
    await selectWorkday(page, '2030-01-07');
    await expect(
      page.getByRole('heading', { name: 'Ligar · DEMONSTRAÇÃO', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: 'Concluir lembrete Ligar · DEMONSTRAÇÃO',
        exact: true,
      })
      .click();
    await expect(page.getByText('Nenhum lembrete pendente.')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
    await t.dispose();
  }
});
