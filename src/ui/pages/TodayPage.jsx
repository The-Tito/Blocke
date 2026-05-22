/**
 * ui/pages/TodayPage — dashboard del día de hoy.
 *
 * Cambia de forma según el momento del día: plan limpio en la mañana, bloque
 * activo durante el trabajo, y enlace al resumen al terminar.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell.jsx';
import { BlockRow } from '../components/BlockRow.jsx';
import { Button, ProgressBar, Spinner } from '../components/primitives.jsx';
import { useDayPlan } from '../../hooks/useDayPlan.js';
import { todayKey, formatLongDate, formatDuration } from '../../lib/time.js';
import { BLOCK_STATUS, nextRunnableBlock, isBlockFinished } from '../../domain/block.js';

export function TodayPage() {
  const navigate = useNavigate();
  const dateKey = todayKey();
  const { data, isLoading } = useDayPlan(dateKey);

  const day = data?.day;
  const blocks = data?.blocks ?? [];

  useEffect(() => {
    if (day?.status === 'closed') navigate('/resumen', { replace: true });
  }, [day?.status, navigate]);

  if (isLoading || !day) {
    return (
      <AppShell>
        <div className="bq-grow bq-center">
          <Spinner size={28} />
        </div>
      </AppShell>
    );
  }

  const plannedMin = blocks.reduce((a, b) => a + b.duration_min, 0);
  const workedSec = blocks
    .filter((b) => b.status === BLOCK_STATUS.DONE)
    .reduce((a, b) => a + (b.actual_work_sec ?? 0), 0);
  const finishedCount = blocks.filter(isBlockFinished).length;
  const next = nextRunnableBlock(blocks);
  const activeBlock = blocks.find((b) => b.status === BLOCK_STATUS.ACTIVE);
  const allFinished = blocks.length > 0 && finishedCount === blocks.length;
  const inProgress = day.status === 'in_progress';

  // ─── Día vacío: aún no hay plan ────────────────────────────────────────────
  if (blocks.length === 0) {
    return (
      <AppShell>
        <Topbar dateKey={dateKey} subtitle="Todavía no has planeado el día." />
        <div
          className="bq-grow bq-center bq-stack"
          style={{
            gap: 20,
            textAlign: 'center',
            border: '1px dashed var(--bq-line)',
            borderRadius: 16,
            padding: 48,
          }}
        >
          <div style={{ fontSize: 36, letterSpacing: '-0.03em', fontWeight: 500 }}>
            Hoy no tiene forma todavía.
          </div>
          <div className="bq-body" style={{ maxWidth: 420, fontSize: 15 }}>
            Bloque entra cuando ya sabes qué vas a hacer. Crea los bloques del día y
            la IA calcula tus microdescansos.
          </div>
          <Button size="lg" onClick={() => navigate('/plan')}>
            Planear el día →
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell todayCount={`${finishedCount}/${blocks.length}`}>
      <Topbar
        dateKey={dateKey}
        subtitle={
          inProgress
            ? `${finishedCount} de ${blocks.length} bloques completos`
            : 'Plan listo · empieza cuando quieras'
        }
        right={
          <div className="bq-row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" onClick={() => navigate('/plan')}>
              Editar plan
            </Button>
            {allFinished ? (
              <Button size="sm" onClick={() => navigate('/resumen')}>
                Ver resumen del día →
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate('/exec')}>
                {activeBlock
                  ? 'Continuar bloque →'
                  : finishedCount > 0
                    ? 'Iniciar siguiente →'
                    : 'Iniciar primer bloque →'}
              </Button>
            )}
          </div>
        }
      />

      {/* Héroe: tiempo planeado o bloque activo */}
      {activeBlock ? (
        <div
          className="bq-stack"
          style={{ gap: 8, marginBottom: 32, paddingBottom: 28, borderBottom: '1px solid var(--bq-line)' }}
        >
          <div className="bq-meta">bloque activo</div>
          <div style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 500, letterSpacing: '-0.03em' }}>
            {activeBlock.title}
          </div>
          <div className="bq-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="bq-label">{activeBlock.work_type}</span>
            <span className="bq-label">·</span>
            <span className="bq-label">{activeBlock.duration_min} min</span>
          </div>
        </div>
      ) : (
        <div className="bq-row" style={{ gap: 48, alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap' }}>
          <div className="bq-stack" style={{ gap: 10 }}>
            <div className="bq-meta">{inProgress ? 'tiempo trabajado' : 'tiempo planeado'}</div>
            <div className="bq-hero" style={{ fontSize: 'clamp(96px, 22vw, 200px)' }}>
              {inProgress ? formatDuration(workedSec / 60) : formatDuration(plannedMin)}
            </div>
          </div>
          <div className="bq-stack" style={{ gap: 4, paddingBottom: 16 }}>
            <div className="bq-meta">bloques</div>
            <div style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.03em' }}>
              {finishedCount}
              <span style={{ color: 'var(--bq-fg-3)' }}>/{blocks.length}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bq-meta" style={{ marginBottom: 8 }}>
        línea del día
      </div>
      <div className="bq-grow" style={{ overflow: 'auto' }}>
        {blocks.map((b) => {
          const finished = isBlockFinished(b);
          const isActive = b.status === BLOCK_STATUS.ACTIVE;
          const isNext = next?.id === b.id && !isActive;
          return (
            <BlockRow
              key={b.id}
              block={b}
              dim={b.status === BLOCK_STATUS.DONE}
              strike={b.status === BLOCK_STATUS.DONE}
              right={
                <>
                  <div className="bq-row" style={{ gap: 10 }}>
                    <ProgressBar
                      fraction={b.status === BLOCK_STATUS.DONE ? 1 : isActive ? 0.5 : 0}
                      width={160}
                    />
                  </div>
                  <div className="bq-tl-dur bq-mono" style={{ textAlign: 'right' }}>
                    {b.status === BLOCK_STATUS.DONE && '✓ hecho'}
                    {b.status === BLOCK_STATUS.SKIPPED && '— saltado'}
                    {isActive && <span style={{ color: 'var(--bq-fg)', fontWeight: 500 }}>ahora</span>}
                    {b.status === BLOCK_STATUS.PENDING &&
                      (isNext ? '→ siguiente' : `→ ${b.scheduled_end ?? ''}`)}
                  </div>
                </>
              }
            />
          );
        })}
      </div>
    </AppShell>
  );
}

function Topbar({ dateKey, subtitle, right }) {
  return (
    <div className="bq-topbar">
      <div>
        <div className="bq-meta">{formatLongDate(dateKey)}</div>
        <h1 style={{ marginTop: 8 }}>Hoy</h1>
        <div className="bq-topbar-sub">{subtitle}</div>
      </div>
      {right}
    </div>
  );
}
