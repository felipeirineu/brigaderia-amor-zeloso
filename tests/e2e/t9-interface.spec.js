import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { weightCostingProject } from '../helpers/weight-costing-project.mjs';
const stage = process.env.T9_CAPTURE;
const before = stage === 'antes';
const flags = {
  browserHTTP: true,
  mobileEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  fieldEnabled: true,
  prospectsEnabled: true,
};
async function context(t, browser, email = 'owner@example.test', width = 390) {
  const c = await browser.newContext({
    viewport: { width, height: 844 },
    serviceWorkers: 'block',
    extraHTTPHeaders: { 'Cf-Access-Jwt-Assertion': await t.token(email) },
  });
  const p = await c.newPage();
  await p.goto(t.url + '/api/access/start');
  return { c, p };
}
async function shot(p, name, info, element) {
  await p.evaluate(() => document.fonts.ready);
  if (stage && info.project.name === 'chromium-mobile') {
    await p.evaluate(() => document.fonts.ready);
    if (element)
      await element.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await (element ?? p).screenshot({
      path: `docs/colaboracao/capturas/t9-${stage}-${name}.png`,
      scale: 'css',
      animations: 'disabled',
    });
  }
}
test('T9 capturas e ajustes de foto, clientes, mensagens e preferências', async ({
  browser,
}, info) => {
  test.setTimeout(120000);
  const t = await runtime(flags);
  const { c, p } = await context(t, browser);
  try {
    const { call } = await weightCostingProject(t);
    await p.goto(t.url + '/gestao/produtos');
    const photo = p.getByRole('group', {
      name: 'Foto do produto',
      exact: true,
    });
    await expect(photo).toBeVisible();
    await shot(p, 'foto-sem-escolha', info, photo);
    const pick = photo.getByRole('button', {
      name: 'Brigadeiro com Amendoim',
      exact: true,
    });
    await pick.click();
    await expect(pick).toHaveAttribute('aria-pressed', 'true');
    await shot(p, 'foto-escolhida', info, photo);
    if (!before) {
      const a = await photo
          .getByRole('button', { name: 'Sugerir foto pelo nome', exact: true })
          .boundingBox(),
        b = await photo
          .getByRole('button', { name: 'Sem foto', exact: true })
          .boundingBox();
      expect(a.y).toBe(b.y);
      const cards = photo.locator('.photo-grid .az-button');
      expect(await cards.count()).toBeGreaterThanOrEqual(9);
      const boxes = await Promise.all(
        [0, 1, 2, 3].map((i) => cards.nth(i).boundingBox()),
      );
      expect(boxes[0].y).toBe(boxes[1].y);
      expect(boxes[1].y).toBe(boxes[2].y);
      expect(boxes[3].y).toBeGreaterThan(boxes[0].y);
      expect(Math.abs(boxes[0].width - boxes[0].height)).toBeLessThanOrEqual(1);
      for (const label of await cards.locator('.photo-name').all()) {
        const style = await label.evaluate((el) => ({
          height: el.getBoundingClientRect().height,
          line: parseFloat(getComputedStyle(el).lineHeight),
          overflow: el.scrollWidth > el.clientWidth,
          align: getComputedStyle(el).textAlign,
        }));
        expect(style.height).toBeLessThanOrEqual(style.line * 2 + 1);
        expect(style.overflow).toBe(false);
        expect(style.align).toBe('center');
      }
    }
    // A escolha de foto sem salvar não grava o cadastro.
    expect((await call('products', undefined, 'GET'))[0].photo_key).toBeNull();
    await p.goto(t.url + '/gestao/clientes');
    const filter = p.getByRole('group', {
      name: 'Clientes ou contatos',
      exact: true,
    });
    await shot(p, 'clientes', info);
    if (!before) {
      const a = await filter
          .getByRole('button', { name: 'Clientes', exact: true })
          .boundingBox(),
        b = await filter
          .getByRole('button', { name: 'Contatos', exact: true })
          .boundingBox();
      expect(b.x - (a.x + a.width)).toBeGreaterThanOrEqual(20);
      await p
        .getByRole('button', { name: 'Novo cliente', exact: true })
        .click();
      await p
        .getByRole('button', { name: 'Ajuda: Cliente ativo', exact: true })
        .click();
      await expect(
        p.getByRole('dialog', { name: 'Cliente ativo', exact: true }),
      ).toContainText('Dá para reativar depois.');
      await p
        .getByRole('button', { name: 'Fechar ajuda', exact: true })
        .click();
      await p.getByRole('button', { name: 'Cancelar', exact: true }).click();
    }
    const templates = await call('message-templates', undefined, 'GET');
    await p.goto(t.url + '/gestao/mensagens');
    if (!before) await shot(p, 'mensagens-ajuda', info);
    await p
      .getByRole('button', { name: 'Editar modelo Entregue', exact: true })
      .click();
    const text = p.getByRole('textbox', {
      name: 'Texto do modelo',
      exact: true,
    });
    await expect(text).toBeVisible();
    await shot(p, 'mensagens', info);
    if (!before) {
      await expect(text).toBeFocused();
      await expect(text.locator('xpath=ancestor::section[1]')).toContainText(
        'Entregue',
      );
    }
    await text.fill('DEMONSTRAÇÃO não salvar');
    await p
      .getByRole('button', { name: 'Cancelar edição', exact: true })
      .click();
    expect(await call('message-templates', undefined, 'GET')).toEqual(
      templates,
    );
    await p.goto(t.url + '/gestao/preferencias');
    await expect(p.locator('#foto-perfil .profile-photo-large')).toBeVisible();
    await shot(p, 'preferencias', info);
    if (!before) {
      const avatar = await p
          .locator('#foto-perfil .profile-photo-large')
          .boundingBox(),
        panel = await p.locator('#foto-perfil').boundingBox();
      expect(
        Math.abs(avatar.x + avatar.width / 2 - panel.x - panel.width / 2),
      ).toBeLessThanOrEqual(1);
      await shot(p, 'avisos', info, p.locator('#avisos'));
      const title = await p
          .getByRole('heading', { name: 'Avisos neste aparelho', exact: true })
          .boundingBox(),
        help = await p
          .getByRole('button', {
            name: 'Ajuda: Avisos no celular',
            exact: true,
          })
          .boundingBox();
      expect(
        Math.abs(title.y + title.height / 2 - help.y - help.height / 2),
      ).toBeLessThanOrEqual(2);
      expect(title.height).toBeLessThanOrEqual(25);
    }
  } finally {
    await c.close();
    await t.dispose();
  }
});

test('T9 nomes longos e entrada do pedido seguem os textos e o modo escolhido', async ({
  browser,
}, info) => {
  const t = await runtime(flags);
  const { c, p } = await context(t, browser);
  try {
    const { call, product } = await weightCostingProject(t);
    const name =
      'Sabor DEMONSTRAÇÃO com nome comprido para conferir o alinhamento';
    await call(
      'products/' + product.id,
      {
        version: product.version,
        name,
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
    await p
      .getByRole('heading', { name: 'Como criar pedidos', exact: true })
      .scrollIntoViewIfNeeded();
    await shot(p, 'modos', info);
    await p.getByRole('button', { name: 'Modo simples', exact: true }).click();
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await expect(
      p.getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true }),
    ).toBeVisible();
    await shot(p, 'escolha-cliente', info);
    if (!before) {
      await expect(
        p.getByRole('link', { name: 'Cadastrar novo cliente', exact: true }),
      ).toBeVisible();
      await expect(
        p.getByRole('heading', { name: 'Lista de clientes', exact: true }),
      ).toBeVisible();
    }
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await expect(p.locator('.flavor-add strong').first()).toHaveText(name);
    await shot(p, 'nome-longo', info);
    if (!before) {
      expect(
        await p
          .locator('.flavor-add strong')
          .first()
          .evaluate((el) => getComputedStyle(el).textAlign),
      ).toBe('center');
      expect(
        await p
          .locator('.flavor-add strong')
          .first()
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
    }
  } finally {
    await c.close();
    await t.dispose();
  }
});

test('T9 Cancelar, Escape e expiração não arquivam; confirmar faz uma única gravação', async ({
  browser,
}, info) => {
  const t = await runtime(flags);
  const { c, p } = await context(t, browser);
  try {
    const { customer } = await weightCostingProject(t);
    const writes = [];
    p.on('request', (r) => {
      if (r.method() === 'DELETE' && r.url().endsWith('/customers/' + customer))
        writes.push(r);
    });
    const open = async () => {
      await p.goto(t.url + '/gestao/clientes');
      await p
        .locator('.customer-records article details > summary')
        .first()
        .click();
      await p
        .getByRole('button', {
          name: 'Arquivar Cliente DEMONSTRAÇÃO P1',
          exact: true,
        })
        .click();
    };
    const sheet = p.getByRole('dialog', { name: 'Tem certeza?', exact: true });
    await open();
    await expect(sheet).toContainText(
      'Arquivar este cliente? O histórico será preservado.',
    );
    await expect(
      sheet.getByRole('button', { name: 'Cancelar', exact: true }),
    ).toBeFocused();
    await shot(p, 'confirmacao', info);
    await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(writes).toHaveLength(0);
    await open();
    await p.keyboard.press('Escape');
    await expect(sheet).not.toBeVisible();
    expect(writes).toHaveLength(0);
    await open();
    await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await expect(sheet).not.toBeVisible();
    expect(writes).toHaveLength(0);
    await open();
    await t.db
      .prepare(
        "UPDATE sessions SET expires_at=unixepoch()-1 WHERE organization_id=? AND user_id=(SELECT id FROM users WHERE email='owner@example.test')",
      )
      .bind(t.org)
      .run();
    await p.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(
      p.getByRole('heading', { name: 'Gestão restrita', exact: true }),
    ).toBeVisible();
    await expect(sheet).toHaveCount(0);
    expect(writes).toHaveLength(0);
    await p.goto(t.url + '/api/access/start');
    await open();
    await sheet.getByRole('button', { name: 'Arquivar', exact: true }).click();
    await expect(
      p.getByRole('status').filter({ hasText: 'Alteração salva' }),
    ).toBeVisible();
    expect(writes).toHaveLength(1);
    expect(
      (
        await t.db
          .prepare(
            'SELECT active FROM customers WHERE organization_id=? AND id=?',
          )
          .bind(t.org, customer)
          .first()
      ).active,
    ).toBe(0);
  } finally {
    await c.close();
    await t.dispose();
  }
});

test('T9 arquivamento de produto só aparece para administrador no computador', async ({
  browser,
}) => {
  const t = await runtime(flags);
  const contexts = [];
  try {
    await weightCostingProject(t);
    for (const [email, width, visible] of [
      ['owner@example.test', 390, false],
      ['operator@example.test', 1280, false],
      ['owner@example.test', 1280, true],
    ]) {
      const { c, p } = await context(t, browser, email, width);
      contexts.push(c);
      await p.goto(t.url + '/gestao/produtos');
      await expect(
        p.getByRole('button', {
          name: 'Editar Produto DEMONSTRAÇÃO P1',
          exact: true,
        }),
      ).toBeVisible();
      const archive = p.getByRole('button', {
        name: 'Arquivar Produto DEMONSTRAÇÃO P1',
        exact: true,
      });
      if (visible) await expect(archive).toBeVisible();
      else await expect(archive).toHaveCount(0);
    }
  } finally {
    for (const c of contexts) await c.close();
    await t.dispose();
  }
});

test('T9 modo simples é padrão em qualquer tela e auto antigo migra sem perder full', async ({
  browser,
}) => {
  const t = await runtime(flags);
  const contexts = [];
  try {
    await weightCostingProject(t);
    for (const [email, width, saved] of [
      ['owner@example.test', 1280, null],
      ['operator@example.test', 390, 'auto'],
      ['owner@example.test', 390, 'full'],
    ]) {
      const { c, p } = await context(t, browser, email, width);
      contexts.push(c);
      const role = email.startsWith('owner') ? 'owner' : 'operator';
      if (saved)
        await p.evaluate(
          ({ role, saved }) =>
            localStorage.setItem('az-order-mode-' + role, saved),
          { role, saved },
        );
      await p.goto(t.url + '/gestao/preferencias');
      const label = saved === 'full' ? 'Lista completa' : 'Modo simples';
      await expect(
        p.getByRole('button', { name: label, exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        p.getByText('Esta escolha fica só neste aparelho.', { exact: false }),
      ).toBeVisible();
      await p.goto(t.url + '/gestao/pedidos?novo=1');
      if (saved === 'full')
        await expect(
          p.getByRole('combobox', { name: 'Cliente', exact: true }),
        ).toBeVisible();
      else
        await expect(
          p.getByRole('heading', { name: 'Escolha o cliente', exact: true }),
        ).toBeVisible();
    }
  } finally {
    for (const c of contexts) await c.close();
    await t.dispose();
  }
});
