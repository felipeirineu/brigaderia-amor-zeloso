import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { weightCostingProject } from '../helpers/weight-costing-project.mjs';
import { fortalezaDay } from '../../shared/workday.ts';
const stage = process.env.T7_CAPTURE;
const before = stage === 'antes';
const flags = {
  browserHTTP: true,
  mobileEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  toolsEnabled: true,
  fieldEnabled: true,
  prospectsEnabled: true,
};
async function shot(p, name, info) {
  if (stage && info.project.name === 'chromium-mobile') {
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({
      path: `docs/colaboracao/capturas/t7-${stage}-${name}.png`,
      scale: 'css',
      animations: 'disabled',
      fullPage: true,
    });
  }
}
async function login(t, browser) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  const p = await ctx.newPage();
  await p.goto(t.url + '/api/access/start');
  return { ctx, p };
}
test('T7 abertura aguarda sessão, acompanha tema e falha real permite entrar', async ({
  browser,
}, info) => {
  const t = await runtime(flags);
  const { ctx, p } = await login(t, browser);
  let release;
  const gate = new Promise((r) => (release = r));
  try {
    await p.route('**/api/session', async (route) => {
      await gate;
      await route.continue();
    });
    await p.goto(t.url + '/gestao');
    if (before)
      await expect(
        p.getByText('Verificando sessão…', { exact: true }),
      ).toBeVisible();
    else {
      const splash = p.getByRole('status', {
        name: 'Carregando a gestão',
        exact: true,
      });
      await expect(splash).toBeVisible();
      const logo = splash.getByRole('img', {
        name: 'Brigaderia Amor Zeloso',
        exact: true,
      });
      await expect(logo).toBeVisible();
      const a = await logo.boundingBox();
      expect(Math.abs(a.x + a.width / 2 - 195)).toBeLessThanOrEqual(2);
      expect(a.width).toBeGreaterThanOrEqual(190);
      const manifest = await p.evaluate(async () =>
        (
          await fetch(document.querySelector('link[rel="manifest"]').href)
        ).json(),
      );
      expect(manifest.background_color).toBe('#fcf6ec');
      expect(
        await splash.evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe('rgb(252, 246, 236)');
      await expect(p.getByText('Gestão restrita', { exact: true })).toHaveCount(
        0,
      );
      await expect(
        p.getByRole('link', { name: 'Entrar na gestão', exact: true }),
      ).toHaveCount(0);
    }
    await shot(p, 'abertura-clara', info);
    await p.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'dark');
    await shot(p, 'abertura-escura', info);
    if (!before) {
      const logo = p.locator('.app-opening img');
      expect(
        await logo.evaluate((el) => getComputedStyle(el).outlineStyle),
      ).toBe('solid');
      for (const point of await p.locator('.opening-dots span').all())
        expect(
          await point.evaluate((el) => getComputedStyle(el).animationName),
        ).toBe('none');
      const manifest = await p.evaluate(async () =>
        (
          await fetch(document.querySelector('link[rel="manifest"]').href)
        ).json(),
      );
      expect(
        await p
          .locator('.app-opening')
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe('rgb(27, 18, 12)');
      expect(manifest.background_color).toBe('#1b120c');
    }
    release();
    await p.unrouteAll({ behavior: 'wait' });
    await expect(p.locator('.management')).toBeVisible();
    await expect(p.locator('.app-opening')).toHaveCount(0);
    await p.route('**/api/session', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Sessão de DEMONSTRAÇÃO expirada.' }),
      }),
    );
    await p.reload();
    await expect(
      p.getByRole('link', { name: 'Entrar na gestão', exact: true }),
    ).toBeVisible();
    await expect(p.locator('.app-opening')).toHaveCount(0);
    if (!before) {
      await p.unrouteAll({ behavior: 'wait' });
      await p.route('**/api/session', (route) => route.abort());
      await p.reload();
      await expect(
        p.getByRole('button', { name: 'Tentar novamente', exact: true }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        p.getByRole('link', { name: 'Entrar na gestão', exact: true }),
      ).toHaveCount(0);
      await p.unrouteAll({ behavior: 'wait' });
      await p.reload();
      await expect(p.locator('.management')).toBeVisible();
    }
  } finally {
    release();
    await p.unrouteAll({ behavior: 'wait' });
    await ctx.close();
    await t.dispose();
  }
});

test('T7 auditoria das telas e ações, filtros de clientes e menu em grade', async ({
  browser,
}, info) => {
  test.setTimeout(180000);
  const t = await runtime(flags);
  const { ctx, p } = await login(t, browser);
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  try {
    const { call, customer, makeOrder } = await weightCostingProject(t);
    await call('prospects', { name: 'Contato DEMONSTRAÇÃO T7', prospect: {} });
    await p.goto(t.url + '/gestao');
    const weekly = p.getByRole('link', {
      name: 'Gerar pedidos da semana?',
      exact: true,
    });
    await expect(weekly).toBeVisible();
    if (!before) {
      const title = p.getByRole('heading', {
        name: /^Produzir hoje e amanhã/,
      });
      expect(
        Math.abs(
          (await weekly.locator('.az-button-label').boundingBox()).x -
            (await title.boundingBox()).x,
        ),
      ).toBeLessThanOrEqual(1);
    }
    await shot(p, 'hoje', info);
    await p.getByRole('button', { name: 'Novo cadastro', exact: true }).click();
    const menu = p.getByRole('dialog', { name: 'Novo cadastro', exact: true });
    await expect(menu).toBeVisible();
    await shot(p, 'menu-mais', info);
    if (!before) {
      const buttons = [
        menu.getByRole('button', { name: 'Nova visita', exact: true }),
        ...['Novo pedido', 'Novo cliente', 'Novo lembrete'].map((name) =>
          menu.getByRole('link', { name, exact: true }),
        ),
      ];
      const boxes = await Promise.all(buttons.map((b) => b.boundingBox()));
      for (const b of boxes) {
        expect(b.height).toBeGreaterThanOrEqual(48);
        expect(Math.abs(b.width - boxes[0].width)).toBeLessThanOrEqual(1);
      }
      expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThanOrEqual(1);
      expect(Math.abs(boxes[2].y - boxes[3].y)).toBeLessThanOrEqual(1);
      expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
      expect(boxes[0].x).toBe(boxes[2].x);
      await menu
        .getByRole('link', { name: 'Novo cliente', exact: true })
        .click();
      const customerSheet = p.getByRole('dialog', {
        name: 'Novo cliente',
        exact: true,
      });
      await expect(customerSheet).toBeVisible();
      await customerSheet
        .getByRole('button', { name: 'Cancelar', exact: true })
        .click();
      expect(
        (await t.db.prepare('SELECT COUNT(*) n FROM customers').first()).n,
      ).toBe(2);
    } else
      await menu.getByRole('button', { name: 'Fechar', exact: true }).click();
    const id = await makeOrder(fortalezaDay() + 'T23:59:00-03:00');
    for (const [name, route] of [
      ['pedidos', 'pedidos'],
      ['detalhe-pedido', 'pedidos/' + id],
      ['clientes', 'clientes'],
      ['visitas', 'visitas'],
      ['kits', 'kits'],
      ['insumos', 'insumos'],
      ['fichas', 'fichas'],
      ['calculadora', 'fichas/peso'],
      ['lembretes', 'lembretes'],
      ['financeiro', 'financeiro'],
      ['conta', 'financeiro/' + customer],
      ['relatorios', 'relatorios'],
      ['mais', 'mais'],
      ['preferencias', 'preferencias'],
      ['acessos', 'acessos'],
      ['backup', 'backup'],
    ]) {
      await p.goto(t.url + '/gestao/' + route);
      await expect(p.locator('.management')).toBeVisible();
      await p.waitForLoadState('networkidle');
      await expect(p.locator('.skeleton-region')).toHaveCount(0);
      await shot(p, name, info);
      expect(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (!before)
        for (const pair of await p.locator('.action-pair:visible').all()) {
          const buttons = pair.locator(':scope > .az-button');
          if ((await buttons.count()) !== 2) continue;
          const a = await buttons.nth(0).boundingBox(),
            b = await buttons.nth(1).boundingBox();
          expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(1);
          expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(1);
          expect(a.height).toBeGreaterThanOrEqual(48);
        }
      if (name === 'clientes') {
        const group = p.getByRole('group', {
          name: 'Clientes ou contatos',
          exact: true,
        });
        const a = await group
            .getByRole('button', { name: 'Clientes', exact: true })
            .boundingBox(),
          b = await group
            .getByRole('button', { name: 'Contatos', exact: true })
            .boundingBox();
        if (!before) {
          expect(b.x - (a.x + a.width)).toBeGreaterThanOrEqual(12);
          expect(a.y).toBe(b.y);
          expect(
            await group
              .locator('legend')
              .evaluate((el) => getComputedStyle(el).textAlign),
          ).toBe('left');
        }
        await group
          .getByRole('button', { name: 'Contatos', exact: true })
          .click();
        await expect(
          p.getByRole('heading', {
            name: 'Contato DEMONSTRAÇÃO T7',
            exact: true,
          }),
        ).toBeVisible();
        await shot(p, 'contatos', info);
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});

test('T7 etapas do pedido e selo de álcool compacto e acessível', async ({
  browser,
}, info) => {
  test.setTimeout(120000);
  const t = await runtime(flags);
  const { ctx, p } = await login(t, browser);
  try {
    const { call, product } = await weightCostingProject(t);
    await call(
      'products/' + product.id,
      {
        name: 'DEMO',
        description: 'Sabor DEMONSTRAÇÃO contém álcool',
        version: product.version,
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
    await p.goto(t.url + '/gestao/preferencias');
    await p.getByRole('button', { name: 'Modo simples', exact: true }).click();
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await expect(
      p.getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true }),
    ).toBeVisible();
    await shot(p, 'pedido-cliente', info);
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await expect(p.locator('.flavor-add').first()).toBeVisible();
    await shot(p, 'pedido-sabores', info);
    if (!before) {
      const tag = p.locator('.flavor-add .alcohol-tag').first();
      await expect(tag).toHaveAttribute('aria-label', 'Contém álcool');
      await expect(
        p
          .locator('.flavor-add')
          .first()
          .getByRole('img', { name: 'Contém álcool', exact: true }),
      ).toBeVisible();
      await expect(tag).toContainText('Álcool');
      expect((await tag.boundingBox()).height).toBeLessThanOrEqual(24);
      expect(await tag.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe(
        'nowrap',
      );
    }
    await p.locator('.flavor-add').first().click();
    if (!before) {
      await p
        .getByRole('button', { name: /^Editar sabores de/ })
        .first()
        .click();
      const choice = p.getByRole('button', {
        name: 'Escolher DEMO para completar',
        exact: true,
      });
      const name = await choice.locator('strong').boundingBox(),
        tag = await choice.locator('.alcohol-tag').boundingBox();
      expect(
        Math.abs(name.y + name.height / 2 - (tag.y + tag.height / 2)),
      ).toBeLessThanOrEqual(2);
      expect(tag.x).toBeGreaterThan(name.x + name.width);
      await shot(p, 'alcool-montagem', info);
      await p
        .getByRole('button', { name: 'Cancelar montagem', exact: true })
        .click();
    }
    const next = () => p.getByRole('button', { name: /^Continuar/ }).click();
    await next();
    await p.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await p.getByRole('button', { name: '14:00', exact: true }).click();
    await shot(p, 'pedido-quando', info);
    await next();
    await p.getByRole('button', { name: /^Retirada/ }).click();
    await shot(p, 'pedido-entrega', info);
    await next();
    await p.getByRole('button', { name: 'Na entrega', exact: true }).click();
    await shot(p, 'pedido-pagamento', info);
    await next();
    await expect(
      p.getByRole('heading', { name: 'Revise e confirme', exact: true }),
    ).toBeVisible();
    await shot(p, 'pedido-revisar', info);
    expect(
      (await t.db.prepare('SELECT COUNT(*) n FROM orders').first()).n,
    ).toBe(0);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});

test('T7 nome comprido quebra antes do selo, sem cortar o aviso ou o sabor', async ({
  browser,
}, info) => {
  const t = await runtime(flags);
  const { ctx, p } = await login(t, browser);
  try {
    const { call, product } = await weightCostingProject(t);
    const name =
      'Sabor DEMONSTRAÇÃO de nome comprido para conferir a quebra de linha';
    await call(
      'products/' + product.id,
      {
        name,
        description: 'DEMONSTRAÇÃO contém álcool',
        version: product.version,
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
    await p.goto(t.url + '/gestao/preferencias');
    await p.getByRole('button', { name: 'Modo simples', exact: true }).click();
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await p.locator('.flavor-add').first().click();
    await p
      .getByRole('button', { name: /^Editar sabores de/ })
      .first()
      .click();
    const choice = p.getByRole('button', {
      name: `Escolher ${name} para completar`,
      exact: true,
    });
    await expect(choice.locator('strong')).toHaveText(name);
    const text = await choice.locator('strong').boundingBox(),
      badge = await choice.locator('.alcohol-tag').boundingBox();
    expect(badge.y).toBeGreaterThanOrEqual(text.y + text.height - 1);
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await choice
        .locator('strong')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await expect(choice.locator('.alcohol-tag')).toHaveAttribute(
      'aria-label',
      'Contém álcool',
    );
    await shot(p, 'alcool-nome-longo', info);
    await p
      .getByRole('button', { name: 'Cancelar montagem', exact: true })
      .click();
    expect(
      (await t.db.prepare('SELECT COUNT(*) n FROM orders').first()).n,
    ).toBe(0);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
