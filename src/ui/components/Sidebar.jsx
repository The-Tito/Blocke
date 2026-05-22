/**
 * ui/components/Sidebar — navegación lateral de la app.
 * Muestra las secciones, un vistazo a la semana y el pie de cuenta.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { Brand } from './primitives.jsx';
import { formatLongDate } from '../../lib/time.js';

const NAV = [
  { path: '/', label: 'Hoy' },
  { path: '/plan', label: 'Planear' },
  { path: '/ajustes', label: 'Ajustes' },
];

const DAY_STATUS_LABEL = {
  planning: 'planeando',
  ready: 'listo',
  in_progress: 'en curso',
  closed: 'cerrado',
};

/** Iniciales para el avatar. */
function initials(profile, email) {
  const name = profile?.full_name?.trim();
  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('');
  }
  return (email?.[0] ?? '?').toUpperCase();
}

export function Sidebar({ profile, email, recentDays = [], todayCount }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="bq-side">
      <Brand size={24} />

      <div className="bq-stack" style={{ gap: 4 }}>
        <div className="bq-meta" style={{ paddingLeft: 12, marginBottom: 6 }}>
          navegación
        </div>
        <nav className="bq-stack bq-side-nav-wrap" style={{ gap: 2 }}>
          {NAV.map((item) => (
            <button
              key={item.path}
              className={`bq-nav-item ${pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span>{item.label}</span>
              {item.path === '/' && todayCount && (
                <span className="bq-nav-count">{todayCount}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="bq-stack bq-side-week" style={{ gap: 4 }}>
        <div className="bq-meta" style={{ paddingLeft: 12, marginBottom: 6 }}>
          días recientes
        </div>
        <div className="bq-stack" style={{ paddingLeft: 12, gap: 10 }}>
          {recentDays.length === 0 && (
            <span className="bq-label">Aún no hay días registrados.</span>
          )}
          {recentDays.slice(0, 6).map((d) => (
            <div
              key={d.id}
              className="bq-row"
              style={{ justifyContent: 'space-between', fontSize: 13 }}
            >
              <span className="bq-muted">{formatLongDate(d.date).split(',')[0]}</span>
              <span className="bq-mono bq-label">
                {DAY_STATUS_LABEL[d.status] ?? d.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="bq-side-foot bq-row"
        style={{
          marginTop: 'auto',
          gap: 12,
          paddingTop: 24,
          borderTop: '1px solid var(--bq-line)',
        }}
      >
        <div className="bq-avatar">{initials(profile, email)}</div>
        <div className="bq-stack" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {profile?.full_name || 'Tu cuenta'}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--bq-fg-3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {email}
          </div>
        </div>
      </div>
    </aside>
  );
}
