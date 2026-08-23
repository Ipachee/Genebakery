# Calendario

**Qué hace:** asignación de turnos de personal a futuro (quién trabaja qué día) — no confundir con
[[Turnos]], que es la caja del día a día.

**Archivos clave:** `src/features/calendario/components/CalendarioView.tsx`, `.css`, `api.ts`

## Ojo: una fila por día, siempre

Hasta agosto 2026 una asignación de varios días (`turno_asignado`) era **una sola fila** en la base,
mostrada repetida en varias celdas del calendario. Arrastrar cualquiera de esas celdas visuales movía o
intercambiaba el rango entero — bug real, ya corregido.

Fix: migración `20260822080000_turnos_por_dia.sql` partió las filas multi-día existentes en filas por
día, y `crearEntrada` en `api.ts` inserta **siempre** una fila por día para `turno_asignado`, nunca un
rango. Si en algún momento se necesita volver a un modelo de "rango" por performance o UX, hay que
rehacer esto con cuidado — la razón de ser de la migración fue justamente romper esa atomicidad falsa.

## Mobile

El grid de 7 columnas no se achica hasta ilegible en celular — a partir de 620px de ancho scrollea
horizontal con un mínimo de 560px (`.calendario-grid-scroll`), mismo criterio que usan las tablas
(`.table-wrap`) en el resto de la app.

**Relacionado:** [[Convenciones]], [[Turnos]]
