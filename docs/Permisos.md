# Permisos

**Qué hace:** quién puede solo ver o también editar cada sección de la app, por cargo.

**Archivos clave:** `src/features/permisos/hooks.ts`, `src/features/permisos/components/PermisosRolesView.tsx`,
`src/app/nav.ts`, Edge Function `crear-cargo`

## Modelo Ver / Editar

Ver [[Convenciones#Ver / Editar por sección]] para el patrón general (`usePuedeEditar`). Aplicado hoy
en: Salón, Insumos, Empleados, Elaborados, Proveedores, Categorías, Gastos, Ventas, Cobranzas, Recetas.

**Clientes queda afuera a propósito** — sigue en un modelo más viejo (`puede_operar_seccion`) para no
regresionar el acceso histórico sin restricciones que tenía el mozo ahí. Si se migra Clientes al modelo
nuevo alguna vez, revisar bien ese caso antes.

## Cargos dinámicos

`profiles.rol` y `permisos_navegacion.rol` dejaron de ser un `CHECK` fijo — ahora se validan por trigger
contra `roles_personalizados`. `src/app/nav.ts` tiene `Rol` como `string` plano, ya no una unión de
literales. La pantalla de login lee los cargos disponibles directo de `roles_personalizados`, así que un
cargo nuevo aparece solo, sin tocar código.

Un cargo recién creado arranca **sin** acceso a nada — antes, cualquier rol que no fuera `'encargado'`
tenía acceso de facto a todo, lo cual hubiera incluido sin querer a los cargos nuevos.

**Relacionado:** [[Salon]], [[Ventas]]
