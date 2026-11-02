import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
import { reviewProject } from '../helpers/review-r5-project.mjs';
test('R6-2 mapa codificado e preferência local por usuário', async ({
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
    const { call } = await reviewProject(t);
    const p = await c.newPage();
    // Confere links sem abrir apps externos nem efetuar chamadas de navegação.
    await p.addInitScript(() =>
      document.addEventListener(
        'click',
        (e) => {
          if (e.target.closest('a[target="_blank"]')) e.preventDefault();
        },
        true,
      ),
    );
    await p.goto(t.url + '/api/access/start');
    await p.getByRole('button', { name: 'Mapa', exact: true }).click();
    const sheet = p.getByRole('dialog', { name: /Rota até/ });
    const google = sheet.getByRole('link', {
        name: 'Google Maps',
        exact: true,
      }),
      waze = sheet.getByRole('link', { name: 'Waze', exact: true }),
      apple = sheet.getByRole('link', { name: 'Mapas do iPhone', exact: true });
    const destination = 'Endereço DEMONSTRAÇÃO';
    expect(
      new URL(await google.getAttribute('href')).searchParams.get(
        'destination',
      ),
    ).toBe(destination);
    expect(
      new URL(await google.getAttribute('href')).searchParams.get('travelmode'),
    ).toBe('driving');
    expect(new URL(await waze.getAttribute('href')).searchParams.get('q')).toBe(
      destination,
    );
    expect(
      new URL(await apple.getAttribute('href')).searchParams.get('daddr'),
    ).toBe(destination);
    await waze.click();
    await expect(sheet.getByRole('status')).toContainText('Último usado: Waze');
    await sheet
      .getByRole('button', { name: 'Fechar mapa', exact: true })
      .click();
    await p.reload();
    await p.getByRole('button', { name: 'Mapa', exact: true }).click();
    await expect(waze).toHaveAttribute('data-preferred', 'true');
    await expect(sheet.getByRole('status')).toContainText('Waze');
    const saved = await p.evaluate(() =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith('az-map-app:'))
        .map((k) => localStorage.getItem(k)),
    );
    expect(saved).toEqual(['waze']);
    if (process.env.R9_CAPTURE === '1' && info.project.name === 'webkit-mobile')
      await p.screenshot({
        path: 'docs/colaboracao/capturas/r9-depois-mapa-preferencia.png',
      });
    // Coordenadas zero são válidas; nenhum texto cru ou origem do trajeto no URL.
    const order = (await call('orders', undefined, 'GET'))[0];
    await t.db
      .prepare(
        'INSERT OR REPLACE INTO order_places(organization_id,order_id,data) VALUES(?,?,?)',
      )
      .bind(
        t.org,
        order.id,
        JSON.stringify({
          name: 'DEMONSTRAÇÃO',
          address: destination,
          neighborhood: '',
          latitude: 0,
          longitude: 0,
          instagram: '',
        }),
      )
      .run();
    await p.reload();
    await p.getByRole('button', { name: 'Mapa', exact: true }).click();
    expect(
      new URL(await google.getAttribute('href')).searchParams.get(
        'destination',
      ),
    ).toBe('0,0');
    expect(
      new URL(await waze.getAttribute('href')).searchParams.get('ll'),
    ).toBe('0,0');
    expect(
      new URL(await apple.getAttribute('href')).searchParams.get('daddr'),
    ).toBe('0,0');
    await c.setExtraHTTPHeaders({
      'Cf-Access-Jwt-Assertion': await t.token('operator@example.test'),
    });
    await p.goto(t.url + '/api/access/start');
    await p.getByRole('button', { name: 'Mapa', exact: true }).click();
    await expect(waze).toHaveAttribute('data-preferred', 'false');
    await expect(sheet.getByRole('status')).toHaveCount(0);
  } finally {
    await c.close();
    await t.dispose();
  }
});
