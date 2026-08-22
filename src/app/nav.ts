// Árbol de navegación del shell nuevo (barra lateral agrupada). Reemplaza
// la barra oscura de arriba + la fila plana de pestañas de Administración.
//
// Roles: admin, mozo, y encargado (agregado 2026-08-22 para una tercera
// persona de confianza, todavía sin puesto definido -- su nombre visible
// vive en roles_personalizados, editable desde Ajustes sin tocar código).
// Qué sección ve cada rol YA NO está hardcodeado acá -- admin ve todo
// siempre (para no poder auto-bloquearse la pantalla de permisos), y
// mozo/encargado se resuelven contra la tabla permisos_navegacion, que
// admin tilda/destilda desde Ajustes → Roles y permisos (ver
// features/permisos). Esta lista solo declara QUÉ secciones existen.
export type Rol = 'admin' | 'mozo' | 'encargado';
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
  | 'cobranzas'
  | 'empleados'
  | 'clientes'
  | 'calendario'
  | 'ajustes'
  | 'papelera';

export type Seccion = { id: SeccionId; label: string };
export type Grupo = { id: string; label: string; icon: string; items: Seccion[] };

// Roles configurables por el panel de permisos (todos menos admin, que
// siempre ve todo).
export const ROLES_CONFIGURABLES: Exclude<Rol, 'admin'>[] = ['mozo', 'encargado'];

// Salón y Comandera van ancladas arriba de todo, fuera de los grupos
// plegables -- son lo que se usa a cada minuto del turno.
export const SECCIONES_FIJAS: Seccion[] = [
  { id: 'salon', label: 'Salón' },
  { id: 'comandera', label: 'Comandera' },
];

export const GRUPOS: Grupo[] = [
  {
    id: 'compras',
    label: 'Compras y stock',
    icon: '📦',
    items: [
      { id: 'insumos', label: 'Insumos' },
      { id: 'movimientos', label: 'Movimientos' },
      { id: 'proveedores', label: 'Proveedores' },
    ],
  },
  {
    id: 'carta',
    label: 'Carta y producción',
    icon: '🍰',
    items: [
      { id: 'categorias', label: 'Categorías' },
      { id: 'recetas', label: 'Recetas' },
      { id: 'elaborados', label: 'Elaborados' },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: '💰',
    items: [
      { id: 'ventas', label: 'Ventas' },
      { id: 'gastos', label: 'Gastos' },
      { id: 'reportes', label: 'Reportes' },
      { id: 'cobranzas', label: 'Cobranzas' },
    ],
  },
  {
    id: 'personas',
    label: 'Personas',
    icon: '👥',
    items: [
      { id: 'empleados', label: 'Empleados' },
      { id: 'clientes', label: 'Clientes' },
      { id: 'calendario', label: 'Calendario' },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: '⚙️',
    items: [
      { id: 'ajustes', label: 'Ajustes' },
      { id: 'papelera', label: 'Papelera' },
    ],
  },
];

export function todasLasSecciones(): Seccion[] {
  return [...SECCIONES_FIJAS, ...GRUPOS.flatMap((g) => g.items)];
}

// `permisos` es el Set de "rol:seccionId" con visible=true, tal como lo arma
// usePermisosNavegacion(). Admin no pasa por acá -- ver idVisiblePara.
export function visiblePara(rol: Rol, seccion: Seccion, permisos: Set<string>) {
  if (rol === 'admin') return true;
  return permisos.has(`${rol}:${seccion.id}`);
}

function seccionPorId(id: SeccionId): Seccion | undefined {
  return SECCIONES_FIJAS.find((s) => s.id === id) ?? GRUPOS.flatMap((g) => g.items).find((s) => s.id === id);
}

export function idVisiblePara(rol: Rol, id: SeccionId, permisos: Set<string>): boolean {
  const seccion = seccionPorId(id);
  return seccion ? visiblePara(rol, seccion, permisos) : false;
}

// Para el fallback de "la sección guardada ya no es visible para este rol"
// -- antes de tener permisos configurables asumía que Salón siempre estaba
// disponible, lo cual ya no es cierto para un rol recién creado sin nada
// tildado todavía.
export function primeraSeccionVisible(rol: Rol, permisos: Set<string>): SeccionId | null {
  const todas = todasLasSecciones();
  return todas.find((s) => visiblePara(rol, s, permisos))?.id ?? null;
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
