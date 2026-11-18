import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';

const flags = {
  browserHTTP: true,
  mobileEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  fieldEnabled: true,
};
async function open(t, browser) {
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  const p = await c.newPage();
  await p.goto(t.url + '/api/access/start');
  await expect(p).toHaveURL(/\/gestao\/?$/);
  return { c, p };
}
const nav = (p) => p.getByRole('navigation', { name: 'Atalhos do celular' });
const idx = (p) => p.evaluate(() => window.history.state?.idx ?? 0);

test('Voltar do celular: abas não acumulam histórico e voltam ao Hoje', async ({
  browser,
}) => {
  const t = await runtime(flags);
  const { c, p } = await open(t, browser);
  try {
    const start = await idx(p);
    // Hoje → Pedidos → Hoje: não acumula; o Hoje volta ao mesmo lugar do histórico.
    await nav(p).getByRole('link', { name: 'Pedidos' }).click();
    await expect(p).toHaveURL(/\/gestao\/pedidos$/);
    await nav(p).getByRole('link', { name: 'Hoje' }).click();
    await expect(p).toHaveURL(/\/gestao\/?$/);
    expect(await idx(p)).toBe(start);
    // Hoje → Pedidos → Clientes → Mais → Voltar = Hoje.
    await nav(p).getByRole('link', { name: 'Pedidos' }).click();
    await expect(p).toHaveURL(/\/gestao\/pedidos$/);
    await nav(p).getByRole('link', { name: 'Clientes' }).click();
    await expect(p).toHaveURL(/\/gestao\/clientes$/);
    await nav(p).getByRole('link', { name: 'Mais' }).click();
    await expect(p).toHaveURL(/\/gestao\/mais$/);
    expect(await idx(p)).toBe(start + 1);
    await p.goBack();
    await expect(p).toHaveURL(/\/gestao\/?$/);
    // Dentro da aba o Voltar continua passo a passo.
    await nav(p).getByRole('link', { name: 'Mais' }).click();
    await p
      .getByRole('link', { name: /Preferências/ })
      .first()
      .click();
    await expect(p).toHaveURL(/preferencias/);
    await p.goBack();
    await expect(p).toHaveURL(/\/gestao\/mais$/);
    // Saindo de uma tela interna por outra aba, a tela interna não fica no meio.
    await p
      .getByRole('link', { name: /Preferências/ })
      .first()
      .click();
    await expect(p).toHaveURL(/preferencias/);
    await nav(p).getByRole('link', { name: 'Clientes' }).click();
    await expect(p).toHaveURL(/\/gestao\/clientes$/);
    expect(await idx(p)).toBe(start + 1);
    await p.goBack();
    await expect(p).toHaveURL(/\/gestao\/?$/);
  } finally {
    await c.close();
    await t.dispose();
  }
});

test('Abrindo direto numa tela interna, o Voltar leva ao Hoje', async ({
  browser,
}) => {
  const t = await runtime(flags);
  const { c } = await open(t, browser);
  const p = await c.newPage();
  try {
    await p.goto(t.url + '/gestao/clientes');
    await expect(p).toHaveURL(/\/gestao\/clientes$/);
    await expect(nav(p)).toBeVisible();
    await p.goBack();
    await expect(p).toHaveURL(/\/gestao\/?$/);
  } finally {
    await c.close();
    await t.dispose();
  }
});
