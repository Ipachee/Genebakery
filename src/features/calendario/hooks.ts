import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useCalendario(desde: string, hasta: string) {
  return useQuery({ queryKey: ['calendario-equipo', desde, hasta], queryFn: () => api.fetchCalendario(desde, hasta) });
}

export function useCalendarioMutations() {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['calendario-equipo'] });
  return {
    crear: useMutation({ mutationFn: api.crearEntrada, onSuccess: invalidar }),
    borrar: useMutation({ mutationFn: api.borrarEntrada, onSuccess: invalidar }),
    mover: useMutation({
      mutationFn: (v: { id: number; fechaInicio?: string; fechaFin?: string; turnoEtiqueta?: string }) =>
        api.moverEntrada(v.id, v),
      onSuccess: invalidar,
    }),
  };
}
