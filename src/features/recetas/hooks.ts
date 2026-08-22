import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useProductos() {
  return useQuery({ queryKey: ['productos-recetas'], queryFn: api.fetchProductos });
}

export function useCrearProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.crearProducto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos-recetas'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      qc.invalidateQueries({ queryKey: ['productos-sin-elaborado'] });
    },
  });
}

// Pausar/reactivar saca (o devuelve) el producto del menú de Comandar
// pedidos -- por eso también invalida ['productos'], que es lo que usa
// ese menú.
export function useActualizarActivoProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; activo: boolean }) => api.actualizarActivoProducto(v.id, v.activo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos-recetas'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      qc.invalidateQueries({ queryKey: ['productos-sin-elaborado'] });
    },
  });
}

export function useInsumos() {
  return useQuery({ queryKey: ['insumos-recetas'], queryFn: api.fetchInsumos });
}

export function useRecetaDeProducto(productoId: number | null) {
  return useQuery({
    queryKey: ['receta', productoId],
    queryFn: () => api.fetchRecetaDeProducto(productoId!),
    enabled: productoId != null,
  });
}

export function useRecetaMutations(productoId: number | null) {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['receta', productoId] });
  return {
    agregar: useMutation({
      mutationFn: (v: { insumoId: number; cantidad: number }) => api.agregarIngrediente(productoId!, v.insumoId, v.cantidad),
      onSuccess: invalidar,
    }),
    quitar: useMutation({ mutationFn: api.quitarIngrediente, onSuccess: invalidar }),
  };
}
