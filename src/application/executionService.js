/**
 * application/executionService — casos de uso de la EJECUCIÓN del día.
 *
 * Maneja las transiciones de estado persistentes: arrancar un bloque, cerrarlo,
 * saltarlo, y resolver microdescansos (respetados / saltados). La lógica del
 * timer en sí es pura y vive en `domain/execution.js`; aquí solo se persiste.
 */
import { BLOCK_STATUS } from '../domain/block.js';

/**
 * @param {{ dayRepo: import('./ports.js').DayRepository,
 *           blockRepo: import('./ports.js').BlockRepository }} deps
 */
export function createExecutionService({ dayRepo, blockRepo }) {
  return {
    /** Arranca un bloque: lo marca activo y pone el día "en curso". */
    async startBlock({ day, block }) {
      const updatedBlock = await blockRepo.update(block.id, {
        status: BLOCK_STATUS.ACTIVE,
        started_at: new Date().toISOString(),
      });
      let updatedDay = day;
      if (day.status !== 'in_progress') {
        updatedDay = await dayRepo.update(day.id, { status: 'in_progress' });
      }
      return { block: updatedBlock, day: updatedDay };
    },

    /** Cierra un bloque como terminado, guardando el trabajo efectivo real. */
    async completeBlock({ blockId, actualWorkSec }) {
      return blockRepo.update(blockId, {
        status: BLOCK_STATUS.DONE,
        completed_at: new Date().toISOString(),
        actual_work_sec: Math.max(0, Math.round(actualWorkSec)),
      });
    },

    /** Marca un bloque como saltado (no se ejecutó). */
    async skipBlock({ blockId }) {
      return blockRepo.update(blockId, {
        status: BLOCK_STATUS.SKIPPED,
        completed_at: new Date().toISOString(),
      });
    },

    /** Registra un microdescanso como respetado o saltado. */
    async resolveBreak({ blockId, segmentIndex, status }) {
      const breaks = await blockRepo.listBreaksByBlock(blockId);
      const target = breaks.find((b) => b.segment_index === segmentIndex);
      if (target && target.status === 'pending') {
        await blockRepo.resolveBreak(target.id, status);
      }
    },
  };
}
