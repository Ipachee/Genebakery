import { defineConfig, devices } from '@playwright/test';

// Corre contra comandacafedev.vercel.app -- misma base de datos que se usa
// para probar todo el resto de la sesión, no un entorno local aparte (no
// hay un Supabase local para este proyecto). Por eso cada corrida deja
// datos reales (pedidos take away, ventas, facturas) en la base de
// desarrollo -- ver docs/E2E-tests.md para el porqué de esa decisión.
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'https://comandacafedev.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
