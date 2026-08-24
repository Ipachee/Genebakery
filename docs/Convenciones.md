# Convenciones

Patrones que se repiten en distintas áreas del código. Antes de reinventar algo parecido, revisar si ya
existe uno de estos.

## Ver / Editar por sección

Hook `usePuedeEditar(seccionId)` (`src/features/permisos/hooks.ts`): `true` si `profile.rol === 'admin'`
o si el rol tiene el permiso de edición explícito para esa sección. Respaldado por RLS real
(`puede_ver_seccion`/`puede_editar_seccion` en SQL), no es solo un chequeo de UI.

Ojo: las **lecturas** de Salón/Comandera/Categorías/Productos/Ventas quedan sin restricción para
cualquier empleado a propósito (hace falta para operar: tomar pedidos, ver mesas). Solo se gatea el
camino de "administrar esta sección". Ver [[Permisos]].

## Funciones SECURITY DEFINER para lecturas cruzadas

Cuando una pantalla necesita datos de una tabla que el rol que la mira no tiene permiso de Ver (por
ejemplo, el mozo cerrando turno necesita ver gastos del día), se resuelve con una función Postgres
`SECURITY DEFINER` gateada por `exists(select 1 from profiles where id = auth.uid() and activo)` — no
por el permiso de esa sección puntual. Ejemplos: `fn_nombres_empleados`, `fn_resumen_gastos_dia`,
`fn_resumen_gastos_rango`.

## PIN de fricción, no de seguridad

`450422` aparece en dos lugares (arqueo de caja en [[Salon]], login de [[Print-bridge]]) como un freno
contra toques accidentales, **no** como control de acceso real — cualquiera que lo sepa puede usarlo. No
tratarlo como si fuera autenticación.

## Cargos dinámicos

Los roles (`profiles.rol`, `permisos_navegacion.rol`) no son un enum fijo — se validan por trigger
(`validar_rol_profile`/`validar_rol_permiso`) contra la tabla `roles_personalizados`. Un cargo nuevo se
crea de punta a punta con la Edge Function `crear-cargo`. Un cargo recién creado arranca **sin** ningún
acceso por default.

## Cambiar contraseñas/PIN reales de cuentas

El clasificador de seguridad de auto mode bloquea cualquier comando que toque credenciales de cuenta
reales (contraseñas, tokens de servicio), incluso con permiso explícito del usuario en el chat — es un
nivel aparte, no se destraba desde el chat. Camino que sí funciona: SQL Editor del dashboard de Supabase,
pisando `auth.users.encrypted_password` directo con `pgcrypto` (`crypt('nuevo', gen_salt('bf'))`) — lo
corre el usuario mismo, no hace falta la Admin API ni el service_role key. Ver [[Auth]] para el caso real
(PIN de las cuentas de turno).

## Flujo de git

`localhost` OK → commit a `feat/rediseno-navegacion` (esto ya dispara deploy a preview, ver
[[Arquitectura#Deploy — es manual, git push NO alcanza]]) → `master` solo cuando hay un OK final
explícito del usuario sobre lo visto en preview.
