import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useElementosDecorativos, useMesas, useEstadoDeMesas, useSalonMutations, useSalones, type EstadoMesa } from '../hooks';
import { useTurnoActual } from '../../turnos/useTurnoActual';
import { PedidoPanel } from '../../pedidos/components/PedidoPanel';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import { fmtMoney } from '../../../lib/format';
import type { Database } from '../../../lib/supabase/types';
import './SalonView.css';

type Mesa = Database['public']['Tables']['mesas']['Row'];
type Salon = Database['public']['Tables']['salones']['Row'];
type Elemento = Database['public']['Tables']['elementos_decorativos']['Row'];

// Antes "abierto" (armando el pedido) era rojo y "entregado" (esperando
// cobro) era verde con etiquetas distintas -- para el que mira el plano de
// arriba, las dos son básicamente "la mesa está ocupada, no hace falta
// prestarle atención". Se unifican en un solo verde "Mesa ocupada"; el azul
// (enviado a cocina, sí necesita seguimiento) se mantiene aparte.
const ESTADO_INFO: Record<EstadoMesa, { label: string; fill: string; strokeStrong: string; ink: string }> = {
  abierto: { label: 'Mesa ocupada', fill: 'var(--salon-ocupada)', strokeStrong: 'var(--salon-ocupada-strong)', ink: 'var(--salon-ocupada-ink)' },
  enviado_cocina: { label: 'Pedido enviado', fill: 'var(--salon-enviado)', strokeStrong: 'var(--salon-enviado-strong)', ink: '#fff' },
  entregado: { label: 'Mesa ocupada', fill: 'var(--salon-ocupada)', strokeStrong: 'var(--salon-ocupada-strong)', ink: 'var(--salon-ocupada-ink)' },
  cobrando: { label: 'Cobrando', fill: 'var(--salon-ambar)', strokeStrong: 'var(--salon-ambar-strong)', ink: 'var(--salon-ambar-ink)' },
};

const LEYENDA: { label: string; color: string }[] = [
  { label: 'Libre', color: 'var(--surface)' },
  { label: 'Mesa ocupada', color: 'var(--salon-ocupada)' },
  { label: 'Pedido enviado', color: 'var(--salon-enviado)' },
  { label: 'Cobrando', color: 'var(--salon-ambar)' },
];

type Seleccion = { tipo: 'mesa' | 'salon' | 'elemento'; id: number } | null;
type Drag = { tipo: 'mesa' | 'salon' | 'elemento'; id: number; dx: number; dy: number } | null;
type Redim = { tipo: 'salon' | 'elemento'; id: number; startX: number; startY: number; startW: number; startH: number } | null;

export function SalonView() {
  const { profile } = useAuth();
  const { data: salones, isLoading: loadingSalones, error: errorSalones } = useSalones();
  const { data: mesas, isLoading: loadingMesas, error: errorMesas } = useMesas();
  const { data: elementos, isLoading: loadingElementos, error: errorElementos } = useElementosDecorativos();
  const { data: estadoDeMesas } = useEstadoDeMesas();
  const { turno, facturado } = useTurnoActual();
  const mutations = useSalonMutations();

  const [editando, setEditando] = useState(false);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [posOverride, setPosOverride] = useState<Record<string, { x: number; y: number }>>({});
  const [redim, setRedim] = useState<Redim>(null);
  const [sizeOverride, setSizeOverride] = useState<Record<string, { w: number; h: number }>>({});
  const [mesaParaPedido, setMesaParaPedido] = useState<Mesa | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { confirm, dialog } = useConfirm();

  // Panel de edición arrastrable: null = todavía en su posición default
  // (esquina de la pantalla, ver SalonView.css). Una vez que se arrastra
  // una vez, se acuerda dónde quedó mientras se sigan editando mesas/
  // salones -- no vuelve solo a la esquina al cambiar de selección.
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [arrastrePanel, setArrastrePanel] = useState<{ dx: number; dy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function iniciarArrastrePanel(e: ReactPointerEvent<HTMLDivElement>) {
    const panel = panelRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    setArrastrePanel({ dx: e.clientX - r.left, dy: e.clientY - r.top });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moverPanel(e: ReactPointerEvent<HTMLDivElement>) {
    if (!arrastrePanel) return;
    const panel = panelRef.current;
    const w = panel?.offsetWidth ?? 240;
    const h = panel?.offsetHeight ?? 200;
    const left = Math.min(Math.max(8, e.clientX - arrastrePanel.dx), window.innerWidth - w - 8);
    const top = Math.min(Math.max(8, e.clientY - arrastrePanel.dy), window.innerHeight - h - 8);
    setPanelPos({ top, left });
  }

  function soltarArrastrePanel() {
    setArrastrePanel(null);
  }

  const esAdmin = profile?.rol === 'admin';

  if (loadingSalones || loadingMesas || loadingElementos) return <EmptyState>Cargando salón…</EmptyState>;
  if (errorSalones || errorMesas || errorElementos) {
    return <EmptyState>No se pudo leer el salón desde Supabase. Reintentá recargando la página.</EmptyState>;
  }
  if (!salones?.length) {
    return <EmptyState>Todavía no hay salones cargados.</EmptyState>;
  }

  const todasLasMesas = mesas ?? [];
  const mesaTakeAway = todasLasMesas.find((m) => m.es_take_away) ?? null;
  const padresConHijos = new Set(
    todasLasMesas.filter((m) => m.mesa_padre_id != null).map((m) => m.mesa_padre_id)
  );
  // La mesa virtual de take away no se dibuja en el plano ni cuenta para
  // "mesas libres/ocupadas" -- no es una mesa real del local.
  const mesasVisibles = todasLasMesas.filter(
    (m) => !m.es_take_away && (m.mesa_padre_id != null ? true : !padresConHijos.has(m.id))
  );

  const mesasOcupadasCount = mesasVisibles.filter((m) => estadoDeMesas?.has(m.id)).length;
  const mesasLibresCount = mesasVisibles.length - mesasOcupadasCount;

  function sizeDe(tipo: 'salon' | 'elemento', item: { id: number; w: number; h: number }) {
    return sizeOverride[`${tipo}-${item.id}`] ?? { w: item.w, h: item.h };
  }

  // Usa el tamaño EN VIVO (con el override del arrastre de la esquina, si
  // hay uno en curso) para que el lienzo crezca a medida que se agranda un
  // salón o elemento -- si usara solo el tamaño guardado en la base, se
  // vería recortado por el viewBox mientras se lo agranda, hasta soltar.
  const maxX =
    Math.max(
      ...salones.map((s) => s.x + sizeDe('salon', s).w),
      ...(elementos ?? []).map((el) => el.x + sizeDe('elemento', el).w)
    ) + 20;
  const maxY =
    Math.max(
      ...salones.map((s) => s.y + sizeDe('salon', s).h),
      ...(elementos ?? []).map((el) => el.y + sizeDe('elemento', el).h)
    ) + 20;

  function posDe(tipo: 'mesa' | 'salon' | 'elemento', item: Mesa | Salon | Elemento) {
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

  function iniciarDrag(e: ReactPointerEvent, tipo: 'mesa' | 'salon' | 'elemento', item: Mesa | Salon | Elemento) {
    if (!editando) return;
    e.stopPropagation();
    setSeleccion({ tipo, id: item.id });
    const p = puntoSvg(e);
    setDrag({ tipo, id: item.id, dx: p.x - item.x, dy: p.y - item.y });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function moverDrag(e: ReactPointerEvent) {
    if (!drag) return;
    const item =
      drag.tipo === 'mesa'
        ? todasLasMesas.find((m) => m.id === drag.id)
        : drag.tipo === 'salon'
          ? salones?.find((s) => s.id === drag.id)
          : elementos?.find((el) => el.id === drag.id);
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
      else if (drag.tipo === 'salon') mutations.moverSalon.mutate({ id: drag.id, x: pos.x, y: pos.y });
      else mutations.moverElemento.mutate({ id: drag.id, x: pos.x, y: pos.y });
    }
    setDrag(null);
  }

  // Agarrar y arrastrar la esquina inferior derecha de un salón o elemento
  // para cambiarle el tamaño a mano, en vez de solo los botones de +/-
  // tamaño de a pasos fijos -- separado del arrastre normal (que mueve, no
  // redimensiona) con su propio estado.
  function iniciarRedim(e: ReactPointerEvent, tipo: 'salon' | 'elemento', item: { id: number; w: number; h: number }) {
    if (!editando) return;
    e.stopPropagation();
    const p = puntoSvg(e);
    setSeleccion({ tipo, id: item.id });
    setRedim({ tipo, id: item.id, startX: p.x, startY: p.y, startW: item.w, startH: item.h });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function moverRedim(e: ReactPointerEvent) {
    if (!redim) return;
    const p = puntoSvg(e);
    const minW = redim.tipo === 'elemento' ? 4 : 80;
    const minH = redim.tipo === 'elemento' ? 4 : 60;
    const w = Math.max(minW, Math.round(redim.startW + (p.x - redim.startX)));
    const h = Math.max(minH, Math.round(redim.startH + (p.y - redim.startY)));
    setSizeOverride((prev) => ({ ...prev, [`${redim.tipo}-${redim.id}`]: { w, h } }));
  }

  function soltarRedim() {
    if (!redim) return;
    const size = sizeOverride[`${redim.tipo}-${redim.id}`];
    if (size) {
      if (redim.tipo === 'salon') mutations.redimensionarSalon.mutate({ id: redim.id, w: size.w, h: size.h });
      else mutations.redimensionarElemento.mutate({ id: redim.id, w: size.w, h: size.h });
    }
    setRedim(null);
  }

  const mesaSeleccionada =
    seleccion?.tipo === 'mesa' ? todasLasMesas.find((m) => m.id === seleccion.id) : null;
  const salonSeleccionado =
    seleccion?.tipo === 'salon' ? salones.find((s) => s.id === seleccion.id) : null;
  const elementoSeleccionado =
    seleccion?.tipo === 'elemento' ? (elementos ?? []).find((el) => el.id === seleccion.id) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="stat-grid">
        <StatCard valor={mesasLibresCount} label="Mesas libres" color="var(--salon-stat-1)" />
        <StatCard valor={mesasOcupadasCount} label="Mesas ocupadas" color="var(--salon-stat-2)" />
        <StatCard valor={mesasOcupadasCount} label="Pedidos en curso" color="var(--salon-stat-3)" />
        <StatCard valor={turno ? fmtMoney.format(facturado) : '—'} label="Facturado en este turno" color="var(--salon-stat-4)" />
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
                  border: l.color === 'var(--surface)' ? '1.5px solid var(--salon-mesa-border-libre)' : 'none',
                  display: 'inline-block',
                }}
              />
              {l.label}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {mesaTakeAway && !editando && (
            <Button variant="secondary" size="sm" onClick={() => setMesaParaPedido(mesaTakeAway)}>
              🛍️ Take away
            </Button>
          )}
          {esAdmin && (
            <>
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
                <Button variant="secondary" size="sm" onClick={() => mutations.crearElemento.mutate({ tipo: 'puerta', x: 20, y: 20 })}>
                  + Puerta
                </Button>
                <Button variant="secondary" size="sm" onClick={() => mutations.crearElemento.mutate({ tipo: 'barra', x: 20, y: 20 })}>
                  + Barra
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
            </>
          )}
        </div>
      </div>

      {/* El panel de edición nunca forma parte del flujo normal (flex/grid):
          si lo fuera, el plano tendría que achicarse para dejarle lugar
          cada vez que se selecciona una mesa/salón -- eso se sentía tosco
          (el plano "saltaba" de tamaño con cada click). Así el plano
          SIEMPRE mide lo mismo, elegido algo o no. El panel en sí es
          position:fixed anclado al borde de la pantalla (ver
          .salon-panel-edicion en SalonView.css) -- no al costado del plano
          -- para que no haga falta scrollear a la derecha en un salón
          ancho para llegar a él. Sin maxWidth en el plano a propósito:
          ocupa todo el ancho disponible del contenido (ver
          .app-content:has(.salon-plano-wrap) en sidebar.css), no un tope
          fijo -- así se aprovecha una pantalla grande y se achica solo en
          una chica. */}
      <div className="salon-plano-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${maxX} ${maxY}`}
          role="img"
          aria-label="Plano del salón"
          className="card"
          style={{
            width: '100%',
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
            const s = sizeDe('salon', salon);
            return (
              // El click en el svg de afuera deselecciona todo (para poder
              // tocar el fondo vacío y cerrar el panel de edición) -- sin
              // frenar acá la propagación, ese mismo click "de soltar" el
              // mouse sobre el salón burbujeaba hasta ahí y deshacía la
              // selección que se acababa de hacer al apretar.
              <g key={salon.id} onClick={(e) => e.stopPropagation()}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={s.w}
                  height={s.h}
                  fill="var(--surface-sunken)"
                  fillOpacity={0.4}
                  stroke={seleccion?.tipo === 'salon' && seleccion.id === salon.id ? 'var(--salon-panel-border-selected)' : 'var(--salon-panel-border)'}
                  strokeWidth={seleccion?.tipo === 'salon' && seleccion.id === salon.id ? 2 : 1.2}
                  rx={6}
                  style={{ cursor: editando ? 'grab' : 'default' }}
                  onPointerDown={(e) => iniciarDrag(e, 'salon', salon)}
                />
                <text x={p.x + 10} y={p.y + 18} fontSize="11" fill="var(--salon-label-text)" fontWeight={700} letterSpacing="0.02em">
                  {salon.nombre.toUpperCase()}
                </text>
                {salon.tag && (
                  <text x={p.x + s.w - 10} y={p.y + 18} fontSize="10" fill="var(--salon-label-text)" textAnchor="end">
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
                    onPointerDown={(e) => iniciarRedim(e, 'salon', salon)}
                    style={{ cursor: 'nwse-resize' }}
                    aria-label={`Redimensionar ${salon.nombre}`}
                  >
                    <rect x={p.x + s.w - 14} y={p.y + s.h - 14} width={14} height={14} fill="transparent" />
                    <path
                      d={`M ${p.x + s.w - 2} ${p.y + s.h - 9} L ${p.x + s.w - 9} ${p.y + s.h - 2} M ${p.x + s.w - 2} ${p.y + s.h - 5} L ${p.x + s.w - 5} ${p.y + s.h - 2}`}
                      stroke="var(--salon-panel-border)"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {(elementos ?? []).map((el) => {
            const p = posDe('elemento', el);
            const s = sizeDe('elemento', el);
            const seleccionado = seleccion?.tipo === 'elemento' && seleccion.id === el.id;
            const esBarra = el.tipo === 'barra';
            return (
              <g key={`elemento-${el.id}`} onClick={(e) => e.stopPropagation()}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={s.w}
                  height={s.h}
                  rx={esBarra ? 3 : 0}
                  fill={esBarra ? 'var(--salon-ambar)' : 'var(--salon-puerta-fill)'}
                  stroke={seleccionado ? 'var(--salon-panel-border-selected)' : esBarra ? 'none' : 'var(--salon-panel-border)'}
                  strokeWidth={seleccionado ? 2 : 0.5}
                  style={{ cursor: editando ? 'grab' : 'default', opacity: esBarra ? 'var(--salon-barra-opacity)' : 1 }}
                  onPointerDown={(e) => iniciarDrag(e, 'elemento', el)}
                />
                {editando && (
                  <g
                    onPointerDown={(e) => iniciarRedim(e, 'elemento', el)}
                    style={{ cursor: 'nwse-resize' }}
                    aria-label={`Redimensionar ${esBarra ? 'barra' : 'puerta'} #${el.id}`}
                  >
                    <rect x={p.x + s.w - 10} y={p.y + s.h - 10} width={10} height={10} fill="transparent" />
                    <path
                      d={`M ${p.x + s.w - 1} ${p.y + s.h - 5} L ${p.x + s.w - 5} ${p.y + s.h - 1}`}
                      stroke="var(--salon-panel-border)"
                      strokeWidth={1.2}
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {mesasVisibles.map((mesa) => {
            const p = posDe('mesa', mesa);
            const seleccionada = seleccion?.tipo === 'mesa' && seleccion.id === mesa.id;
            const estado = estadoDeMesas?.get(mesa.id);
            const info = estado ? ESTADO_INFO[estado] : null;
            const fill = info?.fill ?? 'var(--surface)';
            const textColor = info?.ink ?? 'var(--salon-mesa-text-libre)';
            const stroke = seleccionada ? 'var(--salon-mesa-border-selected)' : (info?.strokeStrong ?? 'var(--salon-mesa-border-libre)');
            return (
              <g
                key={mesa.id}
                onPointerDown={(e) => iniciarDrag(e, 'mesa', mesa)}
                onClick={(e) => {
                  // Frenar la propagación siempre, edición o no -- si no,
                  // el click "de soltar" el mouse llega al svg de afuera y
                  // deselecciona la mesa que se acaba de elegir (mismo
                  // problema que en los salones, ver más arriba).
                  e.stopPropagation();
                  if (editando) return;
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

        {editando && (mesaSeleccionada || salonSeleccionado || elementoSeleccionado) && (
          <div
            ref={panelRef}
            className="salon-panel-edicion"
            style={panelPos ? { top: panelPos.top, left: panelPos.left, right: 'auto' } : undefined}
          >
            <div
              className="salon-panel-handle"
              onPointerDown={iniciarArrastrePanel}
              onPointerMove={moverPanel}
              onPointerUp={soltarArrastrePanel}
              title="Arrastrar para mover"
            >
              ⠿⠿ Mover
            </div>
            <PanelEdicion
              mesa={mesaSeleccionada}
              salon={salonSeleccionado}
              elemento={elementoSeleccionado}
              mutations={mutations}
              onCerrar={() => setSeleccion(null)}
            />
          </div>
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
  elemento,
  mutations,
  onCerrar,
}: {
  mesa?: Mesa | null;
  salon?: Salon | null;
  elemento?: Elemento | null;
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
    return <PanelMesa key={mesa.id} mesa={mesa} mutations={mutations} onCerrar={onCerrar} boxStyle={boxStyle} />;
  }

  if (salon) {
    return <PanelSalon key={salon.id} salon={salon} mutations={mutations} onCerrar={onCerrar} boxStyle={boxStyle} />;
  }

  if (elemento) {
    return (
      <div className="card card-pad" style={boxStyle}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {elemento.tipo === 'barra' ? 'Barra' : 'Puerta'} #{elemento.id}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            size="sm"
            block
            onClick={() =>
              mutations.redimensionarElemento.mutate({ id: elemento.id, w: Math.max(4, elemento.w - 10), h: Math.max(4, elemento.h - 10) })
            }
          >
            − tamaño
          </Button>
          <Button
            size="sm"
            block
            onClick={() => mutations.redimensionarElemento.mutate({ id: elemento.id, w: elemento.w + 10, h: elemento.h + 10 })}
          >
            + tamaño
          </Button>
        </div>
        <Button
          variant="danger"
          size="sm"
          title={elemento.tipo === 'barra' ? 'Borrar barra' : 'Borrar puerta'}
          aria-label={elemento.tipo === 'barra' ? 'Borrar barra' : 'Borrar puerta'}
          onClick={() => {
            mutations.borrarElemento.mutate(elemento.id);
            onCerrar();
          }}
        >
          🗑
        </Button>
      </div>
    );
  }

  return null;
}

// Nombre con guardado explícito (tilde verde, abajo al lado del tacho), no
// con onBlur: al tocar afuera para deseleccionar la mesa/salón, el panel se
// desmonta en el mismo gesto y el cambio se perdía -- el blur no llegaba a
// tiempo. Separado en su propio componente (no un if adentro de
// PanelEdicion) porque necesita su propio useState para el borrador del
// nombre, y los hooks no pueden quedar atrás de un return condicional.
function PanelMesa({
  mesa,
  mutations,
  onCerrar,
  boxStyle,
}: {
  mesa: Mesa;
  mutations: ReturnType<typeof useSalonMutations>;
  onCerrar: () => void;
  boxStyle: React.CSSProperties;
}) {
  const [nombre, setNombre] = useState(mesa.label ?? '');
  const cambio = nombre !== (mesa.label ?? '');
  const guardar = () => mutations.renombrarMesa.mutate({ id: mesa.id, label: nombre });

  return (
    <div className="card card-pad" style={boxStyle}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Mesa #{mesa.id}</div>
        <TextInput
          value={nombre}
          placeholder={`Mesa ${mesa.id}`}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cambio && guardar()}
        />
        <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 4 }}>
          Para separar mesas de gente conocida, poné un nombre en vez del número.
        </div>
      </div>
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
      <div style={{ display: 'flex', gap: 6 }}>
        <Button variant="success" size="sm" disabled={!cambio} title="Guardar nombre" aria-label="Guardar nombre" onClick={guardar}>
          ✓
        </Button>
        <Button
          variant="danger"
          size="sm"
          title="Borrar mesa"
          aria-label="Borrar mesa"
          onClick={() => {
            mutations.borrarMesa.mutate(mesa.id);
            onCerrar();
          }}
        >
          🗑
        </Button>
      </div>
    </div>
  );
}

function PanelSalon({
  salon,
  mutations,
  onCerrar,
  boxStyle,
}: {
  salon: Salon;
  mutations: ReturnType<typeof useSalonMutations>;
  onCerrar: () => void;
  boxStyle: React.CSSProperties;
}) {
  const [nombre, setNombre] = useState(salon.nombre);
  const cambio = nombre !== salon.nombre;
  const guardar = () => mutations.renombrarSalon.mutate({ id: salon.id, nombre });

  return (
    <div className="card card-pad" style={boxStyle}>
      <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && cambio && guardar()} />
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
      <div style={{ display: 'flex', gap: 6 }}>
        <Button variant="success" size="sm" disabled={!cambio} title="Guardar nombre" aria-label="Guardar nombre" onClick={guardar}>
          ✓
        </Button>
        <Button
          variant="danger"
          size="sm"
          title="Borrar salón"
          aria-label="Borrar salón"
          onClick={() => {
            mutations.borrarSalon.mutate(salon.id);
            onCerrar();
          }}
        >
          🗑
        </Button>
      </div>
    </div>
  );
}

function StatCard({ valor, label, color }: { valor: number | string; label: string; color?: string }) {
  return (
    <div className="card card-pad stat-card" style={color ? { borderLeftColor: color } : undefined}>
      <div className="stat-card-value" style={color ? { color } : undefined}>
        {valor}
      </div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
