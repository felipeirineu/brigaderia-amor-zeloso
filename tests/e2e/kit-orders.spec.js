import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
async function adjustUnits(page, name, target) {
  const output = page.getByLabel('Unidades de ' + name, { exact: true });
  let current = Number(await output.textContent());
  while (current !== target) {
    await page
      .getByRole('button', {
        name: (current < target ? 'Mais ' : 'Menos ') + name,
        exact: true,
      })
      .click();
    current = Number(await output.textContent());
  }
}
// Somente fixtures DEMONSTRAÇÃO; nenhum cadastro remoto.
test('R15-B monta kit25/15g com cinco sabores no celular e PC preserva preço ao editar quantidade', async ({
  browser,
}, info) => {
  test.setTimeout(120000);
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    mixedEnabled: true,
    fieldEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  const pc = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call } = await demoProject(t);
    const products = await call('products', undefined, 'GET');
    const names = [products[0].name];
    for (let n = 1; n < 5; n++) {
      const name = `Sabor ${n} DEMONSTRAÇÃO`;
      names.push(name);
      await call('products', {
        name,
        variants: [
          {
            label: 'Embalagem DEMONSTRAÇÃO',
            weight_grams: 30,
            units_per_box: 12,
            price_cents: 500,
          },
        ],
      });
    }
    const data = {
      weight_grams: 15,
      dough_weight_grams: 13,
      units_per_kit: 25,
      price_cents: 12345,
      max_flavors: 5,
    };
    const kit = (await call('p1/kits', data)).id;
    await call('p1/kits', {
      weight_grams: 30,
      units_per_kit: 12,
      price_cents: 4200,
      max_flavors: 3,
    });
    await c.addInitScript(() => {
      window.__kitCsp = [];
      window.addEventListener('securitypolicyviolation', (e) =>
        window.__kitCsp.push(e.violatedDirective),
      );
    });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await p.getByRole('button', { name: 'Montar kit', exact: true }).click();
    for (const name of names.slice(0, 3)) await adjustUnits(p, name, 1);
    await expect(
      p.getByRole('button', { name: 'Mais ' + names[3], exact: true }),
    ).toBeDisabled();
    await p
      .getByRole('button', {
        name: 'Escolher ' + names[0] + ' para completar',
        exact: true,
      })
      .click();
    await p
      .getByRole('button', { name: 'Completar com ' + names[0], exact: true })
      .click();
    await expect(
      p.getByRole('button', { name: 'Adicionar kit ao pedido', exact: true }),
    ).toBeEnabled();
    await p
      .getByRole('button', { name: 'Limpar sabores', exact: true })
      .click();
    await p
      .getByRole('group', { name: 'Tamanho do kit', exact: true })
      .getByRole('button', { name: '15 g', exact: true })
      .click();
    const apply = p.getByRole('button', {
      name: 'Adicionar kit ao pedido',
      exact: true,
    });
    await expect(apply).toBeDisabled();
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(p.getByRole('button', { name: /^Continuar/ })).toBeDisabled();
    for (const name of names) await adjustUnits(p, name, 5);
    await expect(
      p.getByRole('status').filter({ hasText: 'Kit completo' }),
    ).toContainText('Até 5 sabores (5 escolhidos)');
    await apply.click();
    await expect(p.getByRole('button', { name: /^Continuar/ })).toContainText(
      'R$ 123,45',
    );
    await expect(
      p.getByRole('navigation', { name: 'Atalhos do celular' }),
    ).toBeHidden();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await p.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await p.getByRole('button', { name: '14:00', exact: true }).click();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await p.getByRole('button', { name: /^Retirada/ }).click();
    const review = p.getByRole('heading', {
      name: 'Revise e confirme',
      exact: true,
    });
    for (let n = 0; n < 3 && !(await review.isVisible()); n++)
      await p.getByRole('button', { name: /^Continuar/ }).click();
    await expect(review).toBeVisible();
    await expect(p.locator('.review-line').first()).toContainText(
      'Kit 25 · 15 g',
    );
    await p
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    await expect(
      p.getByRole('heading', { name: 'Pedido confirmado', exact: true }),
    ).toBeVisible();
    expect(await p.evaluate(() => window.__kitCsp)).toEqual([]);
    let order = (await call('orders', undefined, 'GET'))[0];
    expect(order.total_cents).toBe(12345);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].components).toHaveLength(5);
    await call(
      'p1/kits/' + kit,
      { ...data, price_cents: 22222, version: 1 },
      'PUT',
    );
    await call('orders/' + order.id + '/status', {
      version: 1,
      to: 'awaiting_confirmation',
      reason: 'Revisão DEMONSTRAÇÃO de quantidade',
    });
    const desktop = await pc.newPage();
    // A regressão cobre o editor completo por escolha explícita, mesmo com o novo padrão simples.
    await desktop.addInitScript(() =>
      localStorage.setItem('az-order-mode-owner', 'full'),
    );
    await desktop.goto(t.url + '/api/access/start');
    await desktop.goto(t.url + '/gestao/pedidos');
    await desktop
      .getByRole('button', {
        name: 'Editar pedido de Cliente DEMONSTRAÇÃO P1',
        exact: true,
      })
      .click();
    await expect(
      desktop.getByLabel('Quantos kits iguais de Kit 25 · 15 g', {
        exact: true,
      }),
    ).toHaveValue('1');
    await desktop
      .getByLabel('Quantos kits iguais de Kit 25 · 15 g', { exact: true })
      .fill('2');
    await desktop
      .getByRole('button', { name: 'Salvar pedido', exact: true })
      .click();
    await expect(desktop.getByRole('status')).toContainText(
      'Alteração salva no servidor.',
    );
    order = await call('orders/' + order.id, undefined, 'GET');
    expect(order.total_cents).toBe(24690);
    expect(order.items[0].quantity).toBe(2);
    expect(order.items[0].components).toHaveLength(5);
    if (
      process.env.R15_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    ) {
      // Apenas captura: screenshot do WebKit injeta CSS. Os contextos funcionais acima usam CSP real.
      const capture = await browser.newContext({
        viewport: { width: 390, height: 844 },
        bypassCSP: true,
        extraHTTPHeaders: {
          'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
        },
      });
      try {
        const photo = await capture.newPage();
        await photo.goto(t.url + '/api/access/start');
        await photo.goto(
          t.url + '/gestao/pedidos/' + order.id + '/editar-simples',
        );
        await expect(
          photo.getByLabel('Quantos kits iguais de Kit 25 · 15 g', {
            exact: true,
          }),
        ).toHaveValue('2');
        await photo.screenshot({
          path: 'docs/colaboracao/capturas/r15-depois-pedido-kit.png',
          fullPage: false,
        });
        await photo
          .getByRole('button', {
            name: 'Editar sabores de Kit 25 · 15 g',
            exact: true,
          })
          .click();
        await expect(
          photo.getByRole('status').filter({ hasText: 'Kit completo' }),
        ).toBeVisible();
        await photo.screenshot({
          path: 'docs/colaboracao/capturas/r15-depois-montagem-kit.png',
          fullPage: true,
        });
      } finally {
        await capture.close();
      }
    }
    await desktop
      .getByRole('button', {
        name: 'Editar pedido de Cliente DEMONSTRAÇÃO P1',
        exact: true,
      })
      .click();
    await desktop
      .getByRole('button', {
        name: 'Editar sabores de Kit 25 · 15 g',
        exact: true,
      })
      .click();
    await adjustUnits(desktop, names[4], 0);
    await adjustUnits(desktop, names[0], 10);
    await expect(
      desktop.getByRole('status').filter({ hasText: 'Kit completo' }),
    ).toBeVisible();
    await desktop
      .getByRole('button', { name: 'Salvar sabores do kit', exact: true })
      .click();
    await expect(
      desktop.locator('[aria-label="Montagem do kit"]'),
    ).toBeHidden();
    await desktop
      .getByRole('button', { name: 'Salvar pedido', exact: true })
      .click();
    await expect(desktop.getByRole('status')).toContainText(
      'Alteração salva no servidor.',
    );
    order = await call('orders/' + order.id, undefined, 'GET');
    expect(order.total_cents).toBe(44444);
    expect(order.items[0].components).toHaveLength(4);
    expect(order.items[0].unit_price_cents).toBe(22222);
  } finally {
    await c.close();
    await pc.close();
    await t.dispose();
  }
});
