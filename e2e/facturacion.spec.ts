import { test, expect } from '@playwright/test';
import { loginComo, crearYCobrarPedidoTakeAway } from './helpers';

// Depende de la API real de AfipSDK (modo dev, CUIT de demo -- ver
// docs/Facturacion-electronica.md), no de un mock, así que puede tardar
// más que el resto y en teoría podría fallar por algo ajeno al código
// (AfipSDK caído, ARCA lento). Si falla, revisar Ajustes → Facturación
// electrónica antes de asumir que es un bug nuevo.
test('generar una Factura B sobre la venta recién cobrada', async ({ page }) => {
  test.setTimeout(60000);

  await loginComo(page, 'Administración');
  await crearYCobrarPedidoTakeAway(page);

  await page.getByRole('button', { name: 'Ventas', exact: true }).click();

  // La venta que acabamos de cobrar es la más nueva -- fetchVentas ordena
  // por created_at descendente, así que siempre es la primera fila.
  const primeraFila = page.locator('tbody tr').first();
  await primeraFila.getByRole('button', { name: 'Generar factura' }).click();

  await page.getByPlaceholder('cliente@mail.com').fill('test-e2e@comandacafe.local');
  await page.getByRole('button', { name: 'Emitir factura' }).click();

  // Mensaje de éxito adentro del modal -- no "CAE" ni "Emitida" sueltos,
  // que también aparecen en facturas viejas ya emitidas en la misma
  // tabla (violación de "strict mode" de Playwright si matchea varias).
  await expect(page.getByText(/Factura emitida/)).toBeVisible({ timeout: 30000 });
});
