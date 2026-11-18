import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const stage = process.env.T10_CAPTURE;
const flags = {
  browserHTTP: true,
  mobileEnabled: true,
  mixedEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  fieldEnabled: true,
};
async function setup(browser, kits = false) {
  const t = await runtime(flags);
  const fixture = await demoProject(t);
  const names = [
    'Sabor comprido de Amendoim DEMONSTRAÇÃO',
    'Sabor B DEMONSTRAÇÃO',
  ];
  const flavors = [];
  for (const name of names) {
    const p = await fixture.call('products', {
      name,
      variants: [
        {
          label: 'Caixa 12 un.',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: 3600,
        },
      ],
    });
    const product = await fixture.call('products/' + p.id, undefined, 'GET');
    flavors.push({ ...product, variant: product.variants[0].id });
  }
  const kit = kits
    ? await fixture.call('p1/kits', {
        weight_grams: 30,
        units_per_kit: 12,
        price_cents: 5000,
        max_flavors: 3,
        packaging_supply_id: null,
      })
    : null;
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  const p = await c.newPage();
  await p.goto(t.url + '/api/access/start');
  return { t, c, p, ...fixture, flavors, names, kit };
}
async function shot(p, name, info) {
  if (stage && info.project.name === 'chromium-mobile') {
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({
      path: `docs/colaboracao/capturas/t10-${stage}-${name}.png`,
      animations: 'disabled',
      scale: 'css',
    });
  }
}
async function start(x) {
  await x.p.goto(x.t.url + '/gestao');
  await x.p.getByRole('link', { name: 'Novo pedido', exact: true }).click();
  await x.p
    .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
    .click();
  await expect(
    x.p.getByRole('button', { name: /Montar caixa mista/ }),
  ).toBeEnabled();
}
async function mix(p, name) {
  await p.getByRole('button', { name: /Montar caixa mista/ }).click();
  const sheet = p.getByRole('dialog', {
    name: 'Montar caixa mista',
    exact: true,
  });
  await sheet
    .getByRole('button', { name: 'Mais ' + name, exact: true })
    .click();
  await sheet
    .getByRole('button', { name: 'Completar com ' + name, exact: true })
    .click();
  return sheet;
}
async function review(p) {
  await p.getByRole('button', { name: /^Continuar/ }).click();
  await p.getByRole('button', { name: 'Amanhã', exact: true }).click();
  await p.getByRole('button', { name: '14:00', exact: true }).click();
  await p.getByRole('button', { name: /^Continuar/ }).click();
  await p.getByRole('button', { name: /^Retirada/ }).click();
  await p.getByRole('button', { name: /^Continuar/ }).click();
  await p.getByRole('button', { name: 'Na entrega', exact: true }).click();
  await p.getByRole('button', { name: /^Continuar/ }).click();
  await expect(
    p.getByRole('heading', { name: 'Revise e confirme', exact: true }),
  ).toBeVisible();
}
test('T10 montagem e revisão: capturas DEMONSTRAÇÃO', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const x = await setup(browser);
  try {
    await start(x);
    await x.p
      .getByRole('button', { name: x.names[0] + ', adicionar', exact: true })
      .click();
    await shot(x.p, 'sabores', info);
    const sheet = await mix(x.p, x.names[0]);
    await shot(x.p, 'montagem', info);
    await sheet
      .getByRole('button', { name: 'Adicionar caixa mista', exact: true })
      .click();
    await review(x.p);
    await shot(x.p, 'revisao', info);
  } finally {
    await x.c.close();
    await x.t.dispose();
  }
});
const selection = (p) =>
  p.evaluate(() =>
    Object.fromEntries(
      Object.entries(sessionStorage).filter(([key]) =>
        key.startsWith('az-order-draft:'),
      ),
    ),
  );
async function putSelection(x, draft) {
  const session = await x.call('session', undefined, 'GET', x.operator);
  const key = `az-order-draft:${session.organization_id}:${session.user_id}`;
  await x.p.evaluate(
    ({ key, draft }) => {
      sessionStorage.setItem(key, JSON.stringify(draft));
      dispatchEvent(new Event('order-draft-changed'));
    },
    { key, draft },
  );
  return key;
}
async function checkBounds(parent, children) {
  const box = await parent.boundingBox();
  for (const child of await children.all()) {
    const rect = await child.boundingBox();
    expect(rect.x).toBeGreaterThanOrEqual(box.x - 1);
    expect(rect.x + rect.width).toBeLessThanOrEqual(box.x + box.width + 1);
    // 3 colunas no celular: alvos de 36 px (acima do mínimo de 24 px da WCAG 2.2).
    expect(rect.width).toBeGreaterThanOrEqual(36);
    expect(rect.height).toBeGreaterThanOrEqual(36);
  }
}
test('T10 primeira retomada depois de Voltar do navegador, com catálogo lento e modo completo salvo', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const x = await setup(browser);
  try {
    await start(x);
    await x.p
      .getByRole('button', { name: x.names[1] + ', adicionar', exact: true })
      .click();
    const sheet = await mix(x.p, x.names[0]);
    await sheet
      .getByRole('textbox', { name: 'Caixas mistas iguais', exact: true })
      .fill('2');
    await sheet
      .getByRole('button', { name: 'Adicionar caixa mista', exact: true })
      .click();
    await expect
      .poll(
        async () =>
          JSON.parse(Object.values(await selection(x.p))[0] ?? 'null')?.items
            .length,
      )
      .toBe(2);
    const saved = await selection(x.p);
    await x.p.goBack();
    const resume = x.p.getByRole('link', {
      name: 'Retomar seleção',
      exact: true,
    });
    await expect(resume).toBeVisible();
    // A preferência completa não pode engolir a intenção explícita de retomar no assistente.
    await x.p.evaluate(() =>
      localStorage.setItem('az-order-mode-operator', 'full'),
    );
    let release;
    const gate = new Promise((r) => {
      release = r;
    });
    let intercepted;
    const requested = new Promise((r) => {
      intercepted = r;
    });
    await x.p.route('**/api/products', async (route) => {
      intercepted();
      await gate;
      await route.continue();
    });
    await resume.click();
    await requested;
    try {
      expect(await selection(x.p)).toEqual(saved);
    } finally {
      release();
    }
    await expect(
      x.p.getByRole('status').filter({ hasText: 'Seleção recuperada' }),
    ).toBeVisible();
    await expect(
      x.p.getByRole('button', { name: 'Recuperar seleção', exact: true }),
    ).toHaveCount(0);
    await expect(x.p.locator('.totem-customer')).toHaveText(
      'Cliente DEMONSTRAÇÃO P1',
    );
    await expect(x.p.locator('.mix-line')).toContainText('2 cx');
    await expect(x.p.locator('.mix-line')).toContainText('12 ' + x.names[0]);
    await expect(
      x.p.locator('.quantity-badge', { hasText: '2' }).first(),
    ).toBeVisible();
    expect(await selection(x.p)).toEqual(saved);
    await shot(x.p, 'retomada', info);
    expect(await x.call('orders', undefined, 'GET')).toHaveLength(0);
  } finally {
    await x.c.close();
    await x.t.dispose();
  }
});
test('T10 app recém-aberto recupera misto+kit; rascunho tardio não é sobrescrito pelo cliente vazio', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const x = await setup(browser, true);
  const draft = {
    customer_id: x.customer,
    order_id: null,
    items: [
      { variant_id: x.flavors[1].variant, quantity: 1 },
      {
        variant_id: x.flavors[0].variant,
        quantity: 2,
        components: [
          { variant_id: x.flavors[0].variant, units: 6 },
          { variant_id: x.flavors[1].variant, units: 6 },
        ],
      },
    ],
    kit_items: [
      {
        kit_id: x.kit.id,
        quantity: 3,
        components: [{ product_id: x.flavors[0].id, units: 12 }],
      },
    ],
  };
  try {
    await putSelection(x, draft);
    await x.p.reload();
    await x.p
      .getByRole('link', { name: 'Retomar seleção', exact: true })
      .click();
    await expect(
      x.p.getByRole('status').filter({ hasText: 'Seleção recuperada' }),
    ).toBeVisible();
    await expect(x.p.locator('.mix-line')).toContainText('6 ' + x.names[1]);
    await review(x.p);
    await expect(
      x.p.getByRole('textbox', {
        name: 'Revisar quantidade de Caixa mista',
        exact: true,
      }),
    ).toHaveValue('2');
    await expect(
      x.p.getByRole('textbox', { name: /^Revisar quantidade de Kit/ }),
    ).toHaveValue('3');
    // Montagem já aberta, escopo presente: rascunho chega por evento depois dos dados.
    await x.p.goto(x.t.url + '/gestao/pedidos?novo=1');
    const prompt = x.p.getByRole('complementary', {
      name: 'Recuperar seleção',
    });
    await expect(prompt).toBeVisible();
    await prompt
      .getByRole('button', { name: 'Descartar seleção', exact: true })
      .click();
    await x.p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await expect(
      x.p.getByRole('status').filter({ hasText: 'Preenchendo' }),
    ).toHaveCount(0);
    const key = await putSelection(x, draft);
    await expect(prompt).toBeVisible();
    expect(JSON.parse((await selection(x.p))[key])).toEqual(draft);
    await prompt
      .getByRole('button', { name: 'Recuperar seleção', exact: true })
      .click();
    await expect(
      x.p.getByRole('status').filter({ hasText: 'Seleção recuperada' }),
    ).toBeVisible();
    expect(JSON.parse((await selection(x.p))[key])).toEqual(draft);
    expect(JSON.stringify(await selection(x.p))).not.toMatch(
      /DEMONSTRAÇÃO|price|address|dupAck|notes/,
    );
  } finally {
    await x.c.close();
    await x.t.dispose();
  }
});
test('T10 geometria 320–430, caixas iguais e remoção cancelável na revisão', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const x = await setup(browser);
  try {
    await start(x);
    await x.p
      .getByRole('button', { name: x.names[0] + ', adicionar', exact: true })
      .click();
    for (const width of [320, 360, 390, 430]) {
      await x.p.setViewportSize({ width, height: 844 });
      const card = x.p.locator('.flavor-card').filter({
        has: x.p.getByRole('button', {
          name: x.names[0] + ', 1 embalagem, adicionar',
          exact: true,
        }),
      });
      await checkBounds(card, card.locator('.flavor-stepper button'));
      if (width === 320) await shot(x.p, 'sabores-320', info);
      expect(
        await x.p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await x.p.setViewportSize({ width: 390, height: 844 });
    const sheet = await mix(x.p, x.names[0]);
    const quantity = sheet.getByRole('textbox', {
      name: 'Caixas mistas iguais',
      exact: true,
    });
    await expect(quantity).toHaveValue('1');
    await expect(
      sheet.getByRole('button', {
        name: 'Diminuir Caixas mistas iguais',
        exact: true,
      }),
    ).toBeDisabled();
    await quantity.fill('2');
    await sheet
      .getByRole('button', { name: 'Adicionar caixa mista', exact: true })
      .click();
    await expect(x.p.getByLabel('Caixas mistas adicionadas')).toHaveText('2');
    await expect(x.p.locator('.mix-card-hint')).toHaveCSS(
      'text-align',
      'center',
    );
    await x.p.getByRole('button', { name: /Montar caixa mista/ }).click();
    await expect(
      sheet.getByRole('textbox', { name: 'Caixas mistas iguais', exact: true }),
    ).toHaveValue('1');
    await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(x.p.getByLabel('Caixas mistas adicionadas')).toHaveText('2');
    await review(x.p);
    await expect(x.p.locator('.review-customer')).toHaveText(
      'Cliente: Cliente DEMONSTRAÇÃO P1',
    );
    const normal = x.p.locator('.review-line').filter({
      has: x.p.getByRole('heading', { name: x.names[0], exact: true }),
    });
    await expect(normal.locator('.review-packaging')).toHaveText(
      'Caixa 12 un.',
    );
    const sizes = await x.p
      .locator('.review-line .quantity-control')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    await normal
      .getByRole('button', { name: 'Remover ' + x.names[0], exact: true })
      .click();
    const confirm = x.p.getByRole('dialog', {
      name: 'Tem certeza?',
      exact: true,
    });
    await expect(confirm).toContainText(
      'Remover ' + x.names[0] + ' do pedido?',
    );
    await shot(x.p, 'remover-item', info);
    await confirm
      .getByRole('button', { name: 'Cancelar', exact: true })
      .click();
    await expect(normal).toBeVisible();
    await normal
      .getByRole('button', { name: 'Remover ' + x.names[0], exact: true })
      .click();
    await confirm.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(normal).toHaveCount(0);
    await x.p
      .getByRole('button', {
        name: 'Diminuir Revisar quantidade de Caixa mista',
        exact: true,
      })
      .click();
    await x.p
      .getByRole('button', { name: 'Remover Caixa mista', exact: true })
      .click();
    await confirm.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(x.p.locator('.totem-hint')).toContainText(
      'Escolha os sabores',
    );
    await expect(
      x.p.getByRole('heading', { name: 'Revise e confirme' }),
    ).toHaveCount(0);
    expect(await x.call('orders', undefined, 'GET')).toHaveLength(0);
  } finally {
    await x.c.close();
    await x.t.dispose();
  }
});
test('T10 motivo obrigatório, cancelar não grava; sessão expirada cancela a folha', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const x = await setup(browser);
  try {
    const id = await x.makeOrder();
    await x.p.goto(x.t.url + '/gestao/pedidos/' + id);
    const calls = [];
    x.p.on('request', (r) => {
      if (r.method() === 'POST' && r.url().includes('/status')) calls.push(r);
    });
    await x.p
      .getByRole('button', { name: 'Cancelar pedido', exact: true })
      .click();
    const sheet = x.p.getByRole('dialog', {
      name: 'Informe o motivo',
      exact: true,
    });
    await expect(
      sheet.getByRole('button', { name: 'Continuar', exact: true }),
    ).toBeDisabled();
    await sheet.getByRole('textbox').fill('   ');
    await expect(
      sheet.getByRole('button', { name: 'Continuar', exact: true }),
    ).toBeDisabled();
    await sheet
      .getByRole('textbox')
      .fill('Pedido de DEMONSTRAÇÃO cancelado para teste');
    await shot(x.p, 'motivo', info);
    await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(calls).toHaveLength(0);
    expect((await x.call('orders/' + id, undefined, 'GET')).status).toBe(
      'confirmed',
    );
    await x.p
      .getByRole('button', { name: 'Cancelar pedido', exact: true })
      .click();
    await sheet
      .getByRole('textbox')
      .fill('Pedido de DEMONSTRAÇÃO cancelado para teste');
    await sheet.getByRole('button', { name: 'Continuar', exact: true }).click();
    const confirm = x.p.getByRole('dialog', {
      name: 'Tem certeza?',
      exact: true,
    });
    await confirm
      .getByRole('button', { name: 'Cancelar', exact: true })
      .click();
    expect(calls).toHaveLength(0);
    await x.p
      .getByRole('button', { name: 'Cancelar pedido', exact: true })
      .click();
    await sheet
      .getByRole('textbox')
      .fill('Pedido de DEMONSTRAÇÃO cancelado para teste');
    await sheet.getByRole('button', { name: 'Continuar', exact: true }).click();
    await confirm
      .getByRole('button', { name: 'Cancelar pedido', exact: true })
      .click();
    await expect
      .poll(async () => (await x.call('orders/' + id, undefined, 'GET')).status)
      .toBe('cancelled');
    expect(calls).toHaveLength(1);
    // A folha não pode sobreviver a uma perda real da sessão.
    const next = await x.makeOrder();
    await x.p.goto(x.t.url + '/gestao/pedidos/' + next);
    await x.p
      .getByRole('button', { name: 'Cancelar pedido', exact: true })
      .click();
    await sheet
      .getByRole('textbox')
      .fill('Motivo que não será enviado DEMONSTRAÇÃO');
    await x.t.db
      .prepare(
        "UPDATE sessions SET expires_at=unixepoch()-1 WHERE organization_id=? AND user_id=(SELECT id FROM users WHERE email='operator@example.test')",
      )
      .bind(x.t.org)
      .run();
    await x.p.evaluate(() => dispatchEvent(new Event('focus')));
    await expect(
      x.p.getByRole('heading', { name: 'Gestão restrita', exact: true }),
    ).toBeVisible();
    expect(calls).toHaveLength(1);
    expect((await x.call('orders/' + next, undefined, 'GET')).status).toBe(
      'confirmed',
    );
  } finally {
    await x.c.close();
    await x.t.dispose();
  }
});
test('T10 retirar o último kit exige confirmação e retorna aos sabores', async ({
  browser,
}) => {
  const x = await setup(browser, true);
  try {
    await putSelection(x, {
      customer_id: x.customer,
      order_id: null,
      items: [],
      kit_items: [
        {
          kit_id: x.kit.id,
          quantity: 1,
          components: [{ product_id: x.flavors[0].id, units: 12 }],
        },
      ],
    });
    await x.p.reload();
    await x.p
      .getByRole('link', { name: 'Retomar seleção', exact: true })
      .click();
    await expect(
      x.p.getByRole('status').filter({ hasText: 'Seleção recuperada' }),
    ).toBeVisible();
    await review(x.p);
    const remove = x.p.getByRole('button', {
      name: 'Remover Kit 12 · 30 g',
      exact: true,
    });
    await remove.click();
    const confirm = x.p.getByRole('dialog', {
      name: 'Tem certeza?',
      exact: true,
    });
    await confirm
      .getByRole('button', { name: 'Cancelar', exact: true })
      .click();
    await expect(remove).toBeVisible();
    await remove.click();
    await confirm.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(
      x.p.getByRole('heading', { name: 'Revise e confirme' }),
    ).toHaveCount(0);
    await expect(x.p.locator('.totem-hint')).toContainText(
      'Escolha o kit e os sabores',
    );
    await expect(
      x.p.getByRole('button', { name: /^Continuar/ }),
    ).toBeDisabled();
    expect(await x.call('orders', undefined, 'GET')).toHaveLength(0);
  } finally {
    await x.c.close();
    await x.t.dispose();
  }
});
test('T10 estorno de crédito: valor pré-preenchido, limites, cancelamento e motivo em sequência', async ({
  browser,
}, info) => {
  const x = await setup(browser);
  try {
    await x.c.clearCookies();
    await x.c.setExtraHTTPHeaders({
      'Cf-Access-Jwt-Assertion': await x.t.token('owner@example.test'),
    });
    await x.p.goto(x.t.url + '/api/access/start');
    const root = 'finance/customers/' + x.customer;
    const view = await x.call(root, undefined, 'GET');
    await x.call(root + '/credit', {
      version: view.version,
      amount_cents: 1200,
      method: 'pix',
      paid_on: '2025-01-01',
    });
    await x.p.goto(x.t.url + '/gestao/financeiro/' + x.customer);
    const refund = x.p.getByRole('button', { name: /^Estornar crédito / });
    await refund.click();
    const sheet = x.p.getByRole('dialog', {
      name: 'Valor do estorno',
      exact: true,
    });
    const input = sheet.getByRole('textbox');
    const next = sheet.getByRole('button', { name: 'Continuar', exact: true });
    await expect(input).toHaveValue('12,00');
    await expect(input).toHaveAttribute('inputmode', 'decimal');
    for (const raw of ['0,00', '12,01', '-1,00', '1.50']) {
      await input.fill(raw);
      await expect(next).toBeDisabled();
    }
    await input.fill('1,50');
    await shot(x.p, 'valor-estorno', info);
    await next.click();
    const reason = x.p.getByRole('dialog', {
      name: 'Informe o motivo',
      exact: true,
    });
    await expect(
      reason.getByRole('button', { name: 'Continuar', exact: true }),
    ).toBeDisabled();
    await reason.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect((await x.call(root, undefined, 'GET')).available_credit_cents).toBe(
      1200,
    );
    await refund.click();
    await expect(input).toHaveValue('12,00');
    await input.fill('1,50');
    await next.click();
    await reason.getByRole('textbox').fill('Devolução DEMONSTRAÇÃO');
    await reason
      .getByRole('button', { name: 'Continuar', exact: true })
      .click();
    await x.p
      .getByRole('dialog', { name: 'Tem certeza?', exact: true })
      .getByRole('button', { name: 'Estornar', exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await x.call(root, undefined, 'GET')).available_credit_cents,
      )
      .toBe(1050);
  } finally {
    await x.c.close();
    await x.t.dispose();
  }
});
