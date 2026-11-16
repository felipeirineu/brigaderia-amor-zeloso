import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const flags = {
  browserHTTP: true,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
  prospectsEnabled: true,
};

test('R7a contato, retorno humano e conversão preservam cadastro e histórico', async ({
  browser,
}, testInfo) => {
  test.setTimeout(90000);
  const t = await runtime(flags);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, operator } = await demoProject(t);
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes');
    const filter = p.getByRole('group', {
      name: 'Clientes ou contatos',
      exact: true,
    });
    await filter.getByRole('button', { name: 'Contatos', exact: true }).click();
    await p.getByRole('button', { name: 'Novo contato', exact: true }).click();
    const sheet = p.getByRole('dialog', { name: 'Novo contato', exact: true });
    const name = 'Contato DEMONSTRAÇÃO móvel';
    await sheet.getByLabel('Nome', { exact: true }).fill(name);
    await sheet
      .getByLabel('Pessoa de contato', { exact: true })
      .fill('Equipe DEMONSTRAÇÃO');
    await sheet
      .getByLabel('Como conheceu', { exact: true })
      .fill('Origem DEMONSTRAÇÃO');
    await sheet
      .getByLabel('Data do próximo passo', { exact: true })
      .fill('2030-01-07T10:00');
    await sheet
      .getByLabel('Notas operacionais', { exact: true })
      .fill('Observação DEMONSTRAÇÃO');
    await sheet.getByText('Endereço e Instagram', { exact: true }).click();
    await sheet
      .getByLabel('Rua/Avenida', { exact: true })
      .fill('Local DEMONSTRAÇÃO');
    await sheet.getByLabel('Sem número (S/N)', { exact: true }).check();
    await sheet
      .getByLabel('Instagram (opcional)', { exact: true })
      .fill('@perfil.demonstracao');
    await sheet
      .getByRole('button', { name: 'Salvar contato', exact: true })
      .click();
    await expect(sheet).not.toBeVisible();
    let card = p
      .locator('.customer-records article')
      .filter({ has: p.getByRole('heading', { name, exact: true }) });
    await expect(card).toBeVisible();
    await expect(card).toContainText('A visitar');
    await expect(card).toContainText('Próximo passo:');
    const [created] = await call(
      'customers?kind=prospect',
      undefined,
      'GET',
      operator,
    );
    expect(created.phone).toBe('');
    expect(created.prospect.contact_person).toBe('Equipe DEMONSTRAÇÃO');
    await expect(card).not.toContainText('sem:');
    await card.getByText('Atualizar acompanhamento', { exact: true }).click();
    await card
      .getByRole('group', { name: 'Etapa do contato', exact: true })
      .getByRole('button', { name: 'Amostra entregue', exact: true })
      .click();
    await card
      .getByRole('button', { name: 'Salvar acompanhamento', exact: true })
      .click();
    await expect(card.locator('.status-tag')).toHaveText('Amostra entregue');
    await card.getByText('Atualizar acompanhamento', { exact: true }).click();
    await card
      .getByRole('group', { name: 'Etapa do contato', exact: true })
      .getByRole('button', { name: 'Retornar', exact: true })
      .click();
    await card
      .getByLabel('Data do próximo passo', { exact: true })
      .fill('2030-01-10T10:00');
    await card
      .getByRole('button', { name: 'Salvar acompanhamento', exact: true })
      .click();
    await expect(card.locator('.status-tag')).toHaveText('Retornar');
    if (
      process.env.R7A_CAPTURE === '1' &&
      testInfo.project.name === 'chromium-mobile'
    ) {
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r7a-contato-retornar.png',
        scale: 'css',
      });
    }
    // Contato não aparece entre clientes do Novo pedido antes da conversão.
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await expect(
      p.getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true }),
    ).toBeVisible();
    await expect(p.getByRole('button', { name, exact: true })).toHaveCount(0);
    await p.goto(t.url + '/gestao/clientes');
    await p
      .getByRole('group', { name: 'Clientes ou contatos', exact: true })
      .getByRole('button', { name: 'Contatos', exact: true })
      .click();
    card = p
      .locator('.customer-records article')
      .filter({ has: p.getByRole('heading', { name, exact: true }) });
    await card
      .getByRole('button', { name: 'Virou cliente', exact: true })
      .click();
    await expect(p).toHaveURL(
      new RegExp('/clientes/' + created.id + '/b2b\\?convertido=1$'),
    );
    await expect(
      p.getByRole('heading', {
        name: 'Contato convertido em cliente',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      p.getByRole('link', { name: 'Criar pedido padrão', exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole('link', { name: 'Criar primeiro pedido', exact: true }),
    ).toBeVisible();
    await expect(p.getByLabel('Rua/Avenida', { exact: true })).toHaveValue(
      'Local DEMONSTRAÇÃO',
    );
    await expect(p.getByLabel('Estabelecimento', { exact: true })).toHaveValue(
      name,
    );
    await expect(p.getByLabel('Responsável', { exact: true })).toHaveValue(
      'Equipe DEMONSTRAÇÃO',
    );
    if (
      process.env.R7A_CAPTURE === '1' &&
      testInfo.project.name === 'chromium-mobile'
    )
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r7a-convertido.png',
        scale: 'css',
      });
    const current = await call('customers/' + created.id, undefined, 'GET');
    expect(current.kind).toBe('customer');
    expect(current.notes).toBe('Observação DEMONSTRAÇÃO');
    const history = await call('prospects/' + created.id, undefined, 'GET');
    expect(history.events).toHaveLength(4);
    expect(history.data.stage).toBe('converted');
    expect(
      (await call('field/context', undefined, 'GET')).sites.find(
        (s) => s.id === created.id,
      ).data.instagram,
    ).toBe('perfil.demonstracao');
    for (const table of [
      'orders',
      'payment_events',
      'reminders',
      'expense_events',
    ])
      expect(
        (await t.db.prepare('SELECT COUNT(*) n FROM ' + table).first()).n,
      ).toBe(0);
    await p.goto(t.url + '/gestao/clientes');
    card = p
      .locator('.customer-records article')
      .filter({ has: p.getByRole('heading', { name, exact: true }) });
    await card.getByText('Histórico do contato', { exact: true }).click();
    await expect(card.getByRole('list')).toContainText('Retornar');
    await expect(card.getByRole('list')).toContainText('Virou cliente');
    await expect(card.getByRole('list').locator('.staff-identity')).toHaveCount(
      4,
    );
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await expect(p.getByRole('button', { name, exact: true })).toBeVisible();
  } finally {
    await ctx.close();
    await t.dispose();
  }
});

test('R7a banco até0023 mantém clientes e esconde contatos mesmo com flag solicitada', async ({
  browser,
}) => {
  const t = await runtime({ ...flags, migrationLimit: 23 });
  const ctx = await browser.newContext({
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    await demoProject(t);
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes');
    await expect(
      p.getByRole('button', { name: 'Novo cliente', exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole('group', { name: 'Clientes ou contatos', exact: true }),
    ).toHaveCount(0);
    await expect(
      p.getByRole('heading', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true }),
    ).toBeVisible();
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
