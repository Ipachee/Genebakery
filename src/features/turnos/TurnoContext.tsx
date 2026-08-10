import { createContext, type ReactNode } from 'react';
import { useAuth } from '../../auth/useAuth';
import { etiquetaPorEmail } from '../auth/accounts';
import {
  useFacturadoTurno,
  useReabrirTurno,
  useResolverTurno,
  useTurno,
} from './hooks';
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
  const etiqueta = profile?.rol === 'mozo' ? etiquetaPorEmail(session?.user.email) : null;
  const userId = session?.user.id ?? null;

  const { turnoId, resolviendo, error, reintentar } = useResolverTurno(etiqueta, userId);
  const { data: turno, isLoading: cargandoTurno } = useTurno(turnoId);
  const { data: facturado = 0 } = useFacturadoTurno(turnoId);
  const reabrir = useReabrirTurno(turnoId);

  const value: TurnoContextValue = {
    turno: turno ?? null,
    facturado,
    loading: etiqueta != null && (resolviendo || cargandoTurno),
    error,
    reintentar,
    reabrirTurno: () => reabrir.mutate(),
  };

  return <TurnoContext.Provider value={value}>{children}</TurnoContext.Provider>;
}
