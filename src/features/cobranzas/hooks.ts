import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function usePagosEmpleados() {
  return useQuery({ queryKey: ['pagos-empleados'], queryFn: api.fetchPagosEmpleados });
}

export function usePagosEmpleadosMutations() {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['pagos-empleados'] });
  return {
    crear: useMutation({ mutationFn: api.crearPago, onSuccess: invalidar }),
    actualizar: useMutation({ mutationFn: api.actualizarPago, onSuccess: invalidar }),
    borrar: useMutation({ mutationFn: api.borrarPago, onSuccess: invalidar }),
  };
}
