/**
 * domain/segmentPlan — estructura y reglas del plan de segmentos.
 *
 * Un plan es una secuencia de segmentos `work` separados por `break`. Lo genera
 * Groq (vía Edge Function) al guardar el bloque. Este módulo es puro: valida la
 * forma del plan, calcula totales y ofrece un respaldo determinista mínimo por
 * si la Edge Function fuera totalmente inalcanzable.
 */

/**
 * @typedef {Object} Segment
 * @property {number} index
 * @property {'work'|'break'} kind
 * @property {number} duration_min
 * @property {string} [activity]
 * @property {string} [rationale]
 */

/**
 * @typedef {Object} SegmentPlan
 * @property {Segment[]} segments
 */

/** Plan vacío válido. */
export const EMPTY_PLAN = { segments: [] };

/** Normaliza y valida un objeto cualquiera como SegmentPlan. */
export function normalizeSegmentPlan(raw) {
  const segments = Array.isArray(raw?.segments) ? raw.segments : [];
  const clean = segments
    .map((s, i) => {
      const kind = s?.kind === 'break' ? 'break' : 'work';
      const duration = Math.round(Number(s?.duration_min));
      if (!Number.isFinite(duration) || duration <= 0) return null;
      return {
        index: i,
        kind,
        duration_min: duration,
        activity: kind === 'break' ? String(s?.activity ?? 'Pausa breve') : undefined,
        rationale: kind === 'break' && s?.rationale ? String(s.rationale) : undefined,
      };
    })
    .filter(Boolean)
    .map((s, i) => ({ ...s, index: i }));
  return { segments: clean };
}

/** Minutos totales de trabajo del plan. */
export function workMinutes(plan) {
  return (plan?.segments ?? [])
    .filter((s) => s.kind === 'work')
    .reduce((a, s) => a + s.duration_min, 0);
}

/** Número de pausas del plan. */
export function breakCount(plan) {
  return (plan?.segments ?? []).filter((s) => s.kind === 'break').length;
}

/** Número de segmentos de trabajo del plan. */
export function workCount(plan) {
  return (plan?.segments ?? []).filter((s) => s.kind === 'work').length;
}

/** Etiqueta corta tipo "4 segmentos · 3 pausas". */
export function planSummaryLabel(plan) {
  const w = workCount(plan);
  const b = breakCount(plan);
  if (w === 0) return 'sin plan';
  if (b === 0) return `${w} segmento${w > 1 ? 's' : ''} · sin pausas`;
  return `${w} segmentos · ${b} pausa${b > 1 ? 's' : ''}`;
}

/**
 * Respaldo determinista de último recurso (cliente). La fuente principal del
 * plan es la Edge Function `groq-segment-plan`; esto solo cubre el caso de que
 * la red falle por completo, para que planear nunca se bloquee.
 */
export function clientFallbackPlan(workTypeId, durationMin) {
  const screenIntense = ['codigo', 'edicion', 'diseno'].includes(workTypeId);
  const lowBreak = ['reunion', 'grabacion'].includes(workTypeId);
  if (lowBreak && durationMin <= 90) {
    return normalizeSegmentPlan({
      segments: [{ kind: 'work', duration_min: durationMin }],
    });
  }
  const workLen = screenIntense ? 25 : 30;
  const screenBreak = {
    activity: 'Mira a 6 metros durante 30 segundos',
    rationale: 'Regla 20-20-20: relaja los músculos ciliares tras el trabajo de pantalla.',
  };
  const cognitiveBreak = {
    activity: 'Mira por la ventana a algo lejano',
    rationale: 'Restauración de atención: estímulos sin esfuerzo recargan la atención dirigida.',
  };
  const brk = screenIntense ? screenBreak : cognitiveBreak;
  const segments = [];
  let remaining = durationMin;
  while (remaining > 0) {
    const work = Math.min(workLen, remaining);
    segments.push({ kind: 'work', duration_min: work });
    remaining -= work;
    if (remaining > 5) segments.push({ kind: 'break', duration_min: 5, ...brk });
  }
  return normalizeSegmentPlan({ segments });
}
