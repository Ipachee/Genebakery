# Papelera

**Qué hace:** vista única con todo lo borrado del sistema (17 tipos de entidad), unificado en la vista SQL
`papelera` — un `union all` de todas las tablas con `deleted_at is not null`. Restaurar es un click;
eliminar definitivamente es sólo para admin.

**Archivos:** `src/features/papelera/components/PapeleraView.tsx`, `api.ts`, `hooks.ts`;
migración de la vista: la última `create or replace view papelera` (hoy en
`20260822040000_cobranzas.sql`); purga: `20260825060000_purgar_papelera.sql`

## Todo el borrado es soft-delete

Ninguna vista del sistema borra de verdad: todas marcan `deleted_at`. Por eso la papelera puede mostrar
17 tipos distintos sin que cada feature tenga que hacer nada especial — alcanza con que su tabla tenga la
columna. **Si se agrega una tabla nueva con `deleted_at`, hay que sumarla a tres lugares**: la vista
`papelera`, el mapa `TABLA_POR_TIPO` en `api.ts` (para restaurar) y el `CASE` de `fn_purgar_papelera`
(para eliminar). Si se olvida alguno, el registro se borra pero nadie lo puede recuperar ni limpiar.

## Eliminar definitivamente (desde el 25/08/2026, issue #11)

`fn_purgar_papelera(p_tipo, p_id)`, security definer. Cuatro decisiones tomadas a propósito:

- **Sólo admin**, no `puede_editar_seccion('papelera')`. Restaurar es reversible, esto no — no queremos
  que un cargo con el tick de "Editar" pueda destruir datos de forma irrecuperable. El botón se esconde
  para el resto, pero el que manda es el chequeo del servidor.
- **El nombre de tabla sale de un `CASE` hardcodeado**, nunca del parámetro. Concatenar `p_tipo` en el
  SQL sería inyección directa contra una función security definer.
- **`where ... and deleted_at is not null`** en el delete: impide que una llamada directa al RPC borre un
  registro *activo* salteándose la papelera.
- **La foreign key es la que decide qué se puede borrar.** Un producto que ya se vendió tiene
  `pedido_items` apuntándole; borrarlo rompería el historial. La FK lo bloquea y la función traduce el
  `foreign_key_violation` a "hay otros registros que todavía dependen de este" en vez del texto crudo de
  Postgres. Verificado con un pedido real que tenía una venta asociada: rebota y el pedido queda intacto.

## Sin expiración automática (a propósito)

No hay purga por antigüedad. Hacerla requiere elegir un plazo de retención (¿30 días? ¿90?) y eso es una
decisión del negocio, no técnica — con el agravante de que equivocarse destruye datos reales sin que
nadie lo haya pedido. Si algún día se define un plazo, es una migración aparte (necesitaría `pg_cron`).

**Relacionado:** [[Permisos]], [[Arquitectura]], [[Ventas]], [[Index]]
