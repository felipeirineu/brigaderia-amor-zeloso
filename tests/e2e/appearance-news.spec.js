import { test, expect } from '@playwright/test';
import { build } from 'vite';
import { mkdtemp, rm } from 'node:fs/promises';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { weightCostingProject } from '../helpers/weight-costing-project.mjs';
const flags = {
  browserHTTP: true,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
  prospectsEnabled: true,
};
async function contrast(button) {
  return button.evaluate((el) => {
    const s = getComputedStyle(el),
      rgb = (value) =>
        value
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number),
      lum = (c) =>
        c
          .map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          })
          .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const a = lum(rgb(s.color)),
      b = lum(rgb(s.backgroundColor));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}
async function shot(p, name, info) {
  if (
    process.env.T45_CAPTURE === '1' &&
    info.project.name === 'chromium-mobile'
  )
    await p.screenshot({
      path: 'docs/colaboracao/capturas/t4-escuro-' + name + '.png',
      scale: 'css',
      animations: 'disabled',
    });
}
test('T4 automático antes do app, telas escuras e preferência manual por aparelho', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const t = await runtime(flags),
    ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
      serviceWorkers: 'block',
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
      },
    });
  try {
    const { call, product } = await weightCostingProject(t);
    await call(
      'products/' + product.id,
      {
        name: product.name,
        version: product.version,
        photo_key: 'tradicional',
        variants: product.variants.map((v) => ({
          id: v.id,
          label: v.label,
          weight_grams: v.weight_grams,
          units_per_box: v.units_per_box,
          price_cents: v.price_cents,
          active: !!v.active,
        })),
      },
      'PUT',
    );
    const contact = await call('prospects', {
      name: 'Contato DEMONSTRAÇÃO aparência',
      prospect: {},
    });
    await call('visits', {
      customer_id: contact.id,
      scheduled_at: new Date().toISOString(),
      samples: [],
    });
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    let release,
      held = false;
    const gate = new Promise((r) => (release = r));
    await p.route('**/assets/index-*.js', async (route) => {
      held = true;
      await gate;
      await route.continue();
    });
    await p.goto(t.url + '/gestao', { waitUntil: 'commit' });
    await expect.poll(() => held).toBe(true);
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'dark');
    release();
    await p.unrouteAll({ behavior: 'wait' });
    await expect(
      p.getByRole('heading', { name: /Boa|Bom/ }).first(),
    ).toBeVisible();
    for (const [path, name] of [
      ['', 'hoje'],
      ['pedidos', 'pedidos'],
      ['clientes', 'clientes'],
      ['visitas', 'visitas'],
      ['kits', 'kits'],
      ['fichas', 'fichas'],
      ['financeiro', 'financeiro'],
      ['mais', 'mais'],
    ]) {
      await p.goto(t.url + '/gestao/' + path);
      await expect(p.locator('.management')).toBeVisible();
      await expect(p.locator('.skeleton-region')).toHaveCount(0);
      await expect(p.locator('html')).toHaveAttribute('data-theme', 'dark');
      expect(
        await p
          .locator('body')
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe('rgb(9, 6, 5)');
      for (const button of await p
        .locator('.az-button--primary:visible, .az-button--success:visible')
        .all())
        if (await button.isEnabled())
          expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
      await shot(p, name, info);
    }
    await p.goto(t.url + '/gestao/preferencias');
    await p.getByRole('button', { name: 'Modo simples', exact: true }).click();
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await expect(
      p.getByRole('heading', { name: 'Escolha o cliente', exact: true }),
    ).toBeVisible();
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: false })
      .click();
    await expect(p.locator('.flavor-card img').first()).toBeVisible();
    await expect(p.locator('.flavor-card img').first()).toHaveJSProperty(
      'complete',
      true,
    );
    await shot(p, 'novo-pedido', info);
    await p.goto(t.url + '/gestao/preferencias');
    const choices = p.getByRole('group', { name: 'Aparência', exact: true });
    await choices.getByRole('button', { name: 'Claro', exact: true }).click();
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'light');
    await p.reload();
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'light');
    await p.emulateMedia({ colorScheme: 'light' });
    await choices.getByRole('button', { name: 'Escuro', exact: true }).click();
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'dark');
    await choices
      .getByRole('button', { name: 'Automático', exact: true })
      .click();
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'light');
    await p.emulateMedia({ colorScheme: 'dark' });
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(p.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#090605',
    );
    await expect(p.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/manifest-dark.webmanifest',
    );
    const manifest = await (
      await ctx.request.get(t.url + '/manifest-dark.webmanifest')
    ).json();
    expect(manifest.theme_color).toBe('#090605');
    expect(manifest.start_url).toBe('/gestao');
    await shot(p, 'preferencias', info);
    await p.getByRole('button', { name: 'Novo cadastro', exact: true }).click();
    await shot(p, 'folha', info);
    await p
      .getByRole('dialog', { name: 'Novo cadastro', exact: true })
      .getByRole('button', { name: 'Fechar', exact: true })
      .click();
    await p.goto(t.url + '/gestao/mais');
    await expect(
      p.getByRole('link', { name: 'Novidades', exact: true }),
    ).toHaveCount(0);
    await expect(
      p.getByRole('dialog', { name: /Novidades da versão/ }),
    ).toHaveCount(0);
    expect(
      await p.evaluate(() => localStorage.getItem('az-release-seen')),
    ).toBeNull();
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
test('T4 storage bloqueado não impede escolher aparência', async ({
  browser,
}) => {
  const t = await runtime(flags),
    ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
  try {
    await demoProject(t);
    await ctx.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw Error('Armazenamento indisponível DEMONSTRAÇÃO');
      };
      Storage.prototype.setItem = () => {
        throw Error('Armazenamento indisponível DEMONSTRAÇÃO');
      };
    });
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/preferencias');
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'dark');
    await p
      .getByRole('group', { name: 'Aparência', exact: true })
      .getByRole('button', { name: 'Claro', exact: true })
      .click();
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'light');
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
test('T5 build isolado 1.0 anuncia uma vez, guarda Entendi e mostra histórico privado', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const dir = await mkdtemp('/tmp/az-release-fixture-');
  let t, ctx;
  try {
    // Override somente no build do teste, sem URL, storage ou flag de produção.
    await build({
      configFile: 'vite.config.ts',
      logLevel: 'error',
      define: { __APP_VERSION__: JSON.stringify('1.0.0') },
      build: { outDir: dir, emptyOutDir: true },
    });
    t = await runtime({ ...flags, assetsDirectory: dir });
    await demoProject(t);
    ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
      },
    });
    await ctx.addInitScript(() => {
      if (!localStorage.getItem('az-release-seen'))
        localStorage.setItem('az-release-seen', '0.17.0');
    });
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao');
    const sheet = p.getByRole('dialog', {
      name: 'Novidades da versão 1.0.0',
      exact: true,
    });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(
      'Bem-vindos ao app da Brigaderia Amor Zeloso',
    );
    await expect(sheet.locator('li')).toHaveCount(3);
    await sheet.getByRole('button', { name: 'Entendi', exact: true }).click();
    await expect(sheet).not.toBeVisible();
    await p.reload();
    await expect(sheet).not.toBeVisible();
    expect(
      await p.evaluate(() => localStorage.getItem('az-release-seen')),
    ).toBe('1.0.0');
    await p.goto(t.url + '/gestao/mais');
    await p.getByRole('link', { name: 'Novidades', exact: true }).click();
    await expect(
      p.getByRole('heading', { name: 'Versão 0.9.0', exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole('heading', { name: 'Versão 1.0.0', exact: true }),
    ).toBeVisible();
    await expect(sheet).not.toBeVisible();
  } finally {
    await ctx?.close();
    await t?.dispose();
    await rm(dir, { recursive: true, force: true });
  }
});
