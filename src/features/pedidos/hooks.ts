import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { Database } from '../../lib/supabase/types';

type Producto = Database['public']['Tables']['productos']['Row'];
export type ItemConProducto = Database['public']['Tables']['pedido_items']['Row'] & { productos: Producto | null };
export type PedidoConItems = Database['public']['Tables']['pedidos']['Row'] & { pedido_items: ItemConProducto[] };

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
        patch((prev) => (prev ? { ...prev, pedido_items: prev.pedido_items.filter((it) => it.id !== itemId) } : prev));
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
                enviado_at: prev.enviado_at ?? new Date().toISOString(),
                pedido_items: prev.pedido_items.map((it) => ({ ...it, enviado_cocina: true })),
              }
            : prev
        );
        invalidarSecundarios();
      },
    }),
    marcarEntregado: useMutation({
      mutationFn: (pedidoId: number) => api.marcarEntregado(pedidoId),
      onSuccess: () => {
        patch((prev) => (prev ? { ...prev, estado: 'entregado' } : prev));
        invalidarSecundarios();
      },
    }),
    cobrar: useMutation({
      mutationFn: api.cobrarPedido,
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: key });
        invalidarSecundarios();
      },
    }),
  };
}
