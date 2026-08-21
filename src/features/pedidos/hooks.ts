import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { Database } from '../../lib/supabase/types';

type Producto = Database['public']['Tables']['productos']['Row'];
export type ItemConProducto = Database['public']['Tables']['pedido_items']['Row'] & { productos: Producto | null };
export type PedidoConItems = Database['public']['Tables']['pedidos']['Row'] & { pedido_items: ItemConProducto[] };
type FilaEstadoMesa = { mesa_id: number | null; estado: string };

// Cuenta los cobros que quedaron pausados esperando conexión (mutationKey
// compartida por todos los cobros, de cualquier mesa). Mientras hay
// internet un cobro está "pending" solo el instante del viaje al servidor y
// no hace falta avisar nada -- isPaused es lo que distingue "está en curso"
// de "está atascado sin red, ojo con cerrar la pestaña".
export function useCobrosPendientes() {
  const estados = useMutationState({
    filters: { mutationKey: ['cobrar-pedido'] },
    select: (mutation) => mutation.state,
  });
  return estados.filter((s) => s.status === 'pending' && s.isPaused).length;
}

export function useProductos() {
  return useQuery({ queryKey: ['productos'], queryFn: api.fetchProductos });
}

export function pedidoMesaKey(mesaId: number) {
  return ['pedido-mesa', mesaId] as const;
}

export function usePedidoDeMesa(mesaId: number) {
  return useQuery({
    queryKey: pedidoMesaKey(mesaId),
    queryFn: () => api.fetchPedidoAbiertoDeMesa(mesaId),
  });
}

/**
 * En vez de invalidar y esperar un refetch en cada click (dos round-trips por
 * acción, se siente lento y clickear rápido dispara mutaciones en paralelo
 * contra datos desactualizados), estas mutaciones parchean la cache de
 * React Query directo con la respuesta del servidor. La serialización real
 * contra condiciones de carrera vive en PedidoPanel (cola de clicks).
 */
export function usePedidoMutations(mesaId: number) {
  const qc = useQueryClient();
  const key = pedidoMesaKey(mesaId);

  function patch(fn: (prev: PedidoConItems | null | undefined) => PedidoConItems | null | undefined) {
    qc.setQueryData<PedidoConItems | null>(key, fn);
  }

  const invalidarSecundarios = () => {
    qc.invalidateQueries({ queryKey: ['facturado-turno'] });
    qc.invalidateQueries({ queryKey: ['mesas-ocupadas'] });
  };

  return {
    cancelarPedido: useMutation({
      mutationFn: (pedidoId: number) => api.cancelarPedido(pedidoId),
      onSuccess: () => {
        patch(() => null);
        invalidarSecundarios();
      },
    }),
    crearPedido: useMutation({
      mutationFn: (v: { turnoId: number; mozoId: string }) => api.crearPedido(mesaId, v.turnoId, v.mozoId),
      onSuccess: (nuevo) => {
        patch(() => ({ ...nuevo, pedido_items: [] }));
        invalidarSecundarios();
      },
    }),
    agregarItem: useMutation({
      mutationFn: (v: { pedidoId: number; productoId: number; precio: number; nota: string }) =>
        api.agregarItem(v.pedidoId, v.productoId, v.precio, v.nota),
      onSuccess: (item) => {
        patch((prev) => (prev ? { ...prev, pedido_items: [...prev.pedido_items, item] } : prev));
        invalidarSecundarios();
      },
    }),
    actualizarCantidad: useMutation({
      mutationFn: (v: { itemId: number; cantidad: number }) => api.actualizarCantidadItem(v.itemId, v.cantidad),
      onSuccess: (item) => {
        patch((prev) => (prev ? { ...prev, pedido_items: prev.pedido_items.map((it) => (it.id === item.id ? item : it)) } : prev));
      },
    }),
    actualizarNota: useMutation({
      mutationFn: (v: { itemId: number; nota: string }) => api.actualizarNotaItem(v.itemId, v.nota),
      onSuccess: (item) => {
        patch((prev) => (prev ? { ...prev, pedido_items: prev.pedido_items.map((it) => (it.id === item.id ? item : it)) } : prev));
      },
    }),
    quitarItem: useMutation({
      mutationFn: (itemId: number) => api.quitarItem(itemId),
      onSuccess: (_data, itemId) => {
        const prev = qc.getQueryData<PedidoConItems | null>(key);
        const restantes = prev ? prev.pedido_items.filter((it) => it.id !== itemId) : [];
        // Si era el último item, el pedido queda vacío -- se cancela para
        // que la mesa vuelva a libre, sin importar si ya se había mandado
        // algo a cocina (borrar item por item hasta vaciar la mesa tiene que
        // liberarla igual que "Cancelar pedido").
        if (prev && restantes.length === 0) {
          patch(() => null);
          api.cancelarPedido(prev.id).then(invalidarSecundarios);
        } else {
          patch((p) => (p ? { ...p, pedido_items: restantes } : p));
        }
      },
    }),
    enviarACocina: useMutation({
      mutationFn: (pedidoId: number) => api.enviarACocina(pedidoId),
      onSuccess: () => {
        patch((prev) =>
          prev
            ? {
                ...prev,
                estado: 'enviado_cocina',
                enviado_at: new Date().toISOString(),
                pedido_items: prev.pedido_items.map((it) => ({ ...it, enviado_cocina: true })),
              }
            : prev
        );
        invalidarSecundarios();
      },
    }),
    marcarEntregado: useMutation({
      mutationFn: (pedidoId: number) => api.marcarPedidoEntregado(pedidoId),
      onSuccess: () => {
        patch((prev) => (prev ? { ...prev, estado: 'entregado' } : prev));
        invalidarSecundarios();
      },
    }),
    cobrar: useMutation({
      // mutationKey compartida (no por mesa) para poder contar TODOS los
      // cobros pausados sin conexión desde un solo lugar (useCobrosPendientes).
      mutationKey: ['cobrar-pedido'],
      mutationFn: api.cobrarPedido,
      onMutate: async () => {
        await qc.cancelQueries({ queryKey: key });
        await qc.cancelQueries({ queryKey: ['mesas-ocupadas'] });
        const pedidoPrevio = qc.getQueryData<PedidoConItems | null>(key);
        const mesasPrevias = qc.getQueryData<FilaEstadoMesa[]>(['mesas-ocupadas']);
        // Optimista: la mesa se libera al instante (haya o no conexión) --
        // con un solo cajón cobrando, no hace falta esperar la confirmación
        // del servidor para que el plano deje de mostrarla ocupada. Si el
        // cobro está sin conexión, queda pausado y se manda solo apenas
        // vuelva internet (useCobrosPendientes avisa mientras tanto).
        patch(() => null);
        qc.setQueryData<FilaEstadoMesa[]>(['mesas-ocupadas'], (prev) => (prev ?? []).filter((f) => f.mesa_id !== mesaId));
        return { pedidoPrevio, mesasPrevias };
      },
      onError: (_err, _vars, contexto) => {
        // Un error acá es de verdad (offline nunca dispara onError, la
        // mutación queda pausada) -- se deshace lo optimista para que la
        // mesa vuelva a aparecer ocupada.
        if (contexto?.pedidoPrevio !== undefined) patch(() => contexto.pedidoPrevio);
        if (contexto?.mesasPrevias !== undefined) qc.setQueryData(['mesas-ocupadas'], contexto.mesasPrevias);
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: key });
        invalidarSecundarios();
      },
    }),
    marcarCobrando: useMutation({
      mutationFn: (v: { pedidoId: number; activo: boolean }) => api.marcarCobrando(v.pedidoId, v.activo),
      onSuccess: () => invalidarSecundarios(),
    }),
    transferirMesa: useMutation({
      mutationFn: (v: { pedidoId: number; mesaDestinoId: number }) => api.transferirPedido(v.pedidoId, v.mesaDestinoId),
      onSuccess: () => {
        patch(() => null);
        qc.invalidateQueries({ queryKey: ['pedido-mesa'] });
        invalidarSecundarios();
      },
    }),
    transferirItems: useMutation({
      mutationFn: (v: {
        seleccion: { itemId: number; cantidad: number }[];
        origenPedidoId: number;
        mesaDestinoId: number;
        turnoId: number;
        mozoId: string;
      }) => api.transferirItems(v.seleccion, v.origenPedidoId, v.mesaDestinoId, v.turnoId, v.mozoId),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['pedido-mesa'] });
        invalidarSecundarios();
      },
    }),
  };
}
