import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;

async function session(browser, t, email, colorScheme = 'light') {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme,
    extraHTTPHeaders: { 'Cf-Access-Jwt-Assertion': await t.token(email) },
  });
  const page = await context.newPage();
  await page.goto(t.url + '/api/access/start');
  await expect(
    page.getByRole('heading', { name: 'Hoje', exact: true }),
  ).toBeVisible();
  return { context, page };
}

test('T14 erro real de renderização recupera e abre relato com contexto sanitizado', async ({
  browser,
}, info) => {
  let broken = true;
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    feedbackWhatsapp: '5500900000000',
    // WebKit pode contornar page.route após recarregar. Simule no servidor local.
    browserResponse: (url, method, response) => {
      if (
        broken &&
        method === 'GET' &&
        url.pathname === '/api/orders' &&
        url.searchParams.has('q') &&
        response.ok
      ) {
        return Response.json(
          { length: 1, sentinel: 'DEMONSTRAÇÃO conteúdo privado' },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
    },
  });
  const operator = await session(browser, t, 'operator@example.test');
  const { page } = operator;
  try {
    const logs = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning') logs.push(msg);
    });
    const orderUrl = t.url + '/gestao/pedidos?cliente=DEMO-PRIVADO';
    await page.goto(orderUrl);
    const error = page.getByRole('heading', {
      name: 'Ops, algo deu errado nesta tela',
    });
    await expect(error).toBeVisible();
    const feedbackCode = page.locator('.feedback-code');
    await expect(feedbackCode).toHaveText(
      /^Código: E-\d{4}-[0-9A-F]{4} · versão /,
    );
    await expect(feedbackCode).toContainText(`versão ${version}`);
    await expect(page.getByText('DEMO-PRIVADO')).toHaveCount(0);
    const diagnostic = await Promise.all(
      logs
        .filter((entry) => entry.text().startsWith('Erro de tela'))
        .map((entry) => entry.args()[1].jsonValue()),
    );
    expect(diagnostic[0]).toEqual({
      code: expect.stringMatching(/^E-/),
      version,
      page: 'pedidos',
      name: 'TypeError',
    });
    if (
      process.env.T14_CAPTURE === '1' &&
      info.project.name === 'chromium-mobile'
    )
      await page.screenshot({
        path: 'docs/colaboracao/capturas/t14-erro-claro.png',
        animations: 'disabled',
      });

    broken = false;
    await page.getByRole('button', { name: 'Recarregar', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Pedidos', exact: true }).first(),
    ).toBeVisible();
    await expect(error).toHaveCount(0);
    broken = true;
    await page.goto(orderUrl);
    await expect(error).toBeVisible();
    await page.getByRole('link', { name: 'Voltar ao Hoje' }).click();
    await expect(
      page.getByRole('heading', { name: 'Hoje', exact: true }),
    ).toBeVisible();

    await page.goto(orderUrl);
    await expect(error).toBeVisible();
    const code = (await page.locator('.feedback-code').textContent()).match(
      /E-\d{4}-[0-9A-F]{4}/,
    )[0];
    await page.getByRole('link', { name: 'Contar o que aconteceu' }).click();
    await expect(
      page.getByRole('button', { name: 'Problema', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/tela Pedidos.*código E-/)).toContainText(code);
    await expect(
      page.getByRole('checkbox', { name: /Incluir informações do aparelho/ }),
    ).toBeChecked();
    if (
      process.env.T14_CAPTURE === '1' &&
      info.project.name === 'chromium-mobile'
    )
      await page.screenshot({
        path: 'docs/colaboracao/capturas/t14-sugestoes-claro.png',
        animations: 'disabled',
      });
    await page
      .getByLabel('Mensagem', { exact: true })
      .fill('DEMONSTRAÇÃO: erro na tela.');
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Obrigado!' }),
    ).toBeVisible();
    const wa = page.getByRole('link', { name: 'Mandar também no WhatsApp' });
    await expect(wa).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\/5500900000000\?text=/,
    );
    const outgoing = new URL(await wa.getAttribute('href'));
    expect(outgoing.searchParams.get('text')).toBe(
      'Problema no app:\nDEMONSTRAÇÃO: erro na tela.',
    );
    const saved = await t.db
      .prepare('SELECT context FROM feedback_messages WHERE organization_id=?')
      .bind(t.org)
      .first();
    expect(JSON.parse(saved.context)).toMatchObject({
      error_code: code,
      page: 'pedidos',
    });
    if (
      process.env.T14_CAPTURE === '1' &&
      info.project.name === 'chromium-mobile'
    )
      await page.screenshot({
        path: 'docs/colaboracao/capturas/t14-obrigado-claro.png',
        animations: 'disabled',
      });
  } finally {
    await operator.context.close();
    await t.dispose();
  }
});

test('T14 operadora envia e acompanha leitura; só administrador tem Recebidas', async ({
  browser,
}, info) => {
  const t = await runtime({ browserHTTP: true, mobileEnabled: true });
  const operator = await session(browser, t, 'operator@example.test');
  const owner = await session(browser, t, 'owner@example.test', 'dark');
  const capture =
    process.env.T14_CAPTURE === '1' && info.project.name === 'chromium-mobile';
  try {
    await operator.page.goto(t.url + '/gestao/mais');
    await expect(
      operator.page.getByRole('link', { name: /Recebidas/ }),
    ).toHaveCount(0);
    await operator.page
      .getByRole('link', { name: 'Sugestões e problemas' })
      .click();
    await operator.page
      .getByLabel('Mensagem', { exact: true })
      .fill('DEMONSTRAÇÃO: melhorar a tela de pedidos.');
    await operator.page
      .getByRole('checkbox', { name: /Incluir informações do aparelho/ })
      .uncheck();
    await operator.page
      .getByRole('button', { name: 'Enviar', exact: true })
      .click();
    await expect(
      operator.page.getByRole('heading', { name: 'Obrigado!' }),
    ).toBeVisible();
    await expect(
      operator.page.getByRole('link', { name: 'Mandar também no WhatsApp' }),
    ).toHaveCount(0);
    await operator.page
      .getByRole('button', { name: 'Voltar', exact: true })
      .click();
    await expect(
      operator.page.getByText('DEMONSTRAÇÃO: melhorar a tela de pedidos.'),
    ).toBeVisible();

    await owner.page.goto(t.url + '/gestao/mais');
    const inbox = owner.page.getByRole('link', { name: /Recebidas/ });
    await expect(inbox).toContainText('1');
    await inbox.click();
    await expect(
      owner.page.getByText('DEMONSTRAÇÃO: melhorar a tela de pedidos.'),
    ).toBeVisible();
    await expect(
      owner.page.getByRole('button', { name: 'Não lidas (1)', exact: true }),
    ).toBeVisible();
    await expect(
      owner.page.getByRole('link', { name: 'Responder no WhatsApp' }),
    ).toHaveCount(0);
    const record = await t.db
      .prepare('SELECT context FROM feedback_messages WHERE organization_id=?')
      .bind(t.org)
      .first();
    expect(record.context).toBeNull();
    if (capture) {
      await expect(owner.page.locator('html')).toHaveAttribute(
        'data-theme',
        'dark',
      );
      await owner.page.screenshot({
        path: 'docs/colaboracao/capturas/t14-recebidas-escuro.png',
        animations: 'disabled',
      });
    }
    await owner.page.getByRole('button', { name: 'Marcar como lida' }).click();
    await expect(
      owner.page.getByText('Nenhuma mensagem por ler.'),
    ).toBeVisible();
    await owner.page
      .getByRole('button', { name: 'Todas', exact: true })
      .click();
    await expect(owner.page.getByText('✓ Lida', { exact: true })).toBeVisible();
    await operator.page.reload();
    await expect(
      operator.page.getByText('✓ Lida', { exact: true }),
    ).toBeVisible();

    const cookie = await t.login('operator@example.test');
    expect((await t.request('feedback/inbox', { cookie })).status).toBe(403);
    await operator.page.goto(t.url + '/gestao/recebidas');
    await expect(operator.page.getByText('Área não encontrada.')).toBeVisible();
  } finally {
    await operator.context.close();
    await owner.context.close();
    await t.dispose();
  }
});
