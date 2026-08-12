import { useEffect, useRef, useState } from 'react';
import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef<string | null>(null);

  function intentar(etq: string, uid: string) {
    setResolviendo(true);
    setError(null);
    resolverTurno(etq, uid)
      .then((turno) => {
        setTurnoId(turno.id);
        setResolviendo(false);
      })
      .catch((e) => {
        // Sin conexión no es lo mismo que "bloqueado por regla de
        // negocio" -- ni siquiera se pudo preguntar. El banner de "sin
        // conexión" ya avisa de esto; no hace falta además mostrar la
        // pantalla de turno bloqueado con un mensaje de red confuso
        // ("Failed to fetch"). Se reintenta solo apenas vuelve la red
        // (ver el efecto de abajo).
        if (!onlineManager.isOnline()) {
          setResolviendo(false);
          return;
        }
        // El error de una llamada RPC de Supabase es un PostgrestError
        // (objeto plano con .message), no necesariamente un Error nativo.
        // El mensaje de la función SQL se muestra tal cual, es un texto
        // pensado para el mozo.
        const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : null;
        setError(msg || 'No se pudo abrir el turno');
        setResolviendo(false);
      });
  }

  useEffect(() => {
    if (!etiqueta || !userId) {
      setResolviendo(false);
      return;
    }
    const clave = `${etiqueta}:${userId}`;
    if (enCurso.current === clave) return;
    enCurso.current = clave;
    intentar(etiqueta, userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etiqueta, userId]);

  useEffect(() => {
    return onlineManager.subscribe((isOnline) => {
      if (isOnline && etiqueta && userId && turnoId == null && !error) {
        intentar(etiqueta, userId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etiqueta, userId, turnoId, error]);

  return {
    turnoId,
    resolviendo,
    error,
    reintentar: () => etiqueta && userId && intentar(etiqueta, userId),
  };
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
