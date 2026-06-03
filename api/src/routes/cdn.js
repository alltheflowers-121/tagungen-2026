const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const bunny = require('../cdn/bunny');

const router = express.Router();

const BUNNY_API_KEY  = process.env.BUNNY_API_KEY;   // Account-API-Key (nicht Storage-Key!)
const PULL_ZONE_ID   = process.env.BUNNY_PULL_ZONE_ID;

// ── GET /api/cdn/status ──────────────────────────────────────
// Konfigurationsstatus des CDN prüfen
router.get('/status', requireAuth, requireAdmin, (_req, res) => {
  const configured = !!(
    process.env.BUNNY_STORAGE_ZONE &&
    process.env.BUNNY_STORAGE_KEY  &&
    process.env.BUNNY_CDN_URL
  );
  res.json({
    configured,
    storage_zone:   process.env.BUNNY_STORAGE_ZONE || null,
    cdn_url:        process.env.BUNNY_CDN_URL       || null,
    pull_zone_id:   PULL_ZONE_ID                    || null,
    purge_api_key:  BUNNY_API_KEY ? '✓ gesetzt' : '✗ fehlt',
  });
});

// ── DELETE /api/cdn/qrcode/:token ────────────────────────────
// Einzelnen QR-Code aus dem CDN löschen (z.B. nach Ticket-Invalidierung)
router.delete('/qrcode/:token', requireAuth, requireAdmin, async (req, res) => {
  const { token } = req.params;
  try {
    await bunny.remove(`qrcodes/${token}.png`);
    res.json({ message: `QR-Code ${token} aus Bunny Storage gelöscht.` });
  } catch (err) {
    res.status(500).json({ error: `Löschen fehlgeschlagen: ${err.message}` });
  }
});

// ── POST /api/cdn/purge ──────────────────────────────────────
// Pull-Zone-Cache leeren (gesamte Zone oder einzelne URL)
router.post('/purge', requireAuth, requireAdmin, async (req, res) => {
  if (!BUNNY_API_KEY || !PULL_ZONE_ID) {
    return res.status(422).json({
      error: 'BUNNY_API_KEY und BUNNY_PULL_ZONE_ID müssen in .env gesetzt sein.',
    });
  }

  const { url } = req.body; // optional: spezifische URL, sonst gesamte Zone

  try {
    let endpoint, body;
    if (url) {
      // Einzelne URL purgen
      endpoint = `https://api.bunny.net/purge?url=${encodeURIComponent(url)}&async=false`;
      body = undefined;
    } else {
      // Gesamte Pull Zone purgen
      endpoint = `https://api.bunny.net/pullzone/${PULL_ZONE_ID}/purgeCache`;
      body = '{}';
    }

    const r = await fetch(endpoint, {
      method:  'POST',
      headers: {
        AccessKey:      BUNNY_API_KEY,
        'Content-Type': 'application/json',
      },
      ...(body ? { body } : {}),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: `Bunny Purge fehlgeschlagen: ${text}` });
    }

    res.json({
      message: url
        ? `Cache für ${url} geleert.`
        : `Gesamter Cache der Pull Zone ${PULL_ZONE_ID} geleert.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/cdn/qrcode/:token/upload ───────────────────────
// QR-Code manuell (neu) zu Bunny hochladen / überschreiben
router.post('/qrcode/:token/upload', requireAuth, requireAdmin, async (req, res) => {
  const { token } = req.params;
  const { getQrUrl } = require('../cdn/qr');

  // Bestehende Datei erst löschen, damit kein Cache-Hit entsteht
  try { await bunny.remove(`qrcodes/${token}.png`); } catch (_) { /* ignorieren */ }

  try {
    const { url } = await getQrUrl(token);
    res.json({ message: 'QR-Code hochgeladen.', cdn_url: url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
