import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function usePerfilNegocio() {
  return useQuery({ queryKey: ['perfil-negocio'], queryFn: api.fetchPerfilNegocio });
}

export function useGuardarPerfilNegocio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.guardarPerfilNegocio,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['perfil-negocio'] }),
  });
}
