import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/useAuth';
import { useTurnoActual } from '../../turnos/useTurnoActual';
import { pedidoMesaKey, usePedidoDeMesa, usePedidoMutations, useProductos, type ItemConProducto, type PedidoConItems } from '../hooks';
import { useClientes } from '../../clientes/hooks';
import { useMesas, useEstadoDeMesas } from '../../salon/hooks';
import { usePerfilNegocio } from '../../negocio/hooks';
import { useOnlineStatus } from '../../../app/useOnlineStatus';
import { agruparEnviados, partirLineas, type GrupoEnviado } from '../transferencia';
import { useConfirm } from '../../../components/ConfirmDialog';
import { Cronometro } from './Cronometro';
import { PedidoMenu } from './PedidoMenu';
import { PedidoCarrito } from './PedidoCarrito';
import { PedidoFooterAcciones } from './PedidoFooterAcciones';
import { PedidoFooterCobro } from './PedidoFooterCobro';
import { PedidoFooterTransferir } from './PedidoFooterTransferir';
import { TicketCobro } from './TicketCobro';
import { EmptyState } from '../../../components/EmptyState';
import type { Database } from '../../../lib/supabase/types';
import './PedidoPanel.css';

type Mesa = Database['public']['Tables']['mesas']['Row'];
type Producto = Database['public']['Tables']['productos']['Row'];

type ReciboCobro = {
  pedidoId: number;
  items: ItemConProducto[];
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: string;
  clienteNombre: string | null;
};

export function PedidoPanel({ mesa, onClose }: { mesa: Mesa; onClose: () => void }) {
  const { session, profile } = useAuth();
  const { turno } = useTurnoActual();
  const { data: productos } = useProductos();
  const { data: pedido, isLoading } = usePedidoDeMesa(mesa.id);
  const { data: clientes } = useClientes();
  const { data: todasMesas } = useMesas();
  const { data: estadoDeMesas } = useEstadoDeMesas();
  const { data: perfilNegocio } = usePerfilNegocio();
  const mutations = usePedidoMutations(mesa.id);
  const qc = useQueryClient();
  const colaRef = useRef<Promise<void>>(Promise.resolve());
  const { confirm, dialog } = useConfirm();
  const [recibo, setRecibo] = useState<ReciboCobro | null>(null);
  const online = useOnlineStatus();

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
    ...items
      .filter((it) => !it.enviado_cocina)
      .map((it) => ({
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

  // Después de cobrar se imprime el ticket para el cliente antes de cerrar
  // el panel -- si cerráramos enseguida, el nodo del ticket se desmontaría
  // en medio de la impresión. 'afterprint' dispara igual si el mozo
  // cancela el diálogo, así que el panel no se queda trabado esperando.
  useEffect(() => {
    if (!recibo) return;
    const id = requestAnimationFrame(() => window.print());
    const cerrarTodo = () => {
      setRecibo(null);
      onClose();
    };
    window.addEventListener('afterprint', cerrarTodo);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('afterprint', cerrarTodo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recibo]);

  function cerrarTransferencia() {
    setTransfiriendo(false);
    setMesaDestino('');
    setCantidadesTransferir(new Map());
    ultimaFilaRef.current = null;
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
      // Optimista también para un producto nuevo (no solo para sumar
      // cantidad): sin esto, con la mutación pausada por estar sin
      // conexión, el click no mostraba nada hasta que volviera la red y el
      // mozo no tenía forma de saber si había quedado registrado. La fila
      // temporal (id negativo) se saca apenas la mutación resuelve de
      // verdad -- el onSuccess de agregarItem ya agrega la fila real, acá
      // solo se limpia el placeholder para no duplicar.
      const tempId = -Date.now();
      const itemOptimista = {
        id: tempId,
        pedido_id: pedidoId,
        producto_id: producto.id,
        cantidad: 1,
        precio_unitario: producto.precio,
        nota: null,
        enviado_cocina: false,
        entregado: false,
        ronda: null,
        enviado_cocina_at: null,
        created_at: new Date().toISOString(),
        productos: producto,
      } as ItemConProducto;
      qc.setQueryData<PedidoConItems | null>(pedidoMesaKey(mesa.id), (prev) =>
        prev ? { ...prev, pedido_items: [...prev.pedido_items, itemOptimista] } : prev
      );
      await mutations.agregarItem.mutateAsync({ pedidoId, productoId: producto.id, precio: producto.precio, nota: '' });
      qc.setQueryData<PedidoConItems | null>(pedidoMesaKey(mesa.id), (prev) =>
        prev ? { ...prev, pedido_items: prev.pedido_items.filter((it) => it.id !== tempId) } : prev
      );
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
    setRecibo({ pedidoId: pedido.id, items, subtotal, descuento, total, metodoPago: metodo, clienteNombre: nombreCliente() });
  }

  async function handleCobrarMultiple(pagos: { metodo: string; monto: number }[]) {
    if (!pedido || !turno || !mozoId) return;
    const metodoPago = pagos.map((p) => p.metodo).join(' + ');
    await mutations.cobrar.mutateAsync({
      pedidoId: pedido.id,
      turnoId: turno.id,
      mesaId: mesa.id,
      mozoId,
      clienteId: clienteId || null,
      subtotal,
      descuento,
      total,
      metodoPago,
      pagos,
    });
    setCobrando(false);
    setRecibo({ pedidoId: pedido.id, items, subtotal, descuento, total, metodoPago, clienteNombre: nombreCliente() });
  }

  function nombreCliente() {
    return clienteSeleccionado ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}` : null;
  }

  async function handleCancelarPedido() {
    if (!pedido) return;
    if (await confirm('¿Cancelar todo el pedido de esta mesa? Se borra todo lo agregado.')) {
      mutations.cancelarPedido.mutate(pedido.id);
      onClose();
    }
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
            <PedidoMenu productos={productos} categoria={categoria} onCategoria={setCategoria} onAgregar={agregarProducto} />

            <div className="pedido-cart">
              <div className="pedido-cart-items">
                <PedidoCarrito
                  isLoading={isLoading}
                  items={items}
                  mutations={mutations}
                  modoTransferir={transfiriendo}
                  filasTransferibles={filasTransferibles}
                  cantidadesTransferir={cantidadesTransferir}
                  onToggleFila={toggleSeleccionFila}
                  onCambiarCantidadFila={cambiarCantidadFila}
                />
              </div>

              <div className="pedido-footer">
                {transfiriendo ? (
                  <PedidoFooterTransferir
                    mesasDestinoOpciones={mesasDestinoOpciones}
                    mesaDestino={mesaDestino}
                    onMesaDestino={setMesaDestino}
                    totalUnidadesSeleccionadas={totalUnidadesSeleccionadas}
                    pendiente={mutations.transferirMesa.isPending || mutations.transferirItems.isPending}
                    error={(mutations.transferirMesa.error ?? mutations.transferirItems.error)?.message ?? null}
                    onTransferir={handleTransferir}
                    onCancelar={cerrarTransferencia}
                  />
                ) : !cobrando ? (
                  <PedidoFooterAcciones
                    pedido={pedido}
                    subtotal={subtotal}
                    itemsCount={items.length}
                    hayPendientesDeCocina={hayPendientesDeCocina}
                    enviando={enviando}
                    offline={!online}
                    onEnviarCocina={handleEnviarCocina}
                    onMarcarEntregado={() => pedido && mutations.marcarEntregado.mutate(pedido.id)}
                    onCobrar={() => setCobrando(true)}
                    onTransferir={() => setTransfiriendo(true)}
                    onCancelarPedido={handleCancelarPedido}
                  />
                ) : (
                  <PedidoFooterCobro
                    clientes={clientes}
                    clienteId={clienteId}
                    onClienteId={setClienteId}
                    subtotal={subtotal}
                    descuento={descuento}
                    total={total}
                    onCobrar={handleCobrar}
                    onCobrarMultiple={handleCobrarMultiple}
                    pendiente={mutations.cobrar.isPending}
                    error={mutations.cobrar.error?.message ?? null}
                    onCancelar={() => setCobrando(false)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {dialog}
      {recibo && (
        <TicketCobro
          pedidoId={recibo.pedidoId}
          mesaLabel={mesa.label ?? String(mesa.id)}
          atendidoPor={profile?.nombre ?? null}
          clienteNombre={recibo.clienteNombre}
          items={recibo.items}
          subtotal={recibo.subtotal}
          descuento={recibo.descuento}
          total={recibo.total}
          metodoPago={recibo.metodoPago}
          perfil={perfilNegocio ?? null}
        />
      )}
    </div>
  );
}
