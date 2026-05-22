/**
 * domain/timeline — reglas de la línea del día.
 *
 * Bloque es opinionado: agenda los bloques en orden, de forma contigua, desde
 * el inicio de la ventana de trabajo del usuario, y NO deja planear más horas
 * de las que hay disponibles en el día.
 */

import { timeToMinutes, minutesToTime } from '../lib/time.js';

/** Minutos disponibles en la ventana de trabajo. */
export function windowMinutes(workWindowStart, workWindowEnd) {
  return Math.max(0, timeToMinutes(workWindowEnd) - timeToMinutes(workWindowStart));
}

/** Minutos ya asignados por una lista de bloques. */
export function assignedMinutes(blocks) {
  return (blocks ?? []).reduce((a, b) => a + (b.duration_min ?? b.durationMin ?? 0), 0);
}

/**
 * Calcula scheduled_start / scheduled_end de cada bloque, en orden de posición,
 * de forma contigua desde el inicio de la ventana de trabajo.
 * @returns {Array<{ ...block, position:number, scheduled_start:string, scheduled_end:string }>}
 */
export function scheduleBlocks(blocks, workWindowStart) {
  let cursor = timeToMinutes(workWindowStart);
  return [...(blocks ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((b, i) => {
      const duration = b.duration_min ?? b.durationMin ?? 0;
      const start = cursor;
      const end = cursor + duration;
      cursor = end;
      return {
        ...b,
        position: i,
        scheduled_start: minutesToTime(start),
        scheduled_end: minutesToTime(end),
      };
    });
}

/**
 * ¿Cabe un bloque nuevo de `durationMin` minutos sin sobrepasar la ventana?
 */
export function fitsInWindow(blocks, durationMin, workWindowStart, workWindowEnd) {
  const used = assignedMinutes(blocks);
  return used + durationMin <= windowMinutes(workWindowStart, workWindowEnd);
}

/** Minutos libres restantes en el día. */
export function freeMinutes(blocks, workWindowStart, workWindowEnd) {
  return Math.max(0, windowMinutes(workWindowStart, workWindowEnd) - assignedMinutes(blocks));
}

/** Reordena: mueve el bloque en `from` a la posición `to`. */
export function reorder(blocks, from, to) {
  const list = [...blocks].sort((a, b) => a.position - b.position);
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return list;
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  return list.map((b, i) => ({ ...b, position: i }));
}
