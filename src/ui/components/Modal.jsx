/**
 * ui/components/Modal — diálogo modal centrado con backdrop.
 * Cierra con Escape o clic en el fondo.
 */
import { useEffect } from 'react';

export function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="bq-modal-backdrop" onMouseDown={onClose}>
      <div
        className="bq-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
