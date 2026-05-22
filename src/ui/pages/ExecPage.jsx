/**
 * ui/pages/ExecPage — modo enfoque: ejecución de un bloque y sus microdescansos.
 *
 * ExecPage actúa de cargador: encuentra el bloque a ejecutar (lo arranca si
 * hace falta) y delega en <ExecRunner>, que conduce el timer. La vista cambia
 * sola entre "trabajando" y "microdescanso" según el segmento actual.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Brand, Button, Spinner } from '../components/primitives.jsx';
import { Ring } from '../components/Ring.jsx';
import { Segments } from '../components/Segments.jsx';
import { useDayPlan, dayQueryKey } from '../../hooks/useDayPlan.js';
import { useProfile } from '../../hooks/useProfile.js';
import { useAuth } from '../../app/providers/AuthProvider.jsx';
import { useExecutionEngine } from '../../hooks/useExecutionEngine.js';
import { services } from '../../app/services.js';
import { todayKey, formatClock } from '../../lib/time.js';
import { BLOCK_STATUS, nextRunnableBlock } from '../../domain/block.js';

/** Reloj de pared "HH:MM". */
function wallClock() {
  return new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

export function ExecPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const dateKey = todayKey();
  const { data, isLoading } = useDayPlan(dateKey);
  const { data: profile } = useProfile();
  const [block, setBlock] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (isLoading || !data || startedRef.current) return;
    const blocks = data.blocks ?? [];
    const active = blocks.find((b) => b.status === BLOCK_STATUS.ACTIVE);
    if (active) {
      startedRef.current = true;
      setBlock(active);
      return;
    }
    const next = nextRunnableBlock(blocks);
    if (!next) {
      navigate('/', { replace: true });
      return;
    }
    startedRef.current = true;
    services.execution
      .startBlock({ day: data.day, block: next })
      .then(({ block: started }) => {
        qc.invalidateQueries({ queryKey: dayQueryKey(user.id, dateKey) });
        setBlock(started);
      })
      .catch(() => navigate('/', { replace: true }));
  }, [isLoading, data, navigate, qc, user?.id, dateKey]);

  if (!block || !data || !profile) {
    return (
      <div className="bq-focus bq-center">
        <Spinner size={28} />
      </div>
    );
  }

  return <ExecRunner block={block} day={data.day} profile={profile} dateKey={dateKey} />;
}

function ExecRunner({ block, day, profile, dateKey }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const soundEnabled = profile?.notif_prefs?.sound !== false;

  function handleComplete({ actualWorkSec }) {
    services.execution
      .completeBlock({ blockId: block.id, actualWorkSec })
      .finally(() => {
        qc.invalidateQueries({ queryKey: dayQueryKey(user.id, dateKey) });
        qc.invalidateQueries({ queryKey: ['recentDays', user.id] });
        navigate('/', { replace: true });
      });
  }

  function handleResolveBreak({ segmentIndex, status }) {
    services.execution.resolveBreak({ blockId: block.id, segmentIndex, status });
  }

  const engine = useExecutionEngine({
    block,
    day,
    soundEnabled,
    onComplete: handleComplete,
    onResolveBreak: handleResolveBreak,
  });

  if (engine.kind === 'break') {
    return <BreakView block={block} engine={engine} />;
  }
  return <WorkView block={block} engine={engine} onExit={() => navigate('/')} />;
}

// ─── Vista: trabajando ───────────────────────────────────────────────────────
function WorkView({ block, engine, onExit }) {
  const seg = engine.segment;
  const totalSec = (seg?.duration_min ?? 1) * 60;
  const fraction = 1 - engine.remainingSec / totalSec;
  const nextSeg = engine.segments[engine.cursor + 1];

  return (
    <div className="bq-focus">
      <main className="bq-main">
        <div className="bq-row" style={{ justifyContent: 'space-between', marginBottom: 40 }}>
          <div className="bq-row" style={{ gap: 16 }}>
            <Brand size={22} />
            <span className="bq-meta">enfoque · sin distracciones</span>
          </div>
          <div className="bq-row" style={{ gap: 16 }}>
            <span className="bq-meta bq-mono">{wallClock()}</span>
            <Button variant="ghost" size="sm" onClick={onExit}>
              Salir
            </Button>
          </div>
        </div>

        <div className="bq-grow bq-center">
          <Ring fraction={fraction} size={560} stroke={2}>
            <div className="bq-meta">
              segmento {engine.workPosition.current} de {engine.workPosition.total}
            </div>
            <div
              className="bq-mono"
              style={{ fontSize: 'clamp(80px, 16vw, 200px)', fontWeight: 500, letterSpacing: '-0.05em', lineHeight: 0.9 }}
            >
              {formatClock(engine.remainingSec)}
            </div>
            <div className="bq-h2" style={{ fontSize: 22, marginTop: 6, textAlign: 'center', maxWidth: 420 }}>
              {block.title}
            </div>
            <div className="bq-row" style={{ gap: 8 }}>
              <span className="bq-label">{block.work_type}</span>
              <span className="bq-label">·</span>
              <span className="bq-label">{block.duration_min} min total</span>
            </div>
          </Ring>
        </div>

        <div className="bq-stack" style={{ gap: 18, marginTop: 32 }}>
          <Segments segments={engine.segments} cursor={engine.cursor} />
          <div
            className="bq-row"
            style={{ justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
          >
            <span className="bq-meta">
              {nextSeg?.kind === 'break'
                ? `próxima pausa · ${nextSeg.activity}`
                : 'último segmento del bloque'}
            </span>
            <div className="bq-row" style={{ gap: 12 }}>
              <Button variant="ghost" onClick={engine.paused ? engine.resume : engine.pause}>
                {engine.paused ? 'Reanudar' : 'Pausar'}
              </Button>
              <Button onClick={engine.completeNow}>Marcar terminado →</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Vista: microdescanso ────────────────────────────────────────────────────
function BreakView({ block, engine }) {
  const seg = engine.segment;
  const totalSec = (seg?.duration_min ?? 1) * 60;
  const fraction = 1 - engine.remainingSec / totalSec;
  const [confirmSkip, setConfirmSkip] = useState(false);
  const nextSeg = engine.segments[engine.cursor + 1];

  return (
    <div className="bq-focus bq-break-canvas">
      <main className="bq-main">
        <div className="bq-row" style={{ justifyContent: 'space-between', marginBottom: 32 }}>
          <div className="bq-row" style={{ gap: 16 }}>
            <Brand size={22} />
            <span className="bq-meta">microdescanso · {seg?.duration_min} min</span>
          </div>
          <span className="bq-meta bq-mono">{wallClock()}</span>
        </div>

        <div
          className="bq-grow bq-row"
          style={{ gap: 48, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <div className="bq-stack" style={{ gap: 24, flex: 1.2, minWidth: 280 }}>
            <div className="bq-meta">ahora · haz esto</div>
            <div style={{ fontSize: 'clamp(40px, 6vw, 80px)', lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 500 }}>
              {seg?.activity}
            </div>
            {seg?.rationale && (
              <div
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.15)',
                  paddingTop: 18,
                  marginTop: 8,
                }}
              >
                <div className="bq-meta" style={{ marginBottom: 8 }}>
                  por qué
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 520, opacity: 0.85 }}>
                  {seg.rationale}
                </div>
              </div>
            )}
          </div>

          <div className="bq-center" style={{ flex: 1, minWidth: 280 }}>
            <Ring fraction={fraction} size={460} stroke={2}>
              <div className="bq-meta">vuelves en</div>
              <div
                className="bq-mono"
                style={{ fontSize: 'clamp(72px, 13vw, 150px)', fontWeight: 500, letterSpacing: '-0.05em', lineHeight: 0.9 }}
              >
                {formatClock(engine.remainingSec)}
              </div>
            </Ring>
          </div>
        </div>

        <div
          className="bq-row"
          style={{ justifyContent: 'space-between', marginTop: 24, gap: 16, flexWrap: 'wrap' }}
        >
          <span style={{ fontSize: 12.5, opacity: 0.7 }}>
            {nextSeg
              ? `después de la pausa vuelves a: ${block.title}`
              : 'es la última pausa del bloque'}
          </span>
          {confirmSkip ? (
            <div className="bq-row" style={{ gap: 8 }}>
              <span style={{ fontSize: 12.5, opacity: 0.8 }}>¿Seguro?</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirmSkip(false)}>
                No, sigo en pausa
              </Button>
              <Button size="sm" onClick={engine.skipBreak}>
                Sí, saltar
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmSkip(true)}>
              Saltarse la pausa
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
