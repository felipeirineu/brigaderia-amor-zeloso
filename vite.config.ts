import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa';
const manifest: Partial<ManifestOptions> = {
  id: '/',
  name: 'Brigaderia Amor Zeloso | Gestão',
  short_name: 'Amor Zeloso',
  description: 'Gestão de pedidos, entregas e finanças da brigaderia.',
  lang: 'pt-BR',
  start_url: '/gestao',
  scope: '/',
  display: 'standalone',
  background_color: '#fcf6ec',
  theme_color: '#fcf6ec',
  icons: [
    {
      src: '/icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

const version = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
).version;
let build = 'desenvolvimento';
try {
  // Último commit que muda o app (documentação não conta): publicar só
  // documentação gera o mesmo pacote e não dispara "Nova versão disponível".
  const [sha, stamp] = execFileSync(
    'git',
    [
      'log',
      '-1',
      '--format=%h %ct',
      '--abbrev=7',
      '--',
      '.',
      ':!docs',
      ':!*.md',
      ':!.zap',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  )
    .trim()
    .split(' ');
  if (!sha || !stamp) throw new Error('sem git');
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(Number(stamp) * 1000));
  const part = (key: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === key)?.value;
  build = `${part('day')}/${part('month')} ${part('hour')}h${part('minute')} · ${sha}`;
} catch {
  /* Fonte sem git: versão continua disponível, build é desenvolvimento. */
}
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_BUILD__: JSON.stringify(build),
  },
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png', 'brand/*.webp', 'favicon.ico'],
      manifest,
      workbox: {
        cleanupOutdatedCaches: true,
        importScripts: ['/push-worker.js'],
        globPatterns: ['**/*.{js,css,html,png,webp,ico,woff2,webmanifest}'],
        // Exports require the live API. Fetch their generators only on demand.
        globIgnores: [
          '**/node_modules/**/*',
          'assets/report-{spreadsheet,pdf,logo}-*',
        ],
        navigateFallback: '/index.html',
        // Rotas reservadas da Cloudflare, incluindo callback/logout do Access,
        // devem sempre chegar à rede, mesmo quando o shell está em cache.
        navigateFallbackDenylist: [
          /^\/api(?:\/|$)/,
          /^\/catalogo(?:\/|$)/,
          /^\/cdn-cgi(?:\/|$)/,
        ],
        runtimeCaching: [],
      },
    }),
    {
      name: 'dark-manifest',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'manifest-dark.webmanifest',
          source: JSON.stringify({
            ...manifest,
            background_color: '#090605',
            theme_color: '#090605',
          }),
        });
      },
    },
  ],
  test: {
    include: [
      'src/**/*.test.ts',
      'worker/**/*.test.ts',
      'shared/**/*.test.ts',
      'scripts/**/*.test.mjs',
    ],
  },
});
