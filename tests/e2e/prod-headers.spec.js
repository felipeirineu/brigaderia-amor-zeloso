import { test, expect } from '@playwright/test';
import { runtime } from '../helpers/runtime.mjs';
// O harness aplica o bloco "/*" de public/_headers, como o Pages em produção.
// Este teste trava os dois recursos que esses cabeçalhos já quebraram:
// leitura da foto escolhida (blob:) e localização (geolocation).
test('cabeçalhos de produção permitem foto e localização, sem violar a CSP', async ({
  browser,
}) => {
  const t = await runtime({
    browserHTTP: true,
    mobileEnabled: true,
    fieldEnabled: true,
    p1Enabled: true,
  });
  const c = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: 0, longitude: 0 },
    extraHTTPHeaders: {
      'Cf-Access-Jwt-Assertion': await t.token('owner@example.test'),
    },
  });
  try {
    const p = await c.newPage();
    const violations = [];
    p.on('console', (m) => {
      if (/Content Security Policy|Permissions policy/i.test(m.text()))
        violations.push(m.text());
    });
    await p.goto(t.url + '/api/access/start');
    const response = await p.goto(t.url + '/gestao');
    const headers = response.headers();
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['content-security-policy']).not.toContain('unsafe');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['cross-origin-embedder-policy']).toBe('require-corp');
    expect(headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    await expect(p.getByRole('navigation').first()).toBeVisible();
    const result = await p.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 8;
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      const url = URL.createObjectURL(blob);
      const photo = await new Promise((r) => {
        const image = new Image();
        image.onload = () => r(true);
        image.onerror = () => r(false);
        image.src = url;
      });
      const location = await new Promise((r) =>
        navigator.geolocation.getCurrentPosition(
          () => r('ok'),
          (e) => r(e.message),
          { timeout: 5000 },
        ),
      );
      return { photo, location };
    });
    expect(result).toEqual({ photo: true, location: 'ok' });
    expect(violations).toEqual([]);
  } finally {
    await c.close();
    await t.dispose();
  }
});
