import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { CUENTAS } from '../accounts';
import { obtenerTokenTurnstile, turnstileHabilitado } from '../turnstile';

const ADMIN = CUENTAS.find((c) => c.id === 'admin')!;

export function AdminUnlock({ onSuccess }: { onSuccess?: () => void }) {
  const { entrarComoAdmin } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setError(null);
    const captchaToken = turnstileHabilitado() ? await obtenerTokenTurnstile().catch(() => undefined) : undefined;
    const { error } = await entrarComoAdmin(ADMIN.email, password, captchaToken);
    setEntrando(false);
    if (error) {
      setError('Contraseña incorrecta');
    } else {
      setAbierto(false);
      setPassword('');
      onSuccess?.();
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button className="shell-signout" title="Acceso admin" aria-label="Acceso admin" onClick={() => setAbierto((v) => !v)}>
        🔑
      </button>
      {abierto && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setAbierto(false)} />
          <form
            onSubmit={submit}
            className="card card-pad"
            style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              zIndex: 21,
              width: 220,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <span className="field-label">Contraseña de admin</span>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••"
            />
            {error && <span style={{ color: 'var(--red)', fontSize: 11.5 }}>{error}</span>}
            <button type="submit" className="btn btn-primary btn-sm" disabled={entrando || !password}>
              {entrando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
