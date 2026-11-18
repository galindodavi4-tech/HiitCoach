import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // HTTPS on the LAN: the Screen Wake Lock API only works in a secure context
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'JOGABR Treino',
        short_name: 'JOGABR',
        description: 'Timer de treino de futebol',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache every built file so the app works fully offline
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        // Any route (e.g. /rodar/abc) opens the cached app
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: { host: true },
});
