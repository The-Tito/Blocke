/**
 * ui/pages/PlanPage — planeación del día. Por defecto planea hoy; con
 * `?date=YYYY-MM-DD` se puede planear cualquier otro día (p. ej. mañana).
 *
 * Crea, edita, reordena y elimina bloques. Al guardar un bloque, el servicio de
 * planeación llama a la IA para calcular sus microdescansos.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../layouts/AppShell.jsx';
import { BlockRow } from '../components/BlockRow.jsx';
import { NewBlockModal } from '../components/NewBlockModal.jsx';
import { DictationModal } from '../components/DictationModal.jsx';
import { Button, ProgressBar, Spinner } from '../components/primitives.jsx';
import { useDayPlan, dayQueryKey } from '../../hooks/useDayPlan.js';
import { useProfile } from '../../hooks/useProfile.js';
import { useAuth } from '../../app/providers/AuthProvider.jsx';
import { services } from '../../app/services.js';
import { todayKey, formatLongDate, formatDuration } from '../../lib/time.js';
import { assignedMinutes, windowMinutes, freeMinutes } from '../../domain/timeline.js';

export function PlanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const dateKey = params.get('date') || todayKey();

  const { data, isLoading } = useDayPlan(dateKey);
  const { data: profile } = useProfile();
  const [modal, setModal] = useState({ open: false, editingBlock: null });
  const [dictationOpen, setDictationOpen] = useState(false);
  const [error, setError] = useState('');

  const day = data?.day;
  const blocks = data?.blocks ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: dayQueryKey(user.id, dateKey) });
    qc.invalidateQueries({ queryKey: ['recentDays', user.id] });
  }

  if (isLoading || !day || !profile) {
    return (
      <AppShell>
        <div className="bq-grow bq-center">
          <Spinner size={28} />
        </div>
      </AppShell>
    );
  }

  const assigned = assignedMinutes(blocks);
  const windowMin = windowMinutes(profile.work_window_start, profile.work_window_end);
  const free = freeMinutes(blocks, profile.work_window_start, profile.work_window_end);
  const fraction = windowMin ? assigned / windowMin : 0;

  // ─── Handlers ──────────────────────────────────────────────────────────────
  async function handleSubmitBlock(input) {
    setError('');
    try {
      const res = modal.editingBlock
        ? await services.planning.editBlock({
            userId: user.id,
            blockId: modal.editingBlock.id,
            input,
            allBlocks: blocks,
            profile,
          })
        : await services.planning.addBlock({
            userId: user.id,
            day,
            input,
            existingBlocks: blocks,
            profile,
          });
      if (res.ok) refresh();
      return res;
    } catch (e) {
      return { ok: false, errors: { title: e.message } };
    }
  }

  // Dictado: paso 1 (analizar texto → borradores) y paso 2 (guardar bloques).
  async function handleAnalyzeDictation(text) {
    try {
      return await services.planning.parseDictation({ text });
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function handleSaveDictation(drafts) {
    try {
      const res = await services.planning.addBlocksFromDrafts({
        userId: user.id,
        day,
        drafts,
        profile,
      });
      if (res.created.length > 0) refresh();
      return res;
    } catch (e) {
      return { ok: false, created: [], skipped: [], error: e.message };
    }
  }

  async function handleDelete(block) {
    if (!window.confirm(`¿Eliminar "${block.title}"?`)) return;
    try {
      await services.planning.deleteBlock({ blockId: block.id, allBlocks: blocks, profile });
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleMove(index, dir) {
    const to = index + dir;
    if (to < 0 || to >= blocks.length) return;
    try {
      await services.planning.reorderBlocks({ allBlocks: blocks, from: index, to, profile });
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleMarkReady() {
    try {
      await services.planning.markDayReady(day.id);
      refresh();
      navigate('/');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppShell>
      <div className="bq-topbar">
        <div>
          <div className="bq-meta">{formatLongDate(dateKey)}</div>
          <h1 style={{ marginTop: 8 }}>Planear</h1>
          <div className="bq-topbar-sub">
            {formatDuration(assigned)} de {formatDuration(windowMin)} asignadas · {blocks.length}{' '}
            bloque{blocks.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="bq-row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={() => setDictationOpen(true)}>
            🎤 Dictar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setModal({ open: true, editingBlock: null })}>
            + Agregar
          </Button>
          {blocks.length > 0 && day.status === 'planning' && (
            <Button size="sm" onClick={handleMarkReady}>
              Marcar como listo →
            </Button>
          )}
          {day.status === 'ready' && (
            <span className="bq-active-pill" style={{ background: 'var(--bq-fg)' }}>
              plan listo
            </span>
          )}
        </div>
      </div>

      {/* Héroe: tiempo asignado */}
      <div className="bq-row" style={{ gap: 48, alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap' }}>
        <div className="bq-stack" style={{ gap: 10 }}>
          <div className="bq-meta">asignado</div>
          <div className="bq-hero" style={{ fontSize: 'clamp(96px, 20vw, 200px)' }}>
            {Math.floor(assigned / 60)}
            <span style={{ fontSize: '0.4em', color: 'var(--bq-fg-3)' }}>
              /{Math.round(windowMin / 60)}h
            </span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 220, paddingBottom: 24 }}>
          <ProgressBar fraction={fraction} height={6} />
          <div className="bq-row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <span className="bq-label">{profile.work_window_start.slice(0, 5)}</span>
            <span className="bq-label bq-mono">{formatDuration(free)} libres</span>
            <span className="bq-label">{profile.work_window_end.slice(0, 5)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 13, color: '#c0392b', marginBottom: 16 }}>{error}</div>
      )}

      <div className="bq-meta" style={{ marginBottom: 8 }}>
        bloques planeados
      </div>

      {blocks.length === 0 ? (
        <div
          className="bq-grow bq-center bq-stack"
          style={{
            gap: 18,
            textAlign: 'center',
            border: '1px dashed var(--bq-line)',
            borderRadius: 16,
            padding: 48,
          }}
        >
          <div style={{ fontSize: 32, letterSpacing: '-0.03em', fontWeight: 500 }}>
            El día está vacío.
          </div>
          <div className="bq-body" style={{ maxWidth: 420, fontSize: 15 }}>
            Agrega tu primer bloque. Tres datos: qué vas a hacer, qué tipo de trabajo
            implica y cuánto tiempo. La IA calcula el resto.
          </div>
          <div className="bq-row" style={{ gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button size="lg" variant="ghost" onClick={() => setDictationOpen(true)}>
              🎤 Dictar el día
            </Button>
            <Button size="lg" onClick={() => setModal({ open: true, editingBlock: null })}>
              + Agregar bloque
            </Button>
          </div>
        </div>
      ) : (
        <div className="bq-grow" style={{ overflow: 'auto' }}>
          {blocks.map((b, i) => (
            <BlockRow
              key={b.id}
              block={b}
              right={
                <>
                  <div className="bq-row" style={{ gap: 6 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMove(i, -1)}
                      disabled={i === 0}
                      aria-label="Subir"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMove(i, 1)}
                      disabled={i === blocks.length - 1}
                      aria-label="Bajar"
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setModal({ open: true, editingBlock: b })}
                    >
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(b)}>
                      Eliminar
                    </Button>
                  </div>
                  <div className="bq-tl-dur bq-mono" style={{ textAlign: 'right' }}>
                    → {b.scheduled_end ?? ''}
                  </div>
                </>
              }
            />
          ))}
        </div>
      )}

      <NewBlockModal
        open={modal.open}
        editingBlock={modal.editingBlock}
        onClose={() => setModal({ open: false, editingBlock: null })}
        onSubmit={handleSubmitBlock}
      />

      <DictationModal
        open={dictationOpen}
        onClose={() => setDictationOpen(false)}
        onAnalyze={handleAnalyzeDictation}
        onSave={handleSaveDictation}
      />
    </AppShell>
  );
}
