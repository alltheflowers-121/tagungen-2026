import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLES = ['admin', 'scanner', 'readonly'];

const ROLE_META = {
  admin:    { label: 'Admin',    badge: 'badge-amber', desc: 'Vollzugriff' },
  scanner:  { label: 'Scanner', badge: 'badge-blue',  desc: 'Nur Einlass' },
  readonly: { label: 'Lesen',   badge: 'badge-muted', desc: 'Nur lesen'   },
};

function UserModal({ existing, onClose, onSaved, authCtx }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    email:        existing?.email        ?? '',
    display_name: existing?.display_name ?? '',
    role:         existing?.role         ?? 'readonly',
    password:     '',
    active:       existing?.active       ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save() {
    setError(null);
    setLoading(true);
    try {
      if (isEdit) {
        await authCtx.updateUser(existing.id, {
          display_name: form.display_name,
          role:         form.role,
          active:       form.active,
        });
        if (form.password) {
          await authCtx.resetPw(existing.id, form.password);
        }
      } else {
        await authCtx.createUser({
          email:        form.email,
          display_name: form.display_name,
          password:     form.password,
          role:         form.role,
        });
      }
      onSaved();
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
          <div className="modal-title">{isEdit ? 'Nutzer bearbeiten' : 'Neuer Nutzer'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!isEdit && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>E-Mail *</label>
              <input value={form.email} onChange={set('email')} type="email" style={{ width: '100%' }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Anzeigename *</label>
            <input value={form.display_name} onChange={set('display_name')} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Rolle</label>
            <select value={form.role} onChange={set('role')} style={{ width: '100%' }}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_META[r].label} – {ROLE_META[r].desc}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              {isEdit ? 'Neues Passwort (leer lassen = nicht ändern)' : 'Passwort * (min. 10 Zeichen)'}
            </label>
            <input value={form.password} onChange={set('password')} type="password" style={{ width: '100%' }} />
          </div>
          {isEdit && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.active} onChange={set('active')} />
              Konto aktiv
            </label>
          )}

          {error && (
            <div style={{ color: 'var(--red)', fontSize: 13, padding: '8px 12px', background: 'rgba(224,92,92,0.1)', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
            <button className="btn btn-primary" onClick={save} disabled={loading}>
              {loading ? '…' : (isEdit ? 'Speichern' : '+ Erstellen')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const auth = useAuth();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'new' | user-object

  function load() {
    setLoading(true);
    auth.getUsers().then(setUsers).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(u) {
    if (!confirm(`Nutzer "${u.display_name}" wirklich löschen?`)) return;
    try {
      await auth.deleteUser(u.id);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Nutzerverwaltung</div>
          <div className="page-sub">{users.length} Konten · Rollen: Admin, Scanner, Readonly</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Nutzer anlegen</button>
      </div>

      <div className="page-body">
        {/* ── Rollen-Erklärung ── */}
        <div className="three-col" style={{ marginBottom: 24 }}>
          {Object.entries(ROLE_META).map(([role, meta]) => (
            <div key={role} className="card" style={{ padding: '16px 20px' }}>
              <span className={`badge ${meta.badge}`} style={{ marginBottom: 8, display: 'inline-block' }}>{meta.label}</span>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {role === 'admin'    && 'Alle Seiten, Daten schreiben, Nutzer verwalten'}
                {role === 'scanner'  && 'Nur Einlass-Seite & Check-in-Endpunkt'}
                {role === 'readonly' && 'Übersicht, Teilnehmende & Sessions nur lesen'}
              </div>
            </div>
          ))}
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrap fade-up">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Status</th>
                  <th>Letzter Login</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const meta = ROLE_META[u.role];
                  const isMe = u.id === auth.user?.id;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>
                        {u.display_name}
                        {isMe && <span className="badge badge-muted" style={{ marginLeft: 8 }}>ich</span>}
                      </td>
                      <td><span className="mono">{u.email}</span></td>
                      <td><span className={`badge ${meta.badge}`}>{meta.label}</span></td>
                      <td>
                        <span className={`badge ${u.active ? 'badge-green' : 'badge-red'}`}>
                          {u.active ? 'Aktiv' : 'Deaktiviert'}
                        </span>
                      </td>
                      <td>
                        <span className="mono">
                          {u.last_login_at
                            ? new Date(u.last_login_at).toLocaleString('de-DE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'Nie'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setModal(u)}
                          >Bearbeiten</button>
                          {!isMe && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '4px 10px', fontSize: 12, color: 'var(--red)', borderColor: 'rgba(224,92,92,0.3)' }}
                              onClick={() => handleDelete(u)}
                            >Löschen</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <UserModal
          existing={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
          authCtx={auth}
        />
      )}
    </>
  );
}
