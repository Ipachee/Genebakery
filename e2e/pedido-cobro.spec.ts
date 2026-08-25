import { test, expect } from '@playwright/test';
import { loginComo, crearYCobrarPedidoTakeAway } from './helpers';

// Administración de a propósito -- no depende de que haya un turno abierto
// (a diferencia de un turno normal, que exige abrir caja primero), así
// que es la cuenta más simple para probar el camino de comandar/cobrar
// sin depender de estado previo de la base.
test('tomar un pedido take away, enviar a cocina y cobrarlo', async ({ page }) => {
  await loginComo(page, 'Administración');
  await crearYCobrarPedidoTakeAway(page);
});

test('el botón Cobrar queda deshabilitado sin productos en el pedido', async ({ page }) => {
  await loginComo(page, 'Administración');
  await page.getByRole('button', { name: /Take away/ }).click();
  await expect(page.getByRole('button', { name: /Cobrar/ })).toBeDisabled();
});
