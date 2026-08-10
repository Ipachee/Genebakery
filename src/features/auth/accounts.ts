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
] as const;

export function etiquetaPorEmail(email: string | undefined | null): string | null {
  const cuenta = CUENTAS.find((c) => c.email === email);
  return cuenta && 'etiqueta' in cuenta ? cuenta.etiqueta : null;
}
