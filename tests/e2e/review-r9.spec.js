import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { reviewProject } from '../helpers/review-r5-project.mjs';
const capture = async (page, name, info) => {
  if (process.env.R9_CAPTURE === '1' && info.project.name === 'webkit-mobile')
    await page.screenshot({
      path: `docs/colaboracao/capturas/r9-depois-${name}.png`,
    });
};
test('R9 calendário sem zeros e cabeçalho alinhado', async ({
  browser,
}, info) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    fieldEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    },
  });
  try {
    await reviewProject(t);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.getByRole('button', { name: 'Escolher dia', exact: true }).click();
    const sheet = p.getByRole('dialog', {
      name: 'Escolher dia de trabalho',
      exact: true,
    });
    await expect(sheet.locator('.calendar-grid small')).toHaveCount(1);
    await expect(sheet.locator('.calendar-grid small')).toHaveText(['1']);
    const title = await sheet.locator('.calendar-month h2').textContent();
    expect(title).toMatch(/^[A-ZÁÉÍÓÚÂÊÔ][a-zçáéíóúâêôãõ]+ de \d{4}$/);
    expect(
      await sheet
        .locator('.calendar-month h2')
        .evaluate((e) => getComputedStyle(e).textTransform),
    ).toBe('none');
    const weekdays = await sheet.locator('.calendar-weekdays').boundingBox(),
      grid = await sheet.locator('.calendar-grid').boundingBox();
    expect(weekdays.width).toBeCloseTo(grid.width, 0);
    await capture(p, 'calendario', info);
    await sheet
      .getByRole('button', { name: 'Fechar calendário', exact: true })
      .click();
    for (const path of [
      'agenda',
      'relatorios',
      'lembretes',
      'despesas',
      'fichas',
      'insumos',
      'compras',
      'ajuda',
      'preferencias',
      'recorrentes',
      'produtos',
      'mensagens',
      'deslocamentos',
    ]) {
      await p.goto(t.url + '/gestao/' + path);
      const heading = p.locator('h1');
      await expect(heading).toHaveClass(/mobile-context-title/);
      expect((await heading.boundingBox()).height).toBe(1);
      if (['agenda', 'relatorios'].includes(path)) await capture(p, path, info);
    }
    await p.goto(t.url + '/gestao');
    await p.getByRole('button', { name: /Abrir menu de/ }).click();
    const menu = p.getByRole('dialog', { name: 'Menu da gestão', exact: true });
    await expect(menu.locator('.profile-menu-item').last()).toHaveText('Sair');
    for (const item of await menu.locator('.profile-menu-item').all()) {
      expect((await item.boundingBox()).height).toBeGreaterThanOrEqual(52);
      await expect(item.locator('svg')).toBeVisible();
    }
    await capture(p, 'menu-perfil', info);
    await menu
      .getByRole('button', { name: 'Fechar menu', exact: true })
      .click();
    await expect(
      p.getByRole('link', { name: 'Defina seu nome', exact: true }),
    ).toBeVisible();
    await capture(p, 'defina-seu-nome', info);
    await p.getByRole('link', { name: 'Defina seu nome', exact: true }).click();
    await p
      .getByLabel('Nome de exibição', { exact: true })
      .fill('Equipe DEMONSTRAÇÃO R9');
    await p
      .getByRole('button', { name: 'Salvar nome de exibição', exact: true })
      .click();
    await expect(
      p.getByText('Nome atualizado.', { exact: true }),
    ).toBeVisible();
    await p.goto(t.url + '/gestao');
    await expect(p.locator('.today-greeting h2')).toContainText(
      'Equipe DEMONSTRAÇÃO R9',
    );
    await expect(
      p.getByRole('link', { name: 'Defina seu nome', exact: true }),
    ).toHaveCount(0);
    const before = p.url();
    await p.getByRole('button', { name: 'Novo lembrete', exact: true }).click();
    const reminder = p.getByRole('dialog', {
      name: 'Novo lembrete',
      exact: true,
    });
    await expect(reminder).toBeVisible();
    await reminder
      .getByLabel('Título do lembrete', { exact: true })
      .fill('Retornar DEMONSTRAÇÃO R9');
    await capture(p, 'novo-lembrete', info);
    await reminder
      .getByRole('button', { name: 'Salvar lembrete', exact: true })
      .click();
    await expect(reminder).toBeHidden();
    expect(p.url()).toBe(before);
    await expect(
      p.getByRole('heading', { name: 'Retornar DEMONSTRAÇÃO R9', exact: true }),
    ).toBeVisible();
    await p.getByRole('button', { name: 'Novo lembrete', exact: true }).click();
    await p
      .getByRole('dialog', { name: 'Novo lembrete', exact: true })
      .getByLabel('Título do lembrete', { exact: true })
      .fill('Cancelado DEMONSTRAÇÃO R9');
    await p.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(
      p.getByRole('heading', {
        name: 'Cancelado DEMONSTRAÇÃO R9',
        exact: true,
      }),
    ).toHaveCount(0);
    const reminderHeader = p.locator('.today-reminders > .section-heading'),
      labelBox = await reminderHeader.locator('h3').boundingBox(),
      buttonBox = await reminderHeader.getByRole('button').boundingBox();
    expect(buttonBox.x).toBeGreaterThan(labelBox.x + labelBox.width);
    expect(
      Math.abs(
        labelBox.y + labelBox.height / 2 - buttonBox.y - buttonBox.height / 2,
      ),
    ).toBeLessThan(1);
    await capture(p, 'lembretes-hoje', info);
  } finally {
    await c.close();
    await t.dispose();
  }
});

test('R9 administrador prioriza valores, produção e confirmação validada por pedido', async ({
  browser,
}, info) => {
  const t = await runtime({
    browserHTTP: true,
    financeEnabled: true,
    p1Enabled: true,
    mobileEnabled: true,
    fieldEnabled: true,
  });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const { call, customer, variants } = await reviewProject(t);
    const due = new Date().toISOString();
    const valid = await call('orders', {
      customer_id: customer,
      due_at: due,
      items: [{ variant_id: variants[0].id, quantity: 1 }],
    });
    await call(
      `orders/${valid.id}/delivery`,
      {
        version: 1,
        delivery_type: 'delivery',
        delivery_address: 'Endereço DEMONSTRAÇÃO',
        courier: 'owner',
      },
      'PUT',
    );
    await call('orders', {
      customer_id: customer,
      due_at: due,
      items: [{ variant_id: variants[1].id, quantity: 1 }],
    });
    const ownerToday = await call('today', undefined, 'GET');
    expect(ownerToday.pending_orders).toHaveLength(2);
    expect(ownerToday.travel_week_cents).toBe(0);
    const op = await t.request('today', {
      cookie: await t.login('operator@example.test'),
    });
    expect((await op.json()).pending_orders).toEqual([]);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await expect(p.locator('.finance-kpi')).toHaveCount(4);
    await expect(p.locator('.production-list img')).toBeVisible();
    const blocks = [
      '.finance-summary',
      '.production-dashboard',
      '.pending-confirmations',
      '.deliveries-heading',
      '.today-reminders',
    ];
    const positions = await Promise.all(
      blocks.map(async (s) => (await p.locator(s).boundingBox()).y),
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    await expect(p.locator('.finance-kpi').last()).toContainText(
      'Corridas na semana',
    );
    const queue = p.locator('.pending-confirmations');
    await expect(
      queue.getByRole('button', { name: /Confirmar todos/ }),
    ).toBeDisabled();
    await capture(p, 'hoje-administrador', info);
    for (const checkbox of await queue.getByRole('checkbox').all())
      await checkbox.check();
    await queue.getByRole('button', { name: /Confirmar todos/ }).click();
    await expect(queue.getByRole('checkbox')).toHaveCount(1);
    await expect(queue.getByRole('alert')).toBeVisible();
    expect((await call('orders/' + valid.id, undefined, 'GET')).status).toBe(
      'confirmed',
    );
  } finally {
    await c.close();
    await t.dispose();
  }
});
