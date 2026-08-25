# Reportes

**Qué hace:** ventas de los últimos 7 o 30 días (total facturado, gastos del período, ventas por día,
producto más vendido) más las alertas consolidadas de stock bajo.

**Archivos:** `src/features/reportes/components/ReportesView.tsx`, `api.ts`, `hooks.ts`

## Por qué varias consultas van por función `security definer`

Quien tiene "Ver" tildado en Reportes **no** necesariamente lo tiene en Gastos, Insumos o Elaborados. Si
esta pantalla leyera esas tablas directo, la RLS le devolvería cero filas y los totales quedarían
mintiendo en $0 sin ningún error visible — el peor tipo de bug, porque parece un dato real.

Por eso `fn_resumen_gastos_rango` y `fn_alertas_stock` son `security definer`: exponen **sólo el
agregado** que Reportes necesita, sin abrir las tablas completas. Si se agrega otro dato acá que venga de
una sección con permisos propios, va por el mismo camino.

## Alertas de stock bajo (desde el 25/08/2026, issue #16)

`fn_alertas_stock()` junta insumos y elaborados en una sola lista, ordenada por urgencia
(`stock - minimo` ascendente: lo que está más abajo del mínimo primero). Antes el stock bajo era sólo un
badge suelto dentro de cada tabla, así que había que entrar a Insumos y a Elaborados y mirarlas a ojo.

Dos detalles que conviene no "arreglar" sin pensarlo:

- **La condición es `stock <= minimo`, idéntica a la del badge "bajo"** de `InsumosView`/`ElaboradosView`.
  Si acá se usara un criterio propio (por ejemplo, ignorar los que no tienen mínimo configurado), las dos
  pantallas se contradirían y no habría forma de saber cuál miente.
- **El panel se renderiza afuera del condicional de ventas.** Lo que falta comprar no depende de que haya
  habido ventas en el período; si estuviera adentro, desaparecería justo cuando no hay ninguna, que es
  cuando más se mira esta pantalla.

**Relacionado:** [[Insumos]], [[Elaborados]], [[Movimientos]], [[Gastos]], [[Permisos]], [[Index]]
