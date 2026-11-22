import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { fortalezaDay, shiftDay } from '../../shared/workday.ts';
import { deliveryDayLabel } from '../../shared/order-schedule.ts';
test('R12 calendário com contagem, sugestão editável e sucesso abre agenda do dia', async ({
  browser,
}, info) => {
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, customer, variant } = await demoProject(t);
    const today = fortalezaDay(),
      chosen = shiftDay(today, 2),
      other = shiftDay(today, 3),
      past = shiftDay(today, -1);
    const weekday = new Date(chosen + 'T12:00Z').getUTCDay() || 7;
    await call('recurring', {
      name: 'Modelo DEMONSTRAÇÃO horário',
      customer_id: customer,
      weekday,
      time: '09:00',
      delivery_type: 'pickup',
      items: [{ variant_id: variant, quantity: 1 }],
    });
    await call('mobile/orders', {
      customer_id: customer,
      due_at: other + 'T12:00:00-03:00',
      items: [{ variant_id: variant, quantity: 1 }],
      delivery: {
        delivery_type: 'delivery',
        delivery_address: 'Endereço DEMONSTRAÇÃO',
        courier: 'partner',
      },
      terms: null,
    });
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await expect(
      p.getByRole('heading', { name: 'Entregas do dia', exact: true }),
    ).toBeVisible();
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await expect(p.locator('.flavor-add')).toHaveAccessibleName(/1 embalagem/);
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await expect(
      p.getByRole('heading', { name: 'Quando entregar?', exact: true }),
    ).toBeVisible();
    await expect(p.getByText(/Sugestão do pedido padrão:/)).toContainText(
      '09:00',
    );
    await p.getByRole('button', { name: 'Escolher data', exact: true }).click();
    const sheet = p.getByRole('dialog', {
      name: 'Escolher dia de trabalho',
      exact: true,
    });
    await expect(
      sheet.getByRole('button', { name: other + ', 1 entregas', exact: true }),
    ).toBeVisible();
    if (past.slice(0, 7) === chosen.slice(0, 7))
      await expect(
        sheet.getByRole('button', { name: new RegExp('^' + past + ',') }),
      ).toBeDisabled();
    await sheet.getByLabel('Ir para data', { exact: true }).fill(past);
    await expect(
      sheet.getByRole('button', { name: 'Ver dia', exact: true }),
    ).toBeDisabled();
    if (
      process.env.R12_CAPTURE === '1' &&
      info.project.name === 'webkit-mobile'
    )
      await sheet.screenshot({
        path: 'docs/colaboracao/capturas/r12-depois-calendario-pedido.png',
      });
    await sheet
      .getByRole('button', { name: other + ', 1 entregas', exact: true })
      .click();
    await expect(sheet).not.toBeVisible();
    await expect(
      p.getByRole('button', { name: 'Escolher data', exact: true }),
    ).toContainText(deliveryDayLabel(other));
    await p.getByRole('button', { name: '14:00', exact: true }).click();
    await p.getByLabel('Outro horário', { exact: true }).fill('15:30');
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await expect(
      p.getByRole('heading', { name: 'Como vai chegar?', exact: true }),
    ).toBeVisible();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await expect(
      p.getByRole('heading', { name: 'Como vai pagar?', exact: true }),
    ).toBeVisible();
    // Fechamento: resumo no (?) com link que abre a Ajuda na seção detalhada.
    await p.getByRole('button', { name: 'A prazo', exact: true }).click();
    await p.getByRole('button', { name: /Ajuda: Fechamento/ }).click();
    await expect(p.getByText(/Funciona como a fatura do cartão/)).toBeVisible();
    await expect(
      p.getByRole('link', { name: 'Ver explicação completa' }),
    ).toHaveAttribute('href', '/gestao/ajuda#fechamento-prazos');
    await p.getByRole('button', { name: 'Fechar ajuda', exact: true }).click();
    const help = await c.newPage();
    await help.goto(t.url + '/gestao/ajuda#fechamento-prazos');
    await expect(help.locator('#fechamento-prazos')).toHaveJSProperty(
      'open',
      true,
    );
    await expect(
      help
        .locator('#fechamento-prazos')
        .getByText('Fecha no dia 15 e vence no dia 22.', { exact: false }),
    ).toBeInViewport();
    await help.close();
    await p.getByRole('button', { name: 'A definir', exact: true }).click();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    // O dia escolhido já tem um pedido deste cliente: aviso de repetido.
    await expect(
      p.getByRole('alert').filter({ hasText: 'Já existe' }),
    ).toBeVisible();
    await p
      .getByRole('button', {
        name: 'É outro pedido, confirmar mesmo assim',
        exact: true,
      })
      .click();
    const create = p.waitForResponse(
      (r) =>
        r.url().endsWith('/api/mobile/orders') &&
        r.request().method() === 'POST',
    );
    await p
      .getByRole('button', { name: 'Confirmar pedido', exact: true })
      .click();
    const saved = await create;
    expect(saved.status(), await saved.text()).toBe(201);
    const success = p.locator('.order-success');
    await expect(success).toContainText(
      deliveryDayLabel(other) + ' · 15:30 · 1 caixa',
    );
    await expect(success).not.toContainText('1 caixas');
    await success
      .getByRole('link', {
        name:
          'Ver na agenda de ' +
          deliveryDayLabel(other).toLocaleLowerCase('pt-BR'),
        exact: true,
      })
      .click();
    await expect(p).toHaveURL(new RegExp('day=' + other));
    await expect(p.locator('.deliveries-heading')).toContainText(
      'Entregas do dia',
    );
    const card = p.locator('.order-card').filter({ hasText: '15:30' });
    await expect(card).toContainText('Cliente DEMONSTRAÇÃO P1');
    await expect(
      p.getByRole('button', { name: 'Escolher dia', exact: true }),
    ).toContainText(
      deliveryDayLabel(other).toLocaleLowerCase('pt-BR').slice(0, 3),
    );
  } finally {
    await c.close();
    await t.dispose();
  }
});

test('R12 janela explícita sugere horário, passado bloqueia continuar e data inválida não muda Hoje', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, customer } = await demoProject(t);
    const { emptyProfile } = await import('../../shared/finance.ts');
    await call(
      'finance/customers/' + customer + '/profile',
      {
        version: 0,
        data: { ...emptyProfile(), delivery_window: '14:30 – 17:00' },
      },
      'PUT',
    );
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await expect(
      p.getByRole('heading', { name: 'Entregas do dia', exact: true }),
    ).toBeVisible();
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await p.locator('.flavor-add').click();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await expect(p.getByLabel('Outro horário', { exact: true })).toHaveValue(
      '14:30',
    );
    await expect(
      p.getByText(
        'Horário sugerido pela janela do cliente. Você pode alterar.',
        { exact: true },
      ),
    ).toBeVisible();
    await p.getByText('Digitar data e horário', { exact: true }).click();
    await p
      .getByLabel('Outro dia ou horário', { exact: true })
      .fill(shiftDay(fortalezaDay(), -1) + 'T14:30');
    await expect(p.getByRole('button', { name: /^Continuar/ })).toBeDisabled();
    await p
      .getByRole('group', { name: 'Atalhos de data do pedido', exact: true })
      .getByRole('button', { name: 'Amanhã', exact: true })
      .click();
    await expect(p.getByRole('button', { name: /^Continuar/ })).toBeEnabled();
    await p.goto(t.url + '/gestao?day=2026-02-31');
    await expect(
      p.getByRole('button', { name: 'Escolher dia', exact: true }),
    ).toContainText('Hoje');
    // Calendário: cada dia ocupa a coluna inteira (não encolhe ao número).
    await p.getByRole('button', { name: 'Escolher dia', exact: true }).click();
    const sizes = await p
      .locator('.calendar-grid > .az-button')
      .first()
      .evaluate((e) => ({
        day: e.getBoundingClientRect().width,
        column: e.parentElement.getBoundingClientRect().width / 7,
      }));
    expect(sizes.day).toBeGreaterThan(sizes.column * 0.85);
  } finally {
    await c.close();
    await t.dispose();
  }
});
