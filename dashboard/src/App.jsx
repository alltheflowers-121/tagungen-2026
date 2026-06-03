import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar      from './components/Sidebar';
import Login        from './pages/Login';
import Overview     from './pages/Overview';
import Participants from './pages/Participants';
import Sessions     from './pages/Sessions';
import Einlass      from './pages/Einlass';
import EventPortal  from './pages/EventPortal';
import Users        from './pages/Users';
import Account      from './pages/Account';

// ── Geschützte Route: leitet nicht-angemeldete Nutzer zum Login ──
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="spinner" style={{ margin: '40vh auto' }} />;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page-body" style={{ paddingTop: 80, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>⊘</div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 20 }}>Keine Berechtigung</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
          Diese Seite erfordert eine höhere Zugangsstufe.
        </div>
      </div>
    );
  }
  return children;
}

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) return <div className="spinner" style={{ margin: '40vh auto' }} />;
  if (!user)   return <Login />;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={
            <ProtectedRoute roles={['admin','scanner','readonly']}><Overview /></ProtectedRoute>
          } />
          <Route path="/teilnehmende" element={
            <ProtectedRoute roles={['admin','readonly']}><Participants /></ProtectedRoute>
          } />
          <Route path="/sessions" element={
            <ProtectedRoute roles={['admin','readonly']}><Sessions /></ProtectedRoute>
          } />
          <Route path="/einlass" element={
            <ProtectedRoute roles={['admin','scanner']}><Einlass /></ProtectedRoute>
          } />
          <Route path="/portal" element={
            <ProtectedRoute roles={['admin','scanner','readonly']}><EventPortal /></ProtectedRoute>
          } />
          <Route path="/nutzer" element={
            <ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>
          } />
          <Route path="/konto"  element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/login"  element={<Navigate to="/" replace />} />
          <Route path="*"       element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
