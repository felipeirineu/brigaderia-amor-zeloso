import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoWorkbook } from '../helpers/spreadsheet.mjs';
// Planilha fictícia no formato preparado para o cadastro inicial.
const workbook = (extra = {}) =>
  demoWorkbook({
    Sabores: [
      ['Nome', 'Embalagem', 'Peso (g)', 'Unidades', 'Preço', 'Foto'],
      ['Sabor A DEMONSTRAÇÃO', 'Caixa 12 un.', 30, 12, '42,00', ''],
      [
        'Caipirinha DEMONSTRAÇÃO',
        'Caixa 12 un.',
        30,
        12,
        '42,00',
        'caipirinha',
      ],
    ],
    Insumos: [
      [
        'Nome do insumo',
        'Unidade de referência',
        'Quantidade por embalagem',
        'Preço da embalagem (R$)',
      ],
      ['Leite DEMONSTRAÇÃO', 'Gramas (g)', 395, 7.1],
      ['Chocolate DEMONSTRAÇÃO', 'Gramas (g)', 1000, '80,00'],
      ['Pétala DEMONSTRAÇÃO', 'Unidades', 50, ''],
      ['Gás', '—', '—', 0.5],
    ],
    Fichas: [
      ['Ficha (sabor)', 'Insumo', 'Quantidade no lote', 'Unidade'],
      ['Sabor A DEMONSTRAÇÃO', 'Leite DEMONSTRAÇÃO', 395, 'g'],
      ['Sabor A DEMONSTRAÇÃO', 'Chocolate DEMONSTRAÇÃO', 30.3, 'g'],
      ['Sabor A DEMONSTRAÇÃO', 'Rendimento do lote (unidades)', 16, 'doces'],
      ['Sabor A DEMONSTRAÇÃO', 'Outros custos por lote (R$)', 0.5, 'R$'],
      ['Limão DEMONSTRAÇÃO', '(receita a preencher)', '', ''],
    ],
    Clientes: [
      ['nome', 'telefone', 'notas'],
      ['Cliente Planilha DEMONSTRAÇÃO', '', 'Bairro: Centro'],
    ],
    ...extra,
  });
test('cadastro inicial por planilha: prévia, confirmação e reimportação sem duplicar', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    toolsEnabled: true,
    mobileEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/importar-cadastro');
    const input = p.getByLabel('Planilha de cadastro inicial', { exact: true });
    const xlsx =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    // Erro de planilha bloqueia a confirmação e diz aba e linha.
    await input.setInputFiles({
      name: 'erro.xlsx',
      mimeType: xlsx,
      buffer: workbook({
        Fichas: [
          ['Ficha (sabor)', 'Insumo', 'Quantidade no lote'],
          ['Sabor A DEMONSTRAÇÃO', 'Insumo Inexistente', 10],
          ['Sabor A DEMONSTRAÇÃO', 'Rendimento do lote (unidades)', 16],
        ],
      }),
    });
    await p.getByRole('button', { name: /^Ver prévia/ }).click();
    await expect(p.getByRole('alert')).toContainText(
      'insumo "Insumo Inexistente" não encontrado',
    );
    await expect(
      p.getByRole('button', { name: /Confirmar cadastro/ }),
    ).toBeDisabled();
    expect(
      (await t.db.prepare('SELECT COUNT(*) n FROM products').first()).n,
    ).toBe(0);

    // Planilha correta: prévia, confirmação e dados gravados exatos.
    await input.setInputFiles({
      name: 'ok.xlsx',
      mimeType: xlsx,
      buffer: workbook(),
    });
    await p.getByRole('button', { name: /^Ver prévia/ }).click();
    await expect(p.getByText('Sabores novos (2)')).toBeVisible();
    await expect(p.getByText('Insumos novos (3)')).toBeVisible();
    await expect(p.getByText('Fichas novas (1)')).toBeVisible();
    await p
      .getByRole('button', { name: 'Confirmar cadastro de 7 itens' })
      .click();
    await expect(p.getByRole('status')).toContainText(
      'Cadastro concluído: 2 sabores, 3 insumos, 1 fichas, 1 clientes.',
    );
    const q = async (sql) => (await t.db.prepare(sql).all()).results;
    expect(
      await q(
        'SELECT p.name,p.photo_key,v.label,v.weight_grams,v.units_per_box,v.price_cents FROM products p JOIN product_variants v ON v.product_id=p.id ORDER BY p.name',
      ),
    ).toEqual([
      {
        name: 'Caipirinha DEMONSTRAÇÃO',
        photo_key: 'caipirinha',
        label: 'Caixa 12 un.',
        weight_grams: 30,
        units_per_box: 12,
        price_cents: 4200,
      },
      {
        name: 'Sabor A DEMONSTRAÇÃO',
        photo_key: null,
        label: 'Caixa 12 un.',
        weight_grams: 30,
        units_per_box: 12,
        price_cents: 4200,
      },
    ]);
    expect(
      await q(
        'SELECT name,unit,pack_quantity_milli,pack_cost_cents FROM supplies ORDER BY name',
      ),
    ).toEqual([
      {
        name: 'Chocolate DEMONSTRAÇÃO',
        unit: 'g',
        pack_quantity_milli: 1000000,
        pack_cost_cents: 8000,
      },
      {
        name: 'Leite DEMONSTRAÇÃO',
        unit: 'g',
        pack_quantity_milli: 395000,
        pack_cost_cents: 710,
      },
      {
        name: 'Pétala DEMONSTRAÇÃO',
        unit: 'unit',
        pack_quantity_milli: 50000,
        pack_cost_cents: null,
      },
    ]);
    expect(
      await q(
        'SELECT r.name,r.yield_units,r.overhead_cents,s.name supply,c.quantity_milli FROM recipes r JOIN recipe_components c ON c.recipe_id=r.id JOIN supplies s ON s.id=c.supply_id ORDER BY s.name',
      ),
    ).toEqual([
      {
        name: 'Sabor A DEMONSTRAÇÃO',
        yield_units: 16,
        overhead_cents: 50,
        supply: 'Chocolate DEMONSTRAÇÃO',
        quantity_milli: 30300,
      },
      {
        name: 'Sabor A DEMONSTRAÇÃO',
        yield_units: 16,
        overhead_cents: 50,
        supply: 'Leite DEMONSTRAÇÃO',
        quantity_milli: 395000,
      },
    ]);
    expect(await q('SELECT name,notes FROM customers')).toEqual([
      { name: 'Cliente Planilha DEMONSTRAÇÃO', notes: 'Bairro: Centro' },
    ]);

    // Reimportar a mesma planilha não duplica nada.
    await input.setInputFiles({
      name: 'ok.xlsx',
      mimeType: xlsx,
      buffer: workbook(),
    });
    await p.getByRole('button', { name: /^Ver prévia/ }).click();
    await expect(
      p.getByRole('button', { name: 'Nada novo para cadastrar' }),
    ).toBeDisabled();
    expect((await q('SELECT COUNT(*) n FROM products'))[0].n).toBe(2);
  } finally {
    await c.close();
    await t.dispose();
  }
});

test('operadora não vê nem usa o cadastro inicial', async ({ browser }) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    toolsEnabled: true,
  });
  const c = await browser.newContext({
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/importar-cadastro');
    await expect(
      p.getByLabel('Planilha de cadastro inicial', { exact: true }),
    ).toHaveCount(0);
    // E o servidor recusa as gravações que a tela usaria.
    for (const path of [
      'p1/supplies',
      'p1/recipes',
      'p1/customer-import/preview',
    ])
      expect(
        (
          await t.request(path, {
            method: 'POST',
            cookie: await t.login('operator@example.test'),
            key: crypto.randomUUID(),
            data: {},
          })
        ).status,
      ).toBe(403);
  } finally {
    await c.close();
    await t.dispose();
  }
});
