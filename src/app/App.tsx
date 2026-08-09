import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { RequireRole } from '../auth/RequireRole';
import { LoginScreen } from '../features/auth/LoginScreen';
import { SalonView } from '../features/salon/components/SalonView';
import { AdminPanel } from '../features/admin/AdminPanel';
import { TurnoProvider } from '../features/turnos/TurnoContext';
import { TurnoBadge } from '../features/turnos/components/TurnoBadge';

export function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <p style={{ padding: 24 }}>Cargando…</p>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <TurnoProvider>
      <Shell />
    </TurnoProvider>
  );
}

function Shell() {
  const { session, profile, signOut } = useAuth();
  const [vista, setVista] = useState<'salon' | 'admin'>('salon');

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
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <strong>☕ ComandaCafé</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13 }}>
          <span>
            {profile?.nombre ?? session?.user.email} · {profile?.rol ?? '…'}
          </span>
          <RequireRole rol="admin">
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setVista('salon')} style={tabBtn(vista === 'salon')}>
                Salón
              </button>
              <button onClick={() => setVista('admin')} style={tabBtn(vista === 'admin')}>
                Administración
              </button>
            </div>
          </RequireRole>
          <TurnoBadge />
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
        {vista === 'admin' && profile?.rol === 'admin' ? <AdminPanel /> : <SalonView />}
      </main>
    </div>
  );
}

function tabBtn(activo: boolean): React.CSSProperties {
  return {
    padding: '5px 10px',
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.35)',
    background: activo ? 'rgba(255,255,255,0.18)' : 'transparent',
    color: '#fff',
    fontSize: 12,
  };
}
