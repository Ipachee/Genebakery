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
import { useMesas, useEstadoDeMesas } from '../../salon/hooks';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
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
  const { data: todasMesas } = useMesas();
  const { data: estadoDeMesas } = useEstadoDeMesas();
  const mutations = usePedidoMutations(mesa.id);
  const qc = useQueryClient();
  const colaRef = useRef<Promise<void>>(Promise.resolve());

  const [categoria, setCategoria] = useState<Producto['categoria']>('bebida');
  const [cobrando, setCobrando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [clienteId, setClienteId] = useState<number | ''>('');
  const [transfiriendo, setTransfiriendo] = useState(false);
  const [mesaDestino, setMesaDestino] = useState<number | ''>('');
  // Cuántas unidades de cada fila se van a transferir (0 = no seleccionada).
  // No alcanza con un Set de ids: si hay 2 budines en la misma fila y solo
  // se quiere transferir 1, hay que partir esa fila en dos.
  const [cantidadesTransferir, setCantidadesTransferir] = useState<Map<string, number>>(new Map());
  const ultimaFilaRef = useRef<number | null>(null);

  const mozoId = session?.user.id;
  const items = pedido?.pedido_items ?? [];
  const subtotal = items.reduce((s, it) => s + Number(it.precio_unitario) * Number(it.cantidad), 0);
  const hayPendientesDeCocina = items.some((it) => !it.enviado_cocina);
  const clienteSeleccionado = clientes?.find((c) => c.id === clienteId);
  const descuento = clienteSeleccionado ? Math.round(subtotal * (Number(clienteSeleccionado.descuento_pct) / 100)) : 0;
  const total = subtotal - descuento;

  // Lista combinada (agrupados enviados + sueltos sin enviar) en el mismo
  // orden en el que se dibujan, para que el shift-click pueda seleccionar
  // un rango entre la última fila clickeada y la actual.
  const filasTransferibles: GrupoEnviado[] = [
    ...agruparEnviados(items),
    ...items.filter((it) => !it.enviado_cocina).map((it) => ({
      key: `suelto-${it.id}`,
      nombre: it.productos?.nombre ?? `Producto #${it.producto_id}`,
      cantidad: Number(it.cantidad),
      entregado: false,
      lineas: [{ id: it.id, cantidad: Number(it.cantidad) }],
    })),
  ];
  const totalUnidadesSeleccionadas = [...cantidadesTransferir.values()].reduce((s, n) => s + n, 0);

  function toggleSeleccionFila(fila: GrupoEnviado, index: number, shiftKey: boolean) {
    setCantidadesTransferir((prev) => {
      const next = new Map(prev);
      if (shiftKey && ultimaFilaRef.current != null) {
        const [ini, fin] = [Math.min(ultimaFilaRef.current, index), Math.max(ultimaFilaRef.current, index)];
        for (let i = ini; i <= fin; i++) {
          const f = filasTransferibles[i];
          next.set(f.key, f.cantidad);
        }
      } else {
        const yaSeleccionada = (prev.get(fila.key) ?? 0) > 0;
        if (yaSeleccionada) next.delete(fila.key);
        else next.set(fila.key, fila.cantidad);
      }
      return next;
    });
    ultimaFilaRef.current = index;
  }

  function cambiarCantidadFila(fila: GrupoEnviado, nueva: number) {
    setCantidadesTransferir((prev) => {
      const next = new Map(prev);
      if (nueva <= 0) next.delete(fila.key);
      else next.set(fila.key, Math.min(nueva, fila.cantidad));
      return next;
    });
  }

  // Si hay items seleccionados, el destino puede ser cualquier otra mesa
  // (se suman a lo que ya tenga); si no hay selección, transferimos la mesa
  // entera y ahí sí tiene que estar libre.
  const mesasDestinoOpciones = (todasMesas ?? []).filter((m) => {
    if (m.id === mesa.id) return false;
    if (cantidadesTransferir.size > 0) return true;
    return !estadoDeMesas?.has(m.id);
  });

  function cerrarTransferencia() {
    setTransfiriendo(false);
    setMesaDestino('');
    setCantidadesTransferir(new Map());
    ultimaFilaRef.current = null;
  }

  // Si una fila tiene más cantidad de la elegida, hay que decidir de cuáles
  // líneas (rondas) sacar las unidades -- se toma en orden hasta completar
  // lo pedido; transferirItems del lado del servidor parte la última línea
  // tocada si hace falta.
  function partirLineas(lineas: { id: number; cantidad: number }[], cantidad: number) {
    const resultado: { itemId: number; cantidad: number }[] = [];
    let restante = cantidad;
    for (const linea of lineas) {
      if (restante <= 0) break;
      const tomar = Math.min(restante, linea.cantidad);
      resultado.push({ itemId: linea.id, cantidad: tomar });
      restante -= tomar;
    }
    return resultado;
  }

  async function handleTransferir() {
    if (!pedido || !mesaDestino) return;
    if (cantidadesTransferir.size === 0) {
      await mutations.transferirMesa.mutateAsync({ pedidoId: pedido.id, mesaDestinoId: mesaDestino });
      onClose();
      return;
    }
    if (!turno || !mozoId) return;
    const seleccion = filasTransferibles
      .filter((f) => (cantidadesTransferir.get(f.key) ?? 0) > 0)
      .flatMap((f) => partirLineas(f.lineas, cantidadesTransferir.get(f.key)!));
    await mutations.transferirItems.mutateAsync({
      seleccion,
      origenPedidoId: pedido.id,
      mesaDestinoId: mesaDestino,
      turnoId: turno.id,
      mozoId,
    });
    cerrarTransferencia();
  }

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

  // Cerrar el panel sin mandar a cocina descarta lo que quedó sin enviar --
  // es solo un borrador hasta confirmar con "Enviar a cocina". Esto aplica
  // aunque la mesa ya tenga rondas anteriores confirmadas (no alcanzaba con
  // revisar si el pedido entero era nuevo: agregar un producto a una mesa
  // que YA tenía historial y cerrar sin enviar dejaba ese producto pegado
  // ahí para siempre, apareciendo recién la próxima vez que se mandara algo
  // a cocina).
  function handleClose() {
    if (pedido) {
      for (const it of pedido.pedido_items) {
        if (!it.enviado_cocina) mutations.quitarItem.mutate(it.id);
      }
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
              <div className="pedido-cart-items">
                {isLoading ? (
                  <EmptyState>Cargando…</EmptyState>
                ) : items.length === 0 ? (
                  <EmptyState>Todavía no agregaste nada.</EmptyState>
                ) : transfiriendo ? (
                  filasTransferibles.map((fila, i) => (
                    <FilaSeleccionable
                      key={fila.key}
                      fila={fila}
                      cantidadElegida={cantidadesTransferir.get(fila.key) ?? 0}
                      onToggle={(shiftKey) => toggleSeleccionFila(fila, i, shiftKey)}
                      onCambiarCantidad={(nueva) => cambiarCantidadFila(fila, nueva)}
                    />
                  ))
                ) : (
                  <>
                    {agruparEnviados(items).map((g) => (
                      <ItemGrupoFila key={g.key} grupo={g} />
                    ))}
                    {items
                      .filter((it) => !it.enviado_cocina)
                      .map((it) => (
                        <ItemFila key={it.id} item={it} mutations={mutations} />
                      ))}
                  </>
                )}
              </div>

              <div className="pedido-footer">
                {transfiriendo ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: 0 }}>
                      {totalUnidadesSeleccionadas > 0
                        ? `Se transfieren ${totalUnidadesSeleccionadas} unidad(es). Si un producto tiene más de 1, podés bajarle la cantidad con −/+.`
                        : 'Sin elegir nada se transfiere la mesa entera. Tocá los items para elegir solo algunos (shift+click para un rango).'}
                    </p>
                    <Select
                      value={mesaDestino}
                      onChange={(e) => setMesaDestino(e.target.value ? Number(e.target.value) : '')}
                      style={{ fontSize: 12.5 }}
                    >
                      <option value="">Elegí la mesa destino…</option>
                      {mesasDestinoOpciones.map((m) => (
                        <option key={m.id} value={m.id}>
                          Mesa {m.label ?? m.id}
                        </option>
                      ))}
                    </Select>
                    {(mutations.transferirMesa.isError || mutations.transferirItems.isError) && (
                      <p style={{ color: 'var(--red)', fontSize: 11.5, margin: 0 }}>
                        {(mutations.transferirMesa.error ?? mutations.transferirItems.error)?.message}
                      </p>
                    )}
                    <div className="pedido-actions">
                      <Button
                        block
                        disabled={!mesaDestino || mutations.transferirMesa.isPending || mutations.transferirItems.isPending}
                        onClick={handleTransferir}
                      >
                        {totalUnidadesSeleccionadas > 0 ? `🔀 Transferir ${totalUnidadesSeleccionadas} unidad(es)` : '🔀 Transferir mesa completa'}
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={cerrarTransferencia}>
                      cancelar
                    </Button>
                  </div>
                ) : !cobrando ? (
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
                    <div className="pedido-actions">
                      <Button variant="secondary" size="sm" block disabled={!pedido} onClick={() => setTransfiriendo(true)}>
                        🔀 Transferir
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        block
                        disabled={!pedido}
                        onClick={() => {
                          if (pedido && confirm('¿Cancelar todo el pedido de esta mesa? Se borra todo lo agregado.')) {
                            mutations.cancelarPedido.mutate(pedido.id);
                            onClose();
                          }
                        }}
                      >
                        🗑 Cancelar pedido
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

// Los items ya enviados a cocina se agrupan por producto+nota para mostrar
// una sola fila con la cantidad sumada (aunque vengan de rondas distintas) --
// mostrar "Agua mineral" repetida 3 veces por 3 rondas distintas era
// confuso. Ya no son editables desde acá (para eso está "Cancelar pedido" o
// pedirle a cocina); lo nuevo que se agrega sigue siendo una fila aparte
// hasta que se envía.
type GrupoEnviado = {
  key: string;
  nombre: string;
  cantidad: number;
  entregado: boolean;
  lineas: { id: number; cantidad: number }[];
};

function agruparEnviados(items: ItemConProducto[]): GrupoEnviado[] {
  const grupos = new Map<string, GrupoEnviado>();
  for (const it of items) {
    if (!it.enviado_cocina) continue;
    const key = `${it.producto_id}-${it.nota ?? ''}`;
    const prev = grupos.get(key);
    if (prev) {
      prev.cantidad += Number(it.cantidad);
      prev.entregado = prev.entregado && it.entregado;
      prev.lineas.push({ id: it.id, cantidad: Number(it.cantidad) });
    } else {
      grupos.set(key, {
        key,
        nombre: it.productos?.nombre ?? `Producto #${it.producto_id}`,
        cantidad: Number(it.cantidad),
        entregado: it.entregado,
        lineas: [{ id: it.id, cantidad: Number(it.cantidad) }],
      });
    }
  }
  return [...grupos.values()];
}

function ItemGrupoFila({ grupo }: { grupo: GrupoEnviado }) {
  return (
    <div className="pedido-item">
      <div className="pedido-item-top">
        <span className="pedido-item-nombre">
          {grupo.nombre}
          <span style={{ marginLeft: 6 }}>
            <Badge tone={grupo.entregado ? 'good' : 'info'}>{grupo.entregado ? 'entregado' : 'en cocina'}</Badge>
          </span>
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>x{grupo.cantidad}</span>
      </div>
    </div>
  );
}

function FilaSeleccionable({
  fila,
  cantidadElegida,
  onToggle,
  onCambiarCantidad,
}: {
  fila: GrupoEnviado;
  cantidadElegida: number;
  onToggle: (shiftKey: boolean) => void;
  onCambiarCantidad: (nueva: number) => void;
}) {
  const seleccionada = cantidadElegida > 0;
  return (
    <div
      className="pedido-item"
      style={{
        borderColor: seleccionada ? 'var(--terracota)' : undefined,
        background: seleccionada ? 'var(--cream-deep)' : undefined,
      }}
    >
      <div
        className="pedido-item-top"
        role="checkbox"
        aria-checked={seleccionada}
        onClick={(e) => onToggle(e.shiftKey)}
        style={{ cursor: 'pointer' }}
      >
        <span className="pedido-item-nombre">
          <span style={{ marginRight: 8 }}>{seleccionada ? '☑️' : '⬜'}</span>
          {fila.nombre}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>x{fila.cantidad}</span>
      </div>
      {seleccionada && fila.cantidad > 1 && (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}
          onClick={(e) => e.stopPropagation()}
        >
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Transferir:</span>
          <button className="pedido-qty-btn" onClick={() => onCambiarCantidad(cantidadElegida - 1)}>
            −
          </button>
          <span style={{ minWidth: 14, textAlign: 'center' }}>{cantidadElegida}</span>
          <button className="pedido-qty-btn" onClick={() => onCambiarCantidad(cantidadElegida + 1)}>
            +
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>de {fila.cantidad}</span>
        </div>
      )}
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
            <span style={{ marginLeft: 6 }}>
              <Badge tone={item.entregado ? 'good' : 'info'}>{item.entregado ? 'entregado' : 'en cocina'}</Badge>
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
