import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { demoSpreadsheet } from '../helpers/spreadsheet.mjs';
test('P1-8 CSV/XLSX, prévia, deduplicação e confirmação humana', async ({
  browser,
}) => {
  const t = await runtime({
      browserHTTP: true,
      financeEnabled: true,
      p1Enabled: true,
      toolsEnabled: true,
    }),
    c = await browser.newContext({
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
      },
    });
  try {
    const { call } = await demoProject(t);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/importar-clientes');
    const input = p.getByLabel('Arquivo de clientes', { exact: true });
    await input.setInputFiles({
      name: 'clientes-demonstracao.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'nome;telefone\nCSV DEMONSTRAÇÃO;11900000001\nDuplicado DEMONSTRAÇÃO;11900000000',
      ),
    });
    await p.getByRole('button', { name: 'Ver prévia de 2 clientes' }).click();
    await expect(
      p.getByText('Telefone já cadastrado; nenhum dado será atualizado.'),
    ).toBeVisible();
    expect((await call('customers', undefined, 'GET')).length).toBe(1);
    await p
      .getByRole('button', { name: 'Confirmar importação de 1 clientes' })
      .click();
    await expect(p.getByRole('status')).toContainText('1 clientes importados');
    await input.setInputFiles({
      name: 'formulas-demonstracao.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: demoSpreadsheet({ formula: true }),
    });
    await expect(p.getByRole('alert')).toContainText('Remova fórmulas');
    await input.setInputFiles({
      name: 'clientes-demonstracao.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: demoSpreadsheet(),
    });
    await p.getByRole('button', { name: 'Ver prévia de 1 clientes' }).click();
    await expect(
      p.getByText('Cliente XLSX DEMONSTRAÇÃO', { exact: true }),
    ).toBeVisible();
    await p
      .getByRole('button', { name: 'Confirmar importação de 1 clientes' })
      .click();
    await expect(p.getByRole('status')).toContainText('1 clientes importados');
    expect((await call('customers', undefined, 'GET')).length).toBe(3);
  } finally {
    await c.close();
    await t.dispose();
  }
});
