const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

// ── Hilfsfunktion ────────────────────────────────────────────
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// ── POST /participants ───────────────────────────────────────
// Teilnehmende registrieren + Ticket automatisch erstellen
router.post(
  '/',
  [
    body('first_name').trim().notEmpty().withMessage('Vorname erforderlich'),
    body('last_name').trim().notEmpty().withMessage('Nachname erforderlich'),
    body('email').isEmail().normalizeEmail().withMessage('Gültige E-Mail erforderlich'),
    body('company').optional().trim(),
  ],
  validate,
  async (req, res) => {
    const { first_name, last_name, email, company } = req.body;

    try {
      // Transaktion: Teilnehmer + Ticket in einem Schritt anlegen
      await db.query('BEGIN');

      const { rows } = await db.query(
        `INSERT INTO participants (first_name, last_name, email, company)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [first_name, last_name, email, company || null]
      );
      const participant = rows[0];

      // Ticket automatisch mitgenerieren
      const { rows: ticketRows } = await db.query(
        `INSERT INTO tickets (participant_id)
         VALUES ($1)
         RETURNING id, token, issued_at`,
        [participant.id]
      );

      await db.query('COMMIT');

      res.status(201).json({
        participant,
        ticket: ticketRows[0],
        message: 'Registrierung erfolgreich. QR-Code unter GET /tickets/:token abrufbar.',
      });
    } catch (err) {
      await db.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ error: 'E-Mail bereits registriert.' });
      }
      console.error(err);
      res.status(500).json({ error: 'Serverfehler bei der Registrierung.' });
    }
  }
);

// ── GET /participants/:id ────────────────────────────────────
// Teilnehmer-Profil mit Auswahlen abrufen
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Ungültige ID')],
  validate,
  async (req, res) => {
    try {
      const { rows } = await db.query(
        `SELECT p.*,
                json_agg(DISTINCT jsonb_build_object(
                  'session_id', s.id,
                  'title', s.title,
                  'starts_at', s.starts_at,
                  'location', s.location
                )) FILTER (WHERE s.id IS NOT NULL) AS sessions,
                json_agg(DISTINCT jsonb_build_object(
                  'food_option_id', f.id,
                  'name', f.name
                )) FILTER (WHERE f.id IS NOT NULL) AS food_options
         FROM participants p
         LEFT JOIN participant_sessions ps ON ps.participant_id = p.id
         LEFT JOIN sessions s             ON s.id = ps.session_id
         LEFT JOIN participant_food pf    ON pf.participant_id = p.id
         LEFT JOIN food_options f         ON f.id = pf.food_option_id
         WHERE p.id = $1
         GROUP BY p.id`,
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Teilnehmer nicht gefunden.' });
      }
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Serverfehler.' });
    }
  }
);

// ── GET /participants ────────────────────────────────────────
// Alle Teilnehmenden auflisten (für Admins)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, first_name, last_name, email, company, created_at
       FROM participants
       ORDER BY last_name, first_name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

module.exports = router;
