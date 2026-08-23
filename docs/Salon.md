# Salón

**Qué hace:** plano visual del local — salones, mesas, elementos decorativos (puertas, barra). Desde acá
se abre una mesa para tomar pedido.

**Archivos clave:** `src/features/salon/components/SalonView.tsx`, `api.ts`, `hooks.ts`

## Dividir / unir mesa

El botón "Dividir en A / B" (`dividirMesa` en `api.ts`) crea dos mesas hijas (`mesa_padre_id` apuntando
a la original), labels `A` y `B`, pegadas a los costados de la mesa madre. `unirMesa` las vuelve a
juntar. No se puede dividir una mesa con pedido activo.

Esto es lo mismo que resuelven las mesas "5BIS"/"3BIS" de otros sistemas (una mesa extra sin
renumerar el resto) — acá ya existe, con otro mecanismo.

## Caja inicial / arqueo

Botón "💵 Caja inicial" en el salón (solo visible con turno abierto). Abre `ArqueoCajaModal.tsx`, que
reusa la mutación `useRegistrarAperturaCaja` — es un `update`, se puede editar el monto en cualquier
momento del turno, no solo al abrir. Pide el PIN `450422` como fricción (ver
[[Convenciones#PIN de fricción, no de seguridad]]) solo si el monto realmente cambió.

## Plano editable

`elementos_decorativos.tipo` soporta `'puerta'`/`'barra'` hoy. Agregar un marcador de "Caja" (visto en
Maxirest) sería el mismo patrón: un tipo nuevo en ese enum.

**Relacionado:** [[Turnos]] (el turno abierto es lo que habilita cobrar/editar en el salón),
[[Permisos]] (lecturas del salón sin restricción a propósito)
