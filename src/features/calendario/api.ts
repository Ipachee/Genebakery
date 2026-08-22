import { supabase } from '../../lib/supabase/client';

// Trae todo lo que "toca" el rango visible (el mes que se está mostrando),
// no solo lo que arranca ahí -- una vacación de 10 días que empezó el mes
// anterior tiene que seguir viéndose los primeros días de este mes.
//
// El nombre del empleado se pide aparte (fn_nombres_empleados, ve solo
// id+nombre+apellido) en vez de con el embed de Supabase sobre `empleados`
// -- esa tabla es admin-only, así que el embed le salía vacío a un mozo
// (mostraba "Empleado" genérico en vez del nombre real).
export async function fetchCalendario(desde: string, hasta: string) {
  const [{ data, error }, { data: nombres, error: errorNombres }] = await Promise.all([
    supabase
      .from('calendario_equipo')
      .select('*')
      .is('deleted_at', null)
      .lte('fecha_inicio', hasta)
      .gte('fecha_fin', desde)
      .order('fecha_inicio'),
    supabase.rpc('fn_nombres_empleados'),
  ]);
  if (error) throw error;
  if (errorNombres) throw errorNombres;
  const nombrePorId = new Map((nombres ?? []).map((n) => [n.id, { nombre: n.nombre, apellido: n.apellido }]));
  return (data ?? []).map((e) => ({ ...e, empleados: e.empleado_id != null ? (nombrePorId.get(e.empleado_id) ?? null) : null }));
}

function diasEntreISO(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  const cursor = new Date(`${desde}T00:00:00`);
  const fin = new Date(`${hasta}T00:00:00`);
  while (cursor <= fin) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

export async function crearEntrada(v: {
  tipo: 'turno_asignado' | 'vacaciones' | 'evento';
  fechaInicio: string;
  fechaFin: string;
  empleadoId: number | null;
  turnoEtiqueta: string | null;
  titulo: string | null;
  nota: string | null;
  creadoPor: string;
}) {
  // turno_asignado siempre es UN día por fila -- si se eligió un rango
  // (ej: asignar "Tarde" toda la semana de una), se crea una fila por
  // cada día del rango, en vez de una sola fila con fecha_inicio/fin
  // abarcando varios días. Así, más adelante, arrastrar un solo día
  // (para un cambio puntual con un compañero) solo toca ese día, no la
  // semana entera. Vacaciones/eventos sí quedan como un rango real.
  const filas =
    v.tipo === 'turno_asignado'
      ? diasEntreISO(v.fechaInicio, v.fechaFin).map((dia) => ({
          tipo: v.tipo,
          fecha_inicio: dia,
          fecha_fin: dia,
          empleado_id: v.empleadoId,
          turno_etiqueta: v.turnoEtiqueta,
          titulo: v.titulo,
          nota: v.nota,
          creado_por: v.creadoPor,
        }))
      : [
          {
            tipo: v.tipo,
            fecha_inicio: v.fechaInicio,
            fecha_fin: v.fechaFin,
            empleado_id: v.empleadoId,
            turno_etiqueta: v.turnoEtiqueta,
            titulo: v.titulo,
            nota: v.nota,
            creado_por: v.creadoPor,
          },
        ];
  const { error } = await supabase.from('calendario_equipo').insert(filas);
  if (error) throw error;
}

export async function borrarEntrada(id: number) {
  const { error } = await supabase.from('calendario_equipo').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// Para arrastrar un item: mover de día (fechaInicio/fechaFin, preservando
// la duración) y/o de turno (solo turno_asignado). Parcial a propósito --
// el drag de un evento no manda turnoEtiqueta, por ejemplo.
export async function moverEntrada(id: number, v: { fechaInicio?: string; fechaFin?: string; turnoEtiqueta?: string }) {
  const patch: { fecha_inicio?: string; fecha_fin?: string; turno_etiqueta?: string } = {};
  if (v.fechaInicio !== undefined) patch.fecha_inicio = v.fechaInicio;
  if (v.fechaFin !== undefined) patch.fecha_fin = v.fechaFin;
  if (v.turnoEtiqueta !== undefined) patch.turno_etiqueta = v.turnoEtiqueta;
  const { error } = await supabase.from('calendario_equipo').update(patch).eq('id', id);
  if (error) throw error;
}
