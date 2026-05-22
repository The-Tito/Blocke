/**
 * ui/components/primitives — primitivas del sistema visual de Bloque.
 * Componentes pequeños y sin estado de negocio, mapeados 1:1 con las clases
 * `bq-*` del sistema visual (src/styles/index.css).
 */

/** Logotipo "bloque" con su punto cuadrado. */
export function Brand({ size = 24 }) {
  return (
    <span className="bq-side-brand" style={{ fontSize: size }}>
      bloque
      <i
        className="bq-brand-dot"
        style={{ width: size / 3.4, height: size / 3.4 }}
      />
    </span>
  );
}

/** Botón. variant: 'solid' | 'ghost'. size: 'md' | 'lg' | 'sm'. */
export function Button({ variant = 'solid', size = 'md', block = false, className = '', ...props }) {
  const cls = [
    'bq-btn',
    variant === 'ghost' && 'bq-btn-ghost',
    size === 'lg' && 'bq-btn-lg',
    size === 'sm' && 'bq-btn-sm',
    block && 'bq-btn-block',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <button type="button" className={cls} {...props} />;
}

/** Chip seleccionable. */
export function Chip({ active = false, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`bq-chip ${active ? 'is-active' : ''} ${className}`}
      {...props}
    />
  );
}

/** Interruptor on/off. */
export function Switch({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`bq-switch ${on ? 'is-on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <i />
    </button>
  );
}

/** Campo de formulario: etiqueta + input controlado. */
export function Field({ label, error, ...inputProps }) {
  return (
    <label className="bq-field">
      <span className="bq-field-label">{label}</span>
      <input className="bq-input" {...inputProps} />
      {error && (
        <span style={{ fontSize: 12, color: '#c0392b', marginTop: 2 }}>{error}</span>
      )}
    </label>
  );
}

/** Indicador de carga giratorio. */
export function Spinner({ size = 16 }) {
  return (
    <svg
      className="bq-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Barra de progreso fina. fraction en [0..1]. */
export function ProgressBar({ fraction = 0, height = 2, width }) {
  return (
    <div className="bq-progress" style={{ height, width }}>
      <i style={{ width: `${Math.min(100, Math.max(0, fraction * 100))}%` }} />
    </div>
  );
}
