import type { ReactNode } from 'react';
import { useAuth } from './useAuth';

export function RequireRole({
  rol,
  fallback = null,
  children,
}: {
  rol: 'admin' | 'mozo';
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { profile } = useAuth();
  if (rol === 'admin' && profile?.rol !== 'admin') return <>{fallback}</>;
  return <>{children}</>;
}
