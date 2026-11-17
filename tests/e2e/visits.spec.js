import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
import { fortalezaDay } from '../../shared/workday.ts';
const flags = {
  browserHTTP: true,
  prospectsEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
};

test('R7b agendar, produzir unidades, registrar e escolher lembrete/corrida sem criação automática', async ({
  browser,
}, testInfo) => {
  test.setTimeout(90000);
  const t = await runtime(flags),
    ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
  try {
    const { call, operator } = await demoProject(t);
    const contact = await call(
      'prospects',
      {
        name: 'Contato DEMONSTRAÇÃO visita móvel',
        phone: '+5511900000040',
        prospect: {},
        site: {
          version: 0,
          data: {
            name: '',
            address: 'Local DEMONSTRAÇÃO',
            neighborhood: '',
            latitude: null,
            longitude: null,
            instagram: '',
          },
        },
      },
      'POST',
      operator,
    );
    const page = await ctx.newPage();
    await page.goto(t.url + '/api/access/start');
    await page.goto(t.url + '/gestao/clientes');
    await page
      .getByRole('group', { name: 'Clientes ou contatos', exact: true })
      .getByRole('button', { name: 'Contatos', exact: true })
      .click();
    const card = page.locator('.customer-records article').filter({
      has: page.getByRole('heading', {
        name: 'Contato DEMONSTRAÇÃO visita móvel',
        exact: true,
      }),
    });
    await card
      .getByRole('link', { name: 'Agendar visita', exact: true })
      .click();
    const sheet = page.getByRole('dialog', {
      name: 'Agendar visita',
      exact: true,
    });
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole('region', {
        name: 'Destinatário da visita',
        exact: true,
      }),
    ).toContainText('Contato DEMONSTRAÇÃO visita móvel');
    await sheet
      .getByLabel('Quando visitar (João Pessoa)', { exact: true })
      .fill(fortalezaDay() + 'T14:00');
    await sheet
      .getByRole('textbox', {
        name: 'Unidades de Produto DEMONSTRAÇÃO P1',
        exact: true,
      })
      .fill('4');
    await sheet
      .getByLabel('Observação da visita', { exact: true })
      .fill('Planejamento DEMONSTRAÇÃO');
    await sheet
      .getByRole('button', { name: 'Agendar visita', exact: true })
      .click();
    await expect(sheet).not.toBeVisible();
    let vcard = page.getByRole('article', {
      name: 'Visita de apresentação · Contato DEMONSTRAÇÃO visita móvel',
      exact: true,
    });
    await expect(vcard).toContainText('4 un. Produto DEMONSTRAÇÃO P1');
    const list = await call(
      'visits?customer_id=' + contact.id,
      undefined,
      'GET',
    );
    expect(list).toHaveLength(1);
    const count = async (table) =>
      (await t.db.prepare('SELECT COUNT(*) n FROM ' + table).first()).n;
    for (const table of [
      'orders',
      'payment_events',
      'reminders',
      'expense_events',
      'displacements',
    ])
      expect(await count(table)).toBe(0);
    await page.goto(t.url + '/gestao/agenda');
    await page
      .getByRole('button', { name: 'Visitas de apresentação', exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Visita de apresentação · Contato DEMONSTRAÇÃO visita móvel',
        exact: true,
      }),
    ).toBeVisible();
    // Administrador vê amostras em unidades; nenhum pedido fictício é fabricado para a produção.
    const owner = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
      },
    });
    try {
      const p = await owner.newPage();
      await p.goto(t.url + '/api/access/start');
      await p.goto(t.url + '/gestao');
      const production = p.locator('section.panel').filter({
        has: p.getByRole('heading', {
          name: 'Amostras para visitas · hoje e amanhã',
          exact: true,
        }),
      });
      await expect(production).toContainText('+ 4 un. para amostras');
      if (
        process.env.R7B_CAPTURE === '1' &&
        testInfo.project.name === 'chromium-mobile'
      )
        await p.screenshot({
          path: 'docs/colaboracao/capturas/r7b-producao.png',
          scale: 'css',
          animations: 'disabled',
        });
    } finally {
      await owner.close();
    }
    const product = (await call('products', undefined, 'GET'))[0];
    await t.db
      .prepare('UPDATE products SET active=0 WHERE organization_id=? AND id=?')
      .bind(t.org, product.id)
      .run();
    await page.goto(t.url + '/gestao');
    vcard = page.getByRole('article', {
      name: 'Visita de apresentação · Contato DEMONSTRAÇÃO visita móvel',
      exact: true,
    });
    for (const name of ['Mapa', 'WhatsApp', 'Uber', '99'])
      await expect(
        vcard.getByRole(name === 'Uber' ? 'link' : 'button', {
          name,
          exact: true,
        }),
      ).toBeVisible();
    await vcard.getByRole('button', { name: 'Mapa', exact: true }).click();
    const map = page.getByRole('dialog', {
      name: 'Rota da visita a Contato DEMONSTRAÇÃO visita móvel',
      exact: true,
    });
    await expect(
      map.getByRole('link', { name: 'Mapas do iPhone', exact: true }),
    ).toHaveAttribute('href', /maps.apple.com/);
    await map.getByRole('button', { name: 'Fechar', exact: true }).click();
    if (
      process.env.R7B_CAPTURE === '1' &&
      testInfo.project.name === 'chromium-mobile'
    ) {
      await vcard.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: 'docs/colaboracao/capturas/r7b-hoje.png',
        scale: 'css',
        animations: 'disabled',
      });
    }
    await vcard
      .getByRole('button', { name: 'Registrar visita', exact: true })
      .click();
    const record = page.getByRole('dialog', {
      name: 'Registrar visita',
      exact: true,
    });
    await expect(record).toBeVisible();
    await expect(record).toContainText('Produto inativo · amostra planejada');
    await expect(
      record.getByLabel('Data do próximo passo', { exact: true }),
    ).not.toHaveValue('');
    await record
      .getByRole('textbox', {
        name: 'Unidades de Produto DEMONSTRAÇÃO P1',
        exact: true,
      })
      .fill('3');
    await record
      .getByLabel('Observação da visita', { exact: true })
      .fill('Registro DEMONSTRAÇÃO');
    if (
      process.env.R7B_CAPTURE === '1' &&
      testInfo.project.name === 'chromium-mobile'
    ) {
      await record.evaluate((el) => {
        el.scrollTop = 0;
      });
      await page.screenshot({
        path: 'docs/colaboracao/capturas/r7b-registrar.png',
        scale: 'css',
        animations: 'disabled',
      });
    }
    await record
      .getByRole('button', { name: 'Salvar registro da visita', exact: true })
      .click();
    await expect(record).not.toBeVisible();
    await expect(vcard).toContainText('Registrada');
    await expect(vcard).toContainText('3 un. Produto DEMONSTRAÇÃO P1');
    for (const table of [
      'orders',
      'payment_events',
      'reminders',
      'expense_events',
      'displacements',
    ])
      expect(await count(table)).toBe(0);
    await vcard
      .getByRole('button', { name: 'Criar lembrete de retorno', exact: true })
      .click();
    const reminder = page.getByRole('dialog', {
      name: 'Novo lembrete',
      exact: true,
    });
    await expect(
      reminder.getByLabel('Título do lembrete', { exact: true }),
    ).toHaveValue('Retornar para Contato DEMONSTRAÇÃO visita móvel');
    await reminder
      .getByRole('button', { name: 'Cancelar', exact: true })
      .click();
    expect(await count('reminders')).toBe(0);
    await vcard
      .getByRole('button', { name: 'Criar lembrete de retorno', exact: true })
      .click();
    await reminder
      .getByRole('button', { name: 'Salvar lembrete', exact: true })
      .click();
    await expect(reminder).not.toBeVisible();
    expect(await count('reminders')).toBe(1);
    expect((await call('p1/reminders', undefined, 'GET'))[0].customer_id).toBe(
      contact.id,
    );
    await vcard
      .getByRole('button', {
        name: 'Registrar corrida de prospecção',
        exact: true,
      })
      .click();
    const trip = page.getByRole('dialog', {
      name: 'Quanto custou a corrida?',
      exact: true,
    });
    await expect(trip).toContainText('Prospecção');
    await expect(
      trip.getByRole('group', { name: 'Pedidos atendidos', exact: true }),
    ).toHaveCount(0);
    await trip.getByRole('button', { name: 'Pular', exact: true }).click();
    expect(await count('expense_events')).toBe(0);
    await vcard
      .getByRole('button', {
        name: 'Registrar corrida de prospecção',
        exact: true,
      })
      .click();
    await trip
      .getByRole('textbox', { name: 'Valor pago (R$)', exact: true })
      .fill('500');
    await trip
      .getByRole('button', { name: 'Registrar despesa paga', exact: true })
      .click();
    await expect(trip).not.toBeVisible();
    expect(await count('expense_events')).toBe(1);
    await page.goto(t.url + '/gestao/clientes');
    await page
      .getByRole('group', { name: 'Clientes ou contatos', exact: true })
      .getByRole('button', { name: 'Contatos', exact: true })
      .click();
    await card.getByText('Atualizar acompanhamento', { exact: true }).click();
    await card
      .getByRole('group', { name: 'Etapa do contato', exact: true })
      .getByRole('button', { name: 'Retornar', exact: true })
      .click();
    await card
      .getByRole('button', { name: 'Salvar acompanhamento', exact: true })
      .click();
    await expect(card.locator('.status-tag')).toHaveText('Retornar');
    await card
      .getByRole('button', { name: 'Virou cliente', exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Contato convertido em cliente',
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(t.url + '/gestao/visitas?contato=' + contact.id);
    await expect(page.getByRole('article')).toContainText(
      'Registro DEMONSTRAÇÃO',
    );
    expect(await count('orders')).toBe(0);
    expect(await count('payment_events')).toBe(0);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});

test('R7b banco até0024 mantém R7a e esconde visitas', async ({ browser }) => {
  const t = await runtime({ ...flags, migrationLimit: 24 }),
    ctx = await browser.newContext({
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
  try {
    const { call } = await demoProject(t);
    await call('prospects', {
      name: 'Contato DEMONSTRAÇÃO sem visitas',
      prospect: {},
    });
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes');
    await p
      .getByRole('group', { name: 'Clientes ou contatos', exact: true })
      .getByRole('button', { name: 'Contatos', exact: true })
      .click();
    await expect(
      p.getByRole('heading', {
        name: 'Contato DEMONSTRAÇÃO sem visitas',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      p.getByRole('link', { name: 'Agendar visita', exact: true }),
    ).toHaveCount(0);
    await p.goto(t.url + '/gestao/mais');
    await expect(
      p.getByRole('link', { name: 'Visitas e amostras', exact: true }),
    ).toHaveCount(0);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
