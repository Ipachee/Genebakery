import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cerrarTurno,
  enviarResumenPorMail,
  fetchFacturadoTurno,
  fetchInsumosStockBajo,
  fetchMesasPendientesDelTurno,
  fetchTurnoPorId,
  fetchTurnosPublico,
  fetchVentasDelTurno,
  reabrirTurno,
  resolverTurno,
} from './api';

export function useTurnosPublico() {
  return useQuery({
    queryKey: ['turnos-publico'],
    queryFn: fetchTurnosPublico,
    refetchInterval: 15000,
  });
}

/**
 * Al loguearse un mozo: retoma el turno si ya está abierto, lo reabre si lo
 * cerraron hoy mismo (por error), o arranca uno nuevo en $0 si el último
 * cierre fue otro día — sin importar la hora en la que se loguee.
 *
 * Todo el "leer, decidir, escribir" vive en una funcion SQL atomica
 * (fn_resolver_turno) con un lock por etiqueta -- si este hook se dispara
 * dos veces casi al mismo tiempo (por ejemplo, el candado de admin
 * remonta el arbol de React al cambiar de sesion), la segunda llamada
 * espera a la primera y retoma el mismo turno en vez de crear uno nuevo.
 */
export function useResolverTurno(etiqueta: string | null, userId: string | null) {
  const [turnoId, setTurnoId] = useState<number | null>(null);
  const [resolviendo, setResolviendo] = useState(true);
  const enCurso = useRef<string | null>(null);

  useEffect(() => {
    if (!etiqueta || !userId) {
      setResolviendo(false);
      return;
    }
    const clave = `${etiqueta}:${userId}`;
    if (enCurso.current === clave && turnoId != null) return;
    enCurso.current = clave;
    setResolviendo(true);

    resolverTurno(etiqueta, userId).then((turno) => {
      setTurnoId(turno.id);
      setResolviendo(false);
    });
  }, [etiqueta, userId, turnoId]);

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

export function useEnviarResumenPorMail() {
  return useMutation({ mutationFn: enviarResumenPorMail });
}
