import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useTurnosPublico } from '../turnos/hooks';
import { CUENTAS } from './accounts';

// Admin no se loguea acá — se accede desde adentro de un turno con el
// candadito 🔑 del header, sin perder la sesión de mozo abierta.
const OPCIONES = CUENTAS.filter((c) => c.id !== 'admin');
import './LoginScreen.css';

function useReloj() {
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return ahora;
}

export function LoginScreen() {
  const { signIn } = useAuth();
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ahora = useReloj();
  const { data: turnosPublico } = useTurnosPublico();

  function turnoAbierto(opcion: (typeof OPCIONES)[number]) {
    if (!('etiqueta' in opcion)) return false;
    return turnosPublico?.some((t) => t.etiqueta === opcion.etiqueta && t.estado === 'abierto') ?? false;
  }

  async function handleSubmit(e: FormEvent, opcion: (typeof OPCIONES)[number]) {
    e.preventDefault();
    setError(null);
    setSubmitting(opcion.id);
    const { error } = await signIn(opcion.email, passwords[opcion.id] ?? '');
    setSubmitting(null);
    if (error) setError(`${opcion.label}: contraseña incorrecta`);
  }

  return (
    <div className="login-screen">
      <div className="login-brand">
        <div className="login-mark">☕</div>
        <h1 className="login-title">ComandaCafé</h1>
        <p className="login-subtitle">Elegí tu acceso e ingresá la contraseña</p>
        <span className="login-clock">
          🕐 {ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
          {ahora.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      <div className="shift-cards">
        {OPCIONES.map((opcion) => (
          <form key={opcion.id} className="shift-card" onSubmit={(e) => handleSubmit(e, opcion)}>
            <span className="shift-icon-wrap">
              <span className="shift-icon">{opcion.icon}</span>
            </span>
            <span className="shift-name">{opcion.label}</span>
            {turnoAbierto(opcion) && (
              <span className="shift-status-abierto">
                <span className="shift-status-dot" /> turno abierto
              </span>
            )}
            <input
              type="password"
              placeholder="Contraseña"
              value={passwords[opcion.id] ?? ''}
              onChange={(e) => setPasswords({ ...passwords, [opcion.id]: e.target.value })}
              required
            />
            <button type="submit" disabled={submitting === opcion.id}>
              {submitting === opcion.id ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        ))}
      </div>
      {error && <p className="login-error">{error}</p>}
    </div>
  );
}
