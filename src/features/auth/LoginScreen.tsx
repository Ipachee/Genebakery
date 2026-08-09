import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { CUENTAS as OPCIONES } from './accounts';
import './LoginScreen.css';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <h1 className="login-title">☕ ComandaCafé</h1>
      <p className="login-subtitle">Elegí tu acceso e ingresá la contraseña</p>
      <div className="shift-cards">
        {OPCIONES.map((opcion) => (
          <form key={opcion.id} className="shift-card" onSubmit={(e) => handleSubmit(e, opcion)}>
            <span className="shift-icon">{opcion.icon}</span>
            <span className="shift-name">{opcion.label}</span>
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
