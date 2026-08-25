# ComandaCafé — Índice

Vault de Obsidian con la documentación del proyecto. Abrí esta carpeta (`docs/`) como vault en Obsidian
(`Abrir carpeta como vault`) para navegar los links y ver el grafo de relaciones.

## Cómo se mantiene actualizado

Esta regla vive en `CLAUDE.md` en la raíz del repo: cada vez que se termina una feature o migración, se
actualiza la nota del área tocada como un paso más del checklist de cierre (junto con tipos, tsc, lint,
commit y deploy). Si una nota queda desactualizada, es porque ese paso se saltó — no hace falta pedirlo
de nuevo cada vez, ya es parte del flujo.

## Base

- [[Arquitectura]] — stack, cómo se despliega, cómo se migran cambios de base de datos
- [[Convenciones]] — patrones que se repiten en todo el código (permisos, funciones de solo-lectura cruzada, PINs de fricción)

## Áreas con documentación real (las más tocadas / más frágiles)

- [[Salon]] — plano, mesas, dividir/unir mesas, caja inicial
- [[Turnos]] — apertura/cierre de turno, PDF de cierre, gastos del día
- [[Calendario]] — asignación de turnos de personal por día
- [[Ventas]] — listado de mesas cobradas, descuento manual, facturación desde acá
- [[Facturacion-electronica]] — AfipSDK/ARCA, CAE, QR
- [[Categorias-y-Recetas]] — separación de tickets cocina/barra
- [[Permisos]] — modelo Ver/Editar por sección y cargos dinámicos
- [[Print-bridge]] — programa aparte que imprime los tickets
- [[Configuracion-turnos]] — qué turnos existen cada día de la semana, lo lee el login
- [[E2E-tests]] — tests automáticos con Playwright de los flujos críticos (`npm run test:e2e`)
- [[Clientes]] — alta/edición, descuento por fidelización, permisos alineados con RLS
- [[Papelera]] — soft-delete unificado de 17 tipos, restaurar y eliminar definitivamente
- [[Movimientos]] — historial de stock, los 5 tipos de movimiento y el ajuste manual
- [[Reportes]] — ventas por período, alertas de stock bajo, por qué van por security definer

## Resto de las secciones (stubs — completar cuando se trabaje ahí)

- [[Ajustes]] · [[Auth]] · [[Comandera]] · [[Elaborados]] · [[Empleados]] · [[Gastos]] ·
  [[Insumos]] · [[Negocio]] · [[Pedidos]] · [[Proveedores]] ·
  [[Cobranzas]]
