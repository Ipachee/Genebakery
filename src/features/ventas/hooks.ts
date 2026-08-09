import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useVentas() {
  return useQuery({ queryKey: ['ventas'], queryFn: api.fetchVentas });
}

export function useVentaMutations() {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['ventas'] });
  return {
    actualizarMetodoPago: useMutation({
      mutationFn: (v: { id: number; metodoPago: string }) => api.actualizarMetodoPago(v.id, v.metodoPago),
      onSuccess: invalidar,
    }),
    borrar: useMutation({ mutationFn: api.borrarVenta, onSuccess: invalidar }),
  };
}
