/**
 * application/planningService — casos de uso de la PLANEACIÓN del día.
 *
 * Orquesta dominio + puertos: validar bloques, llamar a la IA para el plan de
 * microdescansos, agendar la línea del día y persistir. No conoce Supabase ni
 * Groq: recibe los adaptadores por inyección (DIP).
 */
import { validateBlockInput, BLOCK_STATUS } from '../domain/block.js';
import { WORK_TYPES } from '../domain/workTypes.js';
import { normalizeDrafts } from '../domain/dictation.js';
import {
  scheduleBlocks,
  fitsInWindow,
  assignedMinutes,
  reorder as reorderRule,
} from '../domain/timeline.js';

/**
 * @param {{ dayRepo: import('./ports.js').DayRepository,
 *           blockRepo: import('./ports.js').BlockRepository,
 *           aiGateway: import('./ports.js').AiGateway }} deps
 */
export function createPlanningService({ dayRepo, blockRepo, aiGateway }) {
  /** Construye las filas `breaks` a partir del plan de segmentos. */
  function breaksFromPlan(plan, blockId, userId) {
    return plan.segments
      .filter((s) => s.kind === 'break')
      .map((s) => ({
        block_id: blockId,
        user_id: userId,
        segment_index: s.index,
        activity: s.activity ?? 'Pausa breve',
        rationale: s.rationale ?? null,
        duration_sec: s.duration_min * 60,
        status: 'pending',
      }));
  }

  /** Recalcula y persiste horarios + posiciones de todos los bloques del día. */
  async function persistSchedule(blocks, profile) {
    const scheduled = scheduleBlocks(blocks, profile.work_window_start);
    await Promise.all(
      scheduled.map((b) =>
        blockRepo.update(b.id, {
          position: b.position,
          scheduled_start: b.scheduled_start,
          scheduled_end: b.scheduled_end,
        }),
      ),
    );
    return scheduled;
  }

  /**
   * Lógica común para agregar un bloque al día (la usan `addBlock` y el
   * guardado por lotes del dictado). Valida, comprueba la ventana de trabajo,
   * pide el plan de microdescansos a la IA y persiste bloque + pausas.
   */
  async function addOneBlock({ userId, day, input, existingBlocks, profile }) {
    const v = validateBlockInput(input);
    if (!v.ok) return { ok: false, errors: v.errors };
    const { title, workType, durationMin, fixedStart } = v.value;

    if (!fitsInWindow(existingBlocks, durationMin, profile.work_window_start, profile.work_window_end)) {
      return {
        ok: false,
        errors: { durationMin: 'No cabe: superarías tu ventana de trabajo del día.' },
      };
    }

    const wt = WORK_TYPES.find((t) => t.id === workType);
    const position = existingBlocks.length;
    const scheduled = scheduleBlocks(
      [...existingBlocks, { id: '__new__', position, duration_min: durationMin, fixed_start: fixedStart }],
      profile.work_window_start,
    );
    const mine = scheduled.find((b) => b.id === '__new__');

    const { plan, source } = await aiGateway.generateSegmentPlan({
      workTypeLabel: wt.label,
      workTypeId: wt.id,
      durationMin,
      scheduledStart: mine.scheduled_start,
      accumulatedWorkMin: assignedMinutes(existingBlocks),
    });

    const block = await blockRepo.create({
      day_id: day.id,
      user_id: userId,
      position,
      title,
      work_type: wt.label,
      duration_min: durationMin,
      fixed_start: fixedStart,
      scheduled_start: mine.scheduled_start,
      scheduled_end: mine.scheduled_end,
      segment_plan: plan,
      status: BLOCK_STATUS.PENDING,
    });
    await blockRepo.createBreaks(breaksFromPlan(plan, block.id, userId));
    return { ok: true, block, source };
  }

  return {
    /** Carga (creando si hace falta) el día y sus bloques. */
    async loadDay(userId, dateKey) {
      const day = await dayRepo.ensure(userId, dateKey);
      const blocks = await blockRepo.listByDay(day.id);
      return { day, blocks };
    },

    /**
     * Agrega un bloque al día: valida, comprueba que cabe en la ventana de
     * trabajo, pide el plan de microdescansos a la IA y persiste bloque + pausas.
     */
    addBlock: addOneBlock,

    /**
     * Paso 1 del dictado: convierte texto en lenguaje natural a borradores de
     * bloque (la IA los categoriza). NO guarda nada: alimenta la vista previa
     * editable para que el usuario revise antes de confirmar.
     * @returns {Promise<{ ok: boolean, drafts?: object[], source?: string, error?: string }>}
     */
    async parseDictation({ text }) {
      const clean = typeof text === 'string' ? text.trim() : '';
      if (!clean) return { ok: false, error: 'Dicta o escribe al menos una actividad.' };
      const { drafts, source } = await aiGateway.parseDictation(clean);
      const normalized = normalizeDrafts(drafts);
      if (normalized.length === 0) {
        return { ok: false, error: 'No se reconoció ninguna actividad en el texto.' };
      }
      return { ok: true, drafts: normalized, source };
    },

    /**
     * Paso 2 del dictado: guarda los borradores confirmados como bloques. Llama
     * a `addOneBlock` en serie recargando los bloques del día entre inserciones,
     * para que la ventana de trabajo y los horarios se acumulen correctamente.
     * @returns {Promise<{ ok: boolean, created: object[], skipped: {draft, error}[] }>}
     */
    async addBlocksFromDrafts({ userId, day, drafts, profile }) {
      const created = [];
      const skipped = [];
      let existingBlocks = await blockRepo.listByDay(day.id);
      for (const draft of drafts ?? []) {
        const res = await addOneBlock({
          userId,
          day,
          input: draft,
          existingBlocks,
          profile,
        });
        if (res.ok) {
          created.push(res.block);
          existingBlocks = [...existingBlocks, res.block];
        } else {
          const msg = Object.values(res.errors ?? {})[0] ?? 'No se pudo guardar.';
          skipped.push({ draft, error: msg });
        }
      }
      return { ok: created.length > 0, created, skipped };
    },

    /** Edita un bloque: revalida, recalcula el plan de IA y reprograma el día. */
    async editBlock({ userId, blockId, input, allBlocks, profile }) {
      const v = validateBlockInput(input);
      if (!v.ok) return { ok: false, errors: v.errors };
      const { title, workType, durationMin, fixedStart } = v.value;

      const others = allBlocks.filter((b) => b.id !== blockId);
      if (!fitsInWindow(others, durationMin, profile.work_window_start, profile.work_window_end)) {
        return {
          ok: false,
          errors: { durationMin: 'No cabe: superarías tu ventana de trabajo del día.' },
        };
      }

      const wt = WORK_TYPES.find((t) => t.id === workType);
      const target = allBlocks.find((b) => b.id === blockId);
      const merged = allBlocks.map((b) =>
        b.id === blockId ? { ...b, duration_min: durationMin, fixed_start: fixedStart } : b,
      );
      const scheduled = scheduleBlocks(merged, profile.work_window_start);
      const mine = scheduled.find((b) => b.id === blockId);

      const { plan, source } = await aiGateway.generateSegmentPlan({
        workTypeLabel: wt.label,
        workTypeId: wt.id,
        durationMin,
        scheduledStart: mine.scheduled_start,
        accumulatedWorkMin: assignedMinutes(scheduled.filter((b) => b.position < target.position)),
      });

      await blockRepo.update(blockId, {
        title,
        work_type: wt.label,
        duration_min: durationMin,
        fixed_start: fixedStart,
        segment_plan: plan,
      });
      await blockRepo.deleteBreaksByBlock(blockId);
      await blockRepo.createBreaks(breaksFromPlan(plan, blockId, userId));
      await persistSchedule(merged, profile);
      return { ok: true, source };
    },

    /** Elimina un bloque y reprograma el resto del día. */
    async deleteBlock({ blockId, allBlocks, profile }) {
      await blockRepo.remove(blockId);
      const remaining = allBlocks
        .filter((b) => b.id !== blockId)
        .map((b, i) => ({ ...b, position: i }));
      await persistSchedule(remaining, profile);
      return { ok: true };
    },

    /** Reordena un bloque (de la posición `from` a `to`) y reprograma. */
    async reorderBlocks({ allBlocks, from, to, profile }) {
      const reordered = reorderRule(allBlocks, from, to);
      const scheduled = await persistSchedule(reordered, profile);
      return { ok: true, blocks: scheduled };
    },

    /** Marca el plan como listo: el día queda preparado para mañana. */
    async markDayReady(dayId) {
      return dayRepo.update(dayId, { status: 'ready' });
    },
  };
}
