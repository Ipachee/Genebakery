# Turnos

**Qué hace:** apertura y cierre de turno de caja (el turno de trabajo, no confundir con
[[Calendario]] que asigna turnos de personal a futuro).

**Archivos clave:** `src/features/turnos/components/AperturaCajaModal.tsx`, `CierreTurnoModal.tsx`,
`cierrePdf.ts`, `api.ts`, `hooks.ts`

## Cierre de turno

`CierreTurnoModal.tsx` genera un PDF (`cierrePdf.ts`) con el resumen del turno, incluyendo una sección
"Gastos del día" (gastos + pagos a empleados, vía `fn_resumen_gastos_dia` — ver
[[Convenciones#Funciones SECURITY DEFINER para lecturas cruzadas]]). Deliberadamente **no** tiene una
línea de "Neto" (facturado − gastos): se sacó a pedido explícito porque un neto podía dar negativo y
"quedar feo" en el PDF. Es una lista de gastos nomás, sin restar contra lo facturado.

## Admin y turno abierto

Un admin puede cobrar, tomar pedidos y cerrar el turno que dejó abierto un mozo, sin tener que volver a
loguearse como ese mozo.

**Relacionado:** [[Salon]] (caja inicial/arqueo), [[Ventas]] (lo que se cobra durante el turno),
[[Reportes]] (mismo resumen de gastos pero por rango de fechas en vez de un solo día)
