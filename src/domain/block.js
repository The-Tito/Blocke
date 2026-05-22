/**
 * domain/block — entidad Bloque y sus reglas de validación.
 *
 * Un bloque tiene tres datos que captura el usuario: qué va a hacer (título),
 * el tipo de trabajo y la duración. El resto (segment_plan, horarios, estado)
 * lo derivan la IA y el motor de planeación.
 */

import { WORK_TYPES } from './workTypes.js';

/** Duraciones ofrecidas como atajo en el modal de "nuevo bloque". */
export const DURATION_PRESETS = [30, 45, 60, 90, 120];

export const MIN_DURATION = 5;
export const MAX_DURATION = 480;
export const MAX_TITLE = 200;

/** Estados posibles de un bloque. */
export const BLOCK_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  DONE: 'done',
  SKIPPED: 'skipped',
});

/**
 * Valida la entrada del usuario para crear/editar un bloque.
 * @returns {{ ok: true, value: {title:string, workType:string, durationMin:number} }
 *          | { ok: false, errors: Record<string,string> }}
 */
export function validateBlockInput({ title, workType, durationMin }) {
  const errors = {};
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (!cleanTitle) errors.title = 'Escribe qué vas a hacer.';
  else if (cleanTitle.length > MAX_TITLE) errors.title = `Máximo ${MAX_TITLE} caracteres.`;

  const validType = WORK_TYPES.some((t) => t.id === workType);
  if (!validType) errors.workType = 'Elige un tipo de trabajo.';

  const dur = Number(durationMin);
  if (!Number.isFinite(dur) || dur < MIN_DURATION || dur > MAX_DURATION) {
    errors.durationMin = `La duración debe estar entre ${MIN_DURATION} y ${MAX_DURATION} minutos.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { title: cleanTitle, workType, durationMin: Math.round(dur) } };
}

/** Un bloque cuenta como "terminado" (no vuelve a la cola de ejecución). */
export function isBlockFinished(block) {
  return block?.status === BLOCK_STATUS.DONE || block?.status === BLOCK_STATUS.SKIPPED;
}

/** El primer bloque pendiente del día (siguiente a ejecutar). */
export function nextRunnableBlock(blocks) {
  return [...(blocks ?? [])]
    .sort((a, b) => a.position - b.position)
    .find((b) => b.status === BLOCK_STATUS.PENDING || b.status === BLOCK_STATUS.ACTIVE);
}
