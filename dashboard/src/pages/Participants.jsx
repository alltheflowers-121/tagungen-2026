import { useState, useEffect } from 'react';
import { getParticipants, createParticipant, getTicketJson, sendTicketEmail, sendTicketBulk } from '../api';
import { useAuth } from '../context/AuthContext';

// ── QR-Code Modal ─────────────────────────────────────────────
function QRModal({ participant, onClose }) {
  const [qr, setQr]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [sendError, setSendError] = useState(null);

  useEffect(() => {
    if (!participant?.ticket_token) { setLoading(false); return; }
    getTicketJson(participant.ticket_token)
      .then(setQr)
      .catch(() => setQr(null))
      .finally(() => setLoading(false));
  }, [participant]);

  async function handleSend() {
    setSending(true);
    setSendError(null);
    try {
      await sendTicketEmail(participant.id);
      setSent(true);
    } catch (e) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="modal-title">Eintrittskarte</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>
            {participant.first_name} {participant.last_name}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{participant.email}</div>
          {participant.company && (
            <div style={{ color: 'var(--muted-2)', fontSize: 12, marginTop: 2 }}>{participant.company}</div>
          )}
        </div>

        <div className="qr-wrap">
          {loading && <div className="spinner" style={{ margin: '20px auto' }} />}
          {!loading && qr?.qr_data_url && (
            <>
              <img src={qr.qr_data_url} alt="QR Code" width={220} height={220} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted-2)' }}>
                Token: {qr.token?.slice(0, 18)}…
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <a
                  href={qr.qr_data_url}
                  download={`ticket-${participant.last_name}.png`}
                  className="btn btn-ghost"
                >↓ PNG</a>
                <button
                  className="btn btn-primary"
                  onClick={handleSend}
                  disabled={sending || sent}
                >
                  {sending ? '…' : sent ? '✓ Gesendet' : '✉ Ticket per E-Mail senden'}
                </button>
              </div>
              {sendError && (
                <div style={{ color: 'var(--red)', fontSize: 12, textAlign: 'center' }}>{sendError}</div>
              )}
              {sent && (
                <div style={{ color: 'var(--green)', fontSize: 12 }}>
                  Ticket wurde an {participant.email} gesendet.
                </div>
              )}
            </>
          )}
          {!loading && !qr?.qr_data_url && (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>
              Kein Ticket gefunden.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Registrierung Modal ───────────────────────────────────────
function RegisterModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState({ first_name: '', last_name: '', email: '', company: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await createParticipant(form);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="modal-title">Teilnehmer/in registrieren</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Vorname *</label>
              <input value={form.first_name} onChange={set('first_name')} placeholder="Anna" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Nachname *</label>
              <input value={form.last_name} onChange={set('last_name')} placeholder="Müller" style={{ width: '100%' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>E-Mail *</label>
            <input value={form.email} onChange={set('email')} type="email" placeholder="anna@example.com" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Unternehmen</label>
            <input value={form.company} onChange={set('company')} placeholder="optional" style={{ width: '100%' }} />
          </div>
          {error && (
            <div style={{ color: 'var(--red)', fontSize: 13, padding: '8px 12px', background: 'rgba(224,92,92,0.1)', borderRadius: 6 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              {loading ? '…' : '+ Registrieren'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bulk-Versand Modal ────────────────────────────────────────
function BulkModal({ selected, total, onClose }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState(null);

  const count = selected.length || total;

  async function send() {
    setLoading(true);
    setError(null);
    try {
      await sendTicketBulk(selected.length ? selected : undefined);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="modal-title">Tickets versenden</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {!done ? (
          <>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
              Es werden Ticket-E-Mails an <strong style={{ color: 'var(--text)' }}>{count} Teilnehmende</strong> gesendet.
              Der Versand läuft im Hintergrund – du kannst das Fenster schließen.
            </div>
            <div style={{
              background: 'var(--amber-dim)',
              border: '1px solid rgba(232,160,32,0.3)',
              borderRadius: 6, padding: '10px 14px',
              fontSize: 13, color: 'var(--amber)', marginBottom: 20,
            }}>
              ⚠ Bereits gesendete Tickets werden erneut gesendet. Bitte nur bei Bedarf.
            </div>
            {error && (
              <div style={{ color: 'var(--red)', fontSize: 13, padding: '8px 12px', background: 'rgba(224,92,92,0.1)', borderRadius: 6, marginBottom: 14 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
              <button className="btn btn-primary" onClick={send} disabled={loading}>
                {loading ? 'Wird gesendet…' : `✉ ${count} Tickets senden`}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Versand gestartet
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              Die E-Mails werden sequenziell versendet. Fortschritt im Server-Log.
            </div>
            <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hauptseite ────────────────────────────────────────────────
export default function Participants() {
  const { can } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState(new Set());
  const [qrTarget, setQrTarget]         = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showBulk, setShowBulk]         = useState(false);

  function load() {
    setLoading(true);
    getParticipants().then(setParticipants).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = participants.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q)  ||
      p.email.toLowerCase().includes(q)       ||
      (p.company || '').toLowerCase().includes(q)
    );
  });

  function toggleSelect(id) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Teilnehmende</div>
          <div className="page-sub">{participants.length} registrierte Personen</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {can.admin && (
            <button
              className="btn btn-ghost"
              onClick={() => setShowBulk(true)}
              title="Tickets an alle / Auswahl senden"
            >
              ✉ {selected.size > 0 ? `${selected.size} Tickets senden` : 'Alle Tickets senden'}
            </button>
          )}
          {can.admin && (
            <button className="btn btn-primary" onClick={() => setShowRegister(true)}>
              + Registrieren
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="search-bar">
          <input
            placeholder="Name, E-Mail oder Unternehmen suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {selected.size > 0 && (
            <span style={{ color: 'var(--amber)', fontSize: 13, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
              {selected.size} ausgewählt
            </span>
          )}
          <span style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            {filtered.length} Treffer
          </span>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">◎</div>
            <p>Keine Teilnehmenden gefunden.</p>
          </div>
        ) : (
          <div className="table-wrap fade-up">
            <table>
              <thead>
                <tr>
                  {can.admin && (
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleAll}
                        title="Alle auswählen"
                      />
                    </th>
                  )}
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Unternehmen</th>
                  <th>Registriert</th>
                  <th>Ticket</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} style={selected.has(p.id) ? { background: 'var(--amber-glow)' } : {}}>
                    {can.admin && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                        />
                      </td>
                    )}
                    <td style={{ fontWeight: 500 }}>{p.first_name} {p.last_name}</td>
                    <td><span className="mono">{p.email}</span></td>
                    <td style={{ color: 'var(--muted)' }}>{p.company || '—'}</td>
                    <td>
                      <span className="mono">
                        {new Date(p.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => setQrTarget(p)}
                      >
                        QR / ✉
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {qrTarget     && <QRModal      participant={qrTarget} onClose={() => setQrTarget(null)} />}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onSuccess={load} />}
      {showBulk     && (
        <BulkModal
          selected={[...selected]}
          total={participants.length}
          onClose={() => setShowBulk(false)}
        />
      )}
    </>
  );
}
