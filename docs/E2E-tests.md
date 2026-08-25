# Tests E2E (Playwright)

**Qué hace:** prueba automática de los flujos críticos (login, comandar/cobrar, facturar) contra la app
real -- no hay tests unitarios, solo E2E, porque la lógica pesada de este proyecto vive en la base
(RLS, funciones SQL) más que en funciones puras de JS. Correrlos: `npm run test:e2e`.

**Archivos:** `playwright.config.ts` (raíz), `e2e/helpers.ts`, `e2e/login.spec.ts`,
`e2e/pedido-cobro.spec.ts`, `e2e/facturacion.spec.ts`, `e2e/anular-venta.spec.ts`,
`.github/workflows/e2e.yml` (CI)

## Corren contra comandacafedev.vercel.app, no local

No hay Supabase local para este proyecto (la base de dev y prod es la misma, ver
[[Arquitectura]]) -- por eso `playwright.config.ts` apunta `baseURL` directo a
`comandacafedev.vercel.app` en vez de levantar un `webServer` local. Consecuencia real: **cada corrida
deja datos de verdad en la base de desarrollo** (un pedido take away con un café, una venta, una Factura
B con CAE real de AfipSDK modo demo). No corromper esto pensando que es un entorno descartable de
mentira -- es la misma base que se usa para probar todo lo demás a mano.

## El PIN de las cuentas está hardcodeado en el test

`e2e/helpers.ts` tiene `PIN = '1234'` -- mismo PIN de prueba que usan hoy las 5 cuentas reales (ver
[[Auth]]). El día que cambien a PINs de verdad, ese es el único lugar que hay que tocar acá.

## El modal "Fondo de caja" es la trampa más común al escribir un test nuevo

`App.tsx` muestra `AperturaCajaModal` cuando el turno actual tiene `efectivo_apertura == null`. El botón
**"Omitir"** de ese modal es puro estado de React (`omitirAperturaCaja`), no se guarda en la base -- así
que reaparece en cada test nuevo (cada uno es una sesión de browser fresca). Por eso el helper
`saltearFondoDeCajaSiAparece` clickea **"Registrar"** (deja $0 cargado) en vez de "Omitir": una sola vez
que se registra, `efectivo_apertura` queda persistido y el modal no vuelve a aparecer el resto del día
para ningún test que corra después. Si un test nuevo interactúa con Salón/Take away y no usa
`loginComo`/`crearYCobrarPedidoTakeAway`, hay que acordarse de llamar a este chequeo ahí también -- el
modal puede aparecer en cualquier punto de la sesión, con un delay async (espera a que resuelva el turno
desde la base), no solo una vez al loguear.

## Corren en serie (`workers: 1`), y tiene que quedar así

`fullyParallel: false` **no alcanza**: ese flag sólo serializa los tests dentro de un mismo archivo, los
archivos distintos igual arrancan en paralelo (Playwright levantaba 4 workers). Como todos pegan contra
la misma base, eso hacía fallar a `anular-venta.spec.ts` de forma intermitente — ese test cuenta las
filas de Ventas antes y después de anular una, y otro test cobrando en paralelo le cambiaba el total
abajo de los pies. Falla que sólo aparecía corriendo el suite completo, nunca corriendo ese archivo solo.
Por eso está `workers: 1` en `playwright.config.ts`. Si algún día se quiere volver a paralelizar, primero
hay que sacar los tests que dependen de conteos globales de la base.

## Selectores frágiles a propósito, no con `data-testid`

Los tests apuntan a texto/roles reales de la UI (`getByRole('button', { name: /Enviar a cocina/ })`) en
vez de agregar atributos `data-testid` al código de producción -- para un proyecto de este tamaño no vale
la pena el mantenimiento extra. Si un texto de botón cambia, el test que lo usa rompe y hay que
actualizarlo ahí -- es la señal de que cambió algo real, no ruido.

## CI (desde el 25/08/2026): corren solos en cada push/PR

`.github/workflows/e2e.yml` corre `npm run test:e2e` en GitHub Actions en cada push a `master`/
`feat/rediseno-navegacion` y en cada PR contra esas ramas -- ya no hace falta acordarse de correrlo a
mano. Ojo: como siguen apuntando a `comandacafedev.vercel.app` (ver arriba), **cada push a esas ramas
también deja datos reales en la base de dev**, ahora automáticamente. Si en algún momento se vuelve
molesto (mucho ruido de pedidos/ventas de prueba, o se pega contra el límite de llamadas demo de
AfipSDK), la salida más simple es acotar el trigger a menos ramas o pasar `facturacion.spec.ts` a un job
aparte que corra menos seguido -- no hay Supabase local para este proyecto, así que "correr contra una
base descartable" no es una opción sin armar eso primero.

**Relacionado:** [[Auth]], [[Salon]], [[Turnos]], [[Facturacion-electronica]], [[Arquitectura]], [[Index]]
