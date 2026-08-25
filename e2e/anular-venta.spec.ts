import { test, expect } from '@playwright/test';
import { loginComo, crearYCobrarPedidoTakeAway } from './helpers';

// Issue #3 del roadmap: anular una venta ahora pasa por fn_anular_venta
// (RPC), que además de borrarla (soft-delete) revierte el stock
// consumido -- antes era un update directo a deleted_at que no tocaba
// stock para nada.
test('anular una venta recién cobrada la saca de la lista, sin error', async ({ page }) => {
  await loginComo(page, 'Administración');
  await crearYCobrarPedidoTakeAway(page);

  await page.getByRole('button', { name: 'Ventas', exact: true }).click();

  const primeraFila = page.locator('tbody tr').first();
  await expect(primeraFila).toBeVisible({ timeout: 10000 });
  const filasAntes = await page.locator('tbody tr').count();

  await primeraFila.getByRole('button', { name: 'Borrar venta' }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();

  await expect(page.locator('tbody tr')).toHaveCount(filasAntes - 1, { timeout: 10000 });
});
