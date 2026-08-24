import type { Database } from '../../lib/supabase/types';

type FilaConfig = Database['public']['Tables']['configuracion_turnos']['Row'];

// JS: 0 = domingo ... 6 = sábado. Acá se usa 1 = lunes ... 7 = domingo
// (mismo criterio que extract(isodow from ...) en Postgres).
export function isodowDeHoy(fecha: Date = new Date()): number {
  const dia = fecha.getDay();
  return dia === 0 ? 7 : dia;
}

export function etiquetasActivasHoy(config: FilaConfig[] | undefined, fecha: Date = new Date()): string[] {
  if (!config) return [];
  const hoy = isodowDeHoy(fecha);
  return config.filter((f) => f.dia_isodow === hoy && f.activo).map((f) => f.etiqueta);
}
