import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  abrirTurno,
  cerrarTurno,
  fetchFacturadoTurno,
  fetchInsumosStockBajo,
  fetchMesasPendientesDelTurno,
  fetchTurnoPorId,
  fetchUltimoTurno,
  fetchVentasDelTurno,
  reabrirTurno,
} from './api';

function esMismoDia(fechaIso: string, ref: Date) {
  const d = new Date(fechaIso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

/**
 * Al loguearse un mozo: retoma el turno si ya está abierto, lo reabre si lo
 * cerraron hoy mismo (por error), o arranca uno nuevo en $0 si el último
 * cierre fue otro día — sin importar la hora en la que se loguee.
 */
export function useResolverTurno(etiqueta: string | null, userId: string | null) {
  const [turnoId, setTurnoId] = useState<number | null>(null);
  const [resolviendo, setResolviendo] = useState(true);
  const yaResuelto = useRef(false);

  useEffect(() => {
    if (!etiqueta || !userId) {
      setResolviendo(false);
      return;
    }
    if (yaResuelto.current) return;
    yaResuelto.current = true;

    (async () => {
      const ultimo = await fetchUltimoTurno(etiqueta);
      let turno = ultimo;
      if (!ultimo) {
        turno = await abrirTurno(etiqueta, userId);
      } else if (ultimo.estado === 'cerrado') {
        const fechaRef = ultimo.cerrado_at ?? ultimo.abierto_at;
        turno = esMismoDia(fechaRef, new Date())
          ? await reabrirTurno(ultimo.id)
          : await abrirTurno(etiqueta, userId);
      }
      setTurnoId(turno!.id);
      setResolviendo(false);
    })();
  }, [etiqueta, userId]);

  return { turnoId, resolviendo };
}

export function useTurno(turnoId: number | null) {
  return useQuery({
    queryKey: ['turno', turnoId],
    queryFn: () => fetchTurnoPorId(turnoId!),
    enabled: turnoId != null,
  });
}

export function useFacturadoTurno(turnoId: number | null) {
  return useQuery({
    queryKey: ['facturado-turno', turnoId],
    queryFn: () => fetchFacturadoTurno(turnoId!),
    enabled: turnoId != null,
  });
}

export function useCerrarTurno(turnoId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cerrarTurno(turnoId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['turno', turnoId] }),
  });
}

export function useReabrirTurno(turnoId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reabrirTurno(turnoId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['turno', turnoId] }),
  });
}

export function useVentasDelTurno(turnoId: number | null) {
  return useQuery({
    queryKey: ['ventas-turno', turnoId],
    queryFn: () => fetchVentasDelTurno(turnoId!),
    enabled: turnoId != null,
  });
}

export function useMesasPendientesDelTurno(turnoId: number | null) {
  return useQuery({
    queryKey: ['mesas-pendientes-turno', turnoId],
    queryFn: () => fetchMesasPendientesDelTurno(turnoId!),
    enabled: turnoId != null,
  });
}

export function useInsumosStockBajo() {
  return useQuery({ queryKey: ['insumos-stock-bajo'], queryFn: fetchInsumosStockBajo });
}
