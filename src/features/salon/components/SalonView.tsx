import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useMesas, useSalonMutations, useSalones } from '../hooks';
import type { Database } from '../../../lib/supabase/types';

type Mesa = Database['public']['Tables']['mesas']['Row'];
type Salon = Database['public']['Tables']['salones']['Row'];

// Elementos puramente decorativos del plano real del local: marcas de puertas
// entre ambientes y la barra de Salón 1. No son editables (igual que en el
// prototipo original), son solo referencia visual.
const DOORS = [
  { x: 298, y: 95, w: 6, h: 26 },
  { x: 653, y: 95, w: 6, h: 26 },
  { x: 140, y: 203, w: 26, h: 6 },
  { x: 55, y: 318, w: 26, h: 6 },
  { x: 55, y: 403, w: 26, h: 6 },
];
const BARRA = { x: 760, y: 205, w: 340, h: 16 };

type Seleccion = { tipo: 'mesa' | 'salon'; id: number } | null;
type Drag = { tipo: 'mesa' | 'salon'; id: number; dx: number; dy: number } | null;

export function SalonView() {
  const { profile } = useAuth();
  const { data: salones, isLoading: loadingSalones, error: errorSalones } = useSalones();
  const { data: mesas, isLoading: loadingMesas, error: errorMesas } = useMesas();
  const mutations = useSalonMutations();

  const [editando, setEditando] = useState(false);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [posOverride, setPosOverride] = useState<Record<string, { x: number; y: number }>>({});
  const svgRef = useRef<SVGSVGElement>(null);

  const esAdmin = profile?.rol === 'admin';

  if (loadingSalones || loadingMesas) return <p>Cargando salón…</p>;
  if (errorSalones || errorMesas) {
    return (
      <p style={{ color: 'var(--red)' }}>
        No se pudo leer el salón desde Supabase. Reintentá recargando la página.
      </p>
    );
  }
  if (!salones?.length) {
    return <p>Todavía no hay salones cargados.</p>;
  }

  const todasLasMesas = mesas ?? [];
  const padresConHijos = new Set(
    todasLasMesas.filter((m) => m.mesa_padre_id != null).map((m) => m.mesa_padre_id)
  );
  const mesasVisibles = todasLasMesas.filter((m) =>
    m.mesa_padre_id != null ? true : !padresConHijos.has(m.id)
  );

  const maxX = Math.max(...salones.map((s) => s.x + s.w), BARRA.x + BARRA.w) + 20;
  const maxY = Math.max(...salones.map((s) => s.y + s.h)) + 20;

  function posDe(tipo: 'mesa' | 'salon', item: Mesa | Salon) {
    const key = `${tipo}-${item.id}`;
    return posOverride[key] ?? { x: item.x, y: item.y };
  }

  function puntoSvg(e: ReactPointerEvent) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function iniciarDrag(e: ReactPointerEvent, tipo: 'mesa' | 'salon', item: Mesa | Salon) {
    if (!editando) return;
    e.stopPropagation();
    setSeleccion({ tipo, id: item.id });
    const p = puntoSvg(e);
    setDrag({ tipo, id: item.id, dx: p.x - item.x, dy: p.y - item.y });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function moverDrag(e: ReactPointerEvent) {
    if (!drag) return;
    const p = puntoSvg(e);
    const key = `${drag.tipo}-${drag.id}`;
    setPosOverride((prev) => ({
      ...prev,
      [key]: { x: Math.round(p.x - drag.dx), y: Math.round(p.y - drag.dy) },
    }));
  }

  function soltarDrag() {
    if (!drag) return;
    const key = `${drag.tipo}-${drag.id}`;
    const pos = posOverride[key];
    if (pos) {
      if (drag.tipo === 'mesa') mutations.moverMesa.mutate({ id: drag.id, x: pos.x, y: pos.y });
      else mutations.moverSalon.mutate({ id: drag.id, x: pos.x, y: pos.y });
    }
    setDrag(null);
  }

  const mesaSeleccionada =
    seleccion?.tipo === 'mesa' ? todasLasMesas.find((m) => m.id === seleccion.id) : null;
  const salonSeleccionado =
    seleccion?.tipo === 'salon' ? salones.find((s) => s.id === seleccion.id) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {esAdmin && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => {
              setEditando((v) => !v);
              setSeleccion(null);
            }}
            style={{
              padding: '7px 12px',
              borderRadius: 5,
              border: '1px solid var(--border)',
              background: editando ? 'var(--terracota)' : 'var(--surface)',
              color: editando ? '#fff' : 'var(--text)',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            ✏️ {editando ? 'Terminar edición' : 'Editar plano'}
          </button>
          {editando && (
            <button
              onClick={() => mutations.crearSalon.mutate('Nuevo salón')}
              style={{ padding: '7px 12px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13 }}
            >
              + Salón
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${maxX} ${maxY}`}
          style={{
            width: '100%',
            maxWidth: 1120,
            height: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            touchAction: editando ? 'none' : 'auto',
          }}
          onPointerMove={moverDrag}
          onPointerUp={soltarDrag}
          onClick={() => setSeleccion(null)}
        >
          {salones.map((salon) => {
            const p = posDe('salon', salon);
            return (
              <g key={salon.id}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={salon.w}
                  height={salon.h}
                  fill="none"
                  stroke={seleccion?.tipo === 'salon' && seleccion.id === salon.id ? 'var(--terracota)' : 'var(--brown-mid)'}
                  strokeWidth={seleccion?.tipo === 'salon' && seleccion.id === salon.id ? 2 : 1.2}
                  rx={4}
                  style={{ cursor: editando ? 'grab' : 'default' }}
                  onPointerDown={(e) => iniciarDrag(e, 'salon', salon)}
                />
                <text x={p.x + 8} y={p.y + 16} fontSize="11" fill="var(--brown-dark)" fontWeight={700}>
                  {salon.nombre}
                </text>
                {salon.tag && (
                  <text x={p.x + salon.w - 8} y={p.y + 16} fontSize="10" fill="var(--text-dim)" textAnchor="end">
                    {salon.tag}
                  </text>
                )}
                {editando && (
                  <text
                    x={p.x + salon.w - 8}
                    y={p.y + salon.h - 8}
                    fontSize="14"
                    textAnchor="end"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      mutations.crearMesa.mutate({ salonId: salon.id, x: p.x + 20, y: p.y + 30 });
                    }}
                  >
                    ➕
                  </text>
                )}
              </g>
            );
          })}

          {DOORS.map((d, i) => (
            <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h} fill="var(--cream)" stroke="var(--brown-mid)" strokeWidth={0.5} />
          ))}
          <rect x={BARRA.x} y={BARRA.y} width={BARRA.w} height={BARRA.h} fill="var(--amber)" opacity={0.5} />

          {mesasVisibles.map((mesa) => {
            const p = posDe('mesa', mesa);
            const seleccionada = seleccion?.tipo === 'mesa' && seleccion.id === mesa.id;
            return (
              <g key={mesa.id} onPointerDown={(e) => iniciarDrag(e, 'mesa', mesa)}>
                {mesa.shape === 'round' ? (
                  <circle
                    cx={p.x + mesa.w / 2}
                    cy={p.y + mesa.h / 2}
                    r={mesa.w / 2}
                    fill="var(--surface)"
                    stroke={seleccionada ? 'var(--terracota)' : 'var(--brown)'}
                    strokeWidth={seleccionada ? 2.5 : 1.5}
                    style={{ cursor: editando ? 'grab' : 'pointer' }}
                  />
                ) : (
                  <rect
                    x={p.x}
                    y={p.y}
                    width={mesa.w}
                    height={mesa.h}
                    rx={4}
                    fill="var(--surface)"
                    stroke={seleccionada ? 'var(--terracota)' : 'var(--brown)'}
                    strokeWidth={seleccionada ? 2.5 : 1.5}
                    style={{ cursor: editando ? 'grab' : 'pointer' }}
                  />
                )}
                <text
                  x={p.x + mesa.w / 2}
                  y={p.y + mesa.h / 2 + 4}
                  fontSize="12"
                  textAnchor="middle"
                  fill="var(--brown-dark)"
                  style={{ pointerEvents: 'none' }}
                >
                  {mesa.label ?? mesa.id}
                </text>
              </g>
            );
          })}
        </svg>

        {editando && (mesaSeleccionada || salonSeleccionado) && (
          <PanelEdicion
            mesa={mesaSeleccionada}
            salon={salonSeleccionado}
            mutations={mutations}
            onCerrar={() => setSeleccion(null)}
          />
        )}
      </div>
    </div>
  );
}

function PanelEdicion({
  mesa,
  salon,
  mutations,
  onCerrar,
}: {
  mesa?: Mesa | null;
  salon?: Salon | null;
  mutations: ReturnType<typeof useSalonMutations>;
  onCerrar: () => void;
}) {
  const box: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 16,
    width: 220,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    fontSize: 13,
  };

  if (mesa) {
    return (
      <div style={box}>
        <strong>Mesa {mesa.label ?? mesa.id}</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => mutations.redimensionarMesa.mutate({ id: mesa.id, w: Math.max(30, mesa.w - 10), h: Math.max(30, mesa.h - 10) })}>
            − tamaño
          </button>
          <button onClick={() => mutations.redimensionarMesa.mutate({ id: mesa.id, w: mesa.w + 10, h: mesa.h + 10 })}>
            + tamaño
          </button>
        </div>
        {mesa.mesa_padre_id == null ? (
          <button onClick={() => mutations.dividirMesa.mutate(mesa)}>Dividir en A / B</button>
        ) : (
          <button onClick={() => mutations.unirMesa.mutate(mesa.mesa_padre_id!)}>Unir mesa</button>
        )}
        <button style={{ color: 'var(--red)' }} onClick={() => { mutations.borrarMesa.mutate(mesa.id); onCerrar(); }}>
          🗑 Borrar mesa
        </button>
      </div>
    );
  }

  if (salon) {
    return (
      <div style={box}>
        <input
          defaultValue={salon.nombre}
          onBlur={(e) => e.target.value !== salon.nombre && mutations.renombrarSalon.mutate({ id: salon.id, nombre: e.target.value })}
          style={{ padding: 6, border: '1px solid var(--border)', borderRadius: 4 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => mutations.redimensionarSalon.mutate({ id: salon.id, w: Math.max(80, salon.w - 20), h: Math.max(60, salon.h - 20) })}>
            − tamaño
          </button>
          <button onClick={() => mutations.redimensionarSalon.mutate({ id: salon.id, w: salon.w + 20, h: salon.h + 20 })}>
            + tamaño
          </button>
        </div>
        <button style={{ color: 'var(--red)' }} onClick={() => { mutations.borrarSalon.mutate(salon.id); onCerrar(); }}>
          🗑 Borrar salón
        </button>
      </div>
    );
  }

  return null;
}
