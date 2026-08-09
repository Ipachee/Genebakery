import { useContext } from 'react';
import { TurnoContext } from './TurnoContext';

export function useTurnoActual() {
  const ctx = useContext(TurnoContext);
  if (!ctx) throw new Error('useTurnoActual debe usarse dentro de <TurnoProvider>');
  return ctx;
}
