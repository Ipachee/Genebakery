import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import type { Database } from '../lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Cambia la sesión activa a la cuenta admin sin perder la sesión actual (mozo). */
  entrarComoAdmin: (email: string, password: string) => Promise<{ error: string | null }>;
  /** true mientras hay una sesión de mozo guardada esperando a que se vuelva. */
  puedeVolverATurno: boolean;
  volverATurno: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const sesionGuardadaRef = useRef<Session | null>(null);
  const [puedeVolverATurno, setPuedeVolverATurno] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data ?? null);
        setLoading(false);
      });
  }, [session]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }

  async function signOut() {
    sesionGuardadaRef.current = null;
    setPuedeVolverATurno(false);
    await supabase.auth.signOut();
  }

  async function entrarComoAdmin(email: string, password: string) {
    if (!session) return { error: 'No hay sesión activa' };
    const sesionActual = session;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    sesionGuardadaRef.current = sesionActual;
    setPuedeVolverATurno(true);
    return { error: null };
  }

  async function volverATurno() {
    const guardada = sesionGuardadaRef.current;
    if (!guardada) return;
    sesionGuardadaRef.current = null;
    setPuedeVolverATurno(false);
    await supabase.auth.setSession({ access_token: guardada.access_token, refresh_token: guardada.refresh_token });
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, entrarComoAdmin, puedeVolverATurno, volverATurno }}>
      {children}
    </AuthContext.Provider>
  );
}
