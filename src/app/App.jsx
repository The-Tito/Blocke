/**
 * app/App — raíz de la aplicación: providers + router.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider.jsx';
import { AppRoutes } from './router.jsx';
import { isSupabaseConfigured } from '../infrastructure/supabase/client.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 },
  },
});

/** Aviso a pantalla completa si faltan las variables de entorno. */
function MissingEnvNotice() {
  return (
    <div className="bq-center" style={{ height: '100%', padding: 32 }}>
      <div className="bq-stack" style={{ gap: 12, maxWidth: 480, textAlign: 'center' }}>
        <div className="bq-h2">Falta configurar el entorno</div>
        <div className="bq-body">
          Copia <code>.env.example</code> a <code>.env</code> y rellena{' '}
          <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>. Luego
          reinicia el servidor de desarrollo.
        </div>
      </div>
    </div>
  );
}

export function App() {
  if (!isSupabaseConfigured) return <MissingEnvNotice />;
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
