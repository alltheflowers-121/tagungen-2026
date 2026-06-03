import { useState } from 'react';
import { checkin } from '../api';

const HISTORY_MAX = 20;

export default function Einlass() {
  const [token, setToken]     = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  async function scan(e) {
    e.preventDefault();
    const t = token.trim();
    if (!t) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await checkin(t);
      const entry = { ...data, token: t, ts: new Date() };
      setResult({ ok: true, data: entry });
      setHistory((h) => [entry, ...h].slice(0, HISTORY_MAX));
    } catch (err) {
      const entry = { error: err.message, token: t, ts: new Date() };
      setResult({ ok: false, data: entry });
      setHistory((h) => [{ ...entry, ok: false }, ...h].slice(0, HISTORY_MAX));
    } finally {
      setLoading(false);
      setToken('');
    }
  }

  const checkedInCount = history.filter((h) => h.valid !== false && !h.error).length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Einlass <span>·</span></div>
          <div className="page-sub">QR-Code scannen oder Token manuell eingeben</div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: 'var(--amber)',
          background: 'var(--amber-dim)',
          padding: '6px 14px',
          borderRadius: 6,
        }}>
          ◉ {checkedInCount} eingecheckt
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Scanner ── */}
          <div>
            <div className="card fade-up">
              <div className="card-title">Token eingeben</div>
              <form onSubmit={scan} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="UUID aus dem QR-Code…"
                  autoFocus
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 13, width: '100%' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !token.trim()}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {loading ? '…' : '◉ Einlass prüfen'}
                </button>
              </form>

              {/* ── Ergebnis ── */}
              {result && (
                <div
                  className="fade-up"
                  style={{
                    marginTop: 20,
                    padding: 16,
                    borderRadius: 8,
                    border: `1px solid ${result.ok ? 'var(--green)' : 'var(--red)'}`,
                    background: result.ok
                      ? 'rgba(76,175,120,0.08)'
                      : 'rgba(224,92,92,0.08)',
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--font-head)',
                    fontSize: 16,
                    fontWeight: 700,
                    color: result.ok ? 'var(--green)' : 'var(--red)',
                    marginBottom: 8,
                  }}>
                    {result.ok ? '✓ Einlass erlaubt' : '✗ Einlass verweigert'}
                  </div>
                  {result.ok && result.data.participant && (
                    <div style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{result.data.participant.name}</div>
                      <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {result.data.participant.email}
                      </div>
                      {result.data.participant.company && (
                        <div style={{ color: 'var(--muted-2)', fontSize: 12, marginTop: 2 }}>
                          {result.data.participant.company}
                        </div>
                      )}
                    </div>
                  )}
                  {!result.ok && (
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {result.data.error}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card fade-up" style={{ marginTop: 16 }}>
              <div className="card-title">Hinweis</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                Beim Scan eines QR-Codes wird das Token automatisch in das Eingabefeld übertragen.
                Verbinde dein Scan-Gerät als HID-Keyboard und stelle sicher, dass das Feld fokussiert ist.
                Jedes Token kann nur <strong style={{ color: 'var(--text)' }}>einmal</strong> verwendet werden.
              </div>
            </div>
          </div>

          {/* ── Verlauf ── */}
          <div className="card fade-up">
            <div className="card-title">Check-in-Verlauf</div>
            {history.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <div className="icon">◉</div>
                <p>Noch keine Scans in dieser Sitzung.</p>
              </div>
            ) : (
              <div className="table-wrap" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Zeit</th>
                      <th>Name</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td>
                          <span className="mono">
                            {h.ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {h.participant?.name ?? (
                            <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                              {h.token?.slice(0, 12)}…
                            </span>
                          )}
                        </td>
                        <td>
                          {h.valid === false || h.error
                            ? <span className="badge badge-red">
                                {h.already_checked_in ? 'Doppelt' : 'Ungültig'}
                              </span>
                            : <span className="badge badge-green">OK</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
