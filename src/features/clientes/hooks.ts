import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useClientes() {
  return useQuery({ queryKey: ['clientes'], queryFn: api.fetchClientes });
}

export function useClienteMutations() {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['clientes'] });
  return {
    crear: useMutation({ mutationFn: api.crearCliente, onSuccess: invalidar }),
    borrar: useMutation({ mutationFn: api.borrarCliente, onSuccess: invalidar }),
  };
}
