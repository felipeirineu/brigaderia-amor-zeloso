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
async function shot(p, name, info) {
  if (
    process.env.R7D_CAPTURE === '1' &&
    info.project.name === 'chromium-mobile'
  )
    await p.screenshot({
      path: 'docs/colaboracao/capturas/r7d-' + name + '.png',
      scale: 'css',
      animations: 'disabled',
    });
}
test('R7d + Nova visita, contato rápido com endereço e cliente atual sem funil', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const t = await runtime(flags),
    ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
      },
    });
  try {
    const { call, customer, operator } = await demoProject(t),
      p = await ctx.newPage();
    const count = async (table) =>
      (await t.db.prepare('SELECT COUNT(*) n FROM ' + table).first()).n;
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao');
    await p.getByRole('button', { name: 'Novo cadastro', exact: true }).click();
    await p.getByRole('button', { name: 'Nova visita', exact: true }).click();
    const sheet = p.getByRole('dialog', {
      name: 'Agendar visita',
      exact: true,
    });
    await expect(sheet).toBeVisible();
    await sheet
      .getByRole('button', { name: 'Novo contato', exact: true })
      .click();
    await sheet
      .getByLabel('Nome do contato', { exact: true })
      .fill('Contato DEMONSTRAÇÃO atalho');
    await sheet
      .getByLabel('Rua/Avenida', { exact: true })
      .fill('Rua DEMONSTRAÇÃO');
    await sheet.getByLabel('Número', { exact: true }).fill('10');
    await sheet
      .getByLabel('Cidade', { exact: true })
      .fill('Cidade DEMONSTRAÇÃO');
    await sheet
      .getByRole('button', { name: 'Salvar contato', exact: true })
      .click();
    await expect(
      sheet.getByRole('region', {
        name: 'Destinatário da visita',
        exact: true,
      }),
    ).toContainText('Contato DEMONSTRAÇÃO atalho');
    expect(await count('prospect_visits')).toBe(0);
    // Abrir e fechar calendário não submete o formulário de agendamento.
    await sheet
      .getByRole('button', { name: 'Escolher data', exact: true })
      .click();
    const calendar = p.getByRole('dialog', {
      name: 'Escolher dia de trabalho',
      exact: true,
    });
    await expect(calendar).toBeVisible();
    await calendar.getByRole('button', { name: 'Hoje', exact: true }).click();
    expect(await count('prospect_visits')).toBe(0);
    await sheet.getByRole('button', { name: '14:00', exact: true }).click();
    await sheet.evaluate((el) => {
      el.scrollTop = 0;
    });
    await shot(p, 'nova-visita', info);
    await sheet
      .getByRole('button', { name: 'Agendar visita', exact: true })
      .click();
    await expect(sheet).not.toBeVisible();
    const contacts = await call('customers?kind=prospect', undefined, 'GET'),
      contact = contacts.find((c) => c.name === 'Contato DEMONSTRAÇÃO atalho');
    expect(contact.phone).toBe('');
    const context = await call('field/context', undefined, 'GET');
    expect(context.sites.find((s) => s.id === contact.id).data.street).toBe(
      'Rua DEMONSTRAÇÃO',
    );
    // O evento atualiza o Hoje sem recarregar a página.
    await expect(
      p.getByRole('article', {
        name: 'Visita de apresentação · Contato DEMONSTRAÇÃO atalho',
        exact: true,
      }),
    ).toBeVisible();
    await p.getByRole('button', { name: 'Novo cadastro', exact: true }).click();
    await p.getByRole('button', { name: 'Nova visita', exact: true }).click();
    await sheet
      .getByRole('searchbox', {
        name: 'Buscar contato ou cliente',
        exact: true,
      })
      .fill('Cliente DEMONSTRAÇÃO P1');
    await sheet
      .getByRole('button', {
        name: 'Selecionar Cliente DEMONSTRAÇÃO P1',
        exact: true,
      })
      .click();
    await expect(
      sheet.getByRole('region', {
        name: 'Destinatário da visita',
        exact: true,
      }),
    ).toContainText('Novos sabores/opções');
    await sheet.getByRole('button', { name: '09:00', exact: true }).click();
    await sheet
      .getByRole('button', { name: 'Agendar visita', exact: true })
      .click();
    await expect(sheet).not.toBeVisible();
    const vcard = p.getByRole('article', {
      name: 'Visita a cliente · Cliente DEMONSTRAÇÃO P1',
      exact: true,
    });
    await expect(vcard).toContainText('Novos sabores/opções');
    await vcard
      .getByRole('button', { name: 'Registrar visita', exact: true })
      .click();
    const record = p.getByRole('dialog', {
      name: 'Registrar visita',
      exact: true,
    });
    await record
      .getByRole('button', { name: 'Salvar registro da visita', exact: true })
      .click();
    await expect(record).not.toBeVisible();
    await expect(vcard).toContainText('Registrada');
    await shot(p, 'cliente', info);
    expect((await call('customers/' + customer, undefined, 'GET')).kind).toBe(
      'customer',
    );
    expect(await count('prospect_details')).toBe(1);
    expect(await count('prospect_events')).toBe(1);
    for (const table of [
      'orders',
      'payment_events',
      'expense_events',
      'reminders',
    ])
      expect(await count(table)).toBe(0);
    await p.goto(t.url + '/gestao/prospeccao');
    await expect(
      p.getByRole('heading', {
        name: 'Visitas a clientes atuais',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      p.locator('section.panel').filter({
        has: p.getByRole('heading', {
          name: 'Relacionamento com clientes atuais',
          exact: true,
        }),
      }),
    ).toContainText('1 visitas');
    await shot(p, 'relatorio', info);
    // O detalhe antigo continua acessível ao papel operador.
    expect(
      (
        await call('visits?customer_id=' + customer, undefined, 'GET', operator)
      )[0].data.audience,
    ).toBe('customer');
    expect(
      (await call('today?date=' + fortalezaDay(), undefined, 'GET')).visits,
    ).toHaveLength(2);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
test('R7d ajuda nos contatos, folha e passeio; cancelar não agenda', async ({
  browser,
}, info) => {
  const t = await runtime(flags),
    ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
      },
    });
  try {
    await demoProject(t);
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes');
    await p
      .getByRole('group', { name: 'Clientes ou contatos', exact: true })
      .getByRole('button', { name: 'Contatos', exact: true })
      .click();
    await p
      .getByRole('button', {
        name: 'Ajuda: Contatos e visitas de apresentação',
        exact: true,
      })
      .click();
    const help = p.getByRole('dialog', {
      name: 'Contatos e visitas de apresentação',
      exact: true,
    });
    await expect(help).toContainText(
      'Contato é um estabelecimento que ainda não compra',
    );
    await shot(p, 'ajuda', info);
    await help
      .getByRole('button', { name: 'Fechar ajuda', exact: true })
      .click();
    await p.getByRole('button', { name: 'Novo cadastro', exact: true }).click();
    await p.getByRole('button', { name: 'Nova visita', exact: true }).click();
    const sheet = p.getByRole('dialog', {
      name: 'Agendar visita',
      exact: true,
    });
    await expect(
      sheet.getByRole('button', {
        name: 'Ajuda: Contatos e visitas de apresentação',
        exact: true,
      }),
    ).toBeVisible();
    await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(
      (await t.db.prepare('SELECT COUNT(*) n FROM prospect_visits').first()).n,
    ).toBe(0);
    await p.goto(t.url + '/gestao/ajuda');
    await expect(
      p
        .locator('summary')
        .filter({ hasText: 'Contatos e visitas de apresentação' }),
    ).toBeVisible();
    await p
      .getByRole('button', { name: 'Abrir menu de Meu perfil', exact: true })
      .click();
    await p
      .getByRole('dialog', { name: 'Menu da gestão', exact: true })
      .getByRole('button', { name: 'Conhecer o app', exact: true })
      .click();
    const tour = p.getByRole('dialog', { name: 'Passeio guiado', exact: true });
    for (let i = 0; i < 2; i++)
      await tour.getByRole('button', { name: 'Próximo', exact: true }).click();
    await expect(
      tour.getByRole('heading', { name: 'Tudo começa no +', exact: true }),
    ).toBeVisible();
    await expect(tour).toContainText('e nova visita');
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
