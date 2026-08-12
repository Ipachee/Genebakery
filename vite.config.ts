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
        // skipWaiting + clientsClaim: el service worker nuevo toma control
        // apenas se instala, sin esperar a que se cierren todas las
        // pestañas viejas -- sin esto, un deploy nuevo podía quedar
        // "pegado" sirviendo el bundle anterior indefinidamente (lo vi
        // pasar en producción probando esto mismo).
        skipWaiting: true,
        clientsClaim: true,
        // index.html NO se precachea: si quedara en el precache, el SW lo
        // serviría directo sin ni siquiera intentar la red, y esa versión
        // vieja del HTML apunta a hashes de JS que ya no existen. Con
        // NetworkFirst se pide de red primero siempre que haya conexión;
        // recién si no hay conexión cae al cache.
        navigateFallback: null,
        globIgnores: ['**/index.html'],
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
