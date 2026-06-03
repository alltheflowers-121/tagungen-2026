const express  = require('express');
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const { body, param, validationResult } = require('express-validator');
const db       = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const COOKIE_NAME    = 'session';
const SESSION_HOURS  = 8;
const BCRYPT_ROUNDS  = 12;

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  secure:   process.env.NODE_ENV === 'production', // HTTPS only in prod
  maxAge:   SESSION_HOURS * 60 * 60 * 1000,
};

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}

function safeUser(u) {
  return { id: u.id, email: u.email, display_name: u.display_name, role: u.role, active: u.active, created_at: u.created_at, last_login_at: u.last_login_at };
}

// ── POST /auth/login ─────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res) => {
    const { email, password } = req.body;

    try {
      const { rows } = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      const user = rows[0];

      // Timing-safe: immer hashen, auch wenn Nutzer nicht existiert
      const hashToCheck = user?.password_hash ?? '$2a$12$invalidhashfortimingsafety00000000000000000';
      const valid = await bcrypt.compare(password, hashToCheck);

      if (!user || !valid) {
        return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
      }
      if (!user.active) {
        return res.status(403).json({ error: 'Konto deaktiviert. Bitte Admin kontaktieren.' });
      }

      // Session-Token erzeugen
      const token     = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);

      await db.query(
        `INSERT INTO auth_sessions (user_id, token, ip, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          token,
          req.ip,
          req.headers['user-agent'] ?? null,
          expiresAt,
        ]
      );

      // last_login aktualisieren
      await db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
      res.json({
        user: safeUser(user),
        expires_at: expiresAt,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login fehlgeschlagen.' });
    }
  }
);

// ── POST /auth/logout ────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  try {
    await db.query(
      'UPDATE auth_sessions SET revoked = TRUE WHERE token = $1',
      [token]
    );
    res.clearCookie(COOKIE_NAME);
    res.json({ message: 'Erfolgreich abgemeldet.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Logout fehlgeschlagen.' });
  }
});

// ── GET /auth/me ─────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Nutzer nicht gefunden.' });
    res.json(safeUser(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ── GET /auth/sessions ───────────────────────────────────────
// Eigene aktive Sitzungen anzeigen
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, ip, user_agent, created_at, expires_at
       FROM auth_sessions
       WHERE user_id = $1
         AND revoked = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ── POST /auth/change-password ───────────────────────────────
router.post(
  '/change-password',
  requireAuth,
  [
    body('current_password').notEmpty(),
    body('new_password')
      .isLength({ min: 10 }).withMessage('Mindestens 10 Zeichen')
      .matches(/[A-Z]/).withMessage('Mindestens ein Großbuchstabe')
      .matches(/[0-9]/).withMessage('Mindestens eine Zahl'),
  ],
  validate,
  async (req, res) => {
    const { current_password, new_password } = req.body;
    try {
      const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const valid = await bcrypt.compare(current_password, rows[0].password_hash);
      if (!valid) return res.status(401).json({ error: 'Aktuelles Passwort falsch.' });

      const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

      // Alle anderen Sessions widerrufen (außer der aktuellen)
      const currentToken = req.cookies?.[COOKIE_NAME];
      await db.query(
        `UPDATE auth_sessions SET revoked = TRUE
         WHERE user_id = $1 AND token != $2`,
        [req.user.id, currentToken]
      );

      res.json({ message: 'Passwort geändert. Alle anderen Sitzungen wurden beendet.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Serverfehler.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
//  Admin: Nutzerverwaltung
// ═══════════════════════════════════════════════════════════════

// ── GET /auth/users ──────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, email, display_name, role, active, created_at, last_login_at FROM users ORDER BY created_at'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ── POST /auth/users ─────────────────────────────────────────
router.post(
  '/users',
  requireAuth,
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('display_name').trim().notEmpty(),
    body('password').isLength({ min: 10 }),
    body('role').isIn(['admin', 'scanner', 'readonly']),
  ],
  validate,
  async (req, res) => {
    const { email, display_name, password, role } = req.body;
    try {
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const { rows } = await db.query(
        `INSERT INTO users (email, display_name, password_hash, role)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [email, display_name, hash, role]
      );
      res.status(201).json(safeUser(rows[0]));
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'E-Mail bereits vorhanden.' });
      console.error(err);
      res.status(500).json({ error: 'Serverfehler.' });
    }
  }
);

// ── PATCH /auth/users/:id ────────────────────────────────────
router.patch(
  '/users/:id',
  requireAuth,
  requireAdmin,
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    const { display_name, role, active } = req.body;
    const updates = [];
    const values  = [];
    let idx = 1;

    if (display_name !== undefined) { updates.push(`display_name = $${idx++}`); values.push(display_name); }
    if (role         !== undefined) { updates.push(`role = $${idx++}`);         values.push(role); }
    if (active       !== undefined) { updates.push(`active = $${idx++}`);       values.push(active); }

    if (updates.length === 0) return res.status(400).json({ error: 'Nichts zu aktualisieren.' });

    values.push(req.params.id);
    try {
      const { rows } = await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Nutzer nicht gefunden.' });
      res.json(safeUser(rows[0]));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Serverfehler.' });
    }
  }
);

// ── DELETE /auth/users/:id ───────────────────────────────────
router.delete(
  '/users/:id',
  requireAuth,
  requireAdmin,
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Eigenes Konto kann nicht gelöscht werden.' });
    }
    try {
      await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
      res.json({ message: 'Nutzer gelöscht.' });
    } catch (err) {
      res.status(500).json({ error: 'Serverfehler.' });
    }
  }
);

// ── POST /auth/users/:id/reset-password ──────────────────────
router.post(
  '/users/:id/reset-password',
  requireAuth,
  requireAdmin,
  [param('id').isUUID(), body('new_password').isLength({ min: 10 })],
  validate,
  async (req, res) => {
    try {
      const hash = await bcrypt.hash(req.body.new_password, BCRYPT_ROUNDS);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
      // Alle Sessions dieses Nutzers widerrufen
      await db.query('UPDATE auth_sessions SET revoked = TRUE WHERE user_id = $1', [req.params.id]);
      res.json({ message: 'Passwort zurückgesetzt, alle Sitzungen beendet.' });
    } catch (err) {
      res.status(500).json({ error: 'Serverfehler.' });
    }
  }
);

module.exports = router;
