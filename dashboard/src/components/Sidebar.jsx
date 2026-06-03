import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/',              icon: '◈', label: 'Übersicht',      roles: ['admin','scanner','readonly'] },
  { to: '/teilnehmende', icon: '◎', label: 'Teilnehmende',   roles: ['admin','readonly'] },
  { to: '/sessions',     icon: '◷', label: 'Sessions',       roles: ['admin','readonly'] },
  { to: '/portal',       icon: '◑', label: 'Teiln.-Portal',  roles: ['admin','readonly'] },
  { to: '/einlass',      icon: '◉', label: 'Einlass',        roles: ['admin','scanner'] },
  { to: '/nutzer',       icon: '⊛', label: 'Nutzer',         roles: ['admin'] },
];

const ROLE_LABEL = { admin: 'Admin', scanner: 'Scanner', readonly: 'Lesen' };

export default function Sidebar() {
  const { user, logout, can } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="wordmark">Tagungs<span>App</span></div>
        <div className="sub">Admin · v1.0</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">Navigation</div>
        {NAV.filter((n) => n.roles.includes(user?.role)).map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <NavLink
          to="/konto"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          style={{ marginBottom: 4 }}
        >
          <span className="icon">○</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.display_name}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {ROLE_LABEL[user?.role]}
            </div>
          </div>
        </NavLink>
        <button
          onClick={logout}
          className="nav-item"
          style={{ width: '100%', color: 'var(--muted-2)', fontSize: 13 }}
        >
          <span className="icon" style={{ fontSize: 14 }}>→</span>
          Abmelden
        </button>
      </div>
    </aside>
  );
}
