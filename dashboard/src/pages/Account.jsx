import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const { user, changePassword } = useAuth();
  const [pw, setPw]         = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError]     = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [sessions, setSessions]   = useState([]);

  useEffect(() => {
    fetch('/auth/sessions', { credentials: 'include' })
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => {});
  }, []);

  async function submitPw(e) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (pw.next !== pw.confirm) {
      return setPwError('Passwörter stimmen nicht überein.');
    }
    if (pw.next.length < 10) {
      return setPwError('Mindestens 10 Zeichen erforderlich.');
    }
    setPwLoading(true);
    try {
      await changePassword(pw.current, pw.next);
      setPwSuccess(true);
      setPw({ current: '', next: '', confirm: '' });
    } catch (e) {
      setPwError(e.message);
    } finally {
      setPwLoading(false);
    }
  }

  const ROLE_META = {
    admin:    { label: 'Admin',    badge: 'badge-amber' },
    scanner:  { label: 'Scanner', badge: 'badge-blue' },
    readonly: { label: 'Lesen',   badge: 'badge-muted' },
  };

  const meta = ROLE_META[user?.role] ?? {};

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Mein Konto</div>
          <div className="page-sub">{user?.email}</div>
        </div>
      </div>

      <div className="page-body">
        <div className="two-col" style={{ alignItems: 'start' }}>

          {/* ── Profil ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card fade-up">
              <div className="card-title">Profil</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted-2)', textTransform: 'uppercase', marginBottom: 4 }}>Name</div>
                  <div style={{ fontWeight: 600 }}>{user?.display_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted-2)', textTransform: 'uppercase', marginBottom: 4 }}>E-Mail</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{user?.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted-2)', textTransform: 'uppercase', marginBottom: 4 }}>Rolle</div>
                  <span className={`badge ${meta.badge}`}>{meta.label}</span>
                </div>
              </div>
            </div>

            {/* ── Aktive Sessions ── */}
            <div className="card fade-up">
              <div className="card-title">Aktive Sitzungen</div>
              {sessions.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Keine weiteren aktiven Sitzungen.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sessions.map((s) => (
                    <div key={s.id} style={{
                      padding: '10px 14px',
                      background: 'var(--surface-2)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                        {s.ip ?? 'Unbekannte IP'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted-2)', marginBottom: 2 }}>
                        {s.user_agent?.split(' ').slice(-2).join(' ') ?? '—'}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted-2)' }}>
                        Angemeldet: {new Date(s.created_at).toLocaleString('de-DE')}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted-2)' }}>
                        Läuft ab: {new Date(s.expires_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Passwort ändern ── */}
          <div className="card fade-up">
            <div className="card-title">Passwort ändern</div>
            <form onSubmit={submitPw} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Aktuelles Passwort</label>
                <input
                  type="password"
                  value={pw.current}
                  onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Neues Passwort <span style={{ color: 'var(--muted-2)' }}>(min. 10 Zeichen, 1 Großbuchstabe, 1 Zahl)</span></label>
                <input
                  type="password"
                  value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Passwort wiederholen</label>
                <input
                  type="password"
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              {pwError && (
                <div style={{ color: 'var(--red)', fontSize: 13, padding: '8px 12px', background: 'rgba(224,92,92,0.1)', borderRadius: 6 }}>
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div style={{ color: 'var(--green)', fontSize: 13, padding: '8px 12px', background: 'rgba(76,175,120,0.1)', borderRadius: 6 }}>
                  ✓ Passwort geändert. Alle anderen Sitzungen wurden beendet.
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={pwLoading}
                style={{ alignSelf: 'flex-start' }}
              >
                {pwLoading ? '…' : 'Passwort ändern'}
              </button>
            </form>

            <div style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--muted-2)',
              lineHeight: 1.7,
            }}>
              Nach dem Ändern des Passworts werden alle anderen aktiven Sitzungen automatisch beendet.
              Du bleibst in dieser Sitzung angemeldet.
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
