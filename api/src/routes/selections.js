const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}

// ── GET /sessions ────────────────────────────────────────────
// Alle verfügbaren Sessions mit freien Plätzen
router.get('/sessions', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*,
              s.capacity - COUNT(ps.participant_id) AS available_spots
       FROM sessions s
       LEFT JOIN participant_sessions ps ON ps.session_id = s.id
       GROUP BY s.id
       ORDER BY s.starts_at`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ── GET /food-options ────────────────────────────────────────
router.get('/food-options', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM food_options ORDER BY day NULLS FIRST, name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ── PUT /participants/:id/selections ────────────────────────
// Auswahlen speichern (sessions + Essen), idempotent
router.put(
  '/participants/:id/selections',
  [
    param('id').isUUID(),
    body('session_ids').isArray().withMessage('session_ids muss ein Array sein'),
    body('session_ids.*').isUUID().withMessage('Jede Session-ID muss eine UUID sein'),
    body('food_option_ids').isArray().withMessage('food_option_ids muss ein Array sein'),
    body('food_option_ids.*').isUUID().withMessage('Jede Food-ID muss eine UUID sein'),
  ],
  validate,
  async (req, res) => {
    const { id } = req.params;
    const { session_ids, food_option_ids } = req.body;

    try {
      // Prüfen ob Teilnehmer existiert
      const { rows: pRows } = await db.query(
        'SELECT id FROM participants WHERE id = $1', [id]
      );
      if (pRows.length === 0) {
        return res.status(404).json({ error: 'Teilnehmer nicht gefunden.' });
      }

      await db.query('BEGIN');

      // ── Sessions: Kapazitätsprüfung ──────────────────────
      if (session_ids.length > 0) {
        const { rows: capRows } = await db.query(
          `SELECT s.id, s.title, s.capacity,
                  COUNT(ps.participant_id) AS booked
           FROM sessions s
           LEFT JOIN participant_sessions ps ON ps.session_id = s.id
           WHERE s.id = ANY($1::uuid[])
           GROUP BY s.id`,
          [session_ids]
        );

        const full = capRows.filter(
          (r) => parseInt(r.booked) >= parseInt(r.capacity)
        );
        if (full.length > 0) {
          await db.query('ROLLBACK');
          return res.status(409).json({
            error: 'Einige Sessions sind ausgebucht.',
            full_sessions: full.map((r) => ({ id: r.id, title: r.title })),
          });
        }
      }

      // ── Alte Auswahlen ersetzen ──────────────────────────
      await db.query(
        'DELETE FROM participant_sessions WHERE participant_id = $1', [id]
      );
      await db.query(
        'DELETE FROM participant_food WHERE participant_id = $1', [id]
      );

      if (session_ids.length > 0) {
        const sessionValues = session_ids
          .map((sid, i) => `($1, $${i + 2})`)
          .join(', ');
        await db.query(
          `INSERT INTO participant_sessions (participant_id, session_id)
           VALUES ${sessionValues}`,
          [id, ...session_ids]
        );
      }

      if (food_option_ids.length > 0) {
        const foodValues = food_option_ids
          .map((fid, i) => `($1, $${i + 2})`)
          .join(', ');
        await db.query(
          `INSERT INTO participant_food (participant_id, food_option_id)
           VALUES ${foodValues}`,
          [id, ...food_option_ids]
        );
      }

      await db.query('COMMIT');
      res.json({ message: 'Auswahl erfolgreich gespeichert.' });
    } catch (err) {
      await db.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Serverfehler beim Speichern der Auswahl.' });
    }
  }
);

module.exports = router;
