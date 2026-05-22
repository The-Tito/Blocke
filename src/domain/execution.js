/**
 * domain/execution — lógica pura del motor de ejecución de un bloque.
 *
 * Un bloque se ejecuta recorriendo su `segment_plan.segments` (lista plana de
 * segmentos work/break). El "run state" es serializable y se persiste para que
 * el timer sobreviva a recargas: el tiempo restante se computa con reloj de
 * pared a partir de `segmentStartedAt`, nunca con un contador en memoria.
 *
 * Este módulo no toca la red, ni el DOM, ni el reloj global: recibe `now`.
 */

/**
 * @typedef {Object} RunState
 * @property {string} blockId
 * @property {string} dayId
 * @property {number} cursor              índice del segmento actual
 * @property {number} segmentStartedAt    epoch ms en que arrancó el segmento
 * @property {boolean} paused
 * @property {number} pausedRemainingMs   restante congelado al pausar
 */

/** Lista plana de segmentos de un bloque. */
export function segmentsOf(block) {
  return block?.segment_plan?.segments ?? [];
}

/** Estado de ejecución inicial para un bloque. */
export function initRunState(block, dayId, now = Date.now()) {
  return {
    blockId: block.id,
    dayId,
    cursor: 0,
    segmentStartedAt: now,
    paused: false,
    pausedRemainingMs: 0,
  };
}

/** Segmento en el cursor actual (o null si ya terminó). */
export function currentSegment(block, run) {
  return segmentsOf(block)[run?.cursor] ?? null;
}

/** Segmento siguiente al cursor (o null). */
export function nextSegment(block, run) {
  return segmentsOf(block)[(run?.cursor ?? 0) + 1] ?? null;
}

/** Duración del segmento en milisegundos. */
export function segmentDurationMs(segment) {
  return (segment?.duration_min ?? 0) * 60 * 1000;
}

/** ¿El recorrido ya pasó el último segmento? */
export function isComplete(block, run) {
  return (run?.cursor ?? 0) >= segmentsOf(block).length;
}

/** Milisegundos restantes del segmento actual. */
export function remainingMs(block, run, now = Date.now()) {
  const seg = currentSegment(block, run);
  if (!seg) return 0;
  if (run.paused) return Math.max(0, run.pausedRemainingMs);
  const elapsed = now - run.segmentStartedAt;
  return Math.max(0, segmentDurationMs(seg) - elapsed);
}

/** ¿Se agotó el segmento actual? */
export function isSegmentOver(block, run, now = Date.now()) {
  return !run.paused && remainingMs(block, run, now) <= 0;
}

/** Avanza al siguiente segmento, reiniciando su reloj. */
export function advance(run, now = Date.now()) {
  return { ...run, cursor: run.cursor + 1, segmentStartedAt: now, paused: false, pausedRemainingMs: 0 };
}

/** Pausa el segmento actual congelando su tiempo restante. */
export function pause(block, run, now = Date.now()) {
  if (run.paused) return run;
  return { ...run, paused: true, pausedRemainingMs: remainingMs(block, run, now) };
}

/** Reanuda desde una pausa, recolocando `segmentStartedAt`. */
export function resume(block, run, now = Date.now()) {
  if (!run.paused) return run;
  const seg = currentSegment(block, run);
  const startedAt = now - (segmentDurationMs(seg) - run.pausedRemainingMs);
  return { ...run, paused: false, segmentStartedAt: startedAt, pausedRemainingMs: 0 };
}

/** Fracción de progreso [0..1] sobre el bloque completo (por tiempo). */
export function blockProgress(block, run, now = Date.now()) {
  const segs = segmentsOf(block);
  const totalMs = segs.reduce((a, s) => a + segmentDurationMs(s), 0);
  if (totalMs === 0) return 0;
  let doneMs = 0;
  for (let i = 0; i < run.cursor && i < segs.length; i += 1) {
    doneMs += segmentDurationMs(segs[i]);
  }
  const seg = currentSegment(block, run);
  if (seg) doneMs += segmentDurationMs(seg) - remainingMs(block, run, now);
  return Math.min(1, doneMs / totalMs);
}

/** Posición legible del segmento de trabajo actual: { current, total }. */
export function workSegmentPosition(block, run) {
  const segs = segmentsOf(block);
  const total = segs.filter((s) => s.kind === 'work').length;
  let current = 0;
  for (let i = 0; i <= run.cursor && i < segs.length; i += 1) {
    if (segs[i].kind === 'work') current += 1;
  }
  return { current: Math.max(1, current), total: Math.max(1, total) };
}
