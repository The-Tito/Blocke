/**
 * ui/pages/SplashPage — pantalla de carga inicial mientras se resuelve la sesión.
 */
export function SplashPage({ message = 'cargando' }) {
  return (
    <div
      className="bq-stack"
      style={{ height: '100%', padding: '24px clamp(20px, 6vw, 56px)' }}
    >
      <div className="bq-row" style={{ justifyContent: 'space-between' }}>
        <span className="bq-meta">v0.1 · personal</span>
        <span className="bq-meta bq-mono">{message}</span>
      </div>

      <div className="bq-grow bq-center bq-stack" style={{ gap: 24 }}>
        <span
          className="bq-side-brand"
          style={{ fontSize: 'clamp(80px, 18vw, 200px)', lineHeight: 0.85 }}
        >
          bloque
          <i className="bq-brand-dot" style={{ width: 24, height: 24 }} />
        </span>
        <div className="bq-meta" style={{ letterSpacing: '0.22em' }}>
          tiempo · estructura · pausa
        </div>
      </div>

      <div className="bq-stack" style={{ gap: 14, paddingBottom: 12 }}>
        <div style={{ height: 2, background: 'var(--bq-line)', overflow: 'hidden' }}>
          <div className="bq-splash-bar" />
        </div>
        <div className="bq-row" style={{ justifyContent: 'space-between' }}>
          <span className="bq-meta">preparando tu día</span>
          <span className="bq-meta bq-mono">bloque</span>
        </div>
      </div>
    </div>
  );
}
