import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useCalendario, useCalendarioMutations } from '../hooks';
import { usePermisosNavegacion } from '../../permisos/hooks';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import { NuevaEntradaCalendarioModal } from './NuevaEntradaCalendarioModal';
import type { Database } from '../../../lib/supabase/types';
import './CalendarioView.css';

type Entrada = Database['public']['Tables']['calendario_equipo']['Row'] & {
  empleados: { nombre: string; apellido: string } | null;
};

const DIAS_HEADER = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TURNOS = ['Mañana', 'Tarde', 'Noche'] as const;
const ICONO_TURNO: Record<string, string> = { Mañana: '☀️', Tarde: '🌙', Noche: '🍽️' };

function fmtISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDias(iso: string, delta: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + delta);
  return fmtISO(d);
}

function diasEntre(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

function sumarDias(d: Date, delta: number): Date {
  const copia = new Date(d);
  copia.setDate(copia.getDate() + delta);
  return copia;
}

function useGrillaMes(mesBase: Date) {
  return useMemo(() => {
    const primerDia = new Date(mesBase.getFullYear(), mesBase.getMonth(), 1);
    const ultimoDia = new Date(mesBase.getFullYear(), mesBase.getMonth() + 1, 0);
    const inicioGrilla = new Date(primerDia);
    inicioGrilla.setDate(primerDia.getDate() - ((primerDia.getDay() + 6) % 7));
    const finGrilla = new Date(ultimoDia);
    finGrilla.setDate(ultimoDia.getDate() + (6 - ((ultimoDia.getDay() + 6) % 7)));

    const dias: Date[] = [];
    for (let d = new Date(inicioGrilla); d <= finGrilla; d.setDate(d.getDate() + 1)) {
      dias.push(new Date(d));
    }
    return { dias, mesActual: mesBase.getMonth() };
  }, [mesBase]);
}

// Semana de lunes a domingo que contiene `fecha` -- para la vista semanal,
// donde se quiere ver bien claro "esto es lo que viene esta semana" sin
// que se pierda entre el resto del mes.
function useGrillaSemana(fecha: Date) {
  return useMemo(() => {
    const lunes = new Date(fecha);
    lunes.setDate(fecha.getDate() - ((fecha.getDay() + 6) % 7));
    const dias: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      dias.push(d);
    }
    return { dias };
  }, [fecha]);
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Mensual: "Agosto de 2026". Semanal: el rango de la semana en curso --
// "17 – 23 de agosto" (o "27 jul – 2 ago" si cruza de mes), para que quede
// bien explícito qué semana se está mirando.
function tituloRango(dias: Date[], vista: 'mensual' | 'semanal', mesBase: Date): string {
  if (vista === 'mensual') {
    return capitalizar(mesBase.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }));
  }
  const inicio = dias[0];
  const fin = dias[dias.length - 1];
  const mismoMes = inicio.getMonth() === fin.getMonth() && inicio.getFullYear() === fin.getFullYear();
  if (mismoMes) {
    const mes = fin.toLocaleDateString('es-AR', { month: 'long' });
    return `${inicio.getDate()} – ${fin.getDate()} de ${mes}`;
  }
  const inicioTxt = inicio.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const finTxt = fin.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${inicioTxt} – ${finTxt}`;
}

function entradaLabel(e: Entrada) {
  if (e.tipo === 'evento') return e.titulo ?? 'Evento';
  const nombre = e.empleados ? `${e.empleados.nombre} ${e.empleados.apellido}` : 'Empleado';
  if (e.tipo === 'vacaciones') return `🌴 ${nombre}`;
  return `${ICONO_TURNO[e.turno_etiqueta ?? ''] ?? '🕐'} ${nombre}`;
}

function claseTipo(tipo: string): string {
  if (tipo === 'turno_asignado') return 'chip-turno';
  if (tipo === 'vacaciones') return 'chip-vacaciones';
  return 'chip-evento';
}

// Info que necesita el arrastre para saber qué mover -- se guarda en un ref
// (no en el estado) porque se lee/escribe en cada pointermove, y no hace
// falta re-renderizar por eso; dragId/dragPos sí son estado porque de eso
// depende lo que se pinta (el fantasma seguiendo el dedo, la bandeja de
// turnos, la opacidad del chip que se está moviendo).
type InfoArrastre = { entrada: Entrada; duracionDias: number; startX: number; startY: number };

export function CalendarioView() {
  const { profile } = useAuth();
  const { edicion } = usePermisosNavegacion();
  // Admin siempre puede editar el calendario. Mozo/RRHH solo si tienen el
  // tick de "Editar" en calendario tildado en Ajustes → Roles y permisos
  // -- "Ver" (que ya controla si la sección aparece en el menú) no alcanza,
  // separar ambos permite que alguien vea quién trabaja sin poder mover
  // turnos ni cargar vacaciones.
  const puedeEditar = profile?.rol === 'admin' || (!!profile?.rol && edicion.has(`${profile.rol}:calendario`));
  const [vista, setVista] = useState<'mensual' | 'semanal'>('mensual');
  const [mesBase, setMesBase] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [semanaBase, setSemanaBase] = useState(() => new Date());
  const { dias: diasMes } = useGrillaMes(mesBase);
  const { dias: diasSemana } = useGrillaSemana(semanaBase);
  const dias = vista === 'mensual' ? diasMes : diasSemana;
  const { mover, borrar } = useCalendarioMutations();
  const { confirm, dialog } = useConfirm();
  const [modalFecha, setModalFecha] = useState<string | null>(null);

  const desde = fmtISO(dias[0]);
  const hasta = fmtISO(dias[dias.length - 1]);
  const { data: entradas, isLoading } = useCalendario(desde, hasta);

  const hoyIso = fmtISO(new Date());

  const infoArrastreRef = useRef<InfoArrastre | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [diaSobrevolado, setDiaSobrevolado] = useState<string | null>(null);

  // Los turno_asignado se ordenan Mañana/Tarde/Noche (arriba-abajo) para
  // que la posición vertical tenga sentido -- así arrastrar el de abajo
  // encima del de arriba (o viceversa) es intuitivo: intercambia los
  // turnos. Vacaciones/eventos quedan después, en su orden de siempre.
  function entradasDelDia(diaIso: string) {
    const filtradas = ((entradas ?? []) as Entrada[]).filter((e) => e.fecha_inicio <= diaIso && e.fecha_fin >= diaIso);
    return [...filtradas].sort((a, b) => {
      const claveA = a.tipo === 'turno_asignado' ? TURNOS.indexOf(a.turno_etiqueta as (typeof TURNOS)[number]) : 3;
      const claveB = b.tipo === 'turno_asignado' ? TURNOS.indexOf(b.turno_etiqueta as (typeof TURNOS)[number]) : 3;
      return claveA - claveB;
    });
  }

  async function handleBorrar(e: Entrada) {
    if (await confirm(`¿Quitar "${entradaLabel(e)}" del calendario?`)) borrar.mutate(e.id);
  }

  // Mismo patrón que el arrastre de mesas en Salón: setPointerCapture sobre
  // el propio chip hace que TODOS los pointermove/pointerup que siguen
  // lleguen a ese elemento pase lo que pase por debajo del dedo/mouse --
  // más confiable que escuchar en window (que dependía de un useEffect
  // re-suscribiéndose en cada movimiento, y a veces se perdía el soltar).
  function iniciarArrastre(ev: React.PointerEvent, entrada: Entrada) {
    if (!puedeEditar) return;
    ev.stopPropagation();
    // Sin esto, el mousedown+arrastre lo toma el navegador como "selección
    // de texto" (en Edge aparece su mini-menú de selección arriba del
    // chip) en vez de dejarlo para el arrastre -- compitiendo con
    // setPointerCapture y dejando todo en un estado raro a medio camino.
    ev.preventDefault();
    infoArrastreRef.current = {
      entrada,
      duracionDias: diasEntre(entrada.fecha_inicio, entrada.fecha_fin),
      startX: ev.clientX,
      startY: ev.clientY,
    };
    setDragId(entrada.id);
    setDragPos({ x: ev.clientX, y: ev.clientY });
    (ev.target as Element).setPointerCapture(ev.pointerId);
  }

  function moverArrastre(ev: React.PointerEvent) {
    if (infoArrastreRef.current == null) return;
    setDragPos({ x: ev.clientX, y: ev.clientY });
    // Para resaltar en vivo la celda de destino ("soltar acá") mientras se
    // arrastra -- se recalcula en cada movimiento con elementFromPoint, no
    // hace falta nada más sofisticado dado lo chico del calendario.
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const diaIso = (el?.closest('[data-dia-iso]') as HTMLElement | null)?.dataset.diaIso ?? null;
    setDiaSobrevolado(diaIso);
  }

  // Umbral de 8px para distinguir "tap" de "arrastre real" -- si no, un
  // simple click en un chip (que también dispara pointerdown) terminaría
  // moviendo la entrada un pixel a ningún lado.
  //
  // Soltar sobre OTRO turno_asignado (mismo día o distinto) los
  // intercambia directo -- ambos se cruzan de día+turno, no hace falta
  // ningún elemento aparte para "cambiar el turno". Soltar sobre una
  // parte vacía de un día simplemente mueve la fecha, conservando turno y
  // duración.
  function soltarArrastre(ev: React.PointerEvent) {
    const info = infoArrastreRef.current;
    if (info) {
      const distancia = Math.hypot(ev.clientX - info.startX, ev.clientY - info.startY);
      if (distancia > 8) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const idObjetivo = Number((el?.closest('[data-entrada-id]') as HTMLElement | null)?.dataset.entradaId);
        const objetivo = idObjetivo && idObjetivo !== info.entrada.id ? ((entradas ?? []) as Entrada[]).find((e) => e.id === idObjetivo) : null;

        if (objetivo && objetivo.tipo === 'turno_asignado' && info.entrada.tipo === 'turno_asignado') {
          mover.mutate({
            id: info.entrada.id,
            fechaInicio: objetivo.fecha_inicio,
            fechaFin: objetivo.fecha_fin,
            turnoEtiqueta: objetivo.turno_etiqueta ?? undefined,
          });
          mover.mutate({
            id: objetivo.id,
            fechaInicio: info.entrada.fecha_inicio,
            fechaFin: info.entrada.fecha_fin,
            turnoEtiqueta: info.entrada.turno_etiqueta ?? undefined,
          });
        } else {
          const nuevoInicio = (el?.closest('[data-dia-iso]') as HTMLElement | null)?.dataset.diaIso;
          if (nuevoInicio && nuevoInicio !== info.entrada.fecha_inicio) {
            mover.mutate({ id: info.entrada.id, fechaInicio: nuevoInicio, fechaFin: addDias(nuevoInicio, info.duracionDias) });
          }
        }
      }
    }
    infoArrastreRef.current = null;
    setDragId(null);
    setDragPos(null);
    setDiaSobrevolado(null);
  }

  const entradaArrastrada = infoArrastreRef.current?.entrada ?? null;
  const superoUmbral =
    dragPos != null && infoArrastreRef.current != null &&
    Math.hypot(dragPos.x - infoArrastreRef.current.startX, dragPos.y - infoArrastreRef.current.startY) > 8;
  // Mientras se arrastra un turno, los demás chips de turno se marcan como
  // posible destino para intercambiar -- sin esto no queda claro que se
  // puede soltar arriba de otro turno.
  const resaltarComoDestino = superoUmbral && entradaArrastrada?.tipo === 'turno_asignado';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader
        title="Calendario de equipo"
        subtitle="Quién trabaja qué turno cada día, vacaciones y eventos generales, todo en un solo lugar."
      />

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="calendario-vista-toggle" role="group" aria-label="Vista del calendario">
            <button
              type="button"
              className={vista === 'mensual' ? 'activo' : ''}
              onClick={() => setVista('mensual')}
            >
              Mensual
            </button>
            <button
              type="button"
              className={vista === 'semanal' ? 'activo' : ''}
              onClick={() => setVista('semanal')}
            >
              Semanal
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            aria-label={vista === 'mensual' ? 'Mes anterior' : 'Semana anterior'}
            onClick={() =>
              vista === 'mensual'
                ? setMesBase((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                : setSemanaBase((s) => sumarDias(s, -7))
            }
          >
            ‹
          </Button>
          <strong style={{ fontSize: 15, minWidth: 190, textAlign: 'center' }}>{tituloRango(dias, vista, mesBase)}</strong>
          <Button
            variant="secondary"
            size="sm"
            aria-label={vista === 'mensual' ? 'Mes siguiente' : 'Semana siguiente'}
            onClick={() =>
              vista === 'mensual'
                ? setMesBase((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                : setSemanaBase((s) => sumarDias(s, 7))
            }
          >
            ›
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMesBase(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
              setSemanaBase(new Date());
            }}
          >
            Hoy
          </Button>
        </div>
        {puedeEditar && (
          <Button variant="primary" onClick={() => setModalFecha(hoyIso)}>
            + Agregar
          </Button>
        )}
      </div>

      <div className="calendario-leyenda">
        <span className="calendario-chip chip-turno calendario-chip-leyenda">
          <span className="calendario-chip-dot" />
          Turno asignado
        </span>
        <span className="calendario-chip chip-vacaciones calendario-chip-leyenda">
          <span className="calendario-chip-dot" />
          Vacaciones
        </span>
        <span className="calendario-chip chip-evento calendario-chip-leyenda">
          <span className="calendario-chip-dot" />
          Evento
        </span>
        {puedeEditar && (
          <span className="calendario-leyenda-texto">
            Los items se pueden arrastrar: soltalos en un día para moverlos, o encima de otro turno para intercambiarlos.
          </span>
        )}
      </div>

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : (
        <div className={`calendario-grid ${vista === 'semanal' ? 'es-semanal' : ''}`}>
          {DIAS_HEADER.map((d) => (
            <div key={d} className="calendario-dia-header">
              {d}
            </div>
          ))}
          {dias.map((dia) => {
            const iso = fmtISO(dia);
            // En semanal no hay "afuera del mes" -- las 7 son la semana
            // que se está mirando.
            const fueraDeMes = vista === 'mensual' && dia.getMonth() !== mesBase.getMonth();
            const entradasDia = entradasDelDia(iso);
            const esDestinoDeMovimiento = superoUmbral && diaSobrevolado === iso && iso !== entradaArrastrada?.fecha_inicio;
            return (
              <div
                key={iso}
                data-dia-iso={iso}
                className={`calendario-dia ${fueraDeMes ? 'fuera-de-mes' : ''} ${iso === hoyIso ? 'hoy' : ''} ${esDestinoDeMovimiento ? 'es-destino-dia' : ''}`}
                onClick={() => puedeEditar && dragId == null && setModalFecha(iso)}
              >
                <span className="calendario-dia-num">{dia.getDate()}</span>
                {entradasDia.map((e) => (
                  <span
                    key={e.id}
                    data-entrada-id={e.id}
                    className={`calendario-chip ${claseTipo(e.tipo)} ${puedeEditar ? 'es-arrastrable' : ''} ${resaltarComoDestino && e.tipo === 'turno_asignado' && e.id !== dragId ? 'es-destino' : ''}`}
                    onClick={(ev) => ev.stopPropagation()}
                    onPointerDown={(ev) => iniciarArrastre(ev, e)}
                    onPointerMove={moverArrastre}
                    onPointerUp={soltarArrastre}
                    onPointerCancel={soltarArrastre}
                    style={{
                      opacity: dragId === e.id ? 0.25 : 1,
                      touchAction: puedeEditar ? 'none' : undefined,
                    }}
                  >
                    <span className="calendario-chip-dot" />
                    <span className="calendario-chip-lbl">{entradaLabel(e)}</span>
                    {puedeEditar && (
                      <button
                        aria-label="Quitar del calendario"
                        onPointerDown={(ev) => ev.stopPropagation()}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleBorrar(e);
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
                {esDestinoDeMovimiento && <span className="calendario-dia-hint">soltar acá</span>}
              </div>
            );
          })}
        </div>
      )}

      {superoUmbral && dragPos && entradaArrastrada && (
        <div className={`calendario-ghost ${claseTipo(entradaArrastrada.tipo)}`} style={{ left: dragPos.x, top: dragPos.y }}>
          <span className="calendario-chip-dot" />
          {entradaLabel(entradaArrastrada)}
        </div>
      )}

      {modalFecha && <NuevaEntradaCalendarioModal fechaInicial={modalFecha} onClose={() => setModalFecha(null)} />}
      {dialog}
    </div>
  );
}
