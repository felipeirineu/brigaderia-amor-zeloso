import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { weightCostingProject } from '../helpers/weight-costing-project.mjs';
// Valores do exemplo de aceite são exclusivamente fictícios, nunca da planilha privada.
test('R16 operadora consulta aceite, opcionais e margem sem salvar; owner confirma acabamento/configuração', async ({
  browser,
}, info) => {
  test.setTimeout(120000);
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    mixedEnabled: true,
  });
  const op = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  const admin = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  await op.addInitScript(() => {
    window.__costCsp = [];
    window.addEventListener('securitypolicyviolation', (e) =>
      window.__costCsp.push(e.violatedDirective),
    );
  });
  try {
    const { call, ids, recipe } = await weightCostingProject(t);
    const p = await op.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/fichas');
    await p
      .getByRole('link', { name: 'Calculadora por peso', exact: true })
      .click();
    await expect(
      p.getByRole('button', { name: 'Nova ficha por peso', exact: true }),
    ).toHaveCount(0);
    const card = p.locator('.weight-cost-card').filter({
      has: p.getByRole('heading', { name: 'Kit 12 · 30 g', exact: true }),
    });
    await expect(card).toContainText(
      'Custo calculado R$ 17,00 + 20% = R$ 20,40',
    );
    await expect(card).toContainText('R$ 70,28');
    await expect(card).toContainText('1 sacola de envio por pedido');
    const before = await call('p1/costing-settings', undefined, 'GET');
    await p
      .getByRole('checkbox', {
        name: 'DEMONSTRAÇÃO opcional fictício — 1 por doce',
        exact: true,
      })
      .check();
    await expect(card).toContainText('R$ 27,60');
    expect((await call('p1/costing-settings', undefined, 'GET')).version).toBe(
      before.version,
    );
    await p
      .getByRole('checkbox', {
        name: 'DEMONSTRAÇÃO opcional fictício — 1 por doce',
        exact: true,
      })
      .uncheck();
    await expect(card).toContainText('R$ 20,40');
    expect(await p.evaluate(() => window.__costCsp)).toEqual([]);
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (
      process.env.R16_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    ) {
      // Somente fotografia: o screenshot WebKit injeta CSS. O contexto funcional usa CSP real.
      const cap = await browser.newContext({
        viewport: { width: 390, height: 844 },
        bypassCSP: true,
        extraHTTPHeaders: {
          'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
        },
      });
      try {
        const photo = await cap.newPage();
        await photo.goto(t.url + '/api/access/start');
        await photo.goto(t.url + '/gestao/fichas/peso');
        const c = photo.locator('.weight-cost-card').filter({
          has: photo.getByRole('heading', {
            name: 'Kit 12 · 30 g',
            exact: true,
          }),
        });
        await expect(c).toContainText('R$ 70,28');
        await c.screenshot({
          path: 'docs/colaboracao/capturas/r16-depois-calculo-peso.png',
        });
      } finally {
        await cap.close();
      }
    }
    const owner = await admin.newPage();
    await owner.goto(t.url + '/api/access/start');
    await owner.goto(t.url + '/gestao/fichas/peso');
    await owner
      .getByRole('button', {
        name: 'Editar ficha de Produto DEMONSTRAÇÃO P1',
        exact: true,
      })
      .click();
    const form = owner.locator('form').filter({
      has: owner.getByRole('heading', {
        name: 'Editar ficha por peso',
        exact: true,
      }),
    });
    await form
      .getByRole('button', { name: 'Adicionar acabamento', exact: true })
      .click();
    await form.getByLabel('Insumo 2', { exact: true }).selectOption(ids.finish);
    await form
      .getByLabel('Acabamento 2 para 30 g (g)', { exact: true })
      .fill('1');
    await form
      .getByRole('button', { name: 'Usar estimativa para 15 g', exact: true })
      .click();
    await expect(
      form.getByLabel('Acabamento 2 para 15 g (g)', { exact: true }),
    ).toHaveValue('0,63');
    await form
      .getByRole('button', { name: 'Salvar ficha por peso', exact: true })
      .click();
    await expect(form).toBeHidden();
    expect(
      (
        await call('p1/weight-recipes/' + recipe, undefined, 'GET')
      ).data.components[1].sizes.find((s) => s.weight_grams === 15),
    ).toMatchObject({ quantity_milli: 630, estimated: true });
    await owner
      .getByText('Forminhas, opcionais e canal iFood', { exact: true })
      .click();
    await owner
      .getByLabel('Custos incalculáveis (%)', { exact: true })
      .fill('25');
    await owner
      .getByRole('button', {
        name: 'Salvar configuração de custos',
        exact: true,
      })
      .click();
    await expect(owner.getByRole('status')).toContainText('Dados salvos');
    await expect
      .poll(
        async () =>
          (await call('p1/costing-settings', undefined, 'GET')).data
            .overhead_bps,
      )
      .toBe(2500);
  } finally {
    await op.close();
    await admin.close();
    await t.dispose();
  }
});

test('R16 cria ficha de sabor sem variante com rendimento sugerido editável', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, ids } = await weightCostingProject(t);
    const product = (
      await call('products', {
        name: 'Beijinho DEMONSTRAÇÃO',
        photo_key: 'beijinho',
        variants: [],
      })
    ).id;
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/fichas/peso');
    await p
      .getByRole('button', { name: 'Nova ficha por peso', exact: true })
      .click();
    const form = p.locator('form').filter({
      has: p.getByRole('heading', {
        name: 'Nova ficha por peso',
        exact: true,
      }),
    });
    await form
      .getByLabel('Sabor da ficha', { exact: true })
      .selectOption(product);
    await expect(
      form.getByLabel('Doces por receita', { exact: true }),
    ).toHaveValue('17');
    await form
      .getByLabel('Rendimento de referência conferido', { exact: true })
      .check();
    await form
      .getByRole('button', { name: 'Adicionar insumo da massa', exact: true })
      .click();
    await form.getByLabel('Insumo 1', { exact: true }).selectOption(ids.dough);
    await form.getByLabel(/^Quantidade por receita 1/).fill('1');
    await form
      .getByRole('button', { name: 'Salvar ficha por peso', exact: true })
      .click();
    await expect(form).toBeHidden();
    const stored = (
      await call('p1/weight-recipes', undefined, 'GET')
    ).items.find((r) => r.product_id === product);
    expect(stored.data.reference_yield).toBe(17);
    expect(stored.data.reference_confirmed).toBe(true);
    expect(
      (await call('products/' + product, undefined, 'GET')).variants,
    ).toEqual([]);
  } finally {
    await c.close();
    await t.dispose();
  }
});

test('R16 sem0023 preserva fichas anteriores e não oferece calculadora', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    migrationLimit: 22,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/fichas');
    await expect(
      p.getByRole('heading', { name: 'Nova ficha', exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole('link', { name: 'Calculadora por peso', exact: true }),
    ).toHaveCount(0);
  } finally {
    await c.close();
    await t.dispose();
  }
});
