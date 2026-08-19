import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useSalones() {
  return useQuery({ queryKey: ['salones'], queryFn: api.fetchSalones });
}

export function useMesas() {
  return useQuery({ queryKey: ['mesas'], queryFn: api.fetchMesas });
}

export type EstadoMesa = 'abierto' | 'enviado_cocina' | 'entregado';

export function useEstadoDeMesas() {
  return useQuery({
    queryKey: ['mesas-ocupadas'],
    queryFn: api.fetchEstadoDeMesas,
    refetchInterval: 15000,
    // El Map se arma acá, en select, no en queryFn -- lo que persiste en
    // localStorage (para el modo offline) es el dato CRUDO de queryFn, que
    // tiene que ser serializable con JSON.stringify. Un Map se guarda como
    // "{}" y pierde sus métodos al recargar la página (".has is not a
    // function"). select se recalcula en cada lectura y nunca se persiste,
    // así que acá adentro es seguro usar un Map.
    select: (filas) => {
      const map = new Map<number, EstadoMesa>();
      for (const f of filas) {
        if (f.mesa_id != null) map.set(f.mesa_id, f.estado as EstadoMesa);
      }
      return map;
    },
  });
}

export function useSalonMutations() {
  const qc = useQueryClient();
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['salones'] });
    qc.invalidateQueries({ queryKey: ['mesas'] });
  };

  return {
    moverMesa: useMutation({ mutationFn: (v: { id: number; x: number; y: number }) => api.moverMesa(v.id, v.x, v.y), onSuccess: invalidar }),
    redimensionarMesa: useMutation({ mutationFn: (v: { id: number; w: number; h: number }) => api.redimensionarMesa(v.id, v.w, v.h), onSuccess: invalidar }),
    renombrarMesa: useMutation({ mutationFn: (v: { id: number; label: string }) => api.renombrarMesa(v.id, v.label), onSuccess: invalidar }),
    moverSalon: useMutation({ mutationFn: (v: { id: number; x: number; y: number }) => api.moverSalon(v.id, v.x, v.y), onSuccess: invalidar }),
    redimensionarSalon: useMutation({ mutationFn: (v: { id: number; w: number; h: number }) => api.redimensionarSalon(v.id, v.w, v.h), onSuccess: invalidar }),
    renombrarSalon: useMutation({ mutationFn: (v: { id: number; nombre: string }) => api.renombrarSalon(v.id, v.nombre), onSuccess: invalidar }),
    crearSalon: useMutation({ mutationFn: (nombre: string) => api.crearSalon(nombre), onSuccess: invalidar }),
    borrarSalon: useMutation({ mutationFn: (id: number) => api.borrarSalon(id), onSuccess: invalidar }),
    crearMesa: useMutation({ mutationFn: (v: { salonId: number; x: number; y: number }) => api.crearMesa(v.salonId, v.x, v.y), onSuccess: invalidar }),
    borrarMesa: useMutation({ mutationFn: (id: number) => api.borrarMesa(id), onSuccess: invalidar }),
    dividirMesa: useMutation({ mutationFn: api.dividirMesa, onSuccess: invalidar }),
    unirMesa: useMutation({ mutationFn: (mesaPadreId: number) => api.unirMesa(mesaPadreId), onSuccess: invalidar }),
    restablecerPlano: useMutation({ mutationFn: api.restablecerPlano, onSuccess: invalidar }),
  };
}
