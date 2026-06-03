import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        opacity: 0.4,
      }} />

      <div className="fade-up" style={{
        width: '100%',
        maxWidth: 380,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontFamily: 'var(--font-head)',
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.03em',
          }}>
            Tagungs<span style={{ color: 'var(--amber)' }}>App</span>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted-2)',
            marginTop: 4,
          }}>Admin Dashboard</div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
        }}>
          <div style={{
            fontFamily: 'var(--font-head)',
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 6,
          }}>Anmelden</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
            Bitte melde dich mit deinem Konto an.
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dein@konto.de"
                required
                autoFocus
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                style={{ width: '100%' }}
              />
            </div>

            {error && (
              <div style={{
                color: 'var(--red)',
                fontSize: 13,
                padding: '10px 12px',
                background: 'rgba(224,92,92,0.1)',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(224,92,92,0.2)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '10px' }}
            >
              {loading ? 'Anmelden…' : 'Anmelden →'}
            </button>
          </form>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: 12,
          color: 'var(--muted-2)',
          fontFamily: 'var(--font-mono)',
        }}>
          Konto vergessen? Admin kontaktieren.
        </div>
      </div>
    </div>
  );
}
