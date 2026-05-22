/**
 * ui/layouts/SplitLayout — armazón de las pantallas de entrada (login/registro).
 * Panel de marca a la izquierda (oscuro) y formulario a la derecha.
 */
import { Brand } from '../components/primitives.jsx';

export function SplitLayout({ pill, children }) {
  return (
    <div className="bq-split">
      <div className="bq-split-brand">
        <div className="bq-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Brand size={28} />
          {pill && <span className="bq-pill">{pill}</span>}
        </div>

        <div className="bq-stack" style={{ gap: 28, maxWidth: 480 }}>
          <div style={{ fontSize: 64, lineHeight: 0.98, letterSpacing: '-0.045em', fontWeight: 500 }}>
            Estructura para los días que ya decidiste trabajar.
          </div>
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.65)',
              maxWidth: 420,
            }}
          >
            Bloque no te hace productivo. Te lleva del bloque actual al siguiente y te
            recuerda parar antes de que te quemes.
          </div>
        </div>

        <div className="bq-stack" style={{ gap: 4 }}>
          <span className="bq-meta" style={{ color: 'rgba(255,255,255,0.4)' }}>
            fundamentado en
          </span>
          <span
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.8)',
              maxWidth: 360,
              lineHeight: 1.4,
            }}
          >
            Teoría de restauración de atención (Kaplan), regla 20-20-20, ergonomía
            ocupacional.
          </span>
        </div>
      </div>

      <div className="bq-split-form">{children}</div>
    </div>
  );
}
