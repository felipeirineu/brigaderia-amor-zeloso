import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { weightCostingProject } from '../helpers/weight-costing-project.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const flags = {
  browserHTTP: true,
  prospectsEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
};
async function completed(t, call, product, phone = true) {
  const c = await call('prospects', {
    name: 'Contato DEMONSTRAÇÃO retorno',
    ...(phone ? { phone: '+5511900000061' } : {}),
    prospect: {},
  });
  const samples = [{ product_id: product.id, weight_grams: 30, units: 3 }];
  const v = await call('visits', {
    customer_id: c.id,
    scheduled_at: new Date().toISOString(),
    samples,
  });
  await call('visits/' + v.id + '/record', {
    version: 1,
    occurred_at: new Date().toISOString(),
    samples,
  });
  return { c, v };
}
async function capture(page, name, info) {
  if (
    process.env.R7C_CAPTURE === '1' &&
    info.project.name === 'chromium-mobile'
  )
    await page.screenshot({
      path: 'docs/colaboracao/capturas/r7c-' + name + '.png',
      scale: 'css',
      animations: 'disabled',
    });
}
test('R7c estimativa não é despesa, confirmação humana e prévia editável de WhatsApp', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const t = await runtime(flags),
    ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
      },
    });
  try {
    const { call, product } = await weightCostingProject(t),
      { c, v } = await completed(t, call, product);
    await call(
      'field/profile',
      { version: 0, display_name: 'Equipe DEMONSTRAÇÃO' },
      'PUT',
    );
    const page = await ctx.newPage();
    const violations = [];
    await page.exposeFunction('recordCspViolation', (directive) =>
      violations.push(directive),
    );
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) =>
        window.recordCspViolation({
          directive: e.violatedDirective,
          blocked: e.blockedURI,
          source: e.sourceFile,
          line: e.lineNumber,
          sample: e.sample,
          target:
            e.target instanceof Element
              ? e.target.outerHTML.slice(0, 300)
              : String(e.target),
        }),
      );
    });
    await page.goto(t.url + '/api/access/start');
    await page.goto(t.url + '/gestao/visitas?contato=' + c.id);
    const card = page.getByRole('article', {
      name: 'Visita de apresentação · Contato DEMONSTRAÇÃO retorno',
      exact: true,
    });
    const count = async (table) =>
      (await t.db.prepare('SELECT COUNT(*) n FROM ' + table).first()).n;
    await card
      .getByText('Custos e despesas das amostras', { exact: true })
      .click();
    await expect(
      card.getByRole('region', { name: 'Custos da visita' }),
    ).toContainText('R$ 4,50');
    expect(await count('expense_events')).toBe(0);
    await capture(page, 'custos', info);
    await card
      .getByRole('button', {
        name: 'Registrar despesa de amostras',
        exact: true,
      })
      .click();
    const expense = page.getByRole('dialog', {
      name: 'Registrar despesa de amostras',
      exact: true,
    });
    await expect(
      expense.getByRole('textbox', {
        name: 'Valor efetivamente pago (R$)',
        exact: true,
      }),
    ).toHaveValue('');
    await expense
      .getByRole('button', { name: 'Cancelar', exact: true })
      .click();
    expect(await count('expense_events')).toBe(0);
    await card
      .getByRole('button', {
        name: 'Registrar despesa de amostras',
        exact: true,
      })
      .click();
    await expense
      .getByRole('textbox', {
        name: 'Valor efetivamente pago (R$)',
        exact: true,
      })
      .fill('600');
    await expense
      .getByRole('group', { name: 'Forma de pagamento', exact: true })
      .getByRole('button', { name: 'Pix', exact: true })
      .click();
    await capture(page, 'despesa', info);
    await expense
      .getByRole('button', {
        name: 'Registrar despesa paga de amostras',
        exact: true,
      })
      .click();
    await expect(expense).not.toBeVisible();
    await expect.poll(() => count('expense_events')).toBe(1);
    // A versão nova remonta o cartão; se já chegou, reabra a seção de custos.
    await expect
      .poll(
        async () => (await call('visits/' + v.id, undefined, 'GET')).version,
      )
      .toBe(3);
    await expect(
      card
        .locator('details')
        .filter({ hasText: 'Custos e despesas das amostras' }),
    ).not.toHaveAttribute('open', '');
    await card
      .getByText('Custos e despesas das amostras', { exact: true })
      .click();
    await expect(
      card.getByRole('region', { name: 'Custos da visita' }),
    ).toContainText('Despesa de amostras registrada: R$ 6,00');
    expect(
      (await call('visits/' + v.id + '/costs', undefined, 'GET')).expense
        .method,
    ).toBe('pix');
    const beforeContact = await count('contact_events');
    await card.getByRole('button', { name: 'WhatsApp', exact: true }).click();
    const wa = page.getByRole('dialog', {
      name: 'WhatsApp de prospecção · Contato DEMONSTRAÇÃO retorno',
      exact: true,
    });
    const text = wa.getByRole('textbox', {
      name: 'Confira e edite a mensagem',
      exact: true,
    });
    await expect(text).toHaveValue(/Obrigada.*Equipe DEMONSTRAÇÃO/s);
    await text.fill('Mensagem DEMONSTRAÇÃO revisada\nEquipe DEMONSTRAÇÃO');
    await expect(
      wa.getByRole('link', { name: 'Abrir no WhatsApp', exact: true }),
    ).toHaveAttribute(
      'href',
      'https://wa.me/5511900000061?text=' +
        encodeURIComponent(
          'Mensagem DEMONSTRAÇÃO revisada\nEquipe DEMONSTRAÇÃO',
        ),
    );
    await wa
      .getByRole('button', { name: 'O que achou das amostras?', exact: true })
      .click();
    await expect(text).toHaveValue(/O que achou das amostras/);
    await wa
      .getByRole('button', { name: 'Tabela de preços', exact: true })
      .click();
    await expect(text).toHaveValue(/50,00/);
    await capture(page, 'whatsapp', info);
    await wa.getByRole('button', { name: 'Fechar', exact: true }).click();
    expect(await count('expense_events')).toBe(1);
    expect(await count('contact_events')).toBe(beforeContact);
    for (const table of ['orders', 'payment_events', 'reminders'])
      expect(await count(table)).toBe(0);
    await call('prospects/' + c.id + '/convert', { version: 2 });
    await page.goto(t.url + '/gestao/mais');
    await page.getByRole('link', { name: 'Prospecção', exact: true }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Custos das visitas no período',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.locator('section.panel').filter({
        has: page.getByRole('heading', {
          name: 'Custo para conquistar um cliente',
          exact: true,
        }),
      }),
    ).toContainText('R$ 6,00');
    await capture(page, 'relatorio', info);
    expect(violations).toEqual([]);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
test('R7c operadora sem registro de despesa e mensagem orienta nome/telefone ausentes', async ({
  browser,
}) => {
  test.setTimeout(60000);
  const t = await runtime(flags),
    ctx = await browser.newContext({
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
  try {
    const { call, product } = await weightCostingProject(t),
      { c } = await completed(t, call, product, false);
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/visitas?contato=' + c.id);
    await p
      .getByText('Custos e despesas das amostras', { exact: true })
      .click();
    await expect(
      p.getByRole('region', { name: 'Custos da visita' }),
    ).toContainText('R$ 4,50');
    await expect(
      p.getByRole('button', {
        name: 'Registrar despesa de amostras',
        exact: true,
      }),
    ).toHaveCount(0);
    await p.getByRole('button', { name: 'WhatsApp', exact: true }).click();
    const wa = p.getByRole('dialog');
    await expect(wa).toContainText('Este contato está sem telefone');
    await expect(wa).toContainText('Defina seu nome');
    await expect(
      wa.getByRole('link', { name: 'Abrir no WhatsApp', exact: true }),
    ).toHaveCount(0);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
test('R7c banco até0025 conserva visitas e WhatsApp simples sem relatório ou custos', async ({
  browser,
}) => {
  const t = await runtime({ ...flags, migrationLimit: 25 }),
    ctx = await browser.newContext({
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
      },
    });
  try {
    const { call } = await demoProject(t),
      product = (await call('products', undefined, 'GET'))[0],
      { c } = await completed(t, call, product);
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/visitas?contato=' + c.id);
    await expect(
      p.getByRole('link', { name: 'WhatsApp', exact: true }),
    ).toBeVisible();
    await expect(
      p.getByText('Custos e despesas das amostras', { exact: true }),
    ).toHaveCount(0);
    await p.goto(t.url + '/gestao/mais');
    await expect(
      p.getByRole('link', { name: 'Prospecção', exact: true }),
    ).toHaveCount(0);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
