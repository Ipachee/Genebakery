import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useProductos() {
  return useQuery({ queryKey: ['productos'], queryFn: api.fetchProductos });
}

export function usePedidoDeMesa(mesaId: number) {
  return useQuery({
    queryKey: ['pedido-mesa', mesaId],
    queryFn: () => api.fetchPedidoAbiertoDeMesa(mesaId),
  });
}

export function usePedidoMutations(mesaId: number) {
  const qc = useQueryClient();
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['pedido-mesa', mesaId] });
    qc.invalidateQueries({ queryKey: ['facturado-turno'] });
    qc.invalidateQueries({ queryKey: ['mesas-ocupadas'] });
  };

  return {
    crearPedido: useMutation({
      mutationFn: (v: { turnoId: number; mozoId: string }) => api.crearPedido(mesaId, v.turnoId, v.mozoId),
      onSuccess: invalidar,
    }),
    agregarItem: useMutation({
      mutationFn: (v: { pedidoId: number; productoId: number; precio: number; nota: string }) =>
        api.agregarItem(v.pedidoId, v.productoId, v.precio, v.nota),
      onSuccess: invalidar,
    }),
    actualizarCantidad: useMutation({
      mutationFn: (v: { itemId: number; cantidad: number }) => api.actualizarCantidadItem(v.itemId, v.cantidad),
      onSuccess: invalidar,
    }),
    actualizarNota: useMutation({
      mutationFn: (v: { itemId: number; nota: string }) => api.actualizarNotaItem(v.itemId, v.nota),
      onSuccess: invalidar,
    }),
    quitarItem: useMutation({
      mutationFn: (itemId: number) => api.quitarItem(itemId),
      onSuccess: invalidar,
    }),
    enviarACocina: useMutation({
      mutationFn: (pedidoId: number) => api.enviarACocina(pedidoId),
      onSuccess: invalidar,
    }),
    cobrar: useMutation({
      mutationFn: api.cobrarPedido,
      onSuccess: invalidar,
    }),
  };
}
