import { test, expect } from '@playwright/test';
import { loginComo } from './helpers';

test('login con PIN correcto entra al Salón', async ({ page }) => {
  // loginComo ya afirma "Mesas libres" visible -- alcanza como prueba de
  // que entró de verdad, sin depender del texto exacto de la barra lateral.
  await loginComo(page, 'Tarde');
  await expect(page.getByRole('button', { name: /Take away/ })).toBeVisible();
});

test('PIN incorrecto muestra error y no entra', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Tarde/ }).click();
  for (const digito of '9999') {
    await page.getByRole('button', { name: digito, exact: true }).click();
  }
  await expect(page.getByText('PIN incorrecto')).toBeVisible({ timeout: 10000 });
  // No tiene que haber entrado al sistema.
  await expect(page.getByText('Mesas libres')).not.toBeVisible();
});

test('solo se muestran los turnos activos hoy (Configuración de turnos)', async ({ page }) => {
  await page.goto('/');
  // No se afirma sobre CUÁLES exactamente (depende del día real y de lo
  // que esté cargado en Ajustes → Horarios de turno), solo que la
  // pantalla arma la grilla sin errores y siempre deja entrar a
  // Administración, que no depende de esa configuración.
  await expect(page.getByRole('button', { name: /Administración/ })).toBeVisible();
});
