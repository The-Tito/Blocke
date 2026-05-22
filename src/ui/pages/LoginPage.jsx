/**
 * ui/pages/LoginPage — inicio de sesión.
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SplitLayout } from '../layouts/SplitLayout.jsx';
import { Button, Field, Spinner } from '../components/primitives.jsx';
import { useAuth } from '../../app/providers/AuthProvider.jsx';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn({ email: email.trim(), password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SplitLayout pill="app personal">
      <form className="bq-stack" style={{ gap: 36, maxWidth: 440, width: '100%' }} onSubmit={onSubmit}>
        <div>
          <div className="bq-meta">iniciar sesión</div>
          <div className="bq-h1" style={{ marginTop: 16 }}>
            Bienvenido de vuelta.
          </div>
          <div className="bq-body" style={{ marginTop: 14 }}>
            El plan de ayer ya está listo. Solo tienes que empezar.
          </div>
        </div>

        <div className="bq-stack" style={{ gap: 20 }}>
          <Field
            label="Correo"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
          />
          <Field
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
          />
        </div>

        {error && (
          <div style={{ fontSize: 13, color: '#c0392b' }}>{error}</div>
        )}

        <div className="bq-stack" style={{ gap: 14 }}>
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? <Spinner /> : 'Iniciar sesión →'}
          </Button>
          <div className="bq-row" style={{ justifyContent: 'center', gap: 6 }}>
            <span className="bq-label">¿No tienes cuenta?</span>
            <Link to="/register" className="bq-label" style={{ color: 'var(--bq-fg)' }}>
              Crear cuenta
            </Link>
          </div>
        </div>
      </form>
    </SplitLayout>
  );
}
