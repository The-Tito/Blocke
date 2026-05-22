/**
 * ui/pages/SummaryPage — resumen del día.
 *
 * Cierra el día (si no lo estaba), calcula las métricas y muestra la
 * observación de la IA. Datos limpios, sin gamificación.
 */
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../layouts/AppShell.jsx';
import { BlockRow } from '../components/BlockRow.jsx';
import { Button, Spinner } from '../components/primitives.jsx';
import { useDayPlan } from '../../hooks/useDayPlan.js';
import { useAuth } from '../../app/providers/AuthProvider.jsx';
import { services } from '../../app/services.js';
import { todayKey, formatLongDate, formatDuration } from '../../lib/time.js';
import { BLOCK_STATUS } from '../../domain/block.js';

export function SummaryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dateKey = todayKey();
  const { data: dayData } = useDayPlan(dateKey);

  // Cerrar el día es idempotente: si ya estaba cerrado, devuelve lo guardado.
  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', user?.id, dateKey],
    enabled: Boolean(dayData?.day),
    queryFn: () => services.summary.closeDay(dayData.day),
  });

  if (isLoading || !summary) {
    return (
      <AppShell>
        <div className="bq-grow bq-center bq-stack" style={{ gap: 16 }}>
          <Spinner size={28} />
          <span className="bq-meta">cerrando el día…</span>
        </div>
      </AppShell>
    );
  }

  const m = summary.metrics;
  const blocks = summary.blocks ?? dayData?.blocks ?? [];

  return (
    <AppShell>
      <div className="bq-topbar">
        <div>
          <div className="bq-meta">{formatLongDate(dateKey)} · día cerrado</div>
          <h1 style={{ marginTop: 8 }}>Resumen</h1>
          <div className="bq-topbar-sub">
            {m.blocksPlanned} planeados · {m.blocksCompleted} completados ·{' '}
            {m.blocksSkipped} saltados
          </div>
        </div>
        <Button size="sm" onClick={() => navigate('/plan')}>
          Planear mañana →
        </Button>
      </div>

      {/* Héroe + observación IA */}
      <div className="bq-row" style={{ gap: 56, alignItems: 'flex-end', marginBottom: 36, flexWrap: 'wrap' }}>
        <div className="bq-stack" style={{ gap: 10 }}>
          <div className="bq-meta">bloques completados</div>
          <div className="bq-hero" style={{ fontSize: 'clamp(120px, 24vw, 260px)' }}>
            {m.blocksCompleted}
            <span style={{ fontSize: '0.42em', color: 'var(--bq-fg-3)' }}>/{m.blocksPlanned}</span>
          </div>
        </div>
        <div className="bq-stack" style={{ gap: 12, paddingBottom: 24, maxWidth: 380 }}>
          <div className="bq-meta">observación de la ia</div>
          <div style={{ fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1.35, fontWeight: 500 }}>
            {summary.note}
          </div>
          <div className="bq-label" style={{ fontStyle: 'italic' }}>
            groq · análisis del patrón del día
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="bq-metrics" style={{ marginBottom: 36 }}>
        <Metric label="Trabajo efectivo" value={formatDuration(m.workEffectiveMin)} />
        <Metric label="Tiempo planeado" value={formatDuration(m.workPlannedMin)} />
        <Metric
          label="Pausas respetadas"
          value={`${m.breaksRespected}`}
          sub={`/ ${m.breaksTotal}`}
        />
        <Metric label="Bloque más largo" value={`${m.longestBlockMin}`} sub="min" />
      </div>

      <div className="bq-meta" style={{ marginBottom: 8 }}>
        lo que hiciste hoy
      </div>
      <div className="bq-grow" style={{ overflow: 'auto' }}>
        {blocks.map((b) => (
          <BlockRow
            key={b.id}
            block={b}
            dim={b.status !== BLOCK_STATUS.DONE}
            right={
              <div
                className="bq-tl-dur bq-mono"
                style={{ textAlign: 'right', gridColumn: '3 / 5' }}
              >
                {b.status === BLOCK_STATUS.DONE && '✓ hecho'}
                {b.status === BLOCK_STATUS.SKIPPED && '— saltado'}
                {b.status === BLOCK_STATUS.PENDING && '— sin empezar'}
                {b.status === BLOCK_STATUS.ACTIVE && '— a medias'}
              </div>
            }
          />
        ))}
      </div>
    </AppShell>
  );
}

function Metric({ label, value, sub }) {
  return (
    <div className="bq-metric">
      <div className="bq-metric-label">{label}</div>
      <div className="bq-metric-val">
        {value}
        {sub && <sub>{sub}</sub>}
      </div>
    </div>
  );
}
