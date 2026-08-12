import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: el service worker se actualiza solo en segundo plano
      // ni bien hay una versión nueva -- complementa (no reemplaza) el
      // aviso "hay una versión nueva" ya armado en useNuevaVersion.ts.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // NetworkFirst para el shell/HTML: mientras haya conexión siempre
        // trae la versión más nueva; si no hay conexión, cae al cache.
        // Sin esto la app ni siquiera abre sin internet.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'app-shell', networkTimeoutSeconds: 3 },
          },
        ],
      },
      manifest: {
        name: 'ComandaCafé',
        short_name: 'ComandaCafé',
        description: 'Sistema de gestión para el café',
        theme_color: '#3b2418',
        background_color: '#f7ecd9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
