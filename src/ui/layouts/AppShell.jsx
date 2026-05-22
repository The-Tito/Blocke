/**
 * ui/layouts/AppShell — armazón de la app autenticada: barra lateral + main.
 */
import { Sidebar } from '../components/Sidebar.jsx';
import { useAuth } from '../../app/providers/AuthProvider.jsx';
import { useProfile, useRecentDays } from '../../hooks/useProfile.js';

export function AppShell({ children, todayCount }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: recentDays } = useRecentDays();

  return (
    <div className="bq-shell">
      <Sidebar
        profile={profile}
        email={user?.email}
        recentDays={recentDays ?? []}
        todayCount={todayCount}
      />
      <main className="bq-main">{children}</main>
    </div>
  );
}
