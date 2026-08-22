export const CUENTAS = [
  { id: 'admin', icon: '🔑', label: 'Admin', email: 'admin@comandacafe.local', rol: 'admin' as const },
  {
    id: 'manana',
    icon: '☀️',
    label: 'Turno Mañana',
    email: 'manana@comandacafe.local',
    rol: 'mozo' as const,
    etiqueta: 'Mañana',
  },
  {
    id: 'tarde',
    icon: '🌙',
    label: 'Turno Tarde',
    email: 'tarde@comandacafe.local',
    rol: 'mozo' as const,
    etiqueta: 'Tarde',
  },
  {
    id: 'noche',
    icon: '🍽️',
    label: 'Turno Noche',
    email: 'noche@comandacafe.local',
    rol: 'mozo' as const,
    etiqueta: 'Noche',
  },
  // Sin `etiqueta` a propósito -- no es un turno con horario fijo como los
  // de arriba. El label de acá es solo el default: LoginScreen lo pisa con
  // roles_personalizados.etiqueta si está cargado, para que se pueda
  // renombrar sin tocar código (ver migración 20260822020000).
  {
    id: 'encargado',
    icon: '🗂️',
    label: 'Encargado',
    email: 'encargado@comandacafe.local',
    rol: 'encargado' as const,
  },
] as const;

export function etiquetaPorEmail(email: string | undefined | null): string | null {
  const cuenta = CUENTAS.find((c) => c.email === email);
  return cuenta && 'etiqueta' in cuenta ? cuenta.etiqueta : null;
}
