import { useState, useEffect } from 'react';
import { getSessions } from '../api';

function CapacityBar({ capacity, available }) {
  const booked = capacity - (available ?? capacity);
  const pct    = Math.min(Math.round((booked / capacity) * 100), 100);
  const full   = pct >= 100;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: full ? 'var(--red)' : 'var(--muted)' }}>
          {booked} / {capacity} Plätze
        </span>
        <span className={`badge badge-${full ? 'red' : pct > 80 ? 'amber' : 'green'}`}>
          {full ? 'ausgebucht' : `${pct}%`}
        </span>
      </div>
      <div className="cap-bar">
        <div className={`cap-bar-fill${full ? ' full' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState('cards'); // 'cards' | 'table'

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  const total   = sessions.length;
  const full    = sessions.filter((s) => Number(s.available_spots) === 0).length;
  const totCap  = sessions.reduce((n, s) => n + Number(s.capacity), 0);
  const totBook = sessions.reduce((n, s) => n + (Number(s.capacity) - Number(s.available_spots ?? s.capacity)), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Sessions</div>
          <div className="page-sub">
            {total} Sessions · {totBook}/{totCap} Plätze belegt · {full} ausgebucht
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${view === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('cards')}
          >◫ Karten</button>
          <button
            className={`btn ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('table')}
          >≡ Tabelle</button>
        </div>
      </div>

      <div className="page-body">
        {loading && <div className="spinner" />}

        {!loading && sessions.length === 0 && (
          <div className="empty-state">
            <div className="icon">◷</div>
            <p>Noch keine Sessions angelegt.</p>
            <p style={{ marginTop: 6, fontSize: 12, color: 'var(--muted-2)' }}>
              Sessions können direkt über die Datenbank oder einen Admin-API-Endpunkt angelegt werden.
            </p>
          </div>
        )}

        {!loading && sessions.length > 0 && view === 'cards' && (
          <div className="three-col fade-up">
            {sessions.map((s) => {
              const booked = Number(s.capacity) - Number(s.available_spots ?? s.capacity);
              const pct    = Math.round((booked / s.capacity) * 100);
              const full   = pct >= 100;

              return (
                <div key={s.id} className="card">
                  <div style={{ marginBottom: 10 }}>
                    <span className={`badge badge-${full ? 'red' : pct > 80 ? 'amber' : 'green'}`}>
                      {full ? 'Ausgebucht' : `${Number(s.available_spots ?? 0)} frei`}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-head)',
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 6,
                    lineHeight: 1.3,
                  }}>
                    {s.title}
                  </div>
                  {s.description && (
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                      {s.description}
                    </div>
                  )}
                  {s.location && (
                    <div style={{ fontSize: 12, color: 'var(--muted-2)', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
                      ◎ {s.location}
                    </div>
                  )}
                  {s.starts_at && (
                    <div style={{ fontSize: 12, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
                      {new Date(s.starts_at).toLocaleString('de-DE', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  )}
                  <CapacityBar capacity={Number(s.capacity)} available={Number(s.available_spots)} />
                </div>
              );
            })}
          </div>
        )}

        {!loading && sessions.length > 0 && view === 'table' && (
          <div className="table-wrap fade-up">
            <table>
              <thead>
                <tr>
                  <th>Titel</th>
                  <th>Ort</th>
                  <th>Beginn</th>
                  <th>Belegt</th>
                  <th>Kapazität</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const booked = Number(s.capacity) - Number(s.available_spots ?? s.capacity);
                  const pct    = Math.round((booked / s.capacity) * 100);
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.title}</td>
                      <td style={{ color: 'var(--muted)' }}>{s.location || '—'}</td>
                      <td>
                        <span className="mono">
                          {s.starts_at
                            ? new Date(s.starts_at).toLocaleString('de-DE', {
                                month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="mono">{booked}</span>
                      </td>
                      <td>
                        <span className="mono">{s.capacity}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${pct >= 100 ? 'red' : pct > 80 ? 'amber' : 'green'}`}>
                          {pct >= 100 ? 'Ausgebucht' : `${pct}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
