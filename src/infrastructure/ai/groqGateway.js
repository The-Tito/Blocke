/**
 * infrastructure/ai/groqGateway — adaptador del motor de IA.
 *
 * Implementa el puerto AiGateway. Habla con las Edge Functions de Supabase, que
 * a su vez llaman a Groq con la GROQ_API_KEY (secret del servidor). El navegador
 * NUNCA ve esa clave.
 *
 * Cada función ya devuelve un fallback determinista propio si Groq falla; este
 * adaptador añade un último respaldo de cliente por si la red cae por completo.
 */
import { supabase } from '../supabase/client.js';
import { clientFallbackPlan, normalizeSegmentPlan } from '../../domain/segmentPlan.js';

export const groqGateway = {
  /**
   * Calcula el plan de segmentos de un bloque.
   * @returns {Promise<{ plan: import('../../domain/segmentPlan.js').SegmentPlan,
   *                      source: 'groq'|'fallback'|'offline' }>}
   */
  async generateSegmentPlan({ workTypeLabel, workTypeId, durationMin, scheduledStart, accumulatedWorkMin }) {
    try {
      const { data, error } = await supabase.functions.invoke('groq-segment-plan', {
        body: {
          work_type: workTypeLabel,
          duration_min: durationMin,
          scheduled_start: scheduledStart ?? null,
          accumulated_work_min: accumulatedWorkMin ?? 0,
        },
      });
      if (error) throw error;
      return {
        plan: normalizeSegmentPlan({ segments: data?.segments }),
        source: data?.source === 'groq' ? 'groq' : 'fallback',
      };
    } catch (_e) {
      // Red caída: respaldo local para que planear nunca se bloquee.
      return { plan: clientFallbackPlan(workTypeId, durationMin), source: 'offline' };
    }
  },

  /**
   * Genera la observación del resumen del día.
   * @returns {Promise<{ note: string, source: 'groq'|'fallback'|'offline' }>}
   */
  async generateDaySummary(metrics) {
    try {
      const { data, error } = await supabase.functions.invoke('groq-day-summary', {
        body: {
          blocks_planned: metrics.blocksPlanned,
          blocks_completed: metrics.blocksCompleted,
          blocks_skipped: metrics.blocksSkipped,
          work_effective_min: metrics.workEffectiveMin,
          work_planned_min: metrics.workPlannedMin,
          breaks_respected: metrics.breaksRespected,
          breaks_total: metrics.breaksTotal,
          block_titles: metrics.blockTitles ?? [],
        },
      });
      if (error) throw error;
      return {
        note: data?.note ?? 'El día quedó cerrado.',
        source: data?.source === 'groq' ? 'groq' : 'fallback',
      };
    } catch (_e) {
      return {
        note: `Completaste ${metrics.blocksCompleted} de ${metrics.blocksPlanned} bloques.`,
        source: 'offline',
      };
    }
  },
};
