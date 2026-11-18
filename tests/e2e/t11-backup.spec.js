import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const flags = {
  browserHTTP: true,
  financeEnabled: true,
  p1Enabled: true,
  toolsEnabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
};
async function project(browser, width = 390, options = {}) {
  const t = await runtime({ ...flags, ...options }),
    fixture = await demoProject(t);
  const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();
  if (options.migrationLimit !== 26)
    await t.db
      .prepare(
        "UPDATE backup_reminders SET last_backup_at=?,created_at='2020-01-01T12:00:00.000Z',weekday=?,time='00:00' WHERE organization_id=?",
      )
      .bind(
        eightDaysAgo,
        new Date(Date.now() - 10800000 - 86400000).getUTCDay() || 7,
        t.org,
      )
      .run();
  const c = await browser.newContext({
    viewport: { width, height: 844 },
    ...(width > 700 ? { isMobile: false, hasTouch: false } : {}),
    acceptDownloads: true,
    locale: 'pt-BR',
    serviceWorkers: 'block',
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  const p = await c.newPage();
  await p.goto(t.url + '/api/access/start');
  return { t, c, p, ...fixture };
}
async function shot(p, name, info, fullPage = false) {
  if (
    process.env.T11_CAPTURE === '1' &&
    info.project.name === 'chromium-mobile'
  ) {
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({
      path: `docs/colaboracao/capturas/t11-depois-${name}.png`,
      animations: 'disabled',
      scale: 'css',
      fullPage,
    });
  }
}
const settings = (x) =>
  x.call('p1/backup-reminders/' + x.t.org, undefined, 'GET');
const completions = async (x) =>
  (
    await x.t.db
      .prepare(
        'SELECT COUNT(*) n FROM backup_exports WHERE organization_id=? AND completed_at IS NOT NULL',
      )
      .bind(x.t.org)
      .first()
  ).n;
async function folderAPI(c) {
  await c.addInitScript(() => {
    window.__backupPermission = 'granted';
    window.__backupPermissionCalls = 0;
    window.__backupWriteFail = false;
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: async () =>
        (await navigator.storage.getDirectory()).getDirectoryHandle(
          'Backups DEMONSTRAÇÃO',
          { create: true },
        ),
    });
    FileSystemDirectoryHandle.prototype.queryPermission = async () =>
      window.__backupPermission;
    FileSystemDirectoryHandle.prototype.requestPermission = async () => {
      window.__backupPermissionCalls++;
      window.__backupPermission = 'granted';
      return 'granted';
    };
    const write = FileSystemFileHandle.prototype.createWritable;
    FileSystemFileHandle.prototype.createWritable = function (...args) {
      if (window.__backupWriteFail)
        throw new DOMException('DEMONSTRAÇÃO sem espaço', 'QuotaExceededError');
      return write.apply(this, args);
    };
  });
}
test('T11 Hoje: só owner, adiar1h entre aparelhos e concluir download resolve', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const x = await project(browser);
  const operator = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await x.t.token('operator@example.test'),
    },
  });
  try {
    await x.p.clock.install({ time: new Date() });
    await x.p.goto(x.t.url + '/gestao');
    const card = x.p.getByRole('complementary', {
      name: 'Lembrete de backup',
      exact: true,
    });
    await expect(card).toBeVisible();
    await expect(card).toContainText('há 8 dias');
    const heading = card.getByRole('heading', {
      name: 'Está na hora de fazer o backup!',
      exact: true,
    });
    await expect(heading).toBeVisible();
    await shot(x.p, 'hoje', info);
    const op = await operator.newPage();
    await op.goto(x.t.url + '/api/access/start');
    await expect(
      op.getByRole('complementary', { name: 'Lembrete de backup' }),
    ).toHaveCount(0);
    expect(
      (
        await op.request.get(x.t.url + '/api/p1/backup-reminders/' + x.t.org)
      ).status(),
    ).toBe(403);
    const secondOwner = await x.c.newPage();
    await secondOwner.clock.install({ time: new Date() });
    await secondOwner.goto(x.t.url + '/gestao');
    const secondCard = secondOwner.getByRole('complementary', {
      name: 'Lembrete de backup',
      exact: true,
    });
    await expect(secondCard).toBeVisible();
    await card
      .getByRole('button', { name: 'Lembrar mais tarde', exact: true })
      .click();
    await expect(card).toHaveCount(0);
    await secondOwner.clock.fastForward(61000);
    await expect(secondCard).toHaveCount(0);
    await secondOwner.close();
    const delayed = (await settings(x)).settings;
    expect(Date.parse(delayed.snoozed_until) - Date.now()).toBeGreaterThan(
      3590000,
    );
    await x.p.reload();
    await expect(card).toHaveCount(0);
    // Usar o prazo retornado pelo servidor evita depender da diferença entre os dois relógios.
    await x.p.clock.setFixedTime(
      new Date(Date.parse(delayed.snoozed_until) - 1),
    );
    await x.p.evaluate(() => dispatchEvent(new Event('focus')));
    await expect(card).toHaveCount(0);
    await x.p.clock.setFixedTime(
      new Date(Date.parse(delayed.snoozed_until) + 1),
    );
    await x.p.evaluate(() => dispatchEvent(new Event('focus')));
    await expect(card).toBeVisible();
    await card.getByRole('link', { name: 'Fazer backup', exact: true }).click();
    await expect(x.p).toHaveURL(/\/gestao\/backup$/);
    const before = (await settings(x)).settings.last_backup_at;
    const [download] = await Promise.all([
      x.p.waitForEvent('download'),
      x.p
        .getByRole('button', { name: 'Fazer backup agora', exact: true })
        .click(),
    ]);
    expect(await download.failure()).toBeNull();
    await expect(
      x.p.getByRole('status').filter({ hasText: 'Download solicitado' }),
    ).toBeVisible();
    expect((await settings(x)).settings.last_backup_at).toBe(before);
    await shot(x.p, 'download-confirmar', info, true);
    await x.p
      .getByRole('button', { name: 'Já salvei o arquivo', exact: true })
      .click();
    await expect(
      x.p.getByRole('status').filter({ hasText: 'Próximo lembrete' }),
    ).toBeVisible();
    expect(await completions(x)).toBe(1);
    await x.p.goto(x.t.url + '/gestao');
    await expect(card).toHaveCount(0);
  } finally {
    await operator.close();
    await x.c.close();
    await x.t.dispose();
  }
});
test('T11 configuração, retenção e banco sem0027 preservam download antigo', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const x = await project(browser);
  try {
    await x.p.goto(x.t.url + '/gestao/backup');
    const choices = x.p.getByRole('group', {
      name: 'Frequência do backup',
      exact: true,
    });
    await expect(
      choices.getByRole('button', { name: 'Toda semana', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(x.p.getByLabel('Horário local', { exact: true })).toHaveValue(
      '00:00',
    );
    await choices
      .getByRole('button', { name: 'A cada 15 dias', exact: true })
      .click();
    await x.p
      .getByRole('combobox', { name: 'Dia da semana', exact: true })
      .selectOption('1');
    await x.p.getByLabel('Horário local', { exact: true }).fill('09:00');
    await x.p
      .getByRole('button', { name: 'Salvar lembrete', exact: true })
      .click();
    await expect(
      x.p.getByRole('status').filter({ hasText: 'Lembrete atualizado' }),
    ).toBeVisible();
    expect((await settings(x)).settings).toMatchObject({
      period: 'fortnightly',
      weekday: 1,
      time: '09:00',
    });
    await expect(x.p.locator('.backup-retention > p strong')).toBeVisible();
    await x.p
      .getByRole('button', {
        name: 'Ajuda: Por quanto tempo guardar os backups',
      })
      .click();
    const help = x.p.getByRole('dialog', {
      name: 'Por quanto tempo guardar os backups',
    });
    await expect(help).toContainText('últimos 7 dias');
    await expect(help).toContainText('pasta privada');
    await shot(x.p, 'retencao-ajuda', info);
    await help.getByRole('button', { name: 'Fechar ajuda' }).click();
    await choices
      .getByRole('button', { name: 'Não lembrar', exact: true })
      .click();
    await x.p
      .getByRole('button', { name: 'Salvar lembrete', exact: true })
      .click();
    await expect
      .poll(async () => (await settings(x)).settings.period)
      .toBe('off');
    await x.p.goto(x.t.url + '/gestao');
    await expect(
      x.p.getByRole('complementary', { name: 'Lembrete de backup' }),
    ).toHaveCount(0);
  } finally {
    await x.c.close();
    await x.t.dispose();
  }
  const legacy = await project(browser, 390, { migrationLimit: 26 });
  try {
    await legacy.p.goto(legacy.t.url + '/gestao/backup');
    await expect(
      legacy.p.getByRole('group', { name: 'Frequência do backup' }),
    ).toHaveCount(0);
    await expect(
      legacy.p.getByRole('heading', {
        name: 'Pasta dos backups neste computador',
      }),
    ).toHaveCount(0);
    const [download] = await Promise.all([
      legacy.p.waitForEvent('download'),
      legacy.p.getByRole('button', { name: 'Fazer backup agora' }).click(),
    ]);
    expect(await download.failure()).toBeNull();
    await expect(legacy.p.getByRole('status')).toContainText(
      'Download solicitado',
    );
    await legacy.p.goto(legacy.t.url + '/gestao');
    await expect(
      legacy.p.getByRole('complementary', { name: 'Lembrete de backup' }),
    ).toHaveCount(0);
  } finally {
    await legacy.c.close();
    await legacy.t.dispose();
  }
});
test('T11 pasta persistida, permissão renovada e escrita concluída antes do recibo', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const x = await project(browser, 1280);
  try {
    if (info.project.name === 'webkit-mobile') {
      await x.c.addInitScript(() =>
        Object.defineProperty(window, 'showDirectoryPicker', {
          configurable: true,
          value: undefined,
        }),
      );
      await x.p.goto(x.t.url + '/gestao/backup');
      await expect(
        x.p.getByRole('button', { name: 'Escolher pasta', exact: true }),
      ).toHaveCount(0);
      await expect(
        x.p.getByText('No celular, o arquivo vai para Downloads', {
          exact: false,
        }),
      ).toBeVisible();
      return;
    }
    await x.t.db
      .prepare(
        "UPDATE backup_reminders SET weekday=1,time='09:00' WHERE organization_id=?",
      )
      .bind(x.t.org)
      .run();
    await folderAPI(x.c);
    await x.p.goto(x.t.url + '/gestao/backup');
    await x.p
      .getByRole('button', { name: 'Escolher pasta', exact: true })
      .click();
    await expect(
      x.p.getByText('Backups DEMONSTRAÇÃO', { exact: true }),
    ).toBeVisible();
    await x.p.reload();
    await expect(
      x.p.getByText('Backups DEMONSTRAÇÃO', { exact: true }),
    ).toBeVisible();
    await x.p.evaluate(() => {
      window.__backupPermission = 'prompt';
    });
    await x.p
      .getByRole('button', { name: 'Fazer backup agora', exact: true })
      .click();
    await expect(x.p.getByRole('alert')).toContainText('Permita o acesso');
    expect(await completions(x)).toBe(0);
    await x.p
      .getByRole('button', { name: 'Permitir acesso à pasta', exact: true })
      .click();
    expect(await x.p.evaluate(() => window.__backupPermissionCalls)).toBe(1);
    await x.p
      .getByRole('button', { name: 'Fazer backup agora', exact: true })
      .click();
    await expect(
      x.p.getByRole('status').filter({ hasText: 'Próximo lembrete' }),
    ).toBeVisible();
    expect(await completions(x)).toBe(1);
    const saved = await x.p.evaluate(async () => {
      const directory = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle('Backups DEMONSTRAÇÃO');
      const entries = [];
      for await (const [name, file] of directory.entries())
        entries.push({ name, contents: await (await file.getFile()).text() });
      return entries;
    });
    expect(saved).toHaveLength(1);
    expect(saved[0].contents).toContain('PRAGMA foreign_key_check;');
    await shot(x.p, 'pasta-computador', info, true);
    await x.p
      .getByRole('button', { name: 'Fazer backup agora', exact: true })
      .click();
    await expect.poll(async () => completions(x)).toBe(2);
    const count = await x.p.evaluate(async () => {
      const directory = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle('Backups DEMONSTRAÇÃO');
      let count = 0;
      for await (const entry of directory.keys())
        if (entry.endsWith('.sql')) count++;
      return count;
    });
    expect(count).toBe(2);
    await x.c.clearCookies();
    await x.c.setExtraHTTPHeaders({
      'Cf-Access-Jwt-Assertion': await x.t.token('other@example.test'),
    });
    await x.p.goto(x.t.url + '/api/access/start');
    await x.p.goto(x.t.url + '/gestao/backup');
    await expect(
      x.p.getByRole('button', { name: 'Escolher pasta', exact: true }),
    ).toBeVisible();
    await expect(
      x.p.getByText('Backups DEMONSTRAÇÃO', { exact: true }),
    ).toHaveCount(0);
  } finally {
    await x.c.close();
    await x.t.dispose();
  }
});
test('T11 falha ao gravar pasta não resolve o lembrete nem confirma a exportação', async ({
  browser,
}, info) => {
  const x = await project(browser, 1280);
  try {
    if (info.project.name === 'webkit-mobile') {
      await x.c.addInitScript(() =>
        Object.defineProperty(window, 'showDirectoryPicker', {
          configurable: true,
          value: undefined,
        }),
      );
      await x.p.goto(x.t.url + '/gestao/backup');
      await expect(
        x.p.getByRole('button', { name: 'Escolher pasta' }),
      ).toHaveCount(0);
      return;
    }
    await folderAPI(x.c);
    await x.p.goto(x.t.url + '/gestao/backup');
    await x.p
      .getByRole('button', { name: 'Escolher pasta', exact: true })
      .click();
    await expect(
      x.p.getByText('Backups DEMONSTRAÇÃO', { exact: true }),
    ).toBeVisible();
    await x.p.evaluate(() => {
      window.__backupWriteFail = true;
    });
    const before = (await settings(x)).settings.last_backup_at;
    await x.p
      .getByRole('button', { name: 'Fazer backup agora', exact: true })
      .click();
    await expect(x.p.getByRole('alert')).toContainText('Não há espaço');
    expect(await completions(x)).toBe(0);
    expect((await settings(x)).settings.last_backup_at).toBe(before);
    await expect(
      x.p.getByRole('button', { name: 'Atualizar lembrete' }),
    ).toHaveCount(0);
    await x.p
      .getByRole('button', { name: 'Usar Downloads', exact: true })
      .click();
    await x.p.route('**/api/p1/backup', (route) => route.abort('failed'));
    await x.p
      .getByRole('button', { name: 'Fazer backup agora', exact: true })
      .click();
    await expect(x.p.getByRole('alert')).toContainText('A conexão caiu');
    expect(await completions(x)).toBe(0);
    expect((await settings(x)).settings.last_backup_at).toBe(before);

    await x.p.goto(x.t.url + '/gestao');
    await expect(
      x.p.getByRole('complementary', { name: 'Lembrete de backup' }),
    ).toBeVisible();
  } finally {
    await x.c.close();
    await x.t.dispose();
  }
});
