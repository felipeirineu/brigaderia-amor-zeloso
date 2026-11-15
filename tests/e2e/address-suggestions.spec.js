import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

// Sugestões enquanto digita (Photon simulado): escolher preenche os campos e
// não troca o nome já digitado do cliente.
test('sugestões de endereço enquanto digita preenchem os campos', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    fieldEnabled: true,
    placesProvider: true,
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
    await p.getByRole('button', { name: 'Novo cliente', exact: true }).click();
    const sheet = p.getByRole('dialog', { name: 'Novo cliente', exact: true });
    await sheet
      .getByLabel('Nome', { exact: true })
      .fill('Cliente digitado DEMONSTRAÇÃO');
    await sheet.getByText('Endereço e Instagram', { exact: true }).click();
    const search = sheet.getByLabel('Buscar endereço ou estabelecimento', {
      exact: true,
    });
    await search.pressSequentially('Lo');
    await expect(
      sheet.getByRole('list', { name: 'Sugestões de endereço' }),
    ).toHaveCount(0);
    await search.pressSequentially('cal');
    const option = sheet
      .getByRole('list', { name: 'Sugestões de endereço' })
      .getByRole('button')
      .filter({ hasText: 'Local DEMONSTRAÇÃO' });
    await expect(option).toBeVisible();
    await option.click();
    await expect(sheet.getByLabel('Rua/Avenida', { exact: true })).toHaveValue(
      'Endereço DEMONSTRAÇÃO',
    );
    await expect(sheet.getByLabel('Número', { exact: true })).toHaveValue('10');
    await expect(sheet.getByLabel('Cidade', { exact: true })).toHaveValue(
      'Cidade DEMONSTRAÇÃO',
    );
    await expect(sheet.getByText('📍 Localização guardada')).toBeVisible();
    await expect(sheet.getByLabel('Nome', { exact: true })).toHaveValue(
      'Cliente digitado DEMONSTRAÇÃO',
    );
    await expect(search).toHaveValue('');
  } finally {
    await c.close();
    await t.dispose();
  }
});
