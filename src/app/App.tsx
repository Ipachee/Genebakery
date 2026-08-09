import { useAuth } from '../auth/useAuth';
import { RequireRole } from '../auth/RequireRole';
import { LoginScreen } from '../features/auth/LoginScreen';
import { SalonView } from '../features/salon/components/SalonView';

export function App() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return <p style={{ padding: 24 }}>Cargando…</p>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'var(--brown-dark)',
          color: '#fff',
        }}
      >
        <strong>☕ ComandaCafé</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
          <span>
            {profile?.nombre ?? session.user.email} · {profile?.rol ?? '…'}
          </span>
          <RequireRole rol="admin">
            <span style={{ opacity: 0.7 }}>panel admin (próximamente)</span>
          </RequireRole>
          <button
            onClick={signOut}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff',
              borderRadius: 4,
              padding: '6px 10px',
            }}
          >
            Salir
          </button>
        </div>
      </header>
      <main style={{ padding: 20 }}>
        <SalonView />
      </main>
    </div>
  );
}
