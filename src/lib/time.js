/**
 * lib/time — utilidades puras de tiempo. Sin dependencias, sin estado.
 */

/** "HH:MM" -> minutos desde medianoche. */
export function timeToMinutes(hhmm) {
  if (typeof hhmm !== 'string') return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** minutos desde medianoche -> "HH:MM". */
export function minutesToTime(mins) {
  const m = Math.max(0, Math.round(mins));
  const hh = String(Math.floor(m / 60) % 24).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Suma minutos a una hora "HH:MM". */
export function addMinutesToTime(hhmm, mins) {
  return minutesToTime(timeToMinutes(hhmm) + mins);
}

/** Segundos -> "M:SS" o "MM:SS". */
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    return `${h}:${String(mins % 60).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Minutos -> "4h 32m" / "45m". */
export function formatDuration(totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${mm}m`;
  if (mm === 0) return `${h}h`;
  return `${h}h ${String(mm).padStart(2, '0')}m`;
}

/** Fecha local (no UTC) en formato "YYYY-MM-DD". */
export function toDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Clave de fecha de hoy. */
export function todayKey() {
  return toDateKey(new Date());
}

/** Clave de fecha de mañana. */
export function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateKey(d);
}

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "YYYY-MM-DD" -> "Martes, 20 mayo". */
export function formatLongDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const name = DAY_NAMES[date.getDay()];
  return `${name[0].toUpperCase()}${name.slice(1)}, ${d} ${MONTH_NAMES[m - 1]}`;
}
