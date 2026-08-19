import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useMesas, useEstadoDeMesas, useSalonMutations, useSalones, type EstadoMesa } from '../hooks';
import { useTurnoActual } from '../../turnos/useTurnoActual';
import { PedidoPanel } from '../../pedidos/components/PedidoPanel';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import { fmtMoney } from '../../../lib/format';
import type { Database } from '../../../lib/supabase/types';

type Mesa = Database['public']['Tables']['mesas']['Row'];
type Salon = Database['public']['Tables']['salones']['Row'];

// Antes "abierto" (armando el pedido) era rojo y "entregado" (esperando
// cobro) era verde con etiquetas distintas -- para el que mira el plano de
// arriba, las dos son básicamente "la mesa está ocupada, no hace falta
// prestarle atención". Se unifican en un solo verde "Mesa ocupada"; el azul
// (enviado a cocina, sí necesita seguimiento) se mantiene aparte.
const ESTADO_INFO: Record<EstadoMesa, { label: string; fill: string; strokeStrong: string }> = {
  abierto: { label: 'Mesa ocupada', fill: 'var(--green)', strokeStrong: '#2f5b3b' },
  enviado_cocina: { label: 'Pedido enviado', fill: 'var(--blue)', strokeStrong: '#28495f' },
  entregado: { label: 'Mesa ocupada', fill: 'var(--green)', strokeStrong: '#2f5b3b' },
};

const LEYENDA: { label: string; color: string }[] = [
  { label: 'Libre', color: 'var(--surface)' },
  { label: 'Mesa ocupada', color: 'var(--green)' },
  { label: 'Pedido enviado', color: 'var(--blue)' },
  { label: 'Cobrando', color: 'var(--amber)' },
];

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
type Redim = { id: number; startX: number; startY: number; startW: number; startH: number } | null;

export function SalonView() {
  const { profile } = useAuth();
  const { data: salones, isLoading: loadingSalones, error: errorSalones } = useSalones();
  const { data: mesas, isLoading: loadingMesas, error: errorMesas } = useMesas();
  const { data: estadoDeMesas } = useEstadoDeMesas();
  const { turno, facturado } = useTurnoActual();
  const mutations = useSalonMutations();

  const [editando, setEditando] = useState(false);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [posOverride, setPosOverride] = useState<Record<string, { x: number; y: number }>>({});
  const [redim, setRedim] = useState<Redim>(null);
  const [sizeOverride, setSizeOverride] = useState<Record<number, { w: number; h: number }>>({});
  const [mesaParaPedido, setMesaParaPedido] = useState<Mesa | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { confirm, dialog } = useConfirm();

  const esAdmin = profile?.rol === 'admin';

  if (loadingSalones || loadingMesas) return <EmptyState>Cargando salón…</EmptyState>;
  if (errorSalones || errorMesas) {
    return <EmptyState>No se pudo leer el salón desde Supabase. Reintentá recargando la página.</EmptyState>;
  }
  if (!salones?.length) {
    return <EmptyState>Todavía no hay salones cargados.</EmptyState>;
  }

  const todasLasMesas = mesas ?? [];
  const padresConHijos = new Set(
    todasLasMesas.filter((m) => m.mesa_padre_id != null).map((m) => m.mesa_padre_id)
  );
  const mesasVisibles = todasLasMesas.filter((m) =>
    m.mesa_padre_id != null ? true : !padresConHijos.has(m.id)
  );

  const mesasOcupadasCount = mesasVisibles.filter((m) => estadoDeMesas?.has(m.id)).length;
  const mesasLibresCount = mesasVisibles.length - mesasOcupadasCount;

  function sizeDe(salon: Salon) {
    return sizeOverride[salon.id] ?? { w: salon.w, h: salon.h };
  }

  // Usa el tamaño EN VIVO (con el override del arrastre de la esquina, si
  // hay uno en curso) para que el lienzo crezca a medida que se agranda un
  // salón -- si usara solo el tamaño guardado en la base, el salón se vería
  // recortado por el viewBox mientras se lo agranda, hasta soltar.
  const maxX = Math.max(...salones.map((s) => s.x + sizeDe(s).w), BARRA.x + BARRA.w) + 20;
  const maxY = Math.max(...salones.map((s) => s.y + sizeDe(s).h)) + 20;

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
    const item = drag.tipo === 'mesa' ? todasLasMesas.find((m) => m.id === drag.id) : salones?.find((s) => s.id === drag.id);
    if (!item) return;
    const p = puntoSvg(e);
    const key = `${drag.tipo}-${drag.id}`;
    // Arrastrar una mesa o salón fuera del lienzo (x/y negativos, o pasado
    // maxX/maxY) lo saca del viewBox del SVG -- como el SVG recorta lo que
    // queda afuera, la mesa "desaparece" (sigue existiendo con esa posición
    // inválida, invisible, hasta que alguien la encuentre a ciegas o se
    // resetee el plano). Se acota para que el rectángulo entero (no solo la
    // esquina) quede siempre dentro del área visible.
    const x = Math.min(Math.max(Math.round(p.x - drag.dx), 0), Math.max(0, maxX - item.w));
    const y = Math.min(Math.max(Math.round(p.y - drag.dy), 0), Math.max(0, maxY - item.h));
    setPosOverride((prev) => ({ ...prev, [key]: { x, y } }));
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

  // Agarrar y arrastrar la esquina inferior derecha de un salón para
  // cambiarle el tamaño a mano, en vez de solo los botones de +/- tamaño de
  // a pasos fijos -- separado del arrastre normal (que mueve, no
  // redimensiona) con su propio estado.
  function iniciarRedimSalon(e: ReactPointerEvent, salon: Salon) {
    if (!editando) return;
    e.stopPropagation();
    const p = puntoSvg(e);
    setSeleccion({ tipo: 'salon', id: salon.id });
    setRedim({ id: salon.id, startX: p.x, startY: p.y, startW: salon.w, startH: salon.h });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function moverRedim(e: ReactPointerEvent) {
    if (!redim) return;
    const p = puntoSvg(e);
    const w = Math.max(80, Math.round(redim.startW + (p.x - redim.startX)));
    const h = Math.max(60, Math.round(redim.startH + (p.y - redim.startY)));
    setSizeOverride((prev) => ({ ...prev, [redim.id]: { w, h } }));
  }

  function soltarRedim() {
    if (!redim) return;
    const size = sizeOverride[redim.id];
    if (size) mutations.redimensionarSalon.mutate({ id: redim.id, w: size.w, h: size.h });
    setRedim(null);
  }

  const mesaSeleccionada =
    seleccion?.tipo === 'mesa' ? todasLasMesas.find((m) => m.id === seleccion.id) : null;
  const salonSeleccionado =
    seleccion?.tipo === 'salon' ? salones.find((s) => s.id === seleccion.id) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="stat-grid">
        <StatCard valor={mesasLibresCount} label="Mesas libres" />
        <StatCard valor={mesasOcupadasCount} label="Mesas ocupadas" />
        <StatCard valor={mesasOcupadasCount} label="Pedidos en curso" />
        <StatCard valor={turno ? fmtMoney.format(facturado) : '—'} label="Facturado en este turno" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 12, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
          {LEYENDA.map((l) => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: l.color,
                  border: l.color === 'var(--surface)' ? '1.5px solid var(--brown)' : 'none',
                  display: 'inline-block',
                }}
              />
              {l.label}
            </span>
          ))}
        </div>
        {esAdmin && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant={editando ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setEditando((v) => !v);
                setSeleccion(null);
              }}
            >
              ✏️ {editando ? 'Terminar edición' : 'Editar plano'}
            </Button>
            {editando && (
              <>
                <Button variant="secondary" size="sm" onClick={() => mutations.crearSalon.mutate('Nuevo salón')}>
                  + Salón
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    if (await confirm('¿Restablecer el plano a la disposición original? Esto no borra mesas ni salones agregados.', { danger: false })) {
                      mutations.restablecerPlano.mutate();
                    }
                  }}
                >
                  ↺ Restablecer
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${maxX} ${maxY}`}
          role="img"
          aria-label="Plano del salón"
          className="card"
          style={{
            width: '100%',
            maxWidth: 1120,
            height: 'auto',
            padding: 4,
            touchAction: editando ? 'none' : 'auto',
          }}
          onPointerMove={(e) => {
            moverDrag(e);
            moverRedim(e);
          }}
          onPointerUp={() => {
            soltarDrag();
            soltarRedim();
          }}
          onClick={() => setSeleccion(null)}
        >
          {salones.map((salon) => {
            const p = posDe('salon', salon);
            const s = sizeDe(salon);
            return (
              <g key={salon.id}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={s.w}
                  height={s.h}
                  fill="var(--surface-sunken)"
                  fillOpacity={0.4}
                  stroke={seleccion?.tipo === 'salon' && seleccion.id === salon.id ? 'var(--terracota)' : 'var(--brown-mid)'}
                  strokeWidth={seleccion?.tipo === 'salon' && seleccion.id === salon.id ? 2 : 1.2}
                  rx={6}
                  style={{ cursor: editando ? 'grab' : 'default' }}
                  onPointerDown={(e) => iniciarDrag(e, 'salon', salon)}
                />
                <text x={p.x + 10} y={p.y + 18} fontSize="11" fill="var(--brown-dark)" fontWeight={700} letterSpacing="0.02em">
                  {salon.nombre.toUpperCase()}
                </text>
                {salon.tag && (
                  <text x={p.x + s.w - 10} y={p.y + 18} fontSize="10" fill="var(--text-dim)" textAnchor="end">
                    {salon.tag}
                  </text>
                )}
                {editando && (
                  <text
                    x={p.x + s.w - 26}
                    y={p.y + s.h - 10}
                    fontSize="15"
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
                {editando && (
                  <g
                    onPointerDown={(e) => iniciarRedimSalon(e, salon)}
                    style={{ cursor: 'nwse-resize' }}
                    aria-label={`Redimensionar ${salon.nombre}`}
                  >
                    <rect x={p.x + s.w - 14} y={p.y + s.h - 14} width={14} height={14} fill="transparent" />
                    <path
                      d={`M ${p.x + s.w - 2} ${p.y + s.h - 9} L ${p.x + s.w - 9} ${p.y + s.h - 2} M ${p.x + s.w - 2} ${p.y + s.h - 5} L ${p.x + s.w - 5} ${p.y + s.h - 2}`}
                      stroke="var(--brown-mid)"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {DOORS.map((d, i) => (
            <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h} fill="var(--bg)" stroke="var(--brown-mid)" strokeWidth={0.5} />
          ))}
          <rect x={BARRA.x} y={BARRA.y} width={BARRA.w} height={BARRA.h} rx={3} fill="var(--amber)" opacity={0.45} />

          {mesasVisibles.map((mesa) => {
            const p = posDe('mesa', mesa);
            const seleccionada = seleccion?.tipo === 'mesa' && seleccion.id === mesa.id;
            const estado = estadoDeMesas?.get(mesa.id);
            const info = estado ? ESTADO_INFO[estado] : null;
            const fill = info?.fill ?? 'var(--surface)';
            const textColor = info ? '#fff' : 'var(--brown-dark)';
            const stroke = seleccionada ? 'var(--brown-dark)' : (info?.strokeStrong ?? 'var(--brown)');
            return (
              <g
                key={mesa.id}
                onPointerDown={(e) => iniciarDrag(e, 'mesa', mesa)}
                onClick={(e) => {
                  if (editando) return;
                  e.stopPropagation();
                  setMesaParaPedido(mesa);
                }}
              >
                {mesa.shape === 'round' ? (
                  <circle
                    cx={p.x + mesa.w / 2}
                    cy={p.y + mesa.h / 2}
                    r={mesa.w / 2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={seleccionada ? 2.5 : 1.5}
                    style={{ cursor: editando ? 'grab' : 'pointer', filter: 'drop-shadow(0 1px 2px rgba(59,36,24,0.15))' }}
                  />
                ) : (
                  <rect
                    x={p.x}
                    y={p.y}
                    width={mesa.w}
                    height={mesa.h}
                    rx={6}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={seleccionada ? 2.5 : 1.5}
                    style={{ cursor: editando ? 'grab' : 'pointer', filter: 'drop-shadow(0 1px 2px rgba(59,36,24,0.15))' }}
                  />
                )}
                <text
                  x={p.x + mesa.w / 2}
                  y={p.y + mesa.h / 2 + 4}
                  fontSize="12"
                  fontWeight={600}
                  textAnchor="middle"
                  fill={textColor}
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

      {mesaParaPedido && (
        <PedidoPanel mesa={mesaParaPedido} onClose={() => setMesaParaPedido(null)} />
      )}
      {dialog}
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
  const boxStyle: React.CSSProperties = {
    width: 220,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    fontSize: 13,
  };

  if (mesa) {
    return (
      <div className="card card-pad" style={boxStyle}>
        <strong style={{ fontSize: 14 }}>Mesa {mesa.label ?? mesa.id}</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            size="sm"
            block
            onClick={() => mutations.redimensionarMesa.mutate({ id: mesa.id, w: Math.max(30, mesa.w - 10), h: Math.max(30, mesa.h - 10) })}
          >
            − tamaño
          </Button>
          <Button size="sm" block onClick={() => mutations.redimensionarMesa.mutate({ id: mesa.id, w: mesa.w + 10, h: mesa.h + 10 })}>
            + tamaño
          </Button>
        </div>
        {mesa.mesa_padre_id == null ? (
          <Button size="sm" onClick={() => mutations.dividirMesa.mutate(mesa)}>
            Dividir en A / B
          </Button>
        ) : (
          <Button size="sm" onClick={() => mutations.unirMesa.mutate(mesa.mesa_padre_id!)}>
            Unir mesa
          </Button>
        )}
        {(mutations.dividirMesa.isError || mutations.unirMesa.isError) && (
          <p style={{ color: 'var(--red)', fontSize: 11.5, margin: 0 }}>
            {(mutations.dividirMesa.error ?? mutations.unirMesa.error)?.message}
          </p>
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            mutations.borrarMesa.mutate(mesa.id);
            onCerrar();
          }}
        >
          🗑 Borrar mesa
        </Button>
      </div>
    );
  }

  if (salon) {
    return (
      <div className="card card-pad" style={boxStyle}>
        <TextInput
          defaultValue={salon.nombre}
          onBlur={(e) => e.target.value !== salon.nombre && mutations.renombrarSalon.mutate({ id: salon.id, nombre: e.target.value })}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            size="sm"
            block
            onClick={() => mutations.redimensionarSalon.mutate({ id: salon.id, w: Math.max(80, salon.w - 20), h: Math.max(60, salon.h - 20) })}
          >
            − tamaño
          </Button>
          <Button size="sm" block onClick={() => mutations.redimensionarSalon.mutate({ id: salon.id, w: salon.w + 20, h: salon.h + 20 })}>
            + tamaño
          </Button>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            mutations.borrarSalon.mutate(salon.id);
            onCerrar();
          }}
        >
          🗑 Borrar salón
        </Button>
      </div>
    );
  }

  return null;
}

function StatCard({ valor, label }: { valor: number | string; label: string }) {
  return (
    <div className="card card-pad stat-card">
      <div className="stat-card-value">{valor}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
