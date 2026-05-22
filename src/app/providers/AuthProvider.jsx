/**
 * app/providers/AuthProvider — estado de autenticación global.
 *
 * Expone la sesión de Supabase y las acciones de auth a toda la app vía
 * contexto. Las páginas y los guardas de ruta consumen `useAuth()`.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { services } from '../services.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    services.auth.getSession().then((s) => {
      if (!active) return;
      setSession(s);
      setLoading(false);
    });
    const unsubscribe = services.auth.onAuthChange((s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: services.auth.signIn,
      signUp: services.auth.signUp,
      signOut: services.auth.signOut,
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook de acceso al estado de autenticación. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
