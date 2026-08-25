import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

// Mismo PIN de prueba que usan hoy las 5 cuentas reales (ver docs/Auth.md).
// Si algún día lo cambian a uno real, este es el único lugar a tocar.
export const PIN = '1234';

// Si todavía no se cargó el efectivo inicial del turno de hoy, aparece el
// modal "💵 Fondo de caja" tapando el resto de la pantalla -- no siempre
// en el mismo momento (a veces justo al entrar, a veces recién al abrir
// un pedido), así que se chequea en cada punto donde podría trabar un
// click, no una sola vez.
async function saltearFondoDeCajaSiAparece(page: Page) {
  // "Omitir" es estado de React nomás (App.tsx: omitirAperturaCaja) --
  // no se guarda en la base, así que el modal vuelve a aparecer en cada
  // test nuevo (cada uno es una sesión de browser fresca). "Registrar"
  // en cambio SÍ persiste turno.efectivo_apertura -- una sola vez que se
  // registre (aunque sea $0) el modal deja de aparecer el resto del día
  // para cualquier test que corra después. Por eso se usa Registrar acá,
  // no Omitir.
  const registrar = page.getByRole('button', { name: 'Registrar' });
  // Tarda un toque en aparecer (espera a que resuelva el turno actual
  // desde la base) -- se reintenta en vez de chequear una sola vez.
  for (let intento = 0; intento < 5; intento++) {
    if (await registrar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await registrar.click();
      await expect(registrar).not.toBeVisible({ timeout: 5000 });
      return;
    }
  }
}

export async function loginComo(page: Page, nombreTarjeta: string) {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(nombreTarjeta) }).click();
  for (const digito of PIN) {
    await page.getByRole('button', { name: digito, exact: true }).click();
  }
  await expect(page.getByText('Mesas libres')).toBeVisible({ timeout: 15000 });
  await saltearFondoDeCajaSiAparece(page);
}

/** Arma un pedido take away con un solo producto (el primero de la carta
 * que esté disponible), lo manda a cocina, y lo cobra en efectivo. No
 * toca ninguna mesa real del plano -- así una corrida de test nunca deja
 * una mesa "ocupada" a la vista de alguien mirando el Salón real. */
export async function crearYCobrarPedidoTakeAway(page: Page) {
  await page.getByRole('button', { name: /Take away/ }).click();
  await saltearFondoDeCajaSiAparece(page);
  await page.locator('.pedido-producto-btn').first().click();
  await page.getByRole('button', { name: /Enviar a cocina/ }).click();
  await expect(page.getByRole('button', { name: /Cobrar/ })).toBeEnabled({ timeout: 10000 });
  await page.getByRole('button', { name: /Cobrar/ }).click();
  await saltearFondoDeCajaSiAparece(page);
  await page.getByRole('button', { name: 'Efectivo', exact: true }).click();
  await expect(page.getByText('Mesas libres')).toBeVisible({ timeout: 15000 });
}
