import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useCategorias() {
  return useQuery({ queryKey: ['categorias'], queryFn: api.fetchCategorias });
}

export function useCategoriaMutations() {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['categorias'] });
  return {
    crear: useMutation({ mutationFn: api.crearCategoria, onSuccess: invalidar }),
    actualizar: useMutation({ mutationFn: api.actualizarCategoria, onSuccess: invalidar }),
    actualizarDestino: useMutation({
      mutationFn: (v: { id: number; destino: 'cocina' | 'barra' }) => api.actualizarDestinoCategoria(v.id, v.destino),
      onSuccess: invalidar,
    }),
    borrar: useMutation({ mutationFn: api.borrarCategoria, onSuccess: invalidar }),
  };
}
