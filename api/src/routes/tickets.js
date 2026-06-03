const express  = require('express');
const { param, validationResult } = require('express-validator');
const QRCode   = require('qrcode');
const db       = require('../db');
const { getQrUrl } = require('../cdn/qr');

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}

// Einfacher API-Key-Schutz für den Scanner-Endpunkt
function requireScannerKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!process.env.CHECKIN_API_KEY || key === process.env.CHECKIN_API_KEY) {
    return next();
  }
  res.status(401).json({ error: 'Ungültiger API-Key.' });
}

// ── GET /tickets/:token ──────────────────────────────────────
// QR-Code als PNG-Bild ausgeben
router.get(
  '/:token',
  [param('token').isUUID().withMessage('Ungültiges Token-Format')],
  validate,
  async (req, res) => {
    const { token } = req.params;
    const format = req.query.format || 'png'; // ?format=png|svg|json

    try {
      const { rows } = await db.query(
        `SELECT t.token, t.checked_in, t.issued_at,
                p.first_name, p.last_name, p.email, p.company
         FROM tickets t
         JOIN participants p ON p.id = t.participant_id
         WHERE t.token = $1`,
        [token]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Ticket nicht gefunden.' });
      }

      const ticket = rows[0];

      // QR-Code-Inhalt: Token-URL
      const qrContent = `${process.env.APP_BASE_URL || 'https://tagung.example.com'}/checkin/${token}`;

      if (format === 'json') {
        // CDN-URL wenn Bunny konfiguriert, sonst base64 Data-URL
        const { url: qrUrl, type: qrType } = await getQrUrl(token);
        return res.json({
          token,
          participant: {
            name: `${ticket.first_name} ${ticket.last_name}`,
            email: ticket.email,
            company: ticket.company,
          },
          checked_in: ticket.checked_in,
          issued_at:  ticket.issued_at,
          qr_cdn_url:  qrType === 'cdn'     ? qrUrl : null,
          qr_data_url: qrType === 'dataurl' ? qrUrl : null,
        });
      }

      if (format === 'svg') {
        const svg = await QRCode.toString(qrContent, { type: 'svg', margin: 2 });
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(svg);
      }

      // Standard: PNG (direkt streamen, kein CDN-Upload nötig)
      res.setHeader('Content-Type', 'image/png');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="ticket-${token.slice(0, 8)}.png"`
      );
      await QRCode.toFileStream(res, qrContent, {
        width: 300, margin: 2,
        color: { dark: '#0a0a0a', light: '#ffffff' },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Fehler bei der QR-Code-Generierung.' });
    }
  }
);

// ── POST /checkin ────────────────────────────────────────────
// QR-Code beim Einlass scannen & validieren
router.post('/checkin', requireScannerKey, async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token fehlt im Request-Body.' });
  }

  try {
    // Ticket mit Teilnehmer-Infos laden
    const { rows } = await db.query(
      `SELECT t.id, t.checked_in, t.checked_in_at,
              p.first_name, p.last_name, p.email, p.company
       FROM tickets t
       JOIN participants p ON p.id = t.participant_id
       WHERE t.token = $1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        valid: false,
        error: 'Unbekanntes Token – Ticket nicht gefunden.',
      });
    }

    const ticket = rows[0];

    // Bereits eingecheckt?
    if (ticket.checked_in) {
      return res.status(409).json({
        valid: false,
        already_checked_in: true,
        checked_in_at: ticket.checked_in_at,
        participant: {
          name: `${ticket.first_name} ${ticket.last_name}`,
          email: ticket.email,
        },
        error: 'Dieses Ticket wurde bereits verwendet.',
      });
    }

    // Check-in durchführen
    await db.query(
      `UPDATE tickets
       SET checked_in = TRUE, checked_in_at = NOW()
       WHERE id = $1`,
      [ticket.id]
    );

    res.json({
      valid: true,
      participant: {
        name: `${ticket.first_name} ${ticket.last_name}`,
        email: ticket.email,
        company: ticket.company,
      },
      checked_in_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler beim Check-in.' });
  }
});

module.exports = router;
