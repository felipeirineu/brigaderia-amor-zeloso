import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { weightCostingProject } from '../helpers/weight-costing-project.mjs';
const before = process.env.T6_CAPTURE === 'antes';
async function shot(p, name, info) {
  if (process.env.T6_CAPTURE && info.project.name === 'chromium-mobile')
    await p.screenshot({
      path:
        'docs/colaboracao/capturas/t6-' +
        (before ? 'antes' : 'depois') +
        '-' +
        name +
        '.png',
      scale: 'css',
      animations: 'disabled',
    });
}
async function center(p, element) {
  const b = await element.boundingBox();
  expect(
    Math.abs(b.x + b.width / 2 - p.viewportSize().width / 2),
  ).toBeLessThanOrEqual(2);
}
test('T6 clientes, chips com avatar/ocasião, seleção em andamento e logo escuro', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const t = await runtime({
      browserHTTP: true,
      mobileEnabled: true,
      fieldEnabled: true,
      financeEnabled: true,
      p1Enabled: true,
      prospectsEnabled: true,
    }),
    ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
  try {
    const { call, operator, customer } = await weightCostingProject(t);
    await call('field/profile', { version: 0, display_name: 'DEMO A' }, 'PUT');
    await call(
      'field/profile',
      { version: 0, display_name: 'DEMO B' },
      'PUT',
      operator,
    );
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes');
    const filter = p.getByRole('group', {
        name: 'Clientes ou contatos',
        exact: true,
      }),
      create = p.getByRole('button', { name: /^Novo cliente$/, exact: false });
    await expect(create).toBeVisible();
    await shot(p, 'clientes', info);
    if (!before) {
      await center(p, create);
      const a = await filter
          .getByRole('button', { name: 'Clientes', exact: true })
          .boundingBox(),
        b = await filter
          .getByRole('button', { name: 'Contatos', exact: true })
          .boundingBox();
      expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(1);
      expect(
        Math.abs(
          (Math.min(a.x, b.x) + Math.max(a.x + a.width, b.x + b.width)) / 2 -
            195,
        ),
      ).toBeLessThanOrEqual(2);
    }
    await filter.getByRole('button', { name: 'Contatos', exact: true }).click();
    await expect(
      p.getByRole('button', { name: 'Novo contato', exact: true }),
    ).toBeVisible();
    await shot(p, 'contatos', info);
    if (!before)
      await center(
        p,
        p.getByRole('button', { name: 'Novo contato', exact: true }),
      );
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await expect(
      p.getByRole('link', { name: 'Cadastrar novo cliente', exact: true }),
    ).toBeVisible();
    await shot(p, 'novo-pedido', info);
    if (!before) {
      const ghost = p.getByRole('link', {
        name: 'Cadastrar novo cliente',
        exact: true,
      });
      expect(
        await ghost.evaluate((el) => getComputedStyle(el).paddingLeft),
      ).toBe('0px');
    }
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await p.locator('.flavor-add').first().click();
    const next = () => p.getByRole('button', { name: /^Continuar/ }).click();
    await next();
    await p.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await p.getByRole('button', { name: '14:00', exact: true }).click();
    await next();
    const couriers = p.getByRole('group', { name: 'Quem leva', exact: true }),
      owner = couriers.getByRole('button', { name: 'DEMO A', exact: true });
    await expect(owner).toBeVisible();
    await owner.click();
    await expect(owner).toHaveAttribute('aria-pressed', 'true');
    await shot(p, 'entregador', info);
    if (!before) {
      const avatar = owner.locator('.staff-avatar');
      await expect(avatar).toBeVisible();
      const label = owner.locator('.az-button-label');
      const a = await avatar.boundingBox(),
        b = await label.boundingBox();
      expect(b.x - (a.x + a.width)).toBeGreaterThanOrEqual(7);
      expect(
        await avatar.evaluate((el) => getComputedStyle(el).borderRadius),
      ).toBe('50%');
      expect(
        await avatar.evaluate((el) => getComputedStyle(el).backgroundColor),
      ).not.toBe(
        await owner.evaluate((el) => getComputedStyle(el).backgroundColor),
      );
    }
    // Retirada mantém o fluxo rápido, mas a seleção de entregador continua a mesma já existente.
    await p.getByRole('button', { name: /^Retirada/ }).click();
    await next();
    await p.getByRole('button', { name: 'Na entrega', exact: true }).click();
    await next();
    const occasion = p.getByRole('group', {
      name: 'Ocasião (opcional)',
      exact: true,
    });
    await expect(occasion).toBeVisible();
    await occasion
      .getByRole('button', { name: 'Casamento', exact: true })
      .click();
    await shot(p, 'ocasiao', info);
    if (!before) {
      for (const [a, b] of [
        ['Casamento', 'Presente'],
        ['Brinde/empresa', 'Outra'],
      ]) {
        const x = await occasion
            .getByRole('button', { name: a, exact: true })
            .boundingBox(),
          y = await occasion
            .getByRole('button', { name: b, exact: true })
            .boundingBox();
        expect(Math.abs(x.y - y.y)).toBeLessThanOrEqual(1);
      }
      const empty = occasion.getByRole('button', {
        name: 'Outra',
        exact: true,
      });
      expect(await empty.locator('.az-button-icon').count()).toBe(0);
    }
    await p.goto(t.url + '/gestao');
    const draft = p.getByRole('complementary', {
      name: 'Seleção de pedido guardada',
      exact: true,
    });
    await expect(draft).toBeVisible();
    await shot(p, 'rascunho', info);
    if (!before) {
      await expect(draft).toContainText(
        'Há uma seleção de pedido em andamento. Retome e confira os dados para confirmar o pedido.',
      );
      const a = await draft
          .getByRole('link', { name: 'Retomar seleção', exact: true })
          .boundingBox(),
        b = await draft
          .getByRole('button', { name: 'Descartar seleção', exact: true })
          .boundingBox();
      expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(1);
      expect(a.x + a.width).toBeLessThanOrEqual(b.x + 1);
    }
    await draft
      .getByRole('link', { name: 'Retomar seleção', exact: true })
      .click();
    await expect(
      p.getByText(
        'Seleção recuperada. Confira quantidades, data, entrega e pagamento. Textos e valores não foram guardados.',
        { exact: true },
      ),
    ).toBeVisible();
    // Recuperar não confirma nem restaura escolhas que não fazem parte da whitelist (como ocasião).
    expect(
      (await t.db.prepare('SELECT COUNT(*) n FROM orders').first()).n,
    ).toBe(0);
    await p.goto(t.url + '/gestao');
    await draft
      .getByRole('button', { name: 'Descartar seleção', exact: true })
      .click();
    await expect(draft).not.toBeVisible();
    expect(
      (await t.db.prepare('SELECT COUNT(*) n FROM orders').first()).n,
    ).toBe(0);
    await p.emulateMedia({ colorScheme: 'dark' });
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'dark');
    await shot(p, 'logo-escuro', info);
    if (!before) {
      expect(
        await p
          .locator('.compact-header > a img')
          .evaluate((el) => getComputedStyle(el).outlineStyle),
      ).toBe('solid');
      await p.emulateMedia({ colorScheme: 'light' });
      // O evento matchMedia é assíncrono no WebKit; conferir após o tema aplicar.
      await expect(p.locator('html')).toHaveAttribute('data-theme', 'light');
      expect(
        await p
          .locator('.compact-header > a img')
          .evaluate((el) => getComputedStyle(el).outlineStyle),
      ).toBe('none');
    }
    expect((await call('customers/' + customer, undefined, 'GET')).name).toBe(
      'Cliente DEMONSTRAÇÃO P1',
    );
  } finally {
    await ctx.close();
    await t.dispose();
  }
});

test('T6 botões fantasma e avatar de responsável do lembrete preservam ações', async ({
  browser,
}, info) => {
  const t = await runtime({
      browserHTTP: true,
      mobileEnabled: true,
      fieldEnabled: true,
      financeEnabled: true,
      p1Enabled: true,
      prospectsEnabled: true,
    }),
    ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
      },
    });
  try {
    const { call } = await weightCostingProject(t);
    await call('field/profile', { version: 0, display_name: 'DEMO A' }, 'PUT');
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes');
    const card = p.locator('.customer-records article').filter({
      has: p.getByRole('heading', {
        name: 'Cliente DEMONSTRAÇÃO P1',
        exact: true,
      }),
    });
    const route = card.getByRole('button', {
      name: 'Calcular rota',
      exact: true,
    });
    await expect(route).toBeVisible();
    if (!before) {
      const r = await route.boundingBox(),
        name = await card.getByRole('heading').first().boundingBox(),
        label = await route.locator('.az-button-label').boundingBox();
      expect(Math.abs(label.x - name.x)).toBeLessThanOrEqual(1);
      expect(r.height).toBeGreaterThanOrEqual(44);
      expect(
        await route.evaluate((el) => getComputedStyle(el).paddingLeft),
      ).toBe('0px');
    }
    await shot(p, 'rota-cliente', info);
    await p.goto(t.url + '/gestao');
    const more = p.getByRole('link', {
      name: 'Ver todos os lembretes',
      exact: true,
    });
    await expect(more).toBeVisible();
    if (!before) {
      expect(
        await more.evaluate((el) => getComputedStyle(el).paddingLeft),
      ).toBe('0px');
      expect((await more.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    await p.getByRole('button', { name: 'Novo lembrete', exact: true }).click();
    const sheet = p.getByRole('dialog', { name: 'Novo lembrete', exact: true });
    await expect(sheet).toBeVisible();
    const recipient = sheet.getByRole('button', {
      name: 'DEMO A',
      exact: true,
    });
    await expect(recipient).toBeVisible();
    if (!before) {
      await expect(recipient.locator('.staff-avatar')).toBeVisible();
      await expect(recipient).toHaveAttribute('aria-pressed', 'true');
      await recipient.click();
      await expect(recipient).toHaveAttribute('aria-pressed', 'false');
      await expect(recipient.locator('.staff-avatar')).toBeVisible();
      await recipient.click();
      await expect(recipient).toHaveAttribute('aria-pressed', 'true');
    }
    await shot(p, 'lembrete', info);
    await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(
      (await t.db.prepare('SELECT COUNT(*) n FROM reminders').first()).n,
    ).toBe(0);
    expect(
      (await t.db.prepare('SELECT COUNT(*) n FROM push_subscriptions').first())
        .n,
    ).toBe(0);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
