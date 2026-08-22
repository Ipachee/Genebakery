import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useInsumos() {
  return useQuery({ queryKey: ['insumos'], queryFn: api.fetchInsumos });
}

export function useInsumoMutations() {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['insumos'] });
  return {
    crear: useMutation({ mutationFn: api.crearInsumo, onSuccess: invalidar }),
    actualizar: useMutation({ mutationFn: api.actualizarInsumo, onSuccess: invalidar }),
    borrar: useMutation({ mutationFn: api.borrarInsumo, onSuccess: invalidar }),
  };
}
