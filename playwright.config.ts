import { defineConfig, devices } from '@playwright/test';

// Corre contra comandacafedev.vercel.app -- misma base de datos que se usa
// para probar todo el resto de la sesión, no un entorno local aparte (no
// hay un Supabase local para este proyecto). Por eso cada corrida deja
// datos reales (pedidos take away, ventas, facturas) en la base de
// desarrollo -- ver docs/E2E-tests.md para el porqué de esa decisión.
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  // `workers: 1` no es de más junto a `fullyParallel: false`: ese flag sólo
  // serializa los tests DENTRO de un archivo, pero los archivos distintos
  // igual salen en paralelo. Como todos pegan contra la MISMA base, eso
  // hacía fallar a anular-venta.spec.ts de forma intermitente -- cuenta las
  // filas de Ventas antes y después de anular una, y otro test creando una
  // venta al mismo tiempo le cambiaba el total abajo de los pies. En serie
  // no hay carrera posible.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'https://comandacafedev.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
