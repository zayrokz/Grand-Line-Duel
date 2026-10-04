import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Grand Line Duel',
        short_name: 'GL Duel',
        description:
          'Duel de pirates en ligne à deux joueurs : soyez le premier à trouver le trésor !',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0e1b2c',
        theme_color: '#0e1b2c',
        categories: ['games'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // Les URL réservées de Firebase (/__/auth/…) ne doivent jamais servir l'application.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    // Le SDK Firebase pèse ~600 ko minifié : on le sépare pour un meilleur cache navigateur.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            { name: 'engine', test: /packages[\\/]engine[\\/]|node_modules[\\/]zod[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
