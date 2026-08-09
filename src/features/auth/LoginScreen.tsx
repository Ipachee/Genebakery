import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError(error);
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 32,
          width: 320,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <h1 style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--brown-dark)' }}>
          ☕ ComandaCafé
        </h1>
        <p style={{ margin: '0 0 12px', color: 'var(--text-dim)', fontSize: 13 }}>
          Ingresá con tu usuario
        </p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 4, border: '1px solid var(--border)' }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 4, border: '1px solid var(--border)' }}
        />
        {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: 10,
            borderRadius: 4,
            border: 'none',
            background: 'var(--terracota)',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
