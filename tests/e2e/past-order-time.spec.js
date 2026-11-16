import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';

// Dados DEMONSTRAÇÃO, D1 efêmero e relógio do navegador controlado.
test('Hoje passado exige aceite e trocar dia/hora invalida o aceite; futuro é livre', async ({
  browser,
}) => {
  test.setTimeout(60000);
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    await demoProject(t);
    const p = await ctx.newPage();
    await p.clock.install({ time: new Date('2026-11-16T15:00:00Z') });
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await p.locator('.flavor-add').click();
    const next = p.getByRole('button', { name: /^Continuar/ });
    await next.click();
    await p.getByRole('button', { name: 'Hoje', exact: true }).click();
    const morning = p.getByRole('button', { name: '09:00', exact: true });
    await expect(morning).toBeEnabled();
    await expect(morning).toHaveClass(/past-time-chip/);
    await morning.click();
    const warning = p.getByRole('region', { name: 'Horário que já passou' });
    const consent = p.getByRole('button', {
      name: 'Sim, registrar mesmo assim',
      exact: true,
    });
    await expect(warning).toContainText(
      'Esse horário de hoje já passou. É um pedido que já foi entregue?',
    );
    await expect(next).toBeDisabled();
    await consent.click();
    await expect(next).toBeEnabled();
    await p.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await expect(warning).toHaveCount(0);
    await expect(next).toBeEnabled();
    await expect(morning).not.toHaveClass(/past-time-chip/);
    await p.getByRole('button', { name: 'Hoje', exact: true }).click();
    await expect(next).toBeDisabled();
    await expect(consent).toHaveAttribute('aria-pressed', 'false');
    await consent.click();
    await p.getByRole('button', { name: '14:00', exact: true }).click();
    await expect(warning).toHaveCount(0);
    await expect(next).toBeEnabled();
    await morning.click();
    await expect(next).toBeDisabled();
    await consent.click();
    await p.getByLabel('Outro horário', { exact: true }).fill('11:30');
    await expect(next).toBeDisabled();
    await consent.click();
    await next.click();
    await expect(
      p.getByRole('heading', { name: 'Como vai chegar?', exact: true }),
    ).toBeVisible();
    await p
      .getByRole('button', { name: 'Voltar uma etapa', exact: true })
      .click();
    await p.getByLabel('Outro horário', { exact: true }).fill('14:00');
    await expect(warning).toHaveCount(0);
    await p.clock.fastForward('02:01:00'); // Vence enquanto a etapa está aberta.
    await expect(warning).toBeVisible();
    await expect(next).toBeDisabled();
    await consent.click();
    await next.click();
    await expect(
      p.getByRole('heading', { name: 'Como vai chegar?', exact: true }),
    ).toBeVisible();
  } finally {
    await ctx.close();
    await t.dispose();
  }
});

test('Edição de pedido não pede aceite de horário anterior', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, customer, variant } = await demoProject(t);
    const { id } = await call('orders', {
      customer_id: customer,
      due_at: '2026-11-16T12:00:00Z',
      items: [{ variant_id: variant, quantity: 1 }],
    });
    const p = await ctx.newPage();
    await p.clock.install({ time: new Date('2026-11-16T15:00:00Z') });
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/pedidos/' + id + '/editar-simples');
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await expect(
      p.getByRole('heading', { name: 'Quando entregar?', exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole('button', { name: '09:00', exact: true }),
    ).not.toHaveClass(/past-time-chip/);
    await expect(
      p.getByRole('region', { name: 'Horário que já passou' }),
    ).toHaveCount(0);
    await p.getByLabel('Outro horário', { exact: true }).fill('10:00');
    await expect(p.getByRole('button', { name: /^Continuar/ })).toBeEnabled();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await expect(
      p.getByRole('heading', { name: 'Como vai chegar?', exact: true }),
    ).toBeVisible();
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
