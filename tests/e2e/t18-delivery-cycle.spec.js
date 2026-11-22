import { expect, test } from '@playwright/test';
import { fortalezaDay, shiftDay } from '../../shared/workday.ts';
import { demoProject } from '../helpers/demo-project.mjs';
import { runtime } from '../helpers/runtime.mjs';

test('T18 configura a cobrança por entregas, confere mensagem e registra o ciclo no Hoje', async ({
  browser,
}, info) => {
  test.setTimeout(65000);
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    mixedEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, customer, operator, variant } = await demoProject(t);
    const today = fortalezaDay();
    const { profile } = await call(
      'mobile/defaults/' + customer,
      undefined,
      'GET',
    );
    const order = {
      customer_id: customer,
      due_at: today + 'T15:00:00Z',
      items: [{ variant_id: variant, quantity: 1 }],
      delivery: {
        delivery_type: 'delivery',
        delivery_address: 'Rua DEMONSTRAÇÃO T18',
        courier: 'partner',
      },
      terms: {
        ...profile.terms,
        mode: 'credit',
        cycle: 'deliveries',
        every_deliveries: 4,
        due_days: null,
      },
    };
    for (const offset of [-3, -2, -1])
      await call(
        'mobile/orders',
        { ...order, delivered_at: shiftDay(today, offset) + 'T12:00:00Z' },
        'POST',
        operator,
      );
    const secondProduct = await call('products', {
      name: 'Outro sabor DEMONSTRAÇÃO',
      variants: [
        {
          label: 'Embalagem fictícia',
          weight_grams: 10,
          units_per_box: 2,
          price_cents: 1000,
        },
      ],
    });
    const { variants } = await call(
      'products/' + secondProduct.id,
      undefined,
      'GET',
    );
    const last = await call(
      'mobile/orders',
      {
        ...order,
        composition_version: 1,
        items: [
          {
            variant_id: variant,
            quantity: 1,
            components: [
              { variant_id: variant, units: 1 },
              { variant_id: variants[0].id, units: 1 },
            ],
          },
        ],
      },
      'POST',
      operator,
    );
    const partial = await call('customers', {
      name: 'Outro cliente DEMONSTRAÇÃO T18',
    });
    await call(
      'mobile/orders',
      { ...order, customer_id: partial.id },
      'POST',
      operator,
    );
    const page = await context.newPage();
    async function capture(target, suffix) {
      if (
        process.env.T18_CAPTURE === '1' &&
        info.project.name === 'chromium-mobile'
      ) {
        await page.evaluate(() => document.fonts.ready);
        await target.screenshot({
          path: 'docs/colaboracao/capturas/t18-' + suffix + '.png',
          animations: 'disabled',
        });
      }
    }
    await page.goto(t.url + '/api/access/start');
    const panel = page.locator('.delivery-cycle-notice');
    await expect(
      page.getByText('1ª de 4 entregas · cobra na 4ª', { exact: true }),
    ).toBeVisible();
    await expect(panel).toContainText('Cobrar hoje · 4ª de 4 entregas');
    await expect(panel).toContainText('40,00');
    const mix = page.locator('.delivery-mix');
    const summary = mix.locator('summary');
    await summary.click();
    await expect(mix.locator('li').last()).toBeVisible();
    const summaryBox = await summary.boundingBox();
    const flavorBox = await mix.locator('li').first().boundingBox();
    expect(
      flavorBox.y - (summaryBox.y + summaryBox.height),
    ).toBeLessThanOrEqual(8);
    expect(summaryBox.height).toBeLessThanOrEqual(32);
    await summary.click();
    await expect(mix.locator('ul')).toBeHidden();

    await expect(
      panel.getByRole('button', { name: 'Registrar recebimento' }),
    ).toBeDisabled();
    await capture(panel, 'hoje');
    await panel.getByRole('button', { name: 'Cobrar no WhatsApp' }).click();
    const preview = page.getByRole('dialog', { name: 'Conferir cobrança' });
    await expect(preview.getByLabel('Texto para WhatsApp')).toHaveValue(
      /Previsão para o fechamento/,
    );
    await expect(
      preview.getByRole('link', {
        name: 'Abrir WhatsApp para conferir e enviar',
      }),
    ).toBeVisible();
    await preview.getByRole('button', { name: 'Fechar', exact: true }).click();
    for (const to of [
      'in_production',
      'ready',
      'out_for_delivery',
      'delivered',
    ]) {
      const saved = await call('orders/' + last.id, undefined, 'GET');
      await call(
        'orders/' + last.id + '/status',
        { version: saved.version, to },
        'POST',
        operator,
      );
    }
    await page.reload();
    await panel.getByRole('button', { name: 'Cobrar no WhatsApp' }).click();
    await expect(preview.getByLabel('Texto para WhatsApp')).toHaveValue(
      /Fechamos as últimas 4 entregas/,
    );
    await capture(preview, 'whatsapp');
    await preview.getByRole('button', { name: 'Fechar', exact: true }).click();
    await panel.getByRole('button', { name: 'Registrar recebimento' }).click();
    const receipt = page.getByRole('dialog', { name: 'Recebimento rápido' });
    await expect(receipt.getByLabel('Valor recebido (R$)')).toHaveValue(
      '40,00',
    );
    await receipt
      .getByRole('button', { name: 'Dinheiro', exact: true })
      .click();
    await receipt
      .getByRole('button', { name: 'Registrar', exact: true })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Recebimento rápido' }),
    ).toHaveCount(0);
    await page.goto(t.url + '/gestao/financeiro/' + customer);
    await expect(
      page.getByText('Entregas neste ciclo: 4 de 4', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /^A receber:/ }),
    ).toContainText('0,00');
    await capture(page.locator('.delivery-cycle-account'), 'conta');

    await page.goto(t.url + '/gestao/clientes/' + customer + '/b2b');
    await page.getByLabel('Quando cobrar').selectOption('credit');
    await page.getByLabel('Periodicidade').selectOption('deliveries');
    await expect(page.getByLabel('Pagar', { exact: true })).toHaveValue(
      'Na 4ª entrega (no dia dela)',
    );
    await page
      .getByRole('button', { name: 'Salvar padrões do cliente' })
      .click();
    await expect(page.getByRole('status')).toContainText('Padrões salvos');
    await page.goto(t.url + '/gestao/pedidos?novo=1');
    await page
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await page
      .getByRole('button', {
        name: 'Produto DEMONSTRAÇÃO P1, adicionar',
        exact: true,
      })
      .click();
    const next = () => page.getByRole('button', { name: /^Continuar/ }).click();
    await next();
    await page.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await page.getByRole('button', { name: '14:00', exact: true }).click();
    await next();
    await page
      .getByLabel('Endereço desta entrega')
      .fill('Rua DEMONSTRAÇÃO T18');
    await next();
    await expect(
      page.getByRole('button', { name: 'A cada X entregas' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /^Aumentar / }).click();
    await expect(page.getByLabel('Pagar', { exact: true })).toHaveValue(
      'Na 5ª entrega (no dia dela)',
    );
    await capture(page.locator('.delivery-cycle-editor'), 'pagamento');
    await next();
    await expect(page.getByLabel('Resumo do pedido')).toContainText(
      'A prazo · a cada 5 entregas',
    );
  } finally {
    await context.close();
    await t.dispose();
  }
});
