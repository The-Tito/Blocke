/**
 * ui/components/Segments — barra de puntos de segmento.
 * Visualiza la secuencia work/break de un bloque: hechos, actual y por venir.
 */
export function Segments({ segments = [], cursor = 0 }) {
  return (
    <div className="bq-segs">
      {segments.map((seg, i) => {
        if (seg.kind === 'break') {
          return <div key={i} className="bq-seg rest" />;
        }
        let state = '';
        if (i < cursor) state = 'done';
        else if (i === cursor) state = 'now';
        return (
          <div
            key={i}
            className={`bq-seg ${state}`}
            style={{ flex: Math.max(1, seg.duration_min / 25) }}
          />
        );
      })}
    </div>
  );
}
