import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useEmpleados() {
  return useQuery({ queryKey: ['empleados'], queryFn: api.fetchEmpleados });
}

export function useEmpleadoMutations() {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['empleados'] });
  return {
    crear: useMutation({ mutationFn: api.crearEmpleado, onSuccess: invalidar }),
    borrar: useMutation({ mutationFn: api.borrarEmpleado, onSuccess: invalidar }),
  };
}
