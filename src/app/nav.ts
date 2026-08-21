// Árbol de navegación del shell nuevo (barra lateral agrupada). Reemplaza
// la barra oscura de arriba + la fila plana de pestañas de Administración.
//
// Roles: hoy el sistema solo tiene 'admin' y 'mozo' (el filtrado por rol
// vive acá mismo, en `roles` de cada sección -- ya no en un componente
// aparte). El handoff de diseño proyecta un tercer rol 'cajero' (ligado al campo
// Puesto de Empleados) para dar acceso de "solo ver" a algunas secciones --
// eso es un cambio de esquema aparte, fuera del alcance de esta rama. Cada
// sección ya declara qué roles la ven (`roles`) para que sumar 'cajero' el
// día de mañana sea solo tocar esta lista, no la lógica del shell.
export type Rol = 'admin' | 'mozo';
export type SeccionId =
  | 'salon'
  | 'comandera'
  | 'insumos'
  | 'movimientos'
  | 'proveedores'
  | 'categorias'
  | 'recetas'
  | 'elaborados'
  | 'ventas'
  | 'gastos'
  | 'reportes'
  | 'empleados'
  | 'clientes'
  | 'ajustes'
  | 'papelera';

export type Seccion = { id: SeccionId; label: string; roles: Rol[] };
export type Grupo = { id: string; label: string; icon: string; items: Seccion[] };

// Salón y Comandera van ancladas arriba de todo, fuera de los grupos
// plegables -- son lo que se usa a cada minuto del turno.
export const SECCIONES_FIJAS: Seccion[] = [
  { id: 'salon', label: 'Salón', roles: ['admin', 'mozo'] },
  { id: 'comandera', label: 'Comandera', roles: ['admin', 'mozo'] },
];

export const GRUPOS: Grupo[] = [
  {
    id: 'compras',
    label: 'Compras y stock',
    icon: '📦',
    items: [
      { id: 'insumos', label: 'Insumos', roles: ['admin'] },
      { id: 'movimientos', label: 'Movimientos', roles: ['admin'] },
      { id: 'proveedores', label: 'Proveedores', roles: ['admin'] },
    ],
  },
  {
    id: 'carta',
    label: 'Carta y producción',
    icon: '🍰',
    items: [
      { id: 'categorias', label: 'Categorías', roles: ['admin'] },
      { id: 'recetas', label: 'Recetas', roles: ['admin'] },
      { id: 'elaborados', label: 'Elaborados', roles: ['admin'] },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: '💰',
    items: [
      { id: 'ventas', label: 'Ventas', roles: ['admin'] },
      { id: 'gastos', label: 'Gastos', roles: ['admin'] },
      { id: 'reportes', label: 'Reportes', roles: ['admin'] },
    ],
  },
  {
    id: 'personas',
    label: 'Personas',
    icon: '👥',
    items: [
      { id: 'empleados', label: 'Empleados', roles: ['admin'] },
      { id: 'clientes', label: 'Clientes', roles: ['admin'] },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: '⚙️',
    items: [
      { id: 'ajustes', label: 'Ajustes', roles: ['admin'] },
      { id: 'papelera', label: 'Papelera', roles: ['admin'] },
    ],
  },
];

export function visiblePara(rol: Rol, seccion: Seccion) {
  return seccion.roles.includes(rol);
}

function seccionPorId(id: SeccionId): Seccion | undefined {
  return SECCIONES_FIJAS.find((s) => s.id === id) ?? GRUPOS.flatMap((g) => g.items).find((s) => s.id === id);
}

export function idVisiblePara(rol: Rol, id: SeccionId): boolean {
  const seccion = seccionPorId(id);
  return seccion ? visiblePara(rol, seccion) : false;
}

// Grupo al que pertenece una sección, para el kicker del topbar ("Insumos ·
// Compras y stock").
export function grupoDe(id: SeccionId): Grupo | null {
  return GRUPOS.find((g) => g.items.some((it) => it.id === id)) ?? null;
}

export function labelDe(id: SeccionId): string {
  const fija = SECCIONES_FIJAS.find((s) => s.id === id);
  if (fija) return fija.label;
  for (const g of GRUPOS) {
    const it = g.items.find((s) => s.id === id);
    if (it) return it.label;
  }
  return id;
}
