import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useTurnoActual } from '../../turnos/useTurnoActual';
import { usePedidoDeMesa, usePedidoMutations, useProductos } from '../hooks';
import { useClientes } from '../../clientes/hooks';
import type { Database } from '../../../lib/supabase/types';

type Mesa = Database['public']['Tables']['mesas']['Row'];
type Producto = Database['public']['Tables']['productos']['Row'];

const CATEGORIAS: { id: Producto['categoria']; label: string }[] = [
  { id: 'bebida', label: 'Bebidas' },
  { id: 'comida', label: 'Comidas' },
  { id: 'pasteleria', label: 'Pastelería' },
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

  async function agregarProducto(producto: Producto) {
    if (!turno || !mozoId) return;
    let pedidoId = pedido?.id;
    if (!pedidoId) {
      const nuevo = await mutations.crearPedido.mutateAsync({ turnoId: turno.id, mozoId });
      pedidoId = nuevo.id;
    }
    await mutations.agregarItem.mutateAsync({ pedidoId, productoId: producto.id, precio: producto.precio, nota: '' });
  }

  async function handleEnviarCocina() {
    if (!pedido) return;
    setEnviando(true);
    await mutations.enviarACocina.mutateAsync(pedido.id);
    setEnviando(false);
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 10,
          width: 720,
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <strong>Mesa {mesa.label ?? mesa.id}</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {!turno || turno.estado !== 'abierto' ? (
          <p style={{ padding: 18, color: 'var(--text-dim)' }}>
            Necesitás un turno abierto para tomar pedidos.
          </p>
        ) : (
          <div style={{ display: 'flex', flex: 1, minHeight: 0, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', padding: 14, borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {CATEGORIAS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoria(c.id)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 5,
                      border: '1px solid var(--border)',
                      background: categoria === c.id ? 'var(--terracota)' : 'var(--surface)',
                      color: categoria === c.id ? '#fff' : 'var(--text)',
                      fontSize: 12,
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {productos
                  ?.filter((p) => p.categoria === categoria)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => agregarProducto(p)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 5,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        fontSize: 13,
                        textAlign: 'left',
                      }}
                    >
                      <span>{p.nombre}</span>
                      <span style={{ color: 'var(--text-dim)' }}>{fmt.format(p.precio)}</span>
                    </button>
                  ))}
              </div>
            </div>

            <div style={{ flex: '1 1 300px', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
              {isLoading ? (
                <p>Cargando…</p>
              ) : items.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Todavía no agregaste nada.</p>
              ) : (
                items.map((it) => (
                  <ItemFila key={it.id} item={it} mutations={mutations} />
                ))
              )}

              <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                {!cobrando ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 10 }}>
                      <span>Total</span>
                      <span>{fmt.format(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        disabled={!pedido || !hayPendientesDeCocina || enviando}
                        onClick={handleEnviarCocina}
                        style={{ flex: 1, padding: 9, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface)' }}
                      >
                        🍳 Enviar a cocina
                      </button>
                      <button
                        disabled={!pedido || items.length === 0}
                        onClick={() => setCobrando(true)}
                        style={{ flex: 1, padding: 9, borderRadius: 5, border: 'none', background: 'var(--green)', color: '#fff', fontWeight: 600 }}
                      >
                        💰 Cobrar
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : '')}
                      style={{ padding: 6, borderRadius: 4, border: '1px solid var(--border)', fontSize: 12 }}
                    >
                      <option value="">Sin cliente</option>
                      {clientes?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.apellido} {Number(c.descuento_pct) > 0 ? `(-${c.descuento_pct}%)` : ''}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      Subtotal {fmt.format(subtotal)}
                      {descuento > 0 && ` · Descuento −${fmt.format(descuento)}`}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>Total</span>
                      <span>{fmt.format(total)}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Método de pago:</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {METODOS.map((m) => (
                        <button
                          key={m}
                          onClick={() => handleCobrar(m)}
                          style={{ flex: 1, padding: 8, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12 }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setCobrando(false)} style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--text-dim)' }}>
                      cancelar
                    </button>
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

type ItemConProducto = Database['public']['Tables']['pedido_items']['Row'] & {
  productos: Producto | null;
};

function ItemFila({
  item,
  mutations,
}: {
  item: ItemConProducto;
  mutations: ReturnType<typeof usePedidoMutations>;
}) {
  const [nota, setNota] = useState(item.nota ?? '');

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
        <span>
          {item.productos?.nombre ?? `Producto #${item.producto_id}`}
          {item.enviado_cocina && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--teal)' }}>· en cocina</span>}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => mutations.actualizarCantidad.mutate({ itemId: item.id, cantidad: Math.max(1, Number(item.cantidad) - 1) })}
            style={{ width: 22, height: 22 }}
          >
            −
          </button>
          <span>{item.cantidad}</span>
          <button
            onClick={() => mutations.actualizarCantidad.mutate({ itemId: item.id, cantidad: Number(item.cantidad) + 1 })}
            style={{ width: 22, height: 22 }}
          >
            +
          </button>
          <button onClick={() => mutations.quitarItem.mutate(item.id)} style={{ color: 'var(--red)', border: 'none', background: 'none' }}>
            🗑
          </button>
        </div>
      </div>
      <input
        placeholder="Nota (ej: sin azúcar)"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={() => nota !== (item.nota ?? '') && mutations.actualizarNota.mutate({ itemId: item.id, nota })}
        style={{ width: '100%', marginTop: 6, padding: 5, fontSize: 12, border: '1px solid var(--border)', borderRadius: 4 }}
      />
    </div>
  );
}
