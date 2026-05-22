/**
 * infrastructure/supabase/dayRepository — acceso a la tabla `days`.
 * Implementa el puerto DayRepository.
 */
import { supabase } from './client.js';

export const dayRepository = {
  /** Día por fecha ("YYYY-MM-DD"), o null si no existe. */
  async getByDate(userId, dateKey) {
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateKey)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  /** Crea el día si no existe; devuelve el existente o el nuevo. */
  async ensure(userId, dateKey) {
    const existing = await this.getByDate(userId, dateKey);
    if (existing) return existing;
    const { data, error } = await supabase
      .from('days')
      .insert({ user_id: userId, date: dateKey, status: 'planning' })
      .select()
      .single();
    if (error) {
      // Carrera: otro proceso lo creó entre el select y el insert.
      if (error.code === '23505') return this.getByDate(userId, dateKey);
      throw new Error(error.message);
    }
    return data;
  },

  /** Actualiza un día (estado, observación de la IA, cierre…). */
  async update(dayId, patch) {
    const { data, error } = await supabase
      .from('days')
      .update(patch)
      .eq('id', dayId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  /** Últimos días (para el panel "esta semana"). */
  async recent(userId, limit = 7) {
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};
