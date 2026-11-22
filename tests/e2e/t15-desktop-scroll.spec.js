import { expect, test } from '@playwright/test';
import { demoProject } from '../helpers/demo-project.mjs';
import { runtime } from '../helpers/runtime.mjs';
import { fortalezaDay } from '../../shared/workday.ts';
// Computador: nenhuma tela trava a rolagem e nenhuma folha passa da borda
// da tela sem rolar (em 22/11 o cadastro de cliente não descia).
test('computador: páginas e folhas cabem na tela ou rolam', async ({
  browser,
}, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Layout de computador');
  test.setTimeout(300000);
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    financeEnabled: true,
    p1Enabled: true,
    toolsEnabled: true,
    fieldEnabled: true,
    prospectsEnabled: true,
  });
  const out = [];
  for (const vp of [
    { width: 1366, height: 860 },
    { width: 1280, height: 640 },
  ]) {
    const c = await browser.newContext({
      viewport: vp,
      extraHTTPHeaders: {
        'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
      },
    });
    const p = await c.newPage();
    if (vp.width === 1366) {
      const { makeOrder } = await demoProject(t);
      await makeOrder(fortalezaDay() + 'T16:00:00-03:00', 6);
    }
    await p.goto(t.url + '/api/access/start');
    const routes = [
      '',
      'pedidos',
      'clientes',
      'mais',
      'relatorios',
      'financeiro',
      'produtos',
      'kits',
      'fichas',
      'insumos',
      'estoque',
      'agenda',
      'lembretes',
      'recorrentes',
      'preferencias',
      'ajuda',
      'backup',
      'empresa',
      'sugestoes',
      'prospeccao',
      'visitas',
    ];
    for (const r of routes) {
      await p.goto(t.url + '/gestao/' + r).catch(() => {});
      await p.waitForTimeout(900);
      const res = await p.evaluate(() => {
        const bad = [];
        const doc = document.scrollingElement;
        // Página: conteúdo além da tela sem rolagem possível?
        if (
          doc.scrollHeight > innerHeight + 2 &&
          getComputedStyle(document.documentElement).overflowY === 'hidden'
        )
          bad.push('page-locked');
        for (const d of document.querySelectorAll('dialog')) {
          try {
            d.showModal();
          } catch {
            continue;
          }
          const rect = d.getBoundingClientRect(),
            st = getComputedStyle(d);
          const scrolls =
            d.scrollHeight > d.clientHeight + 2 &&
            /auto|scroll/.test(st.overflowY);
          const fits = rect.bottom <= innerHeight + 1 && rect.top >= -1;
          // conteúdo interno cortado sem rolagem
          if (!fits)
            bad.push(
              `dialog-out:${d.className}|${d.getAttribute('aria-label') ?? ''}|bottom=${Math.round(rect.bottom)}`,
            );
          else if (d.scrollHeight > d.clientHeight + 2 && !scrolls)
            bad.push(`dialog-clipped:${d.className}`);
          d.close();
        }
        return bad;
      });
      if (res.length)
        out.push(
          `${vp.width}x${vp.height} /${r}: ${[...new Set(res)].join(' ; ')}`,
        );
    }
    await c.close();
  }
  await t.dispose();
  expect(out).toEqual([]);
});
