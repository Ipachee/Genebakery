import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import type { Database } from '../lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

// La sesión de mozo que queda "en pausa" mientras se entra como admin
// (entrarComoAdmin) se guarda en localStorage, no en un useRef -- un
// useRef vive solo en memoria, así que se perdía cada vez que se recargaba
// la página (F5, o el botón "Actualizar" de una versión nueva) y el botón
// "Volver a mi turno" desaparecía sin explicación, obligando a cerrar
// sesión y volver a entrar con la clave del turno.
const KEY_SESION_GUARDADA = 'comandacafe-sesion-turno-guardada';

function leerSesionGuardada(): { access_token: string; refresh_token: string } | null {
  try {
    return JSON.parse(localStorage.getItem(KEY_SESION_GUARDADA) ?? 'null');
  } catch {
    return null;
  }
}

function guardarSesion(session: Session) {
  localStorage.setItem(KEY_SESION_GUARDADA, JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }));
}

function borrarSesionGuardada() {
  localStorage.removeItem(KEY_SESION_GUARDADA);
}

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Cambia la sesión activa a la cuenta admin sin perder la sesión actual (mozo). */
  entrarComoAdmin: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null }>;
  /** true mientras hay una sesión de mozo guardada esperando a que se vuelva. */
  puedeVolverATurno: boolean;
  volverATurno: () => Promise<{ error: string | null }>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [puedeVolverATurno, setPuedeVolverATurno] = useState(() => leerSesionGuardada() != null);

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

  async function signIn(email: string, password: string, captchaToken?: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
    return { error: error ? error.message : null };
  }

  async function signOut() {
    borrarSesionGuardada();
    setPuedeVolverATurno(false);
    await supabase.auth.signOut();
  }

  async function entrarComoAdmin(email: string, password: string, captchaToken?: string) {
    if (!session) return { error: 'No hay sesión activa' };
    const sesionActual = session;
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
    if (error) return { error: error.message };
    guardarSesion(sesionActual);
    setPuedeVolverATurno(true);
    return { error: null };
  }

  async function volverATurno() {
    const guardada = leerSesionGuardada();
    if (!guardada) return { error: null };
    // Ojo acá: setSession() con tokens inválidos/vencidos (ej. el respaldo
    // quedó guardado mucho tiempo y el refresh token ya venció) no "falla
    // dejando todo como estaba" -- el cliente de Supabase igual pisa la
    // sesión activa en el momento de intentarlo, así que si el respaldo
    // resultaba inválido, la cuenta que SÍ estaba activa (ej. admin) se
    // cerraba sola sin aviso, quedando deslogueado del todo. Por eso se
    // guarda una copia de la sesión actual ANTES de intentar, para poder
    // restaurarla explícitamente si el intento falla.
    const sesionAntesDeIntentar = session;
    const { error } = await supabase.auth.setSession(guardada);
    if (error) {
      if (sesionAntesDeIntentar) {
        await supabase.auth.setSession({
          access_token: sesionAntesDeIntentar.access_token,
          refresh_token: sesionAntesDeIntentar.refresh_token,
        });
      }
      return { error: error.message };
    }
    borrarSesionGuardada();
    setPuedeVolverATurno(false);
    return { error: null };
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, entrarComoAdmin, puedeVolverATurno, volverATurno }}>
      {children}
    </AuthContext.Provider>
  );
}
