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

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // Fallar ruidosamente en desarrollo: sin credenciales la app no funciona.
  console.error(
    '[Bloque] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y rellena los valores.',
  );
}

// `createClient` lanza "supabaseUrl is required" si la URL es vacía, y lo hace
// en tiempo de import —antes de que App pueda mostrar el aviso de configuración,
// dejando la pantalla en blanco. Para no romper el bundle usamos un placeholder
// válido cuando faltan las credenciales: App corta a `MissingEnvNotice` y nunca
// se llega a hacer ninguna petición con este cliente inerte.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

export const supabase = createClient(
  isSupabaseConfigured ? url : PLACEHOLDER_URL,
  isSupabaseConfigured ? anonKey : PLACEHOLDER_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
