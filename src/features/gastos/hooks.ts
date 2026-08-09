import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useGastos() {
  return useQuery({ queryKey: ['gastos'], queryFn: api.fetchGastos });
}

export function useInsumos() {
  return useQuery({ queryKey: ['insumos-gastos'], queryFn: api.fetchInsumos });
}

export function useGastoMutations() {
  const qc = useQueryClient();
  return {
    registrar: useMutation({
      mutationFn: api.registrarGasto,
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['gastos'] });
        qc.invalidateQueries({ queryKey: ['insumos'] });
        qc.invalidateQueries({ queryKey: ['insumos-gastos'] });
      },
    }),
  };
}
