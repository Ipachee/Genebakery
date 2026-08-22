import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useElaborados() {
  return useQuery({ queryKey: ['elaborados'], queryFn: api.fetchElaborados });
}

export function useProductosSinElaborado() {
  return useQuery({ queryKey: ['productos-sin-elaborado'], queryFn: api.fetchProductosSinElaborado });
}

export function useElaboradoMutations() {
  const qc = useQueryClient();
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['elaborados'] });
    qc.invalidateQueries({ queryKey: ['productos-sin-elaborado'] });
    qc.invalidateQueries({ queryKey: ['insumos'] });
  };
  return {
    crear: useMutation({ mutationFn: api.crearElaborado, onSuccess: invalidar }),
    actualizar: useMutation({ mutationFn: api.actualizarElaborado, onSuccess: invalidar }),
    borrar: useMutation({ mutationFn: api.borrarElaborado, onSuccess: invalidar }),
    producir: useMutation({
      mutationFn: (v: { elaboradoId: number; cantidadUnidades: number; usuarioId: string }) =>
        api.registrarProduccion(v.elaboradoId, v.cantidadUnidades, v.usuarioId),
      onSuccess: invalidar,
    }),
  };
}
