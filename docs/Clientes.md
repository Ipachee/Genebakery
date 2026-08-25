# Clientes

**Qué hace:** alta/edición/borrado de clientes habituales, con `descuento_pct` como mecanismo simple de
fidelización (se aplica solo al elegirlos en el cobro, ver [[Ventas#Descuento manual]]) y datos fiscales
para facturación.

**Archivos:** `src/features/clientes/components/ClientesView.tsx`, `NuevoClienteModal.tsx`

## Permisos: RLS y UI ya alineados (desde el 25/08/2026)

La base bloquea la escritura vía RLS (`puede_operar_seccion('clientes')`, solo mozo tiene acceso libre
además de admin -- ver [[Permisos#Modelo Ver / Editar]]). Hasta el 25/08/2026, `ClientesView.tsx` mostraba
igual los botones Editar/Borrar y "+ Nuevo cliente" a cualquier rol con "Ver" tildado, aunque no tuviera
"Editar" -- el click le rebotaba un error del servidor en vez de no ver el botón. Se agregó
`usePuedeEditar('clientes')` (mismo patrón que Empleados/Gastos) para esconder esos controles cuando no
corresponde. Verificado manualmente: con "RRHH ve Clientes" tildado y "RRHH edita Clientes" destildado, el
rol ve la tabla pero no ve ningún botón de escritura.

**Relacionado:** [[Permisos]], [[Ventas]], [[Index]]
