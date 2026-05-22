/**
 * ui/pages/RegisterPage — creación de cuenta.
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SplitLayout } from '../layouts/SplitLayout.jsx';
import { Button, Field, Spinner } from '../components/primitives.jsx';
import { useAuth } from '../../app/providers/AuthProvider.jsx';

/** Fuerza simple de contraseña: 0..4. */
function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 1;
  return score;
}

const STRENGTH_LABEL = ['muy débil', 'débil', 'aceptable', 'fuerte', 'muy fuerte'];

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const strength = passwordStrength(password);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Usa una contraseña de al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      const session = await signUp({ email: email.trim(), password, fullName: fullName.trim() });
      // Si el proyecto exige confirmar el correo, signUp no devuelve sesión.
      if (session) navigate('/', { replace: true });
      else setConfirmSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (confirmSent) {
    return (
      <SplitLayout pill="crear cuenta">
        <div className="bq-stack" style={{ gap: 20, maxWidth: 440, width: '100%' }}>
          <div className="bq-meta">cuenta creada</div>
          <div className="bq-h1">Revisa tu correo.</div>
          <div className="bq-body">
            Te enviamos un enlace de confirmación a <strong>{email.trim()}</strong>.
            Ábrelo para activar tu cuenta y luego inicia sesión.
          </div>
          <Button size="lg" onClick={() => navigate('/login')}>
            Ir a iniciar sesión →
          </Button>
        </div>
      </SplitLayout>
    );
  }

  return (
    <SplitLayout pill="crear cuenta">
      <form className="bq-stack" style={{ gap: 32, maxWidth: 460, width: '100%' }} onSubmit={onSubmit}>
        <div>
          <div className="bq-meta">crear cuenta</div>
          <div className="bq-h1" style={{ marginTop: 16 }}>
            Empecemos por lo básico.
          </div>
          <div className="bq-body" style={{ marginTop: 14 }}>
            Solo necesitamos tres datos para empezar.
          </div>
        </div>

        <div className="bq-stack" style={{ gap: 18 }}>
          <Field
            label="Cómo te llamas"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Tu nombre"
          />
          <Field
            label="Correo"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
          />
          <div className="bq-field">
            <Field
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
            {password && (
              <div className="bq-row" style={{ gap: 6, marginTop: 8 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 999,
                      background: i < strength ? 'var(--bq-fg)' : 'var(--bq-line)',
                    }}
                  />
                ))}
                <span className="bq-label" style={{ marginLeft: 8 }}>
                  {STRENGTH_LABEL[strength]}
                </span>
              </div>
            )}
          </div>
        </div>

        {error && <div style={{ fontSize: 13, color: '#c0392b' }}>{error}</div>}

        <div className="bq-stack" style={{ gap: 14 }}>
          <div className="bq-label">
            Al continuar aceptas que Bloque te interrumpa cuando sea hora de descansar.
          </div>
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? <Spinner /> : 'Crear cuenta →'}
          </Button>
          <div className="bq-row" style={{ justifyContent: 'center', gap: 6 }}>
            <span className="bq-label">¿Ya tienes cuenta?</span>
            <Link to="/login" className="bq-label" style={{ color: 'var(--bq-fg)' }}>
              Iniciar sesión
            </Link>
          </div>
        </div>
      </form>
    </SplitLayout>
  );
}
