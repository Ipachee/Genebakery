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

## Expiración automática: 60 días (desde el 25/08/2026)

`fn_purgar_papelera_vencidos()` corre sola todos los días a las 6am UTC (3am Argentina, fuera del
horario de un café) vía `pg_cron`, y elimina definitivamente todo lo que lleva más de 60 días en la
papelera. Plazo decidido por el dueño del proyecto — no es un número técnico.

Decisiones:

- **No se le da permiso a `authenticated`.** A diferencia de `fn_purgar_papelera` (la manual), esta sólo
  la dispara el cron como `postgres` — nadie debería poder llamarla desde la app.
- **Recorre registro por registro**, no un `DELETE` masivo por tabla, para poder atrapar
  `foreign_key_violation` de a uno: si un pedido viejo todavía tiene una venta activa apuntándole, ese
  registro puntual se salta y sigue en la papelera — se reintenta solo al día siguiente, sin abortar el
  resto de la tabla por un solo registro bloqueado.
- **Sin tabla de log propia.** `pg_cron` ya guarda el historial de cada corrida en
  `cron.job_run_details` (duración, si falló, qué devolvió) — armar una tabla de auditoría aparte sería
  I/O de más para algo que ya viene gratis. Si hace falta algo más rico algún día, es el issue #17.

Verificado con dos casos reales antes de dejarlo andando: un registro descartable con `deleted_at`
retrocedido a 70 días se purgó ✅; un pedido con una venta real todavía apuntándole, con el mismo
`deleted_at` retrocedido, **no se tocó** ✅ (se restauró su fecha original después de la prueba).

Para ver la próxima corrida o el historial: `select * from cron.job_run_details order by start_time desc
limit 10;` contra la base.

**Relacionado:** [[Permisos]], [[Arquitectura]], [[Ventas]], [[Index]]
