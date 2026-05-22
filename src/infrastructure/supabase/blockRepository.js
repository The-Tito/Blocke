/**
 * infrastructure/supabase/blockRepository — acceso a las tablas `blocks` y
 * `breaks`. Implementa el puerto BlockRepository.
 */
import { supabase } from './client.js';

export const blockRepository = {
  /** Bloques de un día, ordenados por posición. */
  async listByDay(dayId) {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('day_id', dayId)
      .order('position', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /** Crea un bloque. `user_id` debe ir explícito (lo exige la política RLS). */
  async create(block) {
    const { data, error } = await supabase
      .from('blocks')
      .insert(block)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  /** Actualiza un bloque. */
  async update(blockId, patch) {
    const { data, error } = await supabase
      .from('blocks')
      .update(patch)
      .eq('id', blockId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  /** Elimina un bloque (sus `breaks` se borran en cascada). */
  async remove(blockId) {
    const { error } = await supabase.from('blocks').delete().eq('id', blockId);
    if (error) throw new Error(error.message);
  },

  /** Persiste varias posiciones a la vez (reordenamiento). */
  async savePositions(items) {
    await Promise.all(
      items.map(({ id, position }) =>
        supabase.from('blocks').update({ position }).eq('id', id),
      ),
    );
  },

  // ─── breaks ───────────────────────────────────────────────────────────────

  /** Inserta los registros de microdescanso de un bloque. */
  async createBreaks(rows) {
    if (!rows.length) return [];
    const { data, error } = await supabase.from('breaks').insert(rows).select();
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /** Borra los microdescansos de un bloque (usado al re-editar un bloque). */
  async deleteBreaksByBlock(blockId) {
    const { error } = await supabase.from('breaks').delete().eq('block_id', blockId);
    if (error) throw new Error(error.message);
  },

  /** Microdescansos de un bloque. */
  async listBreaksByBlock(blockId) {
    const { data, error } = await supabase
      .from('breaks')
      .select('*')
      .eq('block_id', blockId)
      .order('segment_index', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /** Todos los microdescansos de varios bloques (resumen del día). */
  async listBreaksByBlocks(blockIds) {
    if (!blockIds.length) return [];
    const { data, error } = await supabase
      .from('breaks')
      .select('*')
      .in('block_id', blockIds);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /** Marca un microdescanso como respetado o saltado. */
  async resolveBreak(breakId, status) {
    const { error } = await supabase
      .from('breaks')
      .update({ status, occurred_at: new Date().toISOString() })
      .eq('id', breakId);
    if (error) throw new Error(error.message);
  },
};
