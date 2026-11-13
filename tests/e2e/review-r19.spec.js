import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
// Fixtures DEMONSTRAÇÃO, banco efêmero e CSP real.
test('R19 kit padrão salvo no cliente permite adicionar um kit com um toque', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    mixedEnabled: true,
    fieldEnabled: true,
  });
  const owner = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  const op = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, customer, variant } = await demoProject(t);
    const kit = (
      await call('p1/kits', {
        weight_grams: 15,
        units_per_kit: 25,
        price_cents: 12345,
        max_flavors: 5,
      })
    ).id;
    await call('p1/kits', {
      weight_grams: 30,
      units_per_kit: 12,
      price_cents: 4200,
      max_flavors: 3,
    });
    await call('products', {
      name: 'Produto com variantes DEMONSTRAÇÃO',
      variants: [
        {
          label: 'A DEMONSTRAÇÃO',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: 100,
        },
        {
          label: 'B DEMONSTRAÇÃO',
          weight_grams: 30,
          units_per_box: 12,
          price_cents: 100,
        },
      ],
    });
    const admin = await owner.newPage();
    await admin.goto(t.url + '/api/access/start');
    await admin.goto(t.url + '/gestao/kits');
    await expect(admin.getByRole('note')).toContainText(
      'cadastre um produto por sabor',
    );
    await admin.goto(t.url + '/gestao/clientes/' + customer + '/b2b');
    await admin
      .getByRole('group', { name: 'Kit padrão do cliente', exact: true })
      .getByRole('button', { name: 'Kit 25 · 15 g', exact: true })
      .click();
    await admin
      .getByRole('button', { name: 'Salvar padrões do cliente', exact: true })
      .click();
    await expect(admin.getByRole('status')).toContainText('Padrões salvos');
    expect(
      (
        await call(
          'finance/customers/' + customer + '/profile',
          undefined,
          'GET',
        )
      ).data.default_kit_id,
    ).toBe(kit);
    await op.addInitScript(() => {
      window.__r19Csp = [];
      window.addEventListener('securitypolicyviolation', (e) =>
        window.__r19Csp.push(e.violatedDirective),
      );
    });
    const page = await op.newPage();
    await page.goto(t.url + '/api/access/start');
    await page.goto(t.url + '/gestao/pedidos?novo=1');
    await page
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await expect(
      page
        .getByRole('group', { name: 'Kit deste pedido', exact: true })
        .getByRole('button', { name: /Kit 25 · 15 g/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Trocar kit', exact: true }).click();
    await page
      .getByRole('group', { name: 'Kit deste pedido', exact: true })
      .getByRole('button', { name: /Kit 12 · 30 g/ })
      .click();
    await page.getByRole('button', { name: 'Trocar kit', exact: true }).click();
    await page
      .getByRole('group', { name: 'Kit deste pedido', exact: true })
      .getByRole('button', { name: /Kit 25 · 15 g/ })
      .click();
    await expect(page.getByRole('note')).toContainText(
      'cadastre um produto por sabor',
    );
    await page
      .getByRole('button', {
        name: 'Adicionar kit de Produto DEMONSTRAÇÃO P1',
        exact: true,
      })
      .click();
    await expect(
      page.getByLabel('Quantos kits iguais de Kit 25 · 15 g', { exact: true }),
    ).toHaveValue('1');
    await expect(
      page.getByRole('button', { name: /^Continuar/ }),
    ).toContainText('R$ 123,45');
    await page.getByRole('button', { name: /^Continuar/ }).click();
    await page.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await page.getByRole('button', { name: '14:00', exact: true }).click();
    await page.getByRole('button', { name: /^Continuar/ }).click();
    await page.getByRole('button', { name: /^Retirada/ }).click();
    const review = page.getByRole('heading', {
      name: 'Revise e confirme',
      exact: true,
    });
    for (let n = 0; n < 3 && !(await review.isVisible()); n++)
      await page.getByRole('button', { name: /^Continuar/ }).click();
    await expect(review).toBeVisible();
    await page
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    ).toBeVisible();
    const order = (await call('orders', undefined, 'GET'))[0];
    expect(order.total_cents).toBe(12345);
    expect(order.items[0].kit_id).toBe(kit);
    expect(order.items[0].components).toHaveLength(1);
    expect(order.items[0].components[0].units).toBe(25);
    expect(await page.evaluate(() => window.__r19Csp)).toEqual([]);
    if (
      process.env.R19_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    ) {
      // Só captura em contexto separado: screenshot do WebKit injeta CSS. Fluxo acima não usa bypass.
      const capture = await browser.newContext({
        viewport: { width: 390, height: 844 },
        bypassCSP: true,
        extraHTTPHeaders: {
          'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
        },
      });
      try {
        const photo = await capture.newPage();
        await photo.goto(t.url + '/api/access/start');
        await photo.goto(t.url + '/gestao/pedidos?novo=1');
        await photo
          .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
          .click();
        await expect(
          photo.getByRole('button', {
            name: 'Adicionar kit de Produto DEMONSTRAÇÃO P1',
            exact: true,
          }),
        ).toBeEnabled();
        await photo.screenshot({
          path: 'docs/colaboracao/capturas/r19-depois-toque-rapido.png',
          fullPage: false,
        });
        await photo
          .getByRole('button', { name: 'Montar kit', exact: true })
          .click();
        await expect(
          photo
            .getByRole('group', { name: 'Quantidade por kit', exact: true })
            .getByRole('button', { name: /25 doces/ }),
        ).toHaveAttribute('aria-pressed', 'true');
        const rows = photo.locator('.kit-composition .mix-row');
        await expect(rows).toHaveCount(2);
        await photo
          .getByRole('button', {
            name: 'Mais Produto DEMONSTRAÇÃO P1',
            exact: true,
          })
          .click();
        await photo.screenshot({
          path: 'docs/colaboracao/capturas/r19-depois-montagem-compacta.png',
          fullPage: true,
        });
      } finally {
        await capture.close();
      }
    }
    // Modelo antigo mantém seu preço e sua grade visível, sem adição dupla de kit.
    const legacyCustomer = (
      await call('customers', {
        name: 'Estabelecimento legado DEMONSTRAÇÃO',
        phone: '+5511900000001',
      })
    ).id;
    await call('recurring', {
      name: 'Modelo legado DEMONSTRAÇÃO',
      customer_id: legacyCustomer,
      weekday: 1,
      time: '10:00',
      delivery_type: 'pickup',
      items: [{ variant_id: variant, quantity: 1 }],
    });
    const legacyPage = await op.newPage();
    await legacyPage.goto(t.url + '/gestao/pedidos?novo=1');
    await legacyPage
      .getByRole('button', {
        name: 'Estabelecimento legado DEMONSTRAÇÃO',
        exact: true,
      })
      .click();
    const legacySection = legacyPage.locator('details').filter({
      has: legacyPage.getByText('Embalagens anteriores', { exact: true }),
    });
    await expect(legacySection).toHaveAttribute('open', '');
    await expect(
      legacyPage.getByRole('button', { name: /^Continuar/ }),
    ).toContainText('R$ 10,00');
    await expect(
      legacyPage.getByRole('button', {
        name: 'Adicionar kit de Produto DEMONSTRAÇÃO P1',
        exact: true,
      }),
    ).toHaveCount(0);
  } finally {
    await owner.close();
    await op.close();
    await t.dispose();
  }
});
