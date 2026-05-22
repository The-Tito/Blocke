/**
 * domain/workTypes — catálogo de tipos de trabajo.
 *
 * El tipo de trabajo importa: cada uno fatiga sistemas cognitivos y físicos
 * distintos, y eso determina qué clase de microdescanso necesita. El catálogo
 * es extensible (OCP): añadir un tipo no obliga a tocar el resto del código.
 */

/** @typedef {{ id: string, label: string, fatigue: string }} WorkType */

/** @type {WorkType[]} */
export const WORK_TYPES = [
  { id: 'codigo', label: 'Código', fatigue: 'visual' },
  { id: 'escritura', label: 'Escritura', fatigue: 'cognitiva' },
  { id: 'reunion', label: 'Reunión', fatigue: 'social' },
  { id: 'edicion', label: 'Edición', fatigue: 'visual' },
  { id: 'grabacion', label: 'Grabación', fatigue: 'social' },
  { id: 'diseno', label: 'Diseño', fatigue: 'visual' },
  { id: 'admin', label: 'Admin', fatigue: 'cognitiva' },
  { id: 'lectura', label: 'Lectura', fatigue: 'cognitiva' },
];

const BY_LABEL = new Map(WORK_TYPES.map((t) => [t.label, t]));

/** Devuelve un WorkType por su etiqueta, o el primero como respaldo. */
export function workTypeByLabel(label) {
  return BY_LABEL.get(label) ?? WORK_TYPES[0];
}

/** Etiquetas para usar en chips de selección. */
export const WORK_TYPE_LABELS = WORK_TYPES.map((t) => t.label);
