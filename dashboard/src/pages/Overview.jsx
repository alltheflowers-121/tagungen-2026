import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboardStats } from '../api';

// Mock-Verlaufsdaten (Registrierungen pro Tag) – ersetze durch echten Endpunkt
function buildTimeline(participants) {
  const counts = {};
  participants.forEach((p) => {
    const day = p.created_at?.slice(0, 10) ?? '—';
    counts[day] = (counts[day] || 0) + 1;
  });
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function StatCard({ label, value, icon, highlight, delta }) {
  return (
    <div className={`stat-card fade-up${highlight ? ' highlight' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value ?? '—'}</div>
      {delta && <div className="delta">↑ {delta}</div>}
      <div className="bg-icon">{icon}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '8px 14px',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--amber)' }}>{payload[0].value} Registrierungen</div>
    </div>
  );
};

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  if (error) return (
    <div className="page-body">
      <div className="empty-state">
        <div className="icon">⚠</div>
        <p>API nicht erreichbar: {error}</p>
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted-2)' }}>
          Stelle sicher, dass die API auf localhost:3000 läuft.
        </p>
      </div>
    </div>
  );

  const timeline = buildTimeline(stats.participants);
  const checkinPct = stats.totalParticipants
    ? Math.round((stats.checkedIn / stats.totalParticipants) * 100)
    : 0;
  const bookingPct = stats.totalCapacity
    ? Math.round((stats.totalBooked / stats.totalCapacity) * 100)
    : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Übersicht <span>·</span></div>
          <div className="page-sub">Live-Status der Tagung</div>
        </div>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>
          ↻ Aktualisieren
        </button>
      </div>

      <div className="page-body">
        {/* ── Stat cards ── */}
        <div className="stats-grid">
          <StatCard label="Teilnehmende" value={stats.totalParticipants} icon="◎" />
          <StatCard label="Eingecheckt"  value={stats.checkedIn}          icon="◉" highlight delta={`${checkinPct}%`} />
          <StatCard label="Sessions"     value={stats.totalSessions}      icon="◷" />
          <StatCard label="Auslastung"   value={`${bookingPct}%`}         icon="◈" />
        </div>

        {/* ── Chart + Top sessions ── */}
        <div className="two-col" style={{ marginBottom: 20 }}>
          <div className="card fade-up">
            <div className="card-title">Registrierungen / Tag</div>
            {timeline.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <p>Noch keine Daten</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="amber-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#e8a020" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#e8a020" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#e8a020"
                    strokeWidth={2}
                    fill="url(#amber-grad)"
                    dot={{ fill: '#e8a020', r: 3, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Session-Auslastung ── */}
          <div className="card fade-up">
            <div className="card-title">Session-Auslastung</div>
            {stats.sessions.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <p>Keine Sessions angelegt</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {stats.sessions.slice(0, 5).map((s) => {
                  const booked = Number(s.capacity) - Number(s.available_spots ?? s.capacity);
                  const pct    = Math.round((booked / s.capacity) * 100);
                  return (
                    <div key={s.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13 }}>{s.title}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                          {booked}/{s.capacity}
                        </span>
                      </div>
                      <div className="cap-bar">
                        <div
                          className={`cap-bar-fill${pct >= 100 ? ' full' : ''}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Neueste Teilnehmende ── */}
        <div className="card fade-up">
          <div className="card-title">Neueste Registrierungen</div>
          {stats.participants.length === 0 ? (
            <div className="empty-state">
              <div className="icon">◎</div>
              <p>Noch keine Teilnehmenden registriert.</p>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>E-Mail</th>
                    <th>Unternehmen</th>
                    <th>Registriert</th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats.participants]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 8)
                    .map((p) => (
                      <tr key={p.id}>
                        <td>{p.first_name} {p.last_name}</td>
                        <td><span className="mono">{p.email}</span></td>
                        <td style={{ color: 'var(--muted)' }}>{p.company || '—'}</td>
                        <td>
                          <span className="mono">
                            {new Date(p.created_at).toLocaleDateString('de-DE')}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
