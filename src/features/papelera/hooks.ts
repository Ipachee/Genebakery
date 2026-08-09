import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function usePapelera() {
  return useQuery({ queryKey: ['papelera'], queryFn: api.fetchPapelera });
}

export function usePapeleraMutations() {
  const qc = useQueryClient();
  return {
    restaurar: useMutation({
      mutationFn: (v: { tipo: string; id: number }) => api.restaurar(v.tipo, v.id),
      onSuccess: () => qc.invalidateQueries(),
    }),
  };
}
