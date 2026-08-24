import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useConfiguracionTurnos() {
  return useQuery({ queryKey: ['configuracion_turnos'], queryFn: api.fetchConfiguracionTurnos });
}

export function useActualizarActivoTurno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; activo: boolean }) => api.actualizarActivoTurno(v.id, v.activo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configuracion_turnos'] }),
  });
}
