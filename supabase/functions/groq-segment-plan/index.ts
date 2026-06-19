// ============================================================================
// Edge Function: groq-segment-plan
// ----------------------------------------------------------------------------
// Recibe los datos de un bloque de trabajo y devuelve un plan de segmentos
// work/break calculado por Groq, fundamentado en neurociencia y ergonomía:
//   - Restauración de atención (Kaplan & Kaplan)
//   - Regla 20-20-20 contra la fatiga visual digital
//   - Ergonomía ocupacional: cortar el sedentarismo cada 60-90 min
//
// La GROQ_API_KEY vive como secret del proyecto y nunca llega al navegador.
// Si Groq falla, se devuelve un plan determinista basado en reglas (fallback),
// de modo que la app nunca se queda sin plan.
// ============================================================================

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant'; // modelo rápido, baja latencia

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PlanRequest {
  work_type: string;
  duration_min: number;
  scheduled_start?: string | null;
  accumulated_work_min?: number;
}

interface Segment {
  index: number;
  kind: 'work' | 'break';
  duration_min: number;
  activity?: string;
  rationale?: string;
}

// ─── Validación de entrada ──────────────────────────────────────────────────
function parseRequest(body: unknown): PlanRequest {
  if (typeof body !== 'object' || body === null) throw new Error('Cuerpo inválido');
  const b = body as Record<string, unknown>;
  const work_type = typeof b.work_type === 'string' ? b.work_type.trim() : '';
  const duration_min = Number(b.duration_min);
  if (!work_type) throw new Error('work_type es obligatorio');
  if (!Number.isFinite(duration_min) || duration_min < 5 || duration_min > 480) {
    throw new Error('duration_min debe estar entre 5 y 480');
  }
  return {
    work_type,
    duration_min: Math.round(duration_min),
    scheduled_start: typeof b.scheduled_start === 'string' ? b.scheduled_start : null,
    accumulated_work_min: Number.isFinite(Number(b.accumulated_work_min))
      ? Number(b.accumulated_work_min)
      : 0,
  };
}

// ─── Fallback determinista basado en reglas ─────────────────────────────────
function fallbackPlan(req: PlanRequest): Segment[] {
  const type = req.work_type.toLowerCase();
  const total = req.duration_min;
  const screenIntense = /cod|edi|dise/.test(type);
  const lowBreak = /reuni|grab/.test(type);

  // Reuniones y grabaciones cortas: un solo segmento de trabajo, sin pausas.
  if (lowBreak && total <= 90) {
    return [{ index: 0, kind: 'work', duration_min: total }];
  }

  const workLen = screenIntense ? 25 : 30;
  const breakLen = 5;
  const segments: Segment[] = [];
  let remaining = total;
  let idx = 0;

  // Cada activity es una secuencia con tiempos que SUMA exactamente la duración
  // del descanso (5 min). Así el usuario sabe qué hacer minuto a minuto.
  const screenBreaks = [
    {
      activity:
        'Mira a 6 m · 30 s\nEstiramiento cervical lento · 1 min 30 s\nPonte de pie y camina · 2 min\nRespira lento · 1 min',
      rationale: 'Combina la regla 20-20-20 con un corte postural completo.',
    },
    {
      activity:
        'Cierra los ojos y respira · 1 min\nGira cuello y hombros · 1 min 30 s\nMira a 6 m · 30 s\nBebe agua y camina · 2 min',
      rationale: 'Relaja la vista, libera tensión cervical y reactiva la circulación.',
    },
  ];
  const cognitiveBreaks = [
    {
      activity:
        'Mira por la ventana a algo lejano · 1 min\nCamina sin destino · 2 min\nRespiraciones diafragmáticas · 2 min',
      rationale: 'Restauración de atención (Kaplan): estímulos sin esfuerzo recargan la atención dirigida.',
    },
    {
      activity:
        'Ponte de pie · 30 s\nCamina lento · 2 min 30 s\nEstira espalda y brazos · 1 min\nBebe agua · 1 min',
      rationale: 'El movimiento ligero corta el sedentarismo y recupera función cognitiva.',
    },
    {
      activity:
        'Respira lento 4-7-8 · 2 min\nMira lejos sin enfocar nada · 1 min\nMueve manos y muñecas · 1 min\nLevántate y estira · 1 min',
      rationale: 'Reduce la activación y prepara al sistema nervioso para el siguiente segmento.',
    },
  ];
  const pool = screenIntense ? screenBreaks : cognitiveBreaks;

  while (remaining > 0) {
    const work = Math.min(workLen, remaining);
    segments.push({ index: idx++, kind: 'work', duration_min: work });
    remaining -= work;
    if (remaining > breakLen) {
      const b = pool[(idx >> 1) % pool.length];
      segments.push({
        index: idx++,
        kind: 'break',
        duration_min: breakLen,
        activity: b.activity,
        rationale: b.rationale,
      });
    }
  }
  return segments;
}

// ─── Normalización / validación del plan devuelto por Groq ──────────────────
function normalizePlan(raw: unknown, req: PlanRequest): Segment[] | null {
  const obj = raw as Record<string, unknown>;
  const arr = obj?.segments;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const segments: Segment[] = [];
  let workTotal = 0;
  arr.forEach((s, i) => {
    const seg = s as Record<string, unknown>;
    const kind = seg.kind === 'break' ? 'break' : 'work';
    const dur = Math.round(Number(seg.duration_min));
    if (!Number.isFinite(dur) || dur <= 0) return;
    if (kind === 'work') workTotal += dur;
    segments.push({
      index: i,
      kind,
      duration_min: dur,
      activity: kind === 'break' ? String(seg.activity ?? 'Pausa breve') : undefined,
      rationale: kind === 'break' && seg.rationale ? String(seg.rationale) : undefined,
    });
  });
  // El trabajo total debe parecerse a lo pedido (tolerancia 25%).
  if (segments.length === 0) return null;
  if (Math.abs(workTotal - req.duration_min) > req.duration_min * 0.25) return null;
  return segments;
}

// ─── Llamada a Groq ─────────────────────────────────────────────────────────
async function callGroq(apiKey: string, req: PlanRequest): Promise<Segment[] | null> {
  // Prompt compacto: mismas reglas, menos tokens.
  const system = [
    'Motor de microdescansos de una app de time blocking. Divides un bloque en',
    'segmentos "work" separados por "break", según el tipo de trabajo:',
    '- reunion/grabacion: pocas o ninguna pausa.',
    '- codigo/edicion/diseno: pausas regla 20-20-20 (fatiga visual).',
    '- escritura/lectura/admin: pausas de restauración (mirar lejos, caminar).',
    'Reglas: segmentos work de 20-30 min; pausas de 3-7 min; primero y último son',
    '"work"; suma de minutos work = duración total.',
    '`activity` (solo en break): pasos "Acción · tiempo" separados por "\\n", cuyos',
    'tiempos sumen el duration_min de la pausa (sin tiempo muerto). `rationale`: una',
    'frase con el porqué.',
    'Responde SOLO JSON: {"segments":[{"index":0,"kind":"work","duration_min":25},',
    '{"index":1,"kind":"break","duration_min":5,"activity":"Mira a 6 m · 30 s\\nEstira cuello · 2 min\\nCamina · 1 min 30 s\\nRespira · 1 min","rationale":"..."}]}',
  ].join('\n');

  const user = [
    `Tipo de trabajo: ${req.work_type}`,
    `Duración total del bloque: ${req.duration_min} minutos`,
    `Hora de inicio: ${req.scheduled_start ?? 'sin definir'}`,
    `Trabajo ya acumulado hoy antes de este bloque: ${req.accumulated_work_min} minutos`,
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
        temperature: 0.4,
        max_tokens: 512,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return null;
    return normalizePlan(JSON.parse(content), req);
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

    let segments: Segment[] | null = null;
    let source: 'groq' | 'fallback' = 'fallback';

    if (apiKey) {
      segments = await callGroq(apiKey, req);
      if (segments) source = 'groq';
    }
    if (!segments) segments = fallbackPlan(req);

    return new Response(JSON.stringify({ segments, source }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
