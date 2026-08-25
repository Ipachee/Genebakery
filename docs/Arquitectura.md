# Arquitectura

**Stack:** React + Vite + TypeScript, Supabase (Postgres + Auth + Edge Functions), desplegado en Vercel.

**Repo:** `Ipachee/Genebakery`, carpeta de trabajo `P:\Claude\Genebakery`.

## Entornos

- **Producción**: rama `master` → `https://comandacafe.vercel.app`
- **Preview / desarrollo**: rama `feat/rediseno-navegacion` → `https://comandacafedev.vercel.app`

Ver [[Convenciones#Flujo de git]] para cuándo pasa código de una rama a la otra.

## Deploy — es manual, `git push` NO alcanza

Vercel no redespliega solo con el push. Después de pushear hace falta:

```bash
npx vercel deploy --yes
npx vercel alias set <url-que-devuelve-el-deploy> comandacafedev.vercel.app
```

Si algún día no se ve un cambio reciente en `comandacafedev.vercel.app`, la causa más probable es que
faltó este paso, no un bug real.

## Cambios de base de datos

Todo cambio de schema sigue el mismo orden, siempre:

1. Migración nueva en `supabase/migrations/` (nombre `YYYYMMDDHHMMSS_descripcion.sql`)
2. `npx supabase db push --linked`
3. `npx supabase gen types typescript --linked` (regenera `src/lib/supabase/types.ts`)
4. `npx tsc -b` (tiene que quedar limpio)
5. `npm run lint` (oxlint — hoy hay 3 warnings cosméticos preexistentes, no deberían sumarse más)
6. commit + push + deploy

Si una función de Postgres cambia el tipo de retorno, `create or replace function` falla — hay que hacer
`drop function if exists ...()` antes de recrearla.

## CHECK de integridad numérica (desde el 25/08/2026)

Las tablas núcleo (`productos`, `insumos`, `recetas`, `elaborados`, `producciones`, `pedido_items`,
`ventas`, `gastos`) tienen CHECK constraints que impiden stock/precio/cantidad/monto negativo a nivel de
base -- antes solo lo evitaba (a veces) la lógica de la app. `movimientos.cantidad` queda afuera a
propósito: es un delta con signo (negativo al descontar, positivo al reponer), no una cantidad absoluta.
Antes de agregar un CHECK nuevo en una tabla existente, correr una query de conteo primero para confirmar
que ninguna fila real lo viola (si la hay, migrar esos datos antes, no ajustar el constraint para
esquivarlos). Ver `20260825040000_check_integridad_numerica.sql`.

## Segundo proyecto de Supabase, para desarrollo/testing (desde el 25/08/2026)

Hasta el 25/08/2026, `comandacafe.vercel.app` (producción) y `comandacafedev.vercel.app` (dev) compartían
la MISMA base de Supabase -- ver más abajo por qué eso venía siendo un problema real (stock consumido por
tests, un producto que casi traba un cobro real). Se creó un proyecto de Supabase aparte
(`comandacafe-dev`, ref `lycyfxxyfexvpjutiyai`) con las 47 migraciones corridas de punta a punta, las 5
cuentas reales (mismo PIN 1234) y datos mínimos de prueba.

**Queda pausado a propósito** -- el free tier de Supabase permite sólo 2 proyectos activos por
organización, y ya están ocupados por el proyecto real y otro (`stash`, ajeno a este). Se activa cuando
el dueño del proyecto pague el plan Pro. Credenciales completas (DB password, anon key, service_role
key) en la memoria de Claude (`comandacafe-dev-supabase-credenciales`) -- no están en este repo por ser
secretas.

**Cuando se active:** hay que actualizar las env vars de Vercel Preview
(`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) para que `comandacafedev.vercel.app` apunte ahí en vez de
compartir la base con producción, y correr cualquier migración nueva que haya quedado pendiente con
`npx supabase db push --project-ref lycyfxxyfexvpjutiyai -p <password>`.

**Bug real encontrado al crear la base nueva:** `20260821020000_take_away.sql` asumía que ya existía un
salón (cierto en producción, cargado a mano hace tiempo) -- en cualquier base nueva sin salones, esa
migración falla. Arreglado con `20260821015000_fix_salon_para_bases_nuevas.sql`, fechada a propósito
justo *antes* de `take_away` (no se edita una migración ya aplicada en producción) para que quede en el
orden correcto en cualquier proyecto nuevo. Aplicarla en producción necesitó `db push --include-all`
(el CLI protege contra insertar migraciones "en el pasado" salvo que se confirme a propósito) -- ahí no
hizo nada, porque ya había salones.

## Índices (desde el 25/08/2026)

Hasta el 25/08/2026 no había ningún índice más allá de las primary keys y los unique — cada reporte por
turno o por fecha era un full scan. `20260825050000_indices_alto_volumen.sql` agrega 16 índices sobre las
tablas que crecen para siempre (`ventas`, `pedidos`, `pedido_items`, `movimientos`, `gastos`) más las
columnas que recorren las funciones SQL en loop (`elaborados.producto_id`, `pedido_items.pedido_id`).

Criterio, para no repetir el error al revés: hay **32 foreign keys sin índice** y se indexaron sólo las
que alguna consulta real filtra u ordena (verificado leyendo `src/features/*/api.ts` y las funciones SQL,
no a ojo). Quedan sin índice a propósito las columnas de auditoría (`creado_por`, `usuario_id`,
`mozo_id`, `cargado_por`, `abierto_por`) — nadie filtra por ellas — y las tablas chicas de catálogo
(`mesas`, `salones`, `empleados`, `profiles`), donde escanear unas decenas de filas sale más barato que
mantener el índice en cada escritura. Varios son índices parciales (`where deleted_at is null`) porque
todas las consultas de esas tablas filtran los borrados.

## `print-bridge` es un programa aparte

Vive en `print-bridge/` pero **no** es parte del build de Vite ni pasa por `tsc`/`lint` del proyecto
principal. Se corre por separado (`node index.js`) en la compu que tiene la impresora conectada. Ver
[[Print-bridge]].
