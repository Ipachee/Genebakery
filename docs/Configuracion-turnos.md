# Configuración de turnos por día

**Qué hace:** define qué turnos (Mañana/Tarde/Noche) existen cada día de la semana. El login los lee
para decidir qué tarjetas de turno mostrar hoy — reemplaza el "siempre los 3 turnos, todos los días" que
había antes.

**Archivos clave:** `src/features/configuracion-turnos/api.ts`, `hooks.ts`, `turnosActivosHoy.ts`,
`components/HorariosTurnoView.tsx` (vive como pestaña dentro de [[Ajustes]])

## Modelo

Tabla `configuracion_turnos`: una fila por combinación día (1=lunes...7=domingo, mismo criterio que
`extract(isodow from ...)` de Postgres) × etiqueta (`Mañana`/`Tarde`/`Noche`), con un booleano `activo`.
Lectura pública (`using (true)`, mismo patrón que `roles_personalizados`) porque el login la necesita
**antes** de autenticar — no hay nada sensible en esta tabla. Solo admin puede editarla.

Horario real cargado como seed inicial: lunes a jueves Mañana+Tarde, viernes y sábado los 3 turnos,
domingo solo Tarde.

## Independiente del Calendario de staffing

A propósito no se deriva de [[Calendario]] (quién está agendado para trabajar). Esta tabla dice
**qué turnos existen** (una decisión de horario de local, cambia poco); el Calendario sigue diciendo
**quién** trabaja cada uno (staffing semanal, cambia seguido). Mantenerlas separadas evita que un
calendario cargado tarde tumbe el login de un turno que sí existe hoy.

## Cómo lo usa el login

`LoginScreen.tsx` filtra `TODOS_LOS_TURNOS` (de `accounts.ts`) contra `etiquetasActivasHoy(config)`. Si
la consulta a `configuracion_turnos` todavía no cargó (o falla), se muestran **todos** los turnos como
fallback — que el login se caiga por un fetch que falla sería peor que mostrar una tarjeta de más.

**Bug real ya corregido:** un turno que quedó realmente ABIERTO en la base se muestra siempre, aunque
hoy no le toque por configuración. Pasó de verdad: quedó un turno Noche sin cerrar de un fin de semana, y
el lunes siguiente (Noche desactivado ese día) no había forma de entrar a esa cuenta para cerrarlo —
`fn_resolver_turno` bloquea abrir Tarde mientras Noche siga abierto, y su tarjeta de login no aparecía.
Se salvó por Admin (bypassea esa regla), pero no era la solución real. El filtro por día ahora es
`activasHoy.includes(etiqueta) || abierto(etiqueta)` — solo esconde la opción de EMPEZAR un turno fuera
de horario, nunca la de terminar uno que quedó corriendo de antes.

## Ojo con tablas nuevas y la Papelera

`src/features/papelera/api.ts` arma `TablaSoftDelete` como `Exclude<keyof Database['public']['Tables'],
...>` — cualquier tabla nueva sin columna `deleted_at` (como esta) tiene que sumarse a esa lista de
exclusión, si no `tsc` tira un error real (no cosmético) porque el tipo de `Update` para esa tabla no
tiene `deleted_at`.

**Relacionado:** [[Ajustes]], [[Calendario]], [[Auth]], [[Convenciones]]
