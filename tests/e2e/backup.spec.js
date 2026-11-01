import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
test('P1-9 administrador baixa SQL privado sem cache offline', async ({
  browser,
}) => {
  const t = await runtime({
      browserHTTP: true,
      financeEnabled: true,
      p1Enabled: true,
      toolsEnabled: true,
    }),
    c = await browser.newContext({
      acceptDownloads: true,
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
      },
    });
  try {
    await demoProject(t);
    const p = await c.newPage();
    await p.goto(t.url + '/api/access/start');
    await p.goto(t.url + '/gestao/backup');
    const [download] = await Promise.all([
      p.waitForEvent('download'),
      p.getByRole('button', { name: 'Baixar backup privado' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^backup-gestao-.*\.sql$/);
    const text = await readFile(await download.path(), 'utf8');
    expect(text).toContain('CREATE TABLE');
    expect(text).toContain('PRAGMA foreign_key_check;');
    await expect(p.getByRole('status')).toContainText('Download solicitado');
    const cache = await p.evaluate(async () => {
      const items = await Promise.all(
        (await caches.keys()).map(async (k) =>
          (await (await caches.open(k)).keys()).map(
            (r) => new URL(r.url).pathname,
          ),
        ),
      );
      return items.flat();
    });
    expect(cache.some((p) => p.startsWith('/api/'))).toBe(false);
  } finally {
    await c.close();
    await t.dispose();
  }
});
