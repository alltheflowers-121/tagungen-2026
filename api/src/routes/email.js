const express  = require('express');
const { param, validationResult } = require('express-validator');
const db       = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getTransport }    = require('../email/transport');
const { ticketEmailHtml } = require('../email/template');
const { getQrForEmail }   = require('../cdn/qr');

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}

// ── POST /api/email/ticket/:participantId ─────────────────────
// Ticket-E-Mail manuell an einen Teilnehmer senden
router.post(
  '/ticket/:participantId',
  requireAuth,
  requireAdmin,
  [param('participantId').isUUID()],
  validate,
  async (req, res) => {
    const { participantId } = req.params;

    try {
      // ── 1. Teilnehmer + Ticket + Auswahlen laden ────────────
      const { rows: pRows } = await db.query(
        `SELECT p.*,
                t.token,
                t.checked_in,
                t.issued_at,
                json_agg(DISTINCT s.title)   FILTER (WHERE s.title IS NOT NULL)  AS session_titles,
                json_agg(DISTINCT f.name)    FILTER (WHERE f.name  IS NOT NULL)  AS food_names
         FROM participants p
         LEFT JOIN tickets             t   ON t.participant_id = p.id
         LEFT JOIN participant_sessions ps ON ps.participant_id = p.id
         LEFT JOIN sessions             s  ON s.id = ps.session_id
         LEFT JOIN participant_food     pf ON pf.participant_id = p.id
         LEFT JOIN food_options         f  ON f.id = pf.food_option_id
         WHERE p.id = $1
         GROUP BY p.id, t.token, t.checked_in, t.issued_at`,
        [participantId]
      );

      if (pRows.length === 0) {
        return res.status(404).json({ error: 'Teilnehmer nicht gefunden.' });
      }

      const p = pRows[0];

      if (!p.token) {
        return res.status(422).json({ error: 'Kein Ticket für diesen Teilnehmer vorhanden.' });
      }

      // ── 2. QR-Code via CDN-Helper (Bunny wenn konfiguriert, sonst base64) ──
      const { url: qrDataUrl } = await getQrForEmail(p.token);

      // ── 3. E-Mail aufbauen & senden ─────────────────────────
      const transport = getTransport();

      const html = ticketEmailHtml({
        firstName:     p.first_name,
        lastName:      p.last_name,
        company:       p.company,
        eventName:     process.env.EVENT_NAME     || 'Unsere Tagung',
        eventDate:     process.env.EVENT_DATE     || '',
        eventLocation: process.env.EVENT_LOCATION || '',
        qrDataUrl,
        token:         p.token,
        sessions:      p.session_titles  ?? [],
        foodOptions:   p.food_names      ?? [],
      });

      await transport.sendMail({
        from:    `"${process.env.EMAIL_FROM_NAME || 'TagungsApp'}" <${process.env.SMTP_USER}>`,
        to:      `"${p.first_name} ${p.last_name}" <${p.email}>`,
        subject: `Dein Ticket – ${process.env.EVENT_NAME || 'Unsere Tagung'}`,
        html,
        // Text-Fallback für E-Mail-Clients ohne HTML
        text: [
          `Hallo ${p.first_name} ${p.last_name},`,
          '',
          `deine Anmeldung für ${process.env.EVENT_NAME || 'unsere Tagung'} ist bestätigt.`,
          `Dein Ticket-Token: ${p.token}`,
          '',
          `Zeige diesen Token beim Einlass vor.`,
        ].join('\n'),
      });

      // ── 4. Versandzeitpunkt in DB protokollieren ─────────────
      await db.query(
        `UPDATE tickets SET last_email_sent_at = NOW() WHERE participant_id = $1`,
        [participantId]
      );

      console.log(`[E-Mail] Ticket gesendet an ${p.email} (${p.first_name} ${p.last_name})`);

      res.json({
        message: `Ticket erfolgreich an ${p.email} gesendet.`,
        sent_to: p.email,
        participant: { id: p.id, name: `${p.first_name} ${p.last_name}` },
      });

    } catch (err) {
      console.error('E-Mail-Fehler:', err);

      // SMTP-Fehler verständlich zurückgeben
      if (err.responseCode) {
        return res.status(502).json({
          error: `SMTP-Fehler (${err.responseCode}): ${err.response}`,
        });
      }
      res.status(500).json({ error: 'Fehler beim E-Mail-Versand.' });
    }
  }
);

// ── POST /api/email/ticket-bulk ───────────────────────────────
// Tickets an mehrere (oder alle) Teilnehmende senden
router.post(
  '/ticket-bulk',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    // participant_ids: string[] | undefined (undefined = alle)
    const { participant_ids } = req.body;

    try {
      let query, params;
      if (participant_ids?.length) {
        query  = `SELECT id FROM participants WHERE id = ANY($1::uuid[])`;
        params = [participant_ids];
      } else {
        query  = `SELECT id FROM participants`;
        params = [];
      }

      const { rows } = await db.query(query, params);
      const ids = rows.map((r) => r.id);

      if (ids.length === 0) {
        return res.status(400).json({ error: 'Keine Teilnehmenden gefunden.' });
      }

      // Antwort sofort senden, Versand asynchron
      res.json({
        message: `Versand gestartet für ${ids.length} Teilnehmende. Fortschritt im Server-Log.`,
        total: ids.length,
      });

      // Sequenziell senden (kein Spam-Risiko, kein Race-Condition)
      let ok = 0, fail = 0;
      for (const id of ids) {
        try {
          await sendTicketInternal(id);
          ok++;
        } catch (e) {
          fail++;
          console.error(`[Bulk] Fehler bei ${id}:`, e.message);
        }
        // Kurze Pause zwischen Mails (SMTP-Throttling)
        await new Promise((r) => setTimeout(r, 300));
      }
      console.log(`[Bulk-Versand] Fertig: ${ok} OK, ${fail} Fehler`);
    } catch (err) {
      console.error(err);
      // Falls noch nicht geantwortet wurde
      if (!res.headersSent) res.status(500).json({ error: 'Bulk-Versand fehlgeschlagen.' });
    }
  }
);

// ── Interne Hilfsfunktion ─────────────────────────────────────
async function sendTicketInternal(participantId) {
  const { rows } = await db.query(
    `SELECT p.*,
            t.token,
            json_agg(DISTINCT s.title) FILTER (WHERE s.title IS NOT NULL) AS session_titles,
            json_agg(DISTINCT f.name)  FILTER (WHERE f.name  IS NOT NULL) AS food_names
     FROM participants p
     LEFT JOIN tickets             t  ON t.participant_id = p.id
     LEFT JOIN participant_sessions ps ON ps.participant_id = p.id
     LEFT JOIN sessions             s  ON s.id = ps.session_id
     LEFT JOIN participant_food     pf ON pf.participant_id = p.id
     LEFT JOIN food_options         f  ON f.id = pf.food_option_id
     WHERE p.id = $1
     GROUP BY p.id, t.token`,
    [participantId]
  );

  if (!rows[0]?.token) throw new Error('Kein Ticket vorhanden');
  const p = rows[0];

  const { url: qrDataUrl } = await getQrForEmail(p.token);

  const html = ticketEmailHtml({
    firstName: p.first_name, lastName: p.last_name, company: p.company,
    eventName: process.env.EVENT_NAME || 'Unsere Tagung',
    eventDate: process.env.EVENT_DATE || '',
    eventLocation: process.env.EVENT_LOCATION || '',
    qrDataUrl, token: p.token,
    sessions: p.session_titles ?? [], foodOptions: p.food_names ?? [],
  });

  await getTransport().sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || 'TagungsApp'}" <${process.env.SMTP_USER}>`,
    to:   `"${p.first_name} ${p.last_name}" <${p.email}>`,
    subject: `Dein Ticket – ${process.env.EVENT_NAME || 'Unsere Tagung'}`,
    html,
  });

  await db.query(
    `UPDATE tickets SET last_email_sent_at = NOW() WHERE participant_id = $1`,
    [participantId]
  );

  console.log(`[E-Mail] ✓ ${p.email}`);
}

module.exports = router;
