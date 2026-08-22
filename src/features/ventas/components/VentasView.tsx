import { useEffect, useMemo, useState } from 'react';
import { usePuedeEditar } from '../../permisos/hooks';
import { useVentaMutations, useVentas } from '../hooks';
import { fetchItemsParaTicket } from '../api';
import { usePerfilNegocio } from '../../negocio/hooks';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable, ThOrdenable, useOrdenTabla } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { Select, TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import { TicketCobro } from '../../pedidos/components/TicketCobro';
import type { ItemConProducto } from '../../pedidos/hooks';
import { GenerarFacturaModal } from './GenerarFacturaModal';
import { fmtMoney as fmt } from '../../../lib/format';
import { METODOS_PAGO } from '../../../lib/pedidoConstantes';
import type { Database } from '../../../lib/supabase/types';

type Venta = Database['public']['Tables']['ventas']['Row'] & {
  mesas: { label: string | null; es_take_away: boolean } | null;
  clientes: { nombre: string; apellido: string; email: string | null } | null;
  mozo: { nombre: string } | null;
  facturas_electronicas: { id: number; estado: string }[];
};

type ColumnaOrden = 'fecha' | 'mesa' | 'cliente' | 'total' | 'metodo';

function esTakeAway(v: Venta) {
  return v.mesas?.es_take_away === true;
}

function mesaLabelDe(v: Venta) {
  return v.mesas?.label ?? (v.mesa_id ? `#${v.mesa_id}` : 'Take away');
}

export function VentasView() {
  const puedeEditar = usePuedeEditar('ventas');
  const { data: ventas, isLoading } = useVentas();
  const { data: perfilNegocio } = usePerfilNegocio();
  const { actualizarMetodoPago, borrar } = useVentaMutations();
  const [busqueda, setBusqueda] = useState('');
  const [metodoPago, setMetodoPago] = useState('todos');
  const [tipo, setTipo] = useState<'todos' | 'mesa' | 'takeaway'>('todos');
  const { orden, alClickear } = useOrdenTabla<ColumnaOrden>('fecha', 'desc');
  const { confirm, dialog } = useConfirm();

  const [cargandoTicketId, setCargandoTicketId] = useState<number | null>(null);
  const [reimprimiendo, setReimprimiendo] = useState<{ venta: Venta; items: ItemConProducto[] } | null>(null);
  const [facturando, setFacturando] = useState<Venta | null>(null);

  // Reimprimir un ticket viejo no guarda nada aparte: los ítems del pedido
  // original ya están en pedido_items (no se borran al cobrar ni al
  // soft-borrar la venta), así que alcanza con volver a leerlos.
  async function reimprimirTicket(v: Venta) {
    setCargandoTicketId(v.id);
    try {
      const items = await fetchItemsParaTicket(v.pedido_id);
      setReimprimiendo({ venta: v, items });
    } finally {
      setCargandoTicketId(null);
    }
  }

  useEffect(() => {
    if (!reimprimiendo) return;
    const id = requestAnimationFrame(() => window.print());
    const cerrar = () => setReimprimiendo(null);
    window.addEventListener('afterprint', cerrar);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('afterprint', cerrar);
    };
  }, [reimprimiendo]);

  // Resumen sobre las ventas cargadas (últimas 100), sin el filtro de tipo
  // aplicado -- para que se pueda ver de un vistazo "cuánto fue take away
  // vs. mesas" aunque después se filtre para mirar solo una de las dos.
  const resumen = useMemo(() => {
    const base = { mesaCant: 0, mesaTotal: 0, takeAwayCant: 0, takeAwayTotal: 0 };
    for (const v of ventas ?? []) {
      if (esTakeAway(v)) {
        base.takeAwayCant++;
        base.takeAwayTotal += Number(v.total);
      } else {
        base.mesaCant++;
        base.mesaTotal += Number(v.total);
      }
    }
    return base;
  }, [ventas]);

  const ventasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = (ventas ?? []).filter((v) => {
      if (metodoPago !== 'todos' && v.metodo_pago !== metodoPago) return false;
      if (tipo === 'mesa' && esTakeAway(v)) return false;
      if (tipo === 'takeaway' && !esTakeAway(v)) return false;
      if (!q) return true;
      const mesa = (v.mesas?.label ?? '').toLowerCase();
      const cliente = v.clientes ? `${v.clientes.nombre} ${v.clientes.apellido}`.toLowerCase() : '';
      return mesa.includes(q) || cliente.includes(q);
    });
    const dir = orden.dir === 'asc' ? 1 : -1;
    return [...filtradas].sort((a, b) => {
      switch (orden.col) {
        case 'mesa':
          return dir * (a.mesas?.label ?? '').localeCompare(b.mesas?.label ?? '');
        case 'cliente':
          return dir * (a.clientes ? `${a.clientes.nombre} ${a.clientes.apellido}` : '').localeCompare(b.clientes ? `${b.clientes.nombre} ${b.clientes.apellido}` : '');
        case 'total':
          return dir * (Number(a.total) - Number(b.total));
        case 'metodo':
          return dir * a.metodo_pago.localeCompare(b.metodo_pago);
        default:
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });
  }, [ventas, busqueda, metodoPago, tipo, orden]);

  async function pedirBorrado(v: Venta) {
    const mesa = v.mesas?.label ?? (v.mesa_id ? `#${v.mesa_id}` : null);
    const detalle = mesa ? `de la mesa ${mesa}` : 'take away';
    if (await confirm(`¿Borrar esta venta ${detalle} por ${fmt.format(Number(v.total))}? No se puede deshacer.`)) {
      borrar.mutate(v.id);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Ventas" subtitle="Últimas 100 ventas. El método de pago se puede corregir después de cobrar." />

      {ventas?.length ? (
        <>
          <div className="stat-grid">
            <div className="card card-pad stat-card">
              <div className="stat-card-value">
                {resumen.mesaCant} · {fmt.format(resumen.mesaTotal)}
              </div>
              <div className="stat-card-label">Ventas de mesa</div>
            </div>
            <div className="card card-pad stat-card">
              <div className="stat-card-value">
                {resumen.takeAwayCant} · {fmt.format(resumen.takeAwayTotal)}
              </div>
              <div className="stat-card-label">Take away</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <TextInput
              placeholder="🔍 Buscar por mesa o cliente…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ maxWidth: 260 }}
            />
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'todos' | 'mesa' | 'takeaway')} style={{ minWidth: 150 }}>
              <option value="todos">Mesa y take away</option>
              <option value="mesa">Solo mesas</option>
              <option value="takeaway">Solo take away</option>
            </Select>
            <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ minWidth: 170 }}>
              <option value="todos">Todos los métodos</option>
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        </>
      ) : null}

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !ventas?.length ? (
        <EmptyState>Todavía no hay ventas registradas.</EmptyState>
      ) : !ventasFiltradas.length ? (
        <EmptyState>No hay ventas que coincidan con la búsqueda.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <ThOrdenable col="fecha" orden={orden} onOrdenar={alClickear}>
                Fecha
              </ThOrdenable>
              <ThOrdenable col="mesa" orden={orden} onOrdenar={alClickear}>
                Mesa
              </ThOrdenable>
              <ThOrdenable col="cliente" orden={orden} onOrdenar={alClickear}>
                Cliente
              </ThOrdenable>
              <ThOrdenable col="total" orden={orden} onOrdenar={alClickear}>
                Total
              </ThOrdenable>
              <ThOrdenable col="metodo" orden={orden} onOrdenar={alClickear}>
                Método de pago
              </ThOrdenable>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ventasFiltradas.map((v) => (
              <FilaVenta
                key={v.id}
                venta={v}
                cargandoTicket={cargandoTicketId === v.id}
                puedeEditar={puedeEditar}
                onGuardarMetodo={(metodoPago) => actualizarMetodoPago.mutate({ id: v.id, metodoPago })}
                onReimprimir={() => reimprimirTicket(v)}
                onFacturar={() => setFacturando(v)}
                onBorrar={() => pedirBorrado(v)}
              />
            ))}
          </tbody>
        </DataTable>
      )}

      {dialog}

      {reimprimiendo && (
        <TicketCobro
          pedidoId={reimprimiendo.venta.pedido_id}
          mesaLabel={mesaLabelDe(reimprimiendo.venta)}
          atendidoPor={reimprimiendo.venta.mozo?.nombre ?? null}
          clienteNombre={reimprimiendo.venta.clientes ? `${reimprimiendo.venta.clientes.nombre} ${reimprimiendo.venta.clientes.apellido}` : null}
          items={reimprimiendo.items}
          subtotal={Number(reimprimiendo.venta.subtotal)}
          descuento={Number(reimprimiendo.venta.descuento)}
          total={Number(reimprimiendo.venta.total)}
          metodoPago={reimprimiendo.venta.metodo_pago}
          perfil={perfilNegocio ?? null}
          fecha={new Date(reimprimiendo.venta.created_at)}
          reimpresion
        />
      )}

      {facturando && (
        <GenerarFacturaModal
          ventaId={facturando.id}
          clienteId={facturando.cliente_id}
          mailInicial={facturando.clientes?.email ?? ''}
          onClose={() => setFacturando(null)}
        />
      )}
    </div>
  );
}

function FilaVenta({
  venta,
  cargandoTicket,
  puedeEditar,
  onGuardarMetodo,
  onReimprimir,
  onFacturar,
  onBorrar,
}: {
  venta: Venta;
  cargandoTicket: boolean;
  puedeEditar: boolean;
  onGuardarMetodo: (metodoPago: string) => void;
  onReimprimir: () => void;
  onFacturar: () => void;
  onBorrar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [metodo, setMetodo] = useState(venta.metodo_pago);

  function empezarEdicion() {
    setMetodo(venta.metodo_pago);
    setEditando(true);
  }

  function guardar() {
    if (metodo !== venta.metodo_pago) onGuardarMetodo(metodo);
    setEditando(false);
  }

  return (
    <tr>
      <td>{new Date(venta.created_at).toLocaleString('es-AR')}</td>
      <td>{mesaLabelDe(venta)}</td>
      <td>{venta.clientes ? `${venta.clientes.nombre} ${venta.clientes.apellido}` : '—'}</td>
      <td>{fmt.format(Number(venta.total))}</td>
      <td>
        {editando ? (
          <Select value={metodo} onChange={(e) => setMetodo(e.target.value)} style={{ padding: '5px 8px', fontSize: 12.5 }} autoFocus>
            {METODOS_PAGO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        ) : (
          venta.metodo_pago
        )}
      </td>
      <td style={{ display: 'flex', gap: 6 }}>
        {editando ? (
          <>
            <Button variant="success" size="sm" title="Guardar método de pago" aria-label="Guardar método de pago" onClick={guardar}>
              ✓
            </Button>
            <Button variant="secondary" size="sm" title="Cancelar" aria-label="Cancelar edición" onClick={() => setEditando(false)}>
              ✕
            </Button>
          </>
        ) : (
          <>
            {puedeEditar && (
              <Button variant="success" size="sm" title="Editar método de pago" aria-label="Editar método de pago" onClick={empezarEdicion}>
                ✓
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              title="Reimprimir ticket"
              aria-label="Reimprimir ticket"
              disabled={cargandoTicket}
              onClick={onReimprimir}
            >
              🖨️
            </Button>
            {venta.facturas_electronicas.some((f) => f.estado === 'emitida') ? (
              <span className="badge badge-good" title="Factura emitida">
                🧾 Emitida
              </span>
            ) : venta.facturas_electronicas.length > 0 ? (
              <span className="badge badge-info" title="Ya se pidió factura para esta venta -- queda pendiente hasta conectar la emisión real">
                🧾 Pendiente
              </span>
            ) : (
              <Button variant="secondary" size="sm" title="Generar factura" aria-label="Generar factura" onClick={onFacturar}>
                🧾
              </Button>
            )}
            {puedeEditar && (
              <Button variant="danger" size="sm" title="Borrar venta" aria-label="Borrar venta" onClick={onBorrar}>
                🗑
              </Button>
            )}
          </>
        )}
      </td>
    </tr>
  );
}
