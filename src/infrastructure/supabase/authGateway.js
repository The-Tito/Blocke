/**
 * infrastructure/supabase/authGateway — adaptador de autenticación.
 *
 * Implementa el "puerto" AuthGateway (ver application/ports.js). Encapsula
 * Supabase Auth para que el resto de la app no dependa del SDK directamente.
 */
import { supabase } from './client.js';

/** Traduce errores de Supabase a mensajes en español, accionables. */
function translateAuthError(error) {
  if (!error) return null;
  const msg = error.message || '';
  if (/invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/already registered/i.test(msg)) return 'Ese correo ya tiene una cuenta.';
  if (/password should be at least/i.test(msg))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (/email not confirmed/i.test(msg)) return 'Confirma tu correo antes de entrar.';
  if (/unable to validate email/i.test(msg)) return 'El correo no es válido.';
  return msg || 'Algo salió mal. Inténtalo de nuevo.';
}

export const authGateway = {
  /** Sesión actual (o null). */
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  },

  /** Suscripción a cambios de sesión. Devuelve una función para desuscribir. */
  onAuthChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session ?? null);
    });
    return () => data.subscription.unsubscribe();
  },

  /** Registro con correo, contraseña y nombre. */
  async signUp({ email, password, fullName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(translateAuthError(error));
    return data.session ?? null;
  },

  /** Inicio de sesión. */
  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateAuthError(error));
    return data.session;
  },

  /** Cierre de sesión. */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(translateAuthError(error));
  },

  /** Envía un correo de recuperación de contraseña. */
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(translateAuthError(error));
  },
};
