import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('P1-6 entrada, consumo e alerta de mínimo sem débito implícito', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    toolsEnabled: true,
  });
  const c = await browser.newContext({
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call } = await demoProject(t);
    const s = await call('p1/supplies', {
      name: 'Insumo DEMONSTRAÇÃO estoque',
      unit: 'g',
      pack_quantity_milli: 1000000,
      pack_cost_cents: null,
    });
    await call('p1/inventory/' + s.id, {
      action: 'minimum',
      version: 0,
      minimum_milli: 600000,
    });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/estoque');
    await p
      .getByRole('button', {
        name: 'Movimentar e ver histórico de Insumo DEMONSTRAÇÃO estoque',
      })
      .click();
    await p.getByLabel('Quantidade do movimento (g)').fill('1000');
    await p
      .getByLabel('Motivo do movimento ou estorno')
      .fill('Entrada DEMONSTRAÇÃO');
    await p
      .getByRole('button', { name: 'Salvar movimento', exact: true })
      .click();
    await expect(p.getByText('Saldo 1000 g · Mínimo 600 g')).toBeVisible();
    await p.getByRole('button', { name: 'Consumo', exact: true }).click();
    await p.getByLabel('Quantidade do movimento (g)').fill('500');
    await p
      .getByLabel('Motivo do movimento ou estorno')
      .fill('Produção DEMONSTRAÇÃO');
    await p
      .getByRole('button', { name: 'Salvar movimento', exact: true })
      .click();
    await expect(p.getByText('Saldo 500 g · Mínimo 600 g')).toBeVisible();
    await expect(
      p.getByRole('alert').filter({ hasText: 'Abaixo do mínimo' }),
    ).toBeVisible();
  } finally {
    await c.close();
    await t.dispose();
  }
});
