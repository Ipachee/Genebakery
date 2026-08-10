import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/useAuth';
import { useTurnoActual } from '../../turnos/useTurnoActual';
import {
  pedidoMesaKey,
  usePedidoDeMesa,
  usePedidoMutations,
  useProductos,
  type ItemConProducto,
  type PedidoConItems,
} from '../hooks';
import { useClientes } from '../../clientes/hooks';
import { Button } from '../../../components/Button';
import { Select } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import type { Database } from '../../../lib/supabase/types';
import './PedidoPanel.css';

type Mesa = Database['public']['Tables']['mesas']['Row'];
type Producto = Database['public']['Tables']['productos']['Row'];

const CATEGORIAS: { id: Producto['categoria']; label: string }[] = [
  { id: 'bebida', label: 'Bebidas' },
  { id: 'comida', label: 'Comidas' },
  { id: 'pasteleria', label: 'Pastelería' },
  { id: 'noche', label: 'Noche' },
];

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia'];

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function PedidoPanel({ mesa, onClose }: { mesa: Mesa; onClose: () => void }) {
  const { session } = useAuth();
  const { turno } = useTurnoActual();
  const { data: productos } = useProductos();
  const { data: pedido, isLoading } = usePedidoDeMesa(mesa.id);
  const { data: clientes } = useClientes();
  const mutations = usePedidoMutations(mesa.id);
  const qc = useQueryClient();
  const colaRef = useRef<Promise<void>>(Promise.resolve());

  const [categoria, setCategoria] = useState<Producto['categoria']>('bebida');
  const [cobrando, setCobrando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [clienteId, setClienteId] = useState<number | ''>('');

  const mozoId = session?.user.id;
  const items = pedido?.pedido_items ?? [];
  const subtotal = items.reduce((s, it) => s + Number(it.precio_unitario) * Number(it.cantidad), 0);
  const hayPendientesDeCocina = items.some((it) => !it.enviado_cocina);
  const clienteSeleccionado = clientes?.find((c) => c.id === clienteId);
  const descuento = clienteSeleccionado ? Math.round(subtotal * (Number(clienteSeleccionado.descuento_pct) / 100)) : 0;
  const total = subtotal - descuento;

  // Clickear rápido en el mismo producto no debe crear una fila nueva por
  // click (debe sumar cantidad a la línea existente) ni disparar dos
  // pedidos para la misma mesa si el primer click todavía está creando el
  // pedido. Por eso cada click se encola: el siguiente no arranca hasta que
  // el anterior terminó su round-trip, y cada paso relee la cache fresca
  // (no el `pedido` capturado en el cierre del render, que puede estar
  // desactualizado a mitad de una tanda de clicks).
  function agregarProducto(producto: Producto) {
    colaRef.current = colaRef.current.then(() => procesarAgregado(producto));
  }

  async function procesarAgregado(producto: Producto) {
    if (!turno || !mozoId) return;
    const actual = qc.getQueryData<PedidoConItems | null>(pedidoMesaKey(mesa.id));
    let pedidoId = actual?.id;
    if (!pedidoId) {
      const nuevo = await mutations.crearPedido.mutateAsync({ turnoId: turno.id, mozoId });
      pedidoId = nuevo.id;
    }
    const conPedido = qc.getQueryData<PedidoConItems | null>(pedidoMesaKey(mesa.id));
    const existente = conPedido?.pedido_items.find((it) => it.producto_id === producto.id && !it.enviado_cocina);
    if (existente) {
      const cantidadNueva = Number(existente.cantidad) + 1;
      // Optimista: se ve la cantidad nueva en el mismo instante del click,
      // sin esperar el viaje al servidor (era la "pérdida de microsegundos"
      // que se sentía al tocar rápido el mismo producto).
      qc.setQueryData<PedidoConItems | null>(pedidoMesaKey(mesa.id), (prev) =>
        prev
          ? { ...prev, pedido_items: prev.pedido_items.map((it) => (it.id === existente.id ? { ...it, cantidad: cantidadNueva } : it)) }
          : prev
      );
      await mutations.actualizarCantidad.mutateAsync({ itemId: existente.id, cantidad: cantidadNueva });
    } else {
      await mutations.agregarItem.mutateAsync({ pedidoId, productoId: producto.id, precio: producto.precio, nota: '' });
    }
  }

  async function handleEnviarCocina() {
    if (!pedido) return;
    setEnviando(true);
    await mutations.enviarACocina.mutateAsync(pedido.id);
    setEnviando(false);
  }

  // Cerrar el panel sin haber mandado nada a cocina (ni cobrado) descarta el
  // carrito entero: es solo un borrador hasta que se confirma con "Enviar a
  // cocina". Si no, la mesa quedaba marcada "ocupada" con un pedido a medio
  // armar que nadie iba a retomar.
  function handleClose() {
    if (pedido && pedido.estado === 'abierto') {
      mutations.cancelarPedido.mutate(pedido.id);
    }
    onClose();
  }

  async function handleCobrar(metodo: string) {
    if (!pedido || !turno || !mozoId) return;
    await mutations.cobrar.mutateAsync({
      pedidoId: pedido.id,
      turnoId: turno.id,
      mesaId: mesa.id,
      mozoId,
      clienteId: clienteId || null,
      subtotal,
      descuento,
      total,
      metodoPago: metodo,
    });
    setCobrando(false);
    onClose();
  }

  return (
    <div className="pedido-overlay" onClick={handleClose}>
      <div className="pedido-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pedido-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3>Mesa {mesa.label ?? mesa.id}</h3>
            {pedido?.enviado_at && pedido.estado !== 'cobrado' && <Cronometro desde={pedido.enviado_at} />}
          </div>
          <button className="pedido-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {!turno || turno.estado !== 'abierto' ? (
          <EmptyState>Necesitás un turno abierto para tomar pedidos.</EmptyState>
        ) : (
          <div className="pedido-body">
            <div className="pedido-menu">
              <div className="pedido-cat-tabs">
                {CATEGORIAS.map((c) => (
                  <button key={c.id} className={`pedido-cat-tab ${categoria === c.id ? 'active' : ''}`} onClick={() => setCategoria(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="pedido-producto-list">
                {productos
                  ?.filter((p) => p.categoria === categoria)
                  .map((p) => (
                    <button key={p.id} className="pedido-producto-btn" onClick={() => agregarProducto(p)}>
                      <span>{p.nombre}</span>
                      <span className="pedido-producto-precio">{fmt.format(p.precio)}</span>
                    </button>
                  ))}
              </div>
            </div>

            <div className="pedido-cart">
              {isLoading ? (
                <EmptyState>Cargando…</EmptyState>
              ) : items.length === 0 ? (
                <EmptyState>Todavía no agregaste nada.</EmptyState>
              ) : (
                items.map((it) => <ItemFila key={it.id} item={it} mutations={mutations} />)
              )}

              <div className="pedido-footer">
                {!cobrando ? (
                  <>
                    <div className="pedido-total-row">
                      <span className="label">Total</span>
                      <span>{fmt.format(subtotal)}</span>
                    </div>
                    <div className="pedido-actions">
                      <Button block disabled={!pedido || !hayPendientesDeCocina || enviando} onClick={handleEnviarCocina}>
                        🍳 Enviar a cocina
                      </Button>
                      {pedido?.estado === 'enviado_cocina' && !hayPendientesDeCocina && (
                        <Button block onClick={() => mutations.marcarEntregado.mutate(pedido.id)}>
                          ✅ Entregado
                        </Button>
                      )}
                      <Button variant="success" block disabled={!pedido || items.length === 0} onClick={() => setCobrando(true)}>
                        💰 Cobrar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Select value={clienteId} onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : '')} style={{ fontSize: 12.5 }}>
                      <option value="">Sin cliente</option>
                      {clientes?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.apellido} {Number(c.descuento_pct) > 0 ? `(-${c.descuento_pct}%)` : ''}
                        </option>
                      ))}
                    </Select>
                    <div className="pedido-cobro-summary">
                      Subtotal {fmt.format(subtotal)}
                      {descuento > 0 && ` · Descuento −${fmt.format(descuento)}`}
                    </div>
                    <div className="pedido-total-row">
                      <span className="label">Total</span>
                      <span>{fmt.format(total)}</span>
                    </div>
                    <span className="field-label">Método de pago</span>
                    <div className="pedido-actions">
                      {METODOS.map((m) => (
                        <Button key={m} size="sm" block onClick={() => handleCobrar(m)}>
                          {m}
                        </Button>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setCobrando(false)}>
                      cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Cronometro({ desde }: { desde: string }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const segundos = Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 1000));
  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');
  return (
    <span className="badge badge-accent" style={{ fontVariantNumeric: 'tabular-nums' }}>
      ⏱ {mm}:{ss}
    </span>
  );
}

function ItemFila({
  item,
  mutations,
}: {
  item: ItemConProducto;
  mutations: ReturnType<typeof usePedidoMutations>;
}) {
  const [nota, setNota] = useState(item.nota ?? '');

  return (
    <div className="pedido-item">
      <div className="pedido-item-top">
        <span className="pedido-item-nombre">
          {item.productos?.nombre ?? `Producto #${item.producto_id}`}
          {item.enviado_cocina && (
            <span className="badge badge-info" style={{ marginLeft: 6 }}>
              en cocina
            </span>
          )}
        </span>
        <div className="pedido-item-controls">
          <button className="pedido-qty-btn" onClick={() => mutations.actualizarCantidad.mutate({ itemId: item.id, cantidad: Math.max(1, Number(item.cantidad) - 1) })}>
            −
          </button>
          <span style={{ minWidth: 14, textAlign: 'center' }}>{item.cantidad}</span>
          <button className="pedido-qty-btn" onClick={() => mutations.actualizarCantidad.mutate({ itemId: item.id, cantidad: Number(item.cantidad) + 1 })}>
            +
          </button>
          <button className="btn-danger btn-icon" onClick={() => mutations.quitarItem.mutate(item.id)}>
            🗑
          </button>
        </div>
      </div>
      <input
        className="pedido-item-nota"
        placeholder="Nota (ej: sin azúcar)"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={() => nota !== (item.nota ?? '') && mutations.actualizarNota.mutate({ itemId: item.id, nota })}
      />
    </div>
  );
}
