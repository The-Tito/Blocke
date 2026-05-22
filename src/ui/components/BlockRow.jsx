/**
 * ui/components/BlockRow — fila de la línea del día.
 * Reutilizada por Hoy, Planear y Resumen; el contenido de la derecha varía.
 */
import { planSummaryLabel } from '../../domain/segmentPlan.js';

export function BlockRow({ block, right, dim = false, strike = false }) {
  return (
    <div className="bq-tl-row" style={{ opacity: dim ? 0.5 : 1 }}>
      <div className="bq-tl-time bq-mono">{block.scheduled_start ?? '--:--'}</div>
      <div style={{ minWidth: 0 }}>
        <div
          className="bq-tl-title"
          style={{ textDecoration: strike ? 'line-through' : 'none' }}
        >
          {block.title}
        </div>
        <div className="bq-tl-meta">
          <span>{block.work_type}</span>
          <span>·</span>
          <span>{block.duration_min} min</span>
          <span>·</span>
          <span style={{ fontStyle: 'italic' }}>{planSummaryLabel(block.segment_plan)}</span>
        </div>
      </div>
      {right}
    </div>
  );
}
