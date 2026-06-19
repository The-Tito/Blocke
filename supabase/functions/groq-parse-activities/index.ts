// ============================================================================
// Edge Function: groq-parse-activities
// ----------------------------------------------------------------------------
// Recibe el texto que el usuario "dicta" (voz o escrito) con las actividades de
// su día y devuelve una lista estructurada de bloques, categorizando cada uno
// por tipo de trabajo y estimando su duración.
//
//   entrada:  { text: "trabajo en páginas web 2 horas, reunión 30 min" }
//   salida:   { activities: [{ title, work_type, duration_min }], source }
//
// La GROQ_API_KEY vive como secret del proyecto y nunca llega al navegador.
// Si Groq falla o no hay key, se usa un parser determinista por reglas, de modo
// que el dictado nunca se queda sin respuesta.
// ============================================================================

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant'; // modelo rápido, baja latencia

const MAX_TEXT_CHARS = 1000; // acota costo/abuso de tokens de Groq
const MIN_DURATION = 5;
const MAX_DURATION = 480;
const MAX_TITLE = 200;
const DEFAULT_DURATION = 60;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Catálogo de tipos de trabajo — espejo de `src/domain/workTypes.js`.
const WORK_TYPES: { id: string; label: string }[] = [
  { id: 'codigo', label: 'Código' },
  { id: 'escritura', label: 'Escritura' },
  { id: 'reunion', label: 'Reunión' },
  { id: 'edicion', label: 'Edición' },
  { id: 'grabacion', label: 'Grabación' },
  { id: 'diseno', label: 'Diseño' },
  { id: 'admin', label: 'Admin' },
  { id: 'lectura', label: 'Lectura' },
];
const VALID_IDS = new Set(WORK_TYPES.map((t) => t.id));
const BY_LABEL = new Map(WORK_TYPES.map((t) => [t.label.toLowerCase(), t.id]));

interface ParseRequest {
  text: string;
}

interface Activity {
  title: string;
  work_type: string; // id de WORK_TYPES
  duration_min: number;
  fixed_start: string | null; // "HH:MM" 24h, o null si no se mencionó hora
}

// ─── Validación de entrada ──────────────────────────────────────────────────
function parseRequest(body: unknown): ParseRequest {
  if (typeof body !== 'object' || body === null) throw new Error('Cuerpo inválido');
  const b = body as Record<string, unknown>;
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  if (!text) throw new Error('text es obligatorio');
  if (text.length > MAX_TEXT_CHARS) throw new Error(`text excede ${MAX_TEXT_CHARS} caracteres`);
  return { text };
}

function clampDuration(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_DURATION;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, n));
}

function coerceWorkType(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (VALID_IDS.has(s)) return s;
  return BY_LABEL.get(s.toLowerCase()) ?? WORK_TYPES[0].id;
}

/** Normaliza una hora a "HH:MM" 24h, o null si es inválida/ausente. */
function normalizeTime(value: unknown): string | null {
  if (value == null || value === '') return null;
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** Extrae una hora explícita ("a las 10am", "3 pm") de un fragmento. */
function extractFixedStart(fragment: string): { fixedStart: string | null; rest: string } {
  const prefix = /\ba\s+la(?:s)?\s+(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?|de\s+la\s+ma(?:ñ|n)ana|de\s+la\s+tarde|de\s+la\s+noche)?/i;
  const suffix = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)\b/i;
  const m = fragment.match(prefix) ?? fragment.match(suffix);
  if (!m) return { fixedStart: null, rest: fragment };
  let hour = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const marker = (m[3] ?? '').toLowerCase();
  if (/p\.?\s?m\.?|tarde|noche/.test(marker) && hour < 12) hour += 12;
  if (/a\.?\s?m\.?|ma(ñ|n)ana/.test(marker) && hour === 12) hour = 0;
  if (hour > 23 || min > 59) return { fixedStart: null, rest: fragment };
  const fixedStart = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  return { fixedStart, rest: fragment.replace(m[0], ' ').replace(/\s+/g, ' ').trim() };
}

// ─── Parser determinista por reglas (fallback) ──────────────────────────────
const KEYWORD_TO_TYPE: [RegExp, string][] = [
  [/\b(c[oó]digo|codear|programar|programaci[oó]n|desarroll|backend|frontend|bug|deploy)/i, 'codigo'],
  [/\b(reuni[oó]n|junta|meeting|llamada|call|standup|sync)/i, 'reunion'],
  [/\b(escrib|redact|escritura|documenta|art[ií]culo|post|ensayo|gui[oó]n)/i, 'escritura'],
  [/\b(dise[ñn]|figma|maqueta|wireframe|ui|ux|prototip)/i, 'diseno'],
  [/\b(le[ae]r|lectura|estudi|investig|research)/i, 'lectura'],
  [/\b(edita|edici[oó]n|montaje|retoc|corregir)/i, 'edicion'],
  [/\b(graba|grabaci[oó]n|filmar|rodar|podcast|video)/i, 'grabacion'],
  [/\b(admin|correo|email|mail|factura|tr[aá]mite|gesti[oó]n|papele)/i, 'admin'],
];

function detectWorkType(fragment: string): string {
  for (const [re, id] of KEYWORD_TO_TYPE) {
    if (re.test(fragment)) return id;
  }
  return WORK_TYPES[0].id;
}

function extractDuration(fragment: string): { durationMin: number | null; rest: string } {
  let rest = fragment;
  let total = 0;
  let matched = false;

  if (/\bhora\s+y\s+media\b/i.test(rest)) {
    total += 90;
    matched = true;
    rest = rest.replace(/\bhora\s+y\s+media\b/i, ' ');
  } else if (/\bmedia\s+hora\b/i.test(rest)) {
    total += 30;
    matched = true;
    rest = rest.replace(/\bmedia\s+hora\b/i, ' ');
  }

  const hourRe = /(\d+(?:[.,]\d+)?)\s*(?:horas?|hrs?|h)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = hourRe.exec(rest)) !== null) {
    total += Math.round(parseFloat(m[1].replace(',', '.')) * 60);
    matched = true;
  }
  rest = rest.replace(hourRe, ' ');

  const minRe = /(\d+)\s*(?:minutos?|mins?|m)\b/gi;
  while ((m = minRe.exec(rest)) !== null) {
    total += parseInt(m[1], 10);
    matched = true;
  }
  rest = rest.replace(minRe, ' ');

  return { durationMin: matched && total > 0 ? total : null, rest: rest.replace(/\s+/g, ' ').trim() };
}

const TITLE_EDGE_WORDS =
  /^(de|del|la|el|los|las|un|una|y|e|tarea|actividad|hacer|trabajar?\s+en)\s+|\s+(de|del|la|el|y|e|por|durante)$/gi;

function cleanTitle(text: string): string {
  let t = text.replace(TITLE_EDGE_WORDS, '').replace(/\s+/g, ' ').trim();
  if (t.length > MAX_TITLE) t = t.slice(0, MAX_TITLE).trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function fallbackParse(text: string): Activity[] {
  const fragments = text
    .split(/\n|,|;|·|•|\.\s|\s+\by\b\s+(?!media\b)|\s+\be\b\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const activities: Activity[] = [];
  for (const frag of fragments) {
    const work_type = detectWorkType(frag);
    const { fixedStart, rest: afterTime } = extractFixedStart(frag);
    const { durationMin, rest } = extractDuration(afterTime);
    const title = cleanTitle(rest || afterTime || frag);
    if (!title) continue;
    activities.push({
      title,
      work_type,
      duration_min: clampDuration(durationMin ?? DEFAULT_DURATION),
      fixed_start: fixedStart,
    });
  }
  return activities;
}

// ─── Normalización / validación de la respuesta de Groq ─────────────────────
function normalizeActivities(raw: unknown): Activity[] | null {
  const obj = raw as Record<string, unknown>;
  const arr = obj?.activities;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const out: Activity[] = [];
  for (const a of arr) {
    const item = a as Record<string, unknown>;
    const title = typeof item.title === 'string' ? item.title.trim().slice(0, MAX_TITLE) : '';
    if (!title) continue;
    out.push({
      title,
      work_type: coerceWorkType(item.work_type),
      duration_min: clampDuration(item.duration_min),
      fixed_start: normalizeTime(item.fixed_start ?? item.start_time),
    });
  }
  return out.length > 0 ? out : null;
}

// ─── Llamada a Groq ─────────────────────────────────────────────────────────
async function callGroq(apiKey: string, req: ParseRequest): Promise<Activity[] | null> {
  const labels = WORK_TYPES.map((t) => `${t.id} (${t.label})`).join(', ');
  const system = [
    'Eres el parser de planeación de Bloque, una app de time blocking.',
    'Recibes el texto donde el usuario describe, de corrido, las actividades que',
    'quiere hacer hoy, y lo conviertes en una lista estructurada de bloques.',
    'Para cada actividad detectas:',
    '- title: una descripción breve y clara en español (sin la duración ni la hora).',
    '- work_type: clasifícala en UNO de estos ids exactos: ' + labels + '.',
    '- duration_min: la duración en minutos (entero, 5 a 480). Interpreta',
    '  "2 horas"=120, "media hora"=30, "hora y media"=90, "45 min"=45.',
    '  Si no se menciona duración, usa 60.',
    '- fixed_start: si se menciona una hora de inicio ("a las 10am", "a las 14:30",',
    '  "3 pm"), conviértela a "HH:MM" en formato 24h. Si NO se menciona hora, usa null.',
    'Reglas:',
    '- Una entrada del usuario puede contener varias actividades (separadas por',
    '  comas, "y", saltos de línea). Devuelve una por cada una.',
    '- work_type DEBE ser uno de los ids listados, nunca inventes otro.',
    'Responde SOLO JSON con esta forma exacta:',
    '{"activities":[{"title":"Trabajo en páginas web","work_type":"codigo","duration_min":120,"fixed_start":"10:00"}]}',
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: req.text },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return null;
    return normalizeActivities(JSON.parse(content));
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────
Deno.serve(async (httpReq) => {
  if (httpReq.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (httpReq.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const req = parseRequest(await httpReq.json());
    const apiKey = Deno.env.get('GROQ_API_KEY');

    let activities: Activity[] | null = null;
    let source: 'groq' | 'fallback' = 'fallback';

    if (apiKey) {
      activities = await callGroq(apiKey, req);
      if (activities) source = 'groq';
    }
    if (!activities) activities = fallbackParse(req.text);

    return new Response(JSON.stringify({ activities, source }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
