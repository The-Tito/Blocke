/**
 * app/router — rutas de la app y guardas de acceso.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider.jsx';
import { SplashPage } from '../ui/pages/SplashPage.jsx';
import { LoginPage } from '../ui/pages/LoginPage.jsx';
import { RegisterPage } from '../ui/pages/RegisterPage.jsx';
import { TodayPage } from '../ui/pages/TodayPage.jsx';
import { PlanPage } from '../ui/pages/PlanPage.jsx';
import { ExecPage } from '../ui/pages/ExecPage.jsx';
import { SummaryPage } from '../ui/pages/SummaryPage.jsx';
import { SettingsPage } from '../ui/pages/SettingsPage.jsx';

/** Solo usuarios autenticados; si no, al login. */
function Protected({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <SplashPage />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

/** Solo invitados; si ya hay sesión, a Hoy. */
function GuestOnly({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <SplashPage />;
  if (session) return <Navigate to="/" replace />;
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/" element={<Protected><TodayPage /></Protected>} />
      <Route path="/plan" element={<Protected><PlanPage /></Protected>} />
      <Route path="/exec" element={<Protected><ExecPage /></Protected>} />
      <Route path="/resumen" element={<Protected><SummaryPage /></Protected>} />
      <Route path="/ajustes" element={<Protected><SettingsPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
