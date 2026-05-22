/**
 * ui/components/NewBlockModal — modal para crear o editar un bloque.
 * Captura los tres datos del bloque y delega el guardado (que llama a la IA).
 */
import { useEffect, useState } from 'react';
import { Modal } from './Modal.jsx';
import { Button, Chip, Spinner } from './primitives.jsx';
import { WORK_TYPES } from '../../domain/workTypes.js';
import { DURATION_PRESETS } from '../../domain/block.js';

export function NewBlockModal({ open, onClose, onSubmit, editingBlock }) {
  const [title, setTitle] = useState('');
  const [workType, setWorkType] = useState(WORK_TYPES[0].id);
  const [durationMin, setDurationMin] = useState(60);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Rellena el formulario al abrir (creación o edición).
  useEffect(() => {
    if (!open) return;
    if (editingBlock) {
      setTitle(editingBlock.title);
      const wt = WORK_TYPES.find((t) => t.label === editingBlock.work_type);
      setWorkType(wt?.id ?? WORK_TYPES[0].id);
      setDurationMin(editingBlock.duration_min);
    } else {
      setTitle('');
      setWorkType(WORK_TYPES[0].id);
      setDurationMin(60);
    }
    setErrors({});
    setBusy(false);
  }, [open, editingBlock]);

  async function handleSubmit() {
    setBusy(true);
    setErrors({});
    const result = await onSubmit({ title, workType, durationMin });
    setBusy(false);
    if (result?.ok) onClose();
    else setErrors(result?.errors ?? { title: 'No se pudo guardar.' });
  }

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose}>
      <div className="bq-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="bq-meta">{editingBlock ? 'editar bloque' : 'nuevo bloque'}</div>
          <div className="bq-h2" style={{ fontSize: 24, marginTop: 8 }}>
            {editingBlock ? 'Ajustar el bloque' : 'Agregar al día'}
          </div>
        </div>
        <span className="bq-meta bq-mono">esc para salir</span>
      </div>

      <div className="bq-field">
        <span className="bq-field-label">Qué vas a hacer</span>
        <input
          className="bq-input"
          style={{ fontSize: 24, fontWeight: 500 }}
          value={title}
          autoFocus
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Implementar el timer de ejecución"
        />
        {errors.title && <span style={{ fontSize: 12, color: '#c0392b' }}>{errors.title}</span>}
      </div>

      <div className="bq-stack" style={{ gap: 12 }}>
        <span className="bq-field-label">Tipo de trabajo</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {WORK_TYPES.map((t) => (
            <Chip key={t.id} active={workType === t.id} onClick={() => setWorkType(t.id)}>
              {t.label}
            </Chip>
          ))}
        </div>
        {errors.workType && <span style={{ fontSize: 12, color: '#c0392b' }}>{errors.workType}</span>}
      </div>

      <div className="bq-stack" style={{ gap: 12 }}>
        <div className="bq-row" style={{ justifyContent: 'space-between' }}>
          <span className="bq-field-label">Duración</span>
          <span className="bq-label bq-mono">{durationMin} minutos</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DURATION_PRESETS.map((d) => (
            <Chip
              key={d}
              active={durationMin === d}
              onClick={() => setDurationMin(d)}
              style={{ flex: 1, justifyContent: 'center', minWidth: 70 }}
            >
              {d} min
            </Chip>
          ))}
        </div>
        <input
          className="bq-input"
          type="number"
          min={5}
          max={480}
          step={5}
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          style={{ fontSize: 14 }}
        />
        {errors.durationMin && (
          <span style={{ fontSize: 12, color: '#c0392b' }}>{errors.durationMin}</span>
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid var(--bq-line)',
          paddingTop: 16,
          fontSize: 13,
          color: 'var(--bq-fg-3)',
        }}
      >
        Al guardar, la IA (Groq) calcula el plan de microdescansos de este bloque
        según el tipo de trabajo, la duración y la hora.
      </div>

      <div className="bq-row" style={{ gap: 12 }}>
        <Button variant="ghost" style={{ flex: 1 }} onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button size="lg" style={{ flex: 2 }} onClick={handleSubmit} disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Calculando microdescansos…
            </>
          ) : editingBlock ? (
            'Guardar cambios →'
          ) : (
            'Agregar al día →'
          )}
        </Button>
      </div>
    </Modal>
  );
}
