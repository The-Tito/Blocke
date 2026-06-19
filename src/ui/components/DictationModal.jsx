/**
 * ui/components/DictationModal — dictado de actividades del día.
 *
 * Flujo en dos pasos:
 *  1. CAPTURA: el usuario dicta por voz (Web Speech API) o escribe en lenguaje
 *     natural ("trabajo en páginas web 2 horas, reunión 30 min"). Al "Analizar",
 *     la IA (Groq) categoriza y estructura las actividades en borradores.
 *  2. VISTA PREVIA: los borradores se muestran editables (título, tipo, duración)
 *     para que el usuario corrija antes de confirmar. Al guardar, cada borrador
 *     se crea como bloque reutilizando el motor de planeación.
 */
import { useEffect, useState } from 'react';
import { Modal } from './Modal.jsx';
import { Button, Chip, Spinner } from './primitives.jsx';
import { WORK_TYPES } from '../../domain/workTypes.js';
import { MIN_DURATION, MAX_DURATION } from '../../domain/block.js';
import { MAX_DICTATION_CHARS } from '../../domain/dictation.js';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';

const SOURCE_LABEL = { groq: 'IA (Groq)', fallback: 'reglas locales', offline: 'sin conexión' };

export function DictationModal({ open, onClose, onAnalyze, onSave }) {
  const [step, setStep] = useState('capture'); // 'capture' | 'preview'
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [source, setSource] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { supported, listening, interim, error: voiceError, start, stop } = useSpeechRecognition({
    onResult: (finalText) =>
      setText((prev) => (prev ? `${prev} ${finalText}` : finalText).slice(0, MAX_DICTATION_CHARS)),
  });

  // Reinicia el modal cada vez que se abre.
  useEffect(() => {
    if (!open) return;
    setStep('capture');
    setText('');
    setDrafts([]);
    setSource(null);
    setError('');
    setBusy(false);
  }, [open]);

  function close() {
    if (listening) stop();
    onClose();
  }

  async function handleAnalyze() {
    if (listening) stop();
    setBusy(true);
    setError('');
    const res = await onAnalyze(text);
    setBusy(false);
    if (res?.ok) {
      setDrafts(res.drafts);
      setSource(res.source);
      setStep('preview');
    } else {
      setError(res?.error ?? 'No se pudo analizar el dictado.');
    }
  }

  async function handleSave() {
    setBusy(true);
    setError('');
    const res = await onSave(drafts);
    setBusy(false);
    if (res?.ok) {
      if (res.skipped?.length) {
        setError(
          `${res.created.length} bloque(s) creados. ${res.skipped.length} no cupieron en tu ventana de trabajo.`,
        );
        setDrafts(res.skipped.map((s) => s.draft));
      } else {
        close();
      }
    } else {
      setError(res?.error ?? 'No se pudo guardar. Revisa tu ventana de trabajo del día.');
    }
  }

  function updateDraft(i, patch) {
    setDrafts((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }
  function removeDraft(i) {
    setDrafts((ds) => ds.filter((_, idx) => idx !== i));
  }

  return (
    <Modal open={open} onClose={busy ? () => {} : close}>
      <div className="bq-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="bq-meta">dictar el día</div>
          <div className="bq-h2" style={{ fontSize: 24, marginTop: 8 }}>
            {step === 'capture' ? 'Dicta tus actividades' : 'Revisa los bloques'}
          </div>
        </div>
        <span className="bq-meta bq-mono">esc para salir</span>
      </div>

      {step === 'capture' ? (
        <>
          <div className="bq-field">
            <div className="bq-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="bq-field-label">Qué quieres hacer hoy</span>
              {supported && (
                <Button
                  variant={listening ? 'solid' : 'ghost'}
                  size="sm"
                  onClick={listening ? stop : start}
                >
                  {listening ? '■ Detener' : '🎤 Dictar'}
                </Button>
              )}
            </div>
            <textarea
              className="bq-input"
              style={{ fontSize: 16, minHeight: 120, resize: 'vertical', lineHeight: 1.5 }}
              value={listening && interim ? `${text} ${interim}`.trim() : text}
              autoFocus
              maxLength={MAX_DICTATION_CHARS}
              onChange={(e) => setText(e.target.value)}
              placeholder="Trabajo en páginas web 2 horas, reunión con el equipo 30 minutos, leer documentación 45 min…"
            />
            <div className="bq-row" style={{ justifyContent: 'space-between' }}>
              <span className="bq-meta">
                {listening ? 'Escuchando…' : supported ? 'Habla o escribe. Separa actividades con comas o "y".' : 'Escribe tus actividades (tu navegador no soporta dictado por voz).'}
              </span>
              <span className="bq-meta bq-mono">{text.length}/{MAX_DICTATION_CHARS}</span>
            </div>
            {voiceError && (
              <span className="bq-meta" style={{ fontSize: 12, color: 'var(--bq-fg-3)' }}>
                ⓘ {voiceError}
              </span>
            )}
          </div>

          {error && <div style={{ fontSize: 13, color: '#c0392b' }}>{error}</div>}

          <div className="bq-row" style={{ gap: 12 }}>
            <Button variant="ghost" style={{ flex: 1 }} onClick={close} disabled={busy}>
              Cancelar
            </Button>
            <Button
              size="lg"
              style={{ flex: 2 }}
              onClick={handleAnalyze}
              disabled={busy || !text.trim()}
            >
              {busy ? (
                <>
                  <Spinner /> Analizando…
                </>
              ) : (
                'Analizar →'
              )}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="bq-meta">
            {drafts.length} actividad{drafts.length === 1 ? '' : 'es'} detectada{drafts.length === 1 ? '' : 's'}
            {source ? ` · ${SOURCE_LABEL[source] ?? source}` : ''}
          </div>

          <div className="bq-stack" style={{ gap: 16, maxHeight: '46vh', overflow: 'auto' }}>
            {drafts.map((d, i) => (
              <div
                key={i}
                className="bq-stack"
                style={{ gap: 10, border: '1px solid var(--bq-line)', borderRadius: 12, padding: 14 }}
              >
                <div className="bq-row" style={{ gap: 8, alignItems: 'center' }}>
                  <input
                    className="bq-input"
                    style={{ fontSize: 16, fontWeight: 500, flex: 1 }}
                    value={d.title}
                    maxLength={200}
                    onChange={(e) => updateDraft(i, { title: e.target.value })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeDraft(i)} aria-label="Quitar">
                    ✕
                  </Button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {WORK_TYPES.map((t) => (
                    <Chip
                      key={t.id}
                      active={d.workType === t.id}
                      onClick={() => updateDraft(i, { workType: t.id })}
                    >
                      {t.label}
                    </Chip>
                  ))}
                </div>
                <div className="bq-row" style={{ gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="bq-row" style={{ gap: 8, alignItems: 'center' }}>
                    <span className="bq-field-label">Duración</span>
                    <input
                      className="bq-input"
                      type="number"
                      min={MIN_DURATION}
                      max={MAX_DURATION}
                      step={5}
                      value={d.durationMin}
                      onChange={(e) => updateDraft(i, { durationMin: Number(e.target.value) })}
                      style={{ fontSize: 14, width: 90 }}
                    />
                    <span className="bq-label bq-mono">min</span>
                  </div>
                  <div className="bq-row" style={{ gap: 8, alignItems: 'center' }}>
                    <span className="bq-field-label">Hora</span>
                    <input
                      className="bq-input"
                      type="time"
                      value={d.fixedStart ?? ''}
                      onChange={(e) => updateDraft(i, { fixedStart: e.target.value || null })}
                      style={{ fontSize: 14, width: 120 }}
                    />
                    <span className="bq-meta">{d.fixedStart ? 'fija' : 'automática'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <div style={{ fontSize: 13, color: '#c0392b' }}>{error}</div>}

          <div className="bq-row" style={{ gap: 12 }}>
            <Button variant="ghost" style={{ flex: 1 }} onClick={() => setStep('capture')} disabled={busy}>
              ← Editar texto
            </Button>
            <Button
              size="lg"
              style={{ flex: 2 }}
              onClick={handleSave}
              disabled={busy || drafts.length === 0}
            >
              {busy ? (
                <>
                  <Spinner /> Guardando…
                </>
              ) : (
                `Guardar ${drafts.length} bloque${drafts.length === 1 ? '' : 's'} →`
              )}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
