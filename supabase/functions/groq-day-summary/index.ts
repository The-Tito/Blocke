// ============================================================================
// Edge Function: groq-day-summary
// ----------------------------------------------------------------------------
// Recibe las métricas del día y devuelve una observación breve, sin juicio y
// sin gamificación, sobre el patrón del día. Si Groq falla, devuelve una
// observación determinista construida a partir de las mismas métricas.
// ============================================================================

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // más calidad para texto reflexivo

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SummaryRequest {
  blocks_planned: number;
  blocks_completed: number;
  blocks_skipped: number;
  work_effective_min: number;
  work_planned_min: number;
  breaks_respected: number;
  breaks_total: number;
  block_titles?: string[];
}

function parseRequest(body: unknown): SummaryRequest {
  if (typeof body !== 'object' || body === null) throw new Error('Cuerpo inválido');
  const b = body as Record<string, unknown>;
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return {
    blocks_planned: num(b.blocks_planned),
    blocks_completed: num(b.blocks_completed),
    blocks_skipped: num(b.blocks_skipped),
    work_effective_min: num(b.work_effective_min),
    work_planned_min: num(b.work_planned_min),
    breaks_respected: num(b.breaks_respected),
    breaks_total: num(b.breaks_total),
    block_titles: Array.isArray(b.block_titles)
      ? b.block_titles.slice(0, 12).map((t) => String(t))
      : [],
  };
}

// ─── Observación determinista de respaldo ───────────────────────────────────
function fallbackNote(r: SummaryRequest): string {
  const skippedBreaks = r.breaks_total - r.breaks_respected;
  if (r.blocks_completed === 0) {
    return 'Hoy no se completó ningún bloque. Mañana es un buen día para empezar con uno solo, corto, y construir desde ahí.';
  }
  if (skippedBreaks > r.breaks_respected && r.breaks_total > 0) {
    return `Completaste ${r.blocks_completed} de ${r.blocks_planned} bloques, pero saltaste ${skippedBreaks} pausas. Las pausas no son tiempo perdido: sostienen la calidad del trabajo en las últimas horas.`;
  }
  if (r.blocks_completed >= r.blocks_planned) {
    return `Cerraste el día completo: ${r.blocks_completed} bloques y ${r.breaks_respected} pausas respetadas. El plan tuvo forma y lo ejecutaste entero.`;
  }
  return `Completaste ${r.blocks_completed} de ${r.blocks_planned} bloques con ${r.breaks_respected} de ${r.breaks_total} pausas respetadas. Un día con estructura, aunque no perfecto.`;
}

async function callGroq(apiKey: string, r: SummaryRequest): Promise<string | null> {
  const system = [
    'Eres el analista de patrones de Bloque, una app de time blocking.',
    'Escribes UNA observación breve (máximo 2 frases, en español) sobre el día del usuario.',
    'Tono: sereno, concreto, sin juicio, sin gamificación, sin felicitaciones vacías.',
    'No uses emojis. No des consejos genéricos. Señala un patrón observable en los datos.',
    'Responde SOLO JSON: {"note":"..."}',
  ].join('\n');

  const user = [
    `Bloques planeados: ${r.blocks_planned}`,
    `Bloques completados: ${r.blocks_completed}`,
    `Bloques saltados: ${r.blocks_skipped}`,
    `Trabajo efectivo: ${r.work_effective_min} min de ${r.work_planned_min} min planeados`,
    `Pausas respetadas: ${r.breaks_respected} de ${r.breaks_total}`,
    r.block_titles && r.block_titles.length
      ? `Tareas del día: ${r.block_titles.join(', ')}`
      : '',
  ].filter(Boolean).join('\n');

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
        temperature: 0.6,
        max_tokens: 220,
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
    const note = JSON.parse(content)?.note;
    return typeof note === 'string' && note.trim() ? note.trim() : null;
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (httpReq) => {
  if (httpReq.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (httpReq.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const r = parseRequest(await httpReq.json());
    const apiKey = Deno.env.get('GROQ_API_KEY');

    let note: string | null = null;
    let source: 'groq' | 'fallback' = 'fallback';

    if (apiKey) {
      note = await callGroq(apiKey, r);
      if (note) source = 'groq';
    }
    if (!note) note = fallbackNote(r);

    return new Response(JSON.stringify({ note, source }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
