import { expect, test } from '@playwright/test';
import { demoProject } from '../helpers/demo-project.mjs';
import { runtime } from '../helpers/runtime.mjs';
import { emptyPlace } from '../../shared/field.ts';
import { fortalezaDay } from '../../shared/workday.ts';

test('T15 gestão em duas colunas, navegação, filtros e ações no computador', async ({
  browser,
}, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Layout de computador');
  test.setTimeout(100000);
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
    fieldEnabled: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 860 },
    colorScheme: 'light',
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, makeOrder } = await demoProject(t);
    const day = fortalezaDay();
    const id = await makeOrder(day + 'T16:00:00-03:00', 6);
    await call(
      'field/profile',
      { display_name: 'Perfil DEMONSTRAÇÃO', version: 0 },
      'PUT',
    );
    await call(
      'field/company',
      {
        data: {
          ...emptyPlace(),
          name: 'Base DEMONSTRAÇÃO',
          street: 'Rua DEMONSTRAÇÃO',
          latitude: -7,
          longitude: -35,
        },
        version: 0,
      },
      'PUT',
    );
    for (const [photo, label, hour, quantity] of [
      ['tradicional', 'A', '14', 12],
      ['beijinho', 'B', '18', 9],
    ]) {
      const customer = await call('customers', {
        name: 'Cliente DEMONSTRAÇÃO ' + label,
      });
      const product = await call('products', {
        name: 'Sabor DEMONSTRAÇÃO ' + label,
        photo_key: photo,
        variants: [
          {
            label: 'Embalagem fictícia',
            weight_grams: 10,
            units_per_box: 3,
            price_cents: 900,
          },
        ],
      });
      const item = (await call('products/' + product.id, undefined, 'GET'))
        .variants[0];
      const order = await call('orders', {
        customer_id: customer.id,
        due_at: `${day}T${hour}:00:00-03:00`,
        items: [{ variant_id: item.id, quantity }],
      });
      await call(
        'orders/' + order.id + '/delivery',
        {
          version: 1,
          delivery_type: 'delivery',
          delivery_address: 'Rua DEMONSTRAÇÃO, 10',
          courier: 'owner',
        },
        'PUT',
      );
      await call('orders/' + order.id + '/status', {
        version: 2,
        to: 'confirmed',
      });
    }
    for (const [title, time] of [
      ['Separar embalagem DEMONSTRAÇÃO', '17:00'],
      ['Revisar pedido DEMONSTRAÇÃO', '19:00'],
    ])
      await call('p1/reminders', {
        title,
        notes: '',
        customer_id: null,
        due_at: `${day}T${time}:00-03:00`,
      });

    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(t.url + '/api/access/start');
    const sidebar = page.locator('.desktop-sidebar');
    const header = page.locator('.compact-header');
    const kpis = page.locator('.today-page .finance-kpi');
    const deliveries = page.getByRole('region', { name: 'Entregas do dia' });
    const production = page.locator('.production-dashboard');
    const reminders = page.locator('.today-reminders');

    await expect(sidebar.locator('img')).toBeVisible();
    await expect(
      sidebar.getByRole('link', { name: 'Hoje', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(sidebar.getByRole('link').allTextContents()).resolves.toEqual([
      'Amor Zeloso Gestão',
      'Hoje',
      'Pedidos',
      'Clientes',
      'Produtos e kits',
      'Pedidos padrão',
      'Relatórios',
      'Mais',
    ]);
    await expect(
      header.getByRole('heading', { name: 'Hoje', exact: true }),
    ).toBeVisible();
    await expect(header.locator('time')).toHaveAttribute('datetime', day);
    await expect(
      header.getByRole('link', { name: 'Ajuda da gestão' }),
    ).toBeVisible();
    await expect(
      page
        .getByText(
          /Área privada ·|SUA ROTINA|Dia de trabalho|Conheça os atalhos/,
        )
        .first(),
    ).toBeHidden();
    await expect(
      page.getByRole('heading', { name: 'Hoje', exact: true }),
    ).toHaveCount(1);
    await expect(page.locator('.desktop-today-summary')).toContainText(
      /Perfil DEMONSTRAÇÃO\. 3 entregas hoje · 2 lembretes/,
    );
    await expect(kpis).toHaveCount(4);
    await expect(deliveries.locator('.order-card')).toHaveCount(3);
    const kpiBoxes = await Promise.all(
      (await kpis.all()).map((card) => card.boundingBox()),
    );
    expect(new Set(kpiBoxes.map(({ y }) => y)).size).toBe(1);
    expect((await deliveries.boundingBox()).x).toBeLessThan(
      (await production.boundingBox()).x,
    );
    expect((await production.boundingBox()).x).toBe(
      (await reminders.boundingBox()).x,
    );
    await expect(
      production.getByRole('link', {
        name: 'Gerar pedidos da semana',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      reminders.getByRole('button', { name: 'Novo lembrete' }),
    ).toBeVisible();

    const quick = sidebar.getByRole('button', { name: 'Novo cadastro' });
    await quick.click();
    const menu = page.getByRole('dialog', { name: 'Novo cadastro' });
    await expect(
      menu.getByRole('heading', { name: 'O que vamos preparar?' }),
    ).toBeVisible();
    await menu.getByRole('button', { name: 'Fechar', exact: true }).click();
    await header.getByRole('button', { name: 'Escolher dia' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Escolher dia de trabalho' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await header
      .getByRole('button', { name: 'Abrir menu de Perfil DEMONSTRAÇÃO' })
      .click();
    const profile = page.getByRole('dialog', { name: 'Menu da gestão' });
    await expect(profile.getByRole('link', { name: 'Acessos' })).toBeVisible();
    await expect(
      profile.getByRole('button', { name: 'Conhecer o app' }),
    ).toBeVisible();
    await profile.getByRole('button', { name: 'Fechar menu' }).click();

    await deliveries
      .getByRole('link', { name: 'Cliente DEMONSTRAÇÃO P1' })
      .click();
    await expect(page).toHaveURL(new RegExp('/gestao/pedidos/' + id + '$'));
    const detail = page.getByRole('region', { name: 'Detalhe do pedido' });
    await expect(
      detail.getByRole('heading', { name: 'Cliente DEMONSTRAÇÃO P1' }),
    ).toBeVisible();
    expect(
      (await page.locator('.desktop-order-list').boundingBox()).x,
    ).toBeLessThan((await detail.boundingBox()).x);

    await detail
      .getByRole('button', { name: 'Iniciar produção', exact: true })
      .click();
    await expect(
      page
        .locator('.desktop-order-list article')
        .filter({ hasText: 'Cliente DEMONSTRAÇÃO P1' }),
    ).toContainText('Em produção');

    await sidebar.getByRole('link', { name: 'Clientes' }).click();
    const openCustomer = page.getByRole('button', {
      name: 'Editar Cliente DEMONSTRAÇÃO P1',
    });
    const customerLeft = (await openCustomer.boundingBox()).x;
    await openCustomer.click();
    const customerSheet = page.getByRole('dialog', { name: 'Editar cliente' });
    expect((await customerSheet.boundingBox()).x).toBeGreaterThan(
      customerLeft + 260,
    );
    // A folha cabe na tela e rola até o fim do cadastro.
    const sheetBox = await customerSheet.boundingBox();
    expect(sheetBox.y + sheetBox.height).toBeLessThanOrEqual(860);
    const save = customerSheet.getByRole('button', { name: 'Salvar cliente' });
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport();
    await customerSheet
      .getByRole('button', { name: 'Fechar', exact: true })
      .click();

    await sidebar.getByRole('link', { name: 'Mais', exact: true }).click();
    const moreLinks = page.locator('.more-grid .more-link');
    await expect(moreLinks.nth(3)).toBeVisible();
    const links = await moreLinks.all();
    const firstRow = await Promise.all(
      links.slice(0, 4).map((link) => link.boundingBox()),
    );
    expect(firstRow.slice(0, 3).every((box) => box.y === firstRow[0].y)).toBe(
      true,
    );
    expect(firstRow[3].y).toBeGreaterThan(firstRow[0].y);
    await sidebar
      .getByRole('link', { name: 'Relatórios', exact: true })
      .click();
    await expect(page.getByLabel('Vendas até')).toBeVisible();
    const filters = await Promise.all(
      (await page.locator('.desktop-report-filters > *').all()).map((field) =>
        field.boundingBox(),
      ),
    );
    expect(new Set(filters.map(({ y }) => y)).size).toBe(1);

    for (const width of [1024, 1023]) {
      await page.setViewportSize({ width, height: 860 });
      if (width === 1024) await expect(sidebar).toBeVisible();
      else await expect(sidebar).toBeHidden();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    await page.setViewportSize({ width: 1366, height: 860 });

    if (process.env.T15_CAPTURE === '1') {
      for (const theme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: theme });
        for (const [name, route, ready] of [
          ['hoje', '/gestao', '.today-page .finance-kpi'],
          ['pedidos', '/gestao/pedidos/' + id, '.desktop-order-detail h1'],
          ['clientes', '/gestao/clientes', '.customer-records article'],
          ['mais', '/gestao/mais', '.more-grid'],
          ['relatorios', '/gestao/relatorios', '.report-export-panel'],
        ]) {
          await page.goto(t.url + route);
          await expect(page.locator('html')).toHaveAttribute(
            'data-theme',
            theme,
          );
          await expect(page.locator(ready).first()).toBeVisible();
          if (name === 'hoje')
            await expect(deliveries.locator('.order-card')).toHaveCount(3);
          if (name === 'clientes')
            await page
              .getByRole('button', { name: 'Editar Cliente DEMONSTRAÇÃO P1' })
              .click();
          if (name === 'relatorios') {
            await expect(page.getByLabel('Vendas até')).toHaveValue(day);
            await expect(
              page.getByRole('heading', { name: /^Vendas entregues:/ }),
            ).toBeVisible();
          }
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.allSettled(
              Array.from(document.images, (img) => img.decode()),
            );
          });
          await page.screenshot({
            path: `docs/colaboracao/capturas/t15-${name}-${theme === 'light' ? 'claro' : 'escuro'}.png`,
            animations: 'disabled',
          });
        }
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await t.dispose();
  }
});
