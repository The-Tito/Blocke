/**
 * domain/dictation — parseo de lenguaje natural a borradores de bloque.
 *
 * El usuario "dicta" sus actividades del día de corrido (voz o texto), p. ej.
 * "trabajo en páginas web 2 horas, reunión con el equipo 30 minutos". Este
 * módulo es PURO: convierte ese texto en borradores `{ title, workType,
 * durationMin }` —la misma forma que consume `validateBlockInput`— y normaliza
 * los borradores que devuelve la IA.
 *
 * `parseDictationText` es además el respaldo determinista de cliente: si la
 * Edge Function `groq-parse-activities` no está disponible, el dictado sigue
 * funcionando con reglas locales.
 */
import { WORK_TYPES } from './workTypes.js';
import { MIN_DURATION, MAX_DURATION, MAX_TITLE, normalizeFixedStart } from './block.js';

/** Límite de caracteres del dictado (también se valida en el servidor). */
export const MAX_DICTATION_CHARS = 1000;

/** Duración por defecto si el fragmento no menciona ninguna. */
const DEFAULT_DURATION_MIN = 60;

/**
 * Palabras clave → id de WORK_TYPES. El orden importa: la primera que aparezca
 * en el fragmento gana. Sin coincidencia se usa el primer tipo del catálogo.
 */
const KEYWORD_TO_TYPE = [
  [/\b(c[oó]digo|codear|programar|programaci[oó]n|desarroll|backend|frontend|bug|deploy)/i, 'codigo'],
  [/\b(reuni[oó]n|junta|meeting|llamada|call|1:1|standup|sync)/i, 'reunion'],
  [/\b(escrib|redact|escritura|documenta|art[ií]culo|post|ensayo|guion|gui[oó]n)/i, 'escritura'],
  [/\b(dise[ñn]|figma|maqueta|wireframe|ui|ux|prototip)/i, 'diseno'],
  [/\b(le[ae]r|lectura|estudi|investig|research)/i, 'lectura'],
  [/\b(edita|edici[oó]n|montaje|retoc|corregir)/i, 'edicion'],
  [/\b(graba|grabaci[oó]n|filmar|rodar|podcast|video)/i, 'grabacion'],
  [/\b(admin|correo|email|mail|factura|tr[aá]mite|gesti[oó]n|papele)/i, 'admin'],
];

/** Conectores/preposiciones a podar de los bordes del título. */
const TITLE_EDGE_WORDS = /^(de|del|la|el|los|las|un|una|y|e|tarea|actividad|hacer|trabajar?\s+en)\s+|\s+(de|del|la|el|y|e|por|durante)$/gi;

/** Separa el dictado en fragmentos, uno por actividad. El " y " no separa cuando
 *  forma parte de "hora y media" (lookahead que excluye "media"). */
function splitFragments(text) {
  return text
    .split(/\n|,|;|·|•|\.\s|\s+\by\b\s+(?!media\b)|\s+\be\b\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extrae los minutos de duración de un fragmento y devuelve también el texto
 * sin esa parte. Reconoce: "2 horas", "1h", "90 min/minutos", "media hora",
 * "hora y media", "1 hora 30", "1 hora y media".
 * @returns {{ durationMin: number|null, rest: string }}
 */
function extractDuration(fragment) {
  let rest = fragment;
  let total = 0;
  let matched = false;

  // "media hora" / "hora y media"
  if (/\bhora\s+y\s+media\b/i.test(rest)) {
    total += 90;
    matched = true;
    rest = rest.replace(/\bhora\s+y\s+media\b/i, ' ');
  } else if (/\bmedia\s+hora\b/i.test(rest)) {
    total += 30;
    matched = true;
    rest = rest.replace(/\bmedia\s+hora\b/i, ' ');
  }

  // Horas: "2 horas", "1.5 h", "2hrs"
  const hourRe = /(\d+(?:[.,]\d+)?)\s*(?:horas?|hrs?|h)\b/gi;
  let m;
  while ((m = hourRe.exec(rest)) !== null) {
    total += Math.round(parseFloat(m[1].replace(',', '.')) * 60);
    matched = true;
  }
  rest = rest.replace(hourRe, ' ');

  // Minutos: "30 minutos", "45 min", "20m"
  const minRe = /(\d+)\s*(?:minutos?|mins?|m)\b/gi;
  while ((m = minRe.exec(rest)) !== null) {
    total += parseInt(m[1], 10);
    matched = true;
  }
  rest = rest.replace(minRe, ' ');

  return {
    durationMin: matched && total > 0 ? total : null,
    rest: rest.replace(/\s+/g, ' ').trim(),
  };
}

/**
 * Extrae una hora de inicio explícita del fragmento y devuelve el texto sin ella.
 * Requiere un marcador claro ("a las…", o sufijo am/pm/"de la mañana") para no
 * confundir números sueltos con horas. Devuelve la hora en formato "HH:MM" 24h.
 * @returns {{ fixedStart: string|null, rest: string }}
 */
function extractFixedStart(fragment) {
  // Forma con prefijo: "a las 10", "a las 10:30", "a la 1 pm", "a las 8 de la tarde".
  const prefix = /\ba\s+la(?:s)?\s+(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?|de\s+la\s+ma(?:ñ|n)ana|de\s+la\s+tarde|de\s+la\s+noche)?/i;
  // Forma con sufijo am/pm sin "a las": "10am", "3 pm".
  const suffix = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)\b/i;

  const m = fragment.match(prefix) ?? fragment.match(suffix);
  if (!m) return { fixedStart: null, rest: fragment };

  let hour = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const marker = (m[3] ?? '').toLowerCase();
  const isPm = /p\.?\s?m\.?|tarde|noche/.test(marker);
  const isAm = /a\.?\s?m\.?|ma(ñ|n)ana/.test(marker);
  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;
  if (hour > 23 || min > 59) return { fixedStart: null, rest: fragment };

  const fixedStart = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  return { fixedStart, rest: fragment.replace(m[0], ' ').replace(/\s+/g, ' ').trim() };
}

/** Mapea un fragmento a un id de WORK_TYPES por palabras clave. */
function detectWorkType(fragment) {
  for (const [re, id] of KEYWORD_TO_TYPE) {
    if (re.test(fragment)) return id;
  }
  return WORK_TYPES[0].id;
}

/** Limpia el título: poda conectores de los bordes y capitaliza. */
function cleanTitle(text) {
  let t = text.replace(TITLE_EDGE_WORDS, '').replace(/\s+/g, ' ').trim();
  if (t.length > MAX_TITLE) t = t.slice(0, MAX_TITLE).trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Convierte texto dictado en borradores de bloque (respaldo determinista).
 * @param {string} text
 * @returns {{ title: string, workType: string, durationMin: number }[]}
 */
export function parseDictationText(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  const fragments = splitFragments(text.slice(0, MAX_DICTATION_CHARS));
  const drafts = [];
  for (const frag of fragments) {
    const workType = detectWorkType(frag);
    const { fixedStart, rest: afterTime } = extractFixedStart(frag);
    const { durationMin, rest } = extractDuration(afterTime);
    const title = cleanTitle(rest || afterTime || frag);
    if (!title) continue;
    drafts.push({
      title,
      workType,
      durationMin: clampDuration(durationMin ?? DEFAULT_DURATION_MIN),
      fixedStart,
    });
  }
  return drafts;
}

/** Acota una duración a [MIN_DURATION, MAX_DURATION]; redondea al entero. */
function clampDuration(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_DURATION_MIN;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, n));
}

/**
 * Sanea la lista de borradores que devuelve la IA (o el parser local) para que
 * todos sean válidos antes de mostrarlos en la vista previa.
 * @param {unknown} rawDrafts
 * @returns {{ title: string, workType: string, durationMin: number }[]}
 */
export function normalizeDrafts(rawDrafts) {
  if (!Array.isArray(rawDrafts)) return [];
  const validTypeIds = new Set(WORK_TYPES.map((t) => t.id));
  const byLabel = new Map(WORK_TYPES.map((t) => [t.label.toLowerCase(), t.id]));

  return rawDrafts
    .map((d) => {
      const title = typeof d?.title === 'string' ? d.title.trim().slice(0, MAX_TITLE) : '';
      if (!title) return null;
      // Acepta tanto id ("codigo") como etiqueta ("Código") de la IA.
      const raw = typeof d?.workType === 'string' ? d.workType : String(d?.work_type ?? '');
      let workType = raw.trim();
      if (!validTypeIds.has(workType)) workType = byLabel.get(workType.toLowerCase()) ?? WORK_TYPES[0].id;
      const durationMin = clampDuration(d?.durationMin ?? d?.duration_min ?? DEFAULT_DURATION_MIN);
      const fixedStart = normalizeFixedStart(d?.fixedStart ?? d?.fixed_start ?? null);
      return { title, workType, durationMin, fixedStart };
    })
    .filter(Boolean);
}
