/**
 * domain/daySummary — cálculo puro de las métricas del día.
 *
 * Datos limpios, sin gamificación: lo justo para que el usuario sienta que el
 * día tuvo forma y pueda aprender algo simple sobre sus hábitos.
 */
import { BLOCK_STATUS } from './block.js';

/**
 * @param {object[]} blocks  bloques del día
 * @param {object[]} breaks  microdescansos de esos bloques
 * @returns métricas agregadas del día
 */
export function computeDayMetrics(blocks, breaks) {
  const list = blocks ?? [];
  const completed = list.filter((b) => b.status === BLOCK_STATUS.DONE);
  const skipped = list.filter((b) => b.status === BLOCK_STATUS.SKIPPED);

  const workEffectiveMin = Math.round(
    completed.reduce((a, b) => a + (b.actual_work_sec ?? 0), 0) / 60,
  );
  const workPlannedMin = list.reduce((a, b) => a + (b.duration_min ?? 0), 0);

  const resolvedBreaks = (breaks ?? []).filter((b) => b.status !== 'pending');
  const breaksRespected = resolvedBreaks.filter((b) => b.status === 'respected').length;
  const breaksSkipped = resolvedBreaks.filter((b) => b.status === 'skipped').length;

  const longestBlockMin = list.reduce((max, b) => Math.max(max, b.duration_min ?? 0), 0);

  return {
    blocksPlanned: list.length,
    blocksCompleted: completed.length,
    blocksSkipped: skipped.length,
    workEffectiveMin,
    workPlannedMin,
    breaksRespected,
    breaksSkipped,
    breaksTotal: resolvedBreaks.length,
    longestBlockMin,
    blockTitles: list.map((b) => b.title),
  };
}
