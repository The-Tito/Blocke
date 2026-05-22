/**
 * infrastructure/supabase/profileRepository — acceso a la tabla `profiles`.
 * Implementa el puerto ProfileRepository.
 */
import { supabase } from './client.js';

export const profileRepository = {
  /** Perfil del usuario actual. RLS garantiza que solo se vea el propio. */
  async get(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  /** Actualiza preferencias del perfil. */
  async update(userId, patch) {
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};
