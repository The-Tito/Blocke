/**
 * ui/pages/SettingsPage — cuenta y preferencias.
 *
 * Ajustes que no son parte del flujo principal pero deben existir: horario de
 * trabajo (la ventana en la que Bloque puede avisar), notificaciones y tema.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell.jsx';
import { Button, Switch, Spinner } from '../components/primitives.jsx';
import { useProfile, useUpdateProfile } from '../../hooks/useProfile.js';
import { useAuth } from '../../app/providers/AuthProvider.jsx';
import { getTheme, applyTheme } from '../../lib/theme.js';
import { notifier } from '../../infrastructure/notifications/notifier.js';

/** Días de la semana en orden lun→dom; el valor es el índice JS de getDay(). */
const WEEK = [
  ['L', 1], ['M', 2], ['X', 3], ['J', 4], ['V', 5], ['S', 6], ['D', 0],
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [theme, setTheme] = useState(getTheme());
  const [permission, setPermission] = useState(notifier.permissionStatus());

  if (isLoading || !profile) {
    return (
      <AppShell>
        <div className="bq-grow bq-center">
          <Spinner size={28} />
        </div>
      </AppShell>
    );
  }

  const prefs = profile.notif_prefs ?? {};
  const activeDays = profile.active_days ?? [];

  function setPref(key, value) {
    updateProfile.mutate({ notif_prefs: { ...prefs, [key]: value } });
  }

  function toggleDay(dayIndex) {
    const next = activeDays.includes(dayIndex)
      ? activeDays.filter((d) => d !== dayIndex)
      : [...activeDays, dayIndex].sort();
    updateProfile.mutate({ active_days: next });
  }

  function setWindow(field, value) {
    updateProfile.mutate({ [field]: value });
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }

  async function askPermission() {
    const result = await notifier.requestPermission();
    setPermission(result);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <AppShell>
      <div className="bq-topbar">
        <div>
          <div className="bq-meta">cuenta y preferencias</div>
          <h1 style={{ marginTop: 8 }}>Ajustes</h1>
          <div className="bq-topbar-sub">Bloque v0.1 · web personal</div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Cerrar sesión
        </Button>
      </div>

      <div className="bq-stack" style={{ gap: 36, maxWidth: 640, overflow: 'auto' }}>
        {/* Cuenta */}
        <section>
          <div className="bq-meta" style={{ marginBottom: 8 }}>
            cuenta
          </div>
          <div className="bq-set-row">
            <div>
              <div className="bq-set-label">{profile.full_name || 'Sin nombre'}</div>
              <div className="bq-set-sub">{user?.email}</div>
            </div>
          </div>
        </section>

        {/* Horario habitual */}
        <section>
          <div className="bq-meta" style={{ marginBottom: 8 }}>
            horario habitual
          </div>
          <div className="bq-set-row">
            <div>
              <div className="bq-set-label">Ventana de trabajo</div>
              <div className="bq-set-sub">en qué franja Bloque puede avisarte y planear</div>
            </div>
            <div className="bq-row" style={{ gap: 8 }}>
              <input
                type="time"
                className="bq-input"
                style={{ width: 120, fontSize: 15 }}
                value={(profile.work_window_start ?? '09:00').slice(0, 5)}
                onChange={(e) => setWindow('work_window_start', e.target.value)}
              />
              <span className="bq-muted">—</span>
              <input
                type="time"
                className="bq-input"
                style={{ width: 120, fontSize: 15 }}
                value={(profile.work_window_end ?? '18:00').slice(0, 5)}
                onChange={(e) => setWindow('work_window_end', e.target.value)}
              />
            </div>
          </div>
          <div className="bq-set-row">
            <div>
              <div className="bq-set-label">Días activos</div>
              <div className="bq-set-sub">los días en que sueles trabajar</div>
            </div>
            <div className="bq-row" style={{ gap: 6 }}>
              {WEEK.map(([label, idx]) => {
                const on = activeDays.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleDay(idx)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: on ? 'var(--bq-fg)' : 'transparent',
                      color: on ? 'var(--bq-bg)' : 'var(--bq-fg-3)',
                      border: on ? 0 : '1px solid var(--bq-line)',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Notificaciones */}
        <section>
          <div className="bq-meta" style={{ marginBottom: 8 }}>
            notificaciones
          </div>
          {permission !== 'granted' && (
            <div className="bq-set-row">
              <div>
                <div className="bq-set-label">Permiso del navegador</div>
                <div className="bq-set-sub">
                  {permission === 'denied'
                    ? 'Bloqueado — actívalo en los ajustes del navegador.'
                    : 'Sin las notificaciones, el sistema de pausas no avisa.'}
                </div>
              </div>
              <Button size="sm" onClick={askPermission} disabled={permission === 'denied'}>
                Activar
              </Button>
            </div>
          )}
          <SettingToggle
            label="Inicio del primer bloque"
            sub="aviso al empezar el día"
            on={prefs.first_block !== false}
            onChange={(v) => setPref('first_block', v)}
          />
          <SettingToggle
            label="Cambio de segmento"
            sub="fin de trabajo / fin de pausa"
            on={prefs.segment_change !== false}
            onChange={(v) => setPref('segment_change', v)}
          />
          <SettingToggle
            label="Cierre del día"
            sub="aviso al completar todos los bloques"
            on={prefs.day_close === true}
            onChange={(v) => setPref('day_close', v)}
          />
          <SettingToggle
            label="Sonido suave"
            sub="campana al notificar"
            on={prefs.sound !== false}
            onChange={(v) => setPref('sound', v)}
          />
        </section>

        {/* Apariencia */}
        <section>
          <div className="bq-meta" style={{ marginBottom: 8 }}>
            apariencia
          </div>
          <SettingToggle
            label="Tema oscuro"
            sub="invierte la paleta monocromática"
            on={theme === 'dark'}
            onChange={toggleTheme}
          />
        </section>
      </div>
    </AppShell>
  );
}

function SettingToggle({ label, sub, on, onChange }) {
  return (
    <div className="bq-set-row">
      <div>
        <div className="bq-set-label">{label}</div>
        <div className="bq-set-sub">{sub}</div>
      </div>
      <Switch on={on} onChange={onChange} />
    </div>
  );
}
