import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        id: '/',
        name: 'Brigaderia Amor Zeloso | Gestão',
        short_name: 'Amor Zeloso',
        description:
          'Base de demonstração do sistema de gestão. Sem dados reais.',
        lang: 'pt-BR',
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        background_color: '#F6EBDD',
        theme_color: '#351C13',
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
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/catalogo(?:\/|$)/],
        runtimeCaching: [],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts', 'worker/**/*.test.ts'] },
});
