import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const flags = {
  browserHTTP: true,
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
};

test('Endereço do B2B é o de Clientes e Novo pedido; Mais mostra versão local', async ({
  browser,
}) => {
  test.setTimeout(60000);
  const t = await runtime(flags);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const { call, customer } = await demoProject(t);
    const profilePath = 'finance/customers/' + customer + '/profile';
    const legacy = {
      ...(await call(profilePath, undefined, 'GET')).data,
      address: 'Endereço anterior DEMONSTRAÇÃO',
      neighborhood: 'Bairro antigo DEMONSTRAÇÃO',
    };
    await call(profilePath, { version: 0, data: legacy }, 'PUT');
    const p = await ctx.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes/' + customer + '/b2b');
    await expect(p.getByLabel('Endereço padrão', { exact: true })).toHaveCount(
      0,
    );
    await expect(p.locator('.place-legacy')).toContainText(legacy.address);
    await p.getByLabel('Rua/Avenida', { exact: true }).fill('Rua DEMONSTRAÇÃO');
    await p.getByLabel('Número', { exact: true }).fill('20');
    await p.getByLabel('Bairro', { exact: true }).fill('Bairro DEMONSTRAÇÃO');
    await p.getByLabel('Cidade', { exact: true }).fill('Cidade DEMONSTRAÇÃO');
    await p
      .getByLabel('Ponto de referência (opcional)', { exact: true })
      .fill('Referência DEMONSTRAÇÃO');
    await p
      .getByRole('button', { name: 'Salvar endereço', exact: true })
      .click();
    await expect(
      p.getByText('Endereço salvo no cadastro do cliente.', { exact: true }),
    ).toBeVisible();
    expect((await call(profilePath, undefined, 'GET')).data.address).toBe(
      legacy.address,
    );
    // Mesmo contexto/cadastro, sem recarregar dados por uma segunda fonte.
    await p
      .getByRole('navigation', { name: 'Atalhos do celular', exact: true })
      .getByRole('link', { name: 'Clientes', exact: true })
      .click();
    const card = p.locator('article').filter({
      has: p.getByRole('heading', {
        name: 'Cliente DEMONSTRAÇÃO P1',
        exact: true,
      }),
    });
    await card.getByText('Conta e localização', { exact: true }).click();
    await card
      .getByRole('link', { name: 'Localização, foto e Instagram', exact: true })
      .click();
    await expect(p.getByLabel('Rua/Avenida', { exact: true })).toHaveValue(
      'Rua DEMONSTRAÇÃO',
    );
    await expect(p.getByLabel('Número', { exact: true })).toHaveValue('20');
    await p.goto(t.url + '/gestao/pedidos?novo=1');
    await p
      .getByRole('button', { name: 'Cliente DEMONSTRAÇÃO P1', exact: true })
      .click();
    await p.locator('.flavor-add').click();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await expect(
      p.getByRole('heading', { name: 'Quando entregar?', exact: true }),
    ).toBeVisible();
    await p.getByRole('button', { name: 'Amanhã', exact: true }).click();
    await p.getByRole('button', { name: '09:00', exact: true }).click();
    await p.getByRole('button', { name: /^Continuar/ }).click();
    await expect(
      p.getByRole('heading', { name: 'Como vai chegar?', exact: true }),
    ).toBeVisible();
    const useAddress = p.getByRole('checkbox', {
      name: /Usar o endereço do cliente/,
    });
    await expect(useAddress).toBeChecked();
    await expect(p.locator('label').filter({ has: useAddress })).toContainText(
      'Rua DEMONSTRAÇÃO, 20, Bairro DEMONSTRAÇÃO, Cidade DEMONSTRAÇÃO · Ref.: Referência DEMONSTRAÇÃO',
    );
    await p.goto(t.url + '/gestao/mais');
    await expect(
      p.getByText(
        new RegExp(
          '^Versão ' +
            version.replaceAll('.', '\\.') +
            ' · \\d{2}/\\d{2} \\d{2}h\\d{2} · [a-f0-9]{7,}$',
        ),
      ),
    ).toBeVisible();
  } finally {
    await ctx.close();
    await t.dispose();
  }
});

test('Mapa sem número avisa e foca Número na sugestão e localização', async ({
  browser,
}) => {
  test.setTimeout(60000);
  // Omissão intencional de housenumber no Photon local. Nenhum provedor real.
  const t = await runtime({ ...flags, placesProvider: {} });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['geolocation'],
    geolocation: { latitude: 0, longitude: 0 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { customer } = await demoProject(t);
    const p = await ctx.newPage();
    const searches = [];
    p.on('request', (r) => {
      if (/\/api\/field\/(search|reverse)$/.test(r.url()))
        searches.push(r.url());
    });
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/clientes/' + customer + '/local');
    await p
      .getByRole('searchbox', {
        name: 'Buscar endereço ou estabelecimento',
        exact: true,
      })
      .fill('Local DEMONSTRAÇÃO');
    await p
      .getByRole('list', { name: 'Sugestões de endereço' })
      .getByRole('button')
      .first()
      .click();
    const notice =
      'O mapa não tem o número deste local. Digite o número ou marque S/N.';
    await expect(p.getByText(notice, { exact: true })).toBeVisible();
    await expect(p.getByLabel('Número', { exact: true })).toBeFocused();
    await expect(p.getByLabel('Número', { exact: true })).toHaveValue('');
    await p.getByLabel('Sem número (S/N)', { exact: true }).check();
    await expect(p.getByLabel('Número', { exact: true })).toBeDisabled();
    await p.getByLabel('Sem número (S/N)', { exact: true }).uncheck();
    // Respeita o cooldown real de 1 s do provedor entre search e reverse.
    await p.waitForTimeout(1100);
    const reverse = p.waitForResponse((r) =>
      r.url().endsWith('/api/field/reverse'),
    );
    await p
      .getByRole('button', { name: 'Usar minha localização', exact: true })
      .click();
    expect((await reverse).status()).toBe(200);
    await expect(p.getByLabel('Número', { exact: true })).toBeFocused();
    await expect(p.getByText(notice, { exact: true })).toBeVisible();
    await p.goto(t.url + '/gestao/clientes?novo=1');
    const sheet = p.getByRole('dialog', { name: 'Novo cliente', exact: true });
    // Cooldown do serviço, sem enfraquecer o limitador no servidor.
    await p.waitForTimeout(1100);
    await sheet
      .getByRole('button', { name: 'Usar minha localização', exact: true })
      .click();
    await expect(sheet.getByText(notice, { exact: true })).toBeVisible();
    await expect(sheet.getByLabel('Número', { exact: true })).toBeFocused();
    await expect(sheet.getByLabel('Número', { exact: true })).toHaveValue('');
    // Uma busca e dois reverse: nenhum pedido adicional por proximidade.
    expect(searches.filter((s) => s.endsWith('/search'))).toHaveLength(1);
    expect(searches.filter((s) => s.endsWith('/reverse'))).toHaveLength(2);
  } finally {
    await ctx.close();
    await t.dispose();
  }
});
