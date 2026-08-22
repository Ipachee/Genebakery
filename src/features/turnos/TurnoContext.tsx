import { createContext, type ReactNode } from 'react';
import { useAuth } from '../../auth/useAuth';
import { etiquetaPorEmail } from '../auth/accounts';
import { useFacturadoTurno, useResolverTurno, useTurno, useTurnoAbierto } from './hooks';
import type { Database } from '../../lib/supabase/types';

type Turno = Database['public']['Tables']['turnos']['Row'];

type TurnoContextValue = {
  turno: Turno | null;
  facturado: number;
  loading: boolean;
  error: string | null;
  reintentar: () => void;
  reabrirTurno: () => void;
};

export const TurnoContext = createContext<TurnoContextValue | undefined>(undefined);

export function TurnoProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  // Admin y encargado no tienen turno propio (ninguno es "mozo de turno") --
  // ambos se enganchan al turno que ya esté abierto en vez de resolver el
  // suyo.
  const usaTurnoAbierto = profile?.rol === 'admin' || profile?.rol === 'encargado';
  const etiqueta = profile?.rol === 'mozo' ? etiquetaPorEmail(session?.user.email) : null;
  const userId = session?.user.id ?? null;

  const { turnoId: turnoIdMozo, resolviendo, error, reintentar } = useResolverTurno(etiqueta, userId);
  // Ninguno de los dos abre turno propio -- se enganchan al que ya esté
  // abierto (si hay uno) para poder cobrar/tomar pedidos sin tener que
  // "volver a mi cuenta" de un mozo. Como fn_resolver_turno nunca deja más
  // de un turno abierto a la vez, esto es inequívoco.
  const { data: turnoAbierto, isLoading: buscandoAbierto } = useTurnoAbierto(usaTurnoAbierto);
  const turnoId = usaTurnoAbierto ? (turnoAbierto?.id ?? null) : turnoIdMozo;

  const { data: turno, isLoading: cargandoTurno } = useTurno(turnoId);
  const { data: facturado = 0 } = useFacturadoTurno(turnoId);

  const value: TurnoContextValue = {
    turno: turno ?? null,
    facturado,
    loading: usaTurnoAbierto ? buscandoAbierto || cargandoTurno : etiqueta != null && (resolviendo || cargandoTurno),
    // El error de fn_resolver_turno es específico de mozo (regla de "un
    // turno a la vez" al intentar abrir el propio); para admin, no tener
    // turno abierto no es un error -- solo significa que Salón/Comandera
    // van a mostrar su propio EmptyState hasta que alguien abra uno.
    error: usaTurnoAbierto ? null : error,
    reintentar,
    // "Reabrir" pasa de nuevo por fn_resolver_turno (mismo camino que al
    // loguearse) -- así respeta las mismas reglas de negocio (un turno
    // abierto a la vez, ventana horaria) en vez de reabrir con un update
    // directo que se las saltea.
    reabrirTurno: reintentar,
  };

  return <TurnoContext.Provider value={value}>{children}</TurnoContext.Provider>;
}
