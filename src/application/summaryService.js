/**
 * application/summaryService — caso de uso del RESUMEN del día.
 *
 * Calcula las métricas, pide a la IA una observación sobre el patrón del día y
 * cierra el día persistiendo todo.
 */
import { computeDayMetrics } from '../domain/daySummary.js';

/**
 * @param {{ dayRepo: import('./ports.js').DayRepository,
 *           blockRepo: import('./ports.js').BlockRepository,
 *           aiGateway: import('./ports.js').AiGateway }} deps
 */
export function createSummaryService({ dayRepo, blockRepo, aiGateway }) {
  /** Carga bloques + breaks y calcula métricas (sin cerrar el día). */
  async function metricsFor(day) {
    const blocks = await blockRepo.listByDay(day.id);
    const breaks = await blockRepo.listBreaksByBlocks(blocks.map((b) => b.id));
    return { blocks, breaks, metrics: computeDayMetrics(blocks, breaks) };
  }

  return {
    metricsFor,

    /**
     * Cierra el día: calcula métricas, genera la observación de la IA y guarda
     * el estado `closed` con la nota. Idempotente: si ya está cerrado, devuelve
     * lo guardado sin volver a llamar a la IA.
     */
    async closeDay(day) {
      const { blocks, metrics } = await metricsFor(day);
      if (day.status === 'closed' && day.summary_note) {
        return { day, metrics, note: day.summary_note };
      }
      const { note } = await aiGateway.generateDaySummary(metrics);
      const updatedDay = await dayRepo.update(day.id, {
        status: 'closed',
        summary_note: note,
        closed_at: new Date().toISOString(),
      });
      return { day: updatedDay, metrics, note, blocks };
    },
  };
}
