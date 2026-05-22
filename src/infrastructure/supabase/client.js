/**
 * infrastructure/supabase/client — instancia única del cliente Supabase.
 *
 * Las credenciales vienen de variables de entorno de Vite. La anon key es
 * pública por diseño: es segura de exponer PORQUE todas las tablas tienen RLS.
 * La GROQ_API_KEY nunca está aquí; vive como secret de las Edge Functions.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fallar ruidosamente en desarrollo: sin credenciales la app no funciona.
  console.error(
    '[Bloque] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y rellena los valores.',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = Boolean(url && anonKey);
