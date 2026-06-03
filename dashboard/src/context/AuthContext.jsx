import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const BASE = '/auth';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include', // Cookies mitsenden
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // initiales Session-Check

  // Beim Start: prüfen ob noch eine Session aktiv ist
  useEffect(() => {
    apiFetch('/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiFetch('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }, []);

  const changePassword = useCallback((current_password, new_password) =>
    apiFetch('/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }), []);

  // Nutzerverwaltung (admin)
  const getUsers    = ()       => apiFetch('/users');
  const createUser  = (data)   => apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
  const updateUser  = (id, d)  => apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(d) });
  const deleteUser  = (id)     => apiFetch(`/users/${id}`, { method: 'DELETE' });
  const resetPw     = (id, pw) => apiFetch(`/users/${id}/reset-password`, {
    method: 'POST', body: JSON.stringify({ new_password: pw }),
  });

  // Hilfsfunktionen
  const can = {
    admin:    user?.role === 'admin',
    scanner:  ['admin', 'scanner'].includes(user?.role),
    readonly: ['admin', 'scanner', 'readonly'].includes(user?.role),
  };

  return (
    <AuthContext.Provider value={{
      user, loading, can,
      login, logout, changePassword,
      getUsers, createUser, updateUser, deleteUser, resetPw,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
  return ctx;
};
