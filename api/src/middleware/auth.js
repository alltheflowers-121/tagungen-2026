const db = require('../db');

// ── Session aus Cookie lesen & Nutzer laden ───────────────────
async function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) {
    return res.status(401).json({ error: 'Nicht angemeldet.' });
  }

  try {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.display_name, u.role, u.active,
              s.expires_at, s.revoked
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Ungültige Sitzung.' });
    }

    const session = rows[0];

    if (session.revoked) {
      return res.status(401).json({ error: 'Sitzung wurde beendet.' });
    }
    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Sitzung abgelaufen. Bitte erneut anmelden.' });
    }
    if (!session.active) {
      return res.status(403).json({ error: 'Konto deaktiviert.' });
    }

    // Nutzer an Request anhängen
    req.user = {
      id:          session.id,
      email:       session.email,
      displayName: session.display_name,
      role:        session.role,
    };

    next();
  } catch (err) {
    console.error('Auth-Middleware-Fehler:', err);
    res.status(500).json({ error: 'Authentifizierungsfehler.' });
  }
}

// ── Rollen-Guards ─────────────────────────────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nicht angemeldet.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Keine Berechtigung. Benötigt: ${roles.join(' oder ')}.`,
      });
    }
    next();
  };
}

// Vordefinierte Guards
const requireAdmin    = requireRole('admin');
const requireScanner  = requireRole('admin', 'scanner');
const requireReadonly = requireRole('admin', 'scanner', 'readonly');

module.exports = { requireAuth, requireRole, requireAdmin, requireScanner, requireReadonly };
