/**
 * Bunny Storage + CDN Client
 *
 * Bunny Storage API:
 *   PUT  https://{region}.storage.bunnycdn.com/{zone}/{path}
 *   GET  https://{region}.storage.bunnycdn.com/{zone}/{path}
 *   DELETE ...
 *
 * CDN-URL (Pull Zone):
 *   https://{pullzone}.b-cdn.net/{path}
 */

const REGION    = process.env.BUNNY_STORAGE_REGION || 'storage'; // de, uk, ny, la, sg, ...
const ZONE      = process.env.BUNNY_STORAGE_ZONE;                // Storage Zone Name
const ACCESS_KEY = process.env.BUNNY_STORAGE_KEY;               // Storage Password
const CDN_BASE  = process.env.BUNNY_CDN_URL;                    // https://tagung.b-cdn.net

function storageUrl(path) {
  return `https://${REGION}.bunnycdn.com/${ZONE}/${path}`;
}

function cdnUrl(path) {
  const base = (CDN_BASE || '').replace(/\/$/, '');
  return `${base}/${path}`;
}

/**
 * Datei zu Bunny Storage hochladen.
 * @param {string} path       – Zielpfad in der Storage Zone, z.B. "qrcodes/abc123.png"
 * @param {Buffer|string} data – Dateiinhalt
 * @param {string} contentType – MIME-Type
 * @returns {string} CDN-URL der hochgeladenen Datei
 */
async function upload(path, data, contentType = 'application/octet-stream') {
  if (!ZONE || !ACCESS_KEY) {
    throw new Error('Bunny CDN nicht konfiguriert (BUNNY_STORAGE_ZONE / BUNNY_STORAGE_KEY fehlen).');
  }

  const url = storageUrl(path);
  const body = typeof data === 'string' ? Buffer.from(data) : data;

  const res = await fetch(url, {
    method:  'PUT',
    headers: {
      AccessKey:       ACCESS_KEY,
      'Content-Type':  contentType,
      'Content-Length': body.length.toString(),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Bunny Upload fehlgeschlagen (${res.status}): ${text}`);
  }

  return cdnUrl(path);
}

/**
 * Datei aus Bunny Storage löschen.
 */
async function remove(path) {
  if (!ZONE || !ACCESS_KEY) return;
  await fetch(storageUrl(path), {
    method:  'DELETE',
    headers: { AccessKey: ACCESS_KEY },
  });
}

/**
 * Prüfen ob eine Datei bereits existiert.
 * @returns {string|null} CDN-URL wenn vorhanden, sonst null
 */
async function exists(path) {
  if (!ZONE || !ACCESS_KEY) return null;
  const res = await fetch(storageUrl(path), {
    method:  'HEAD',
    headers: { AccessKey: ACCESS_KEY },
  });
  return res.ok ? cdnUrl(path) : null;
}

/**
 * QR-Code PNG-Buffer zu Bunny hochladen (mit Caching: Upload nur wenn nicht schon vorhanden).
 * @param {string} token  – Ticket-Token (UUID), wird als Dateiname verwendet
 * @param {Buffer} pngBuf – PNG-Buffer
 * @returns {string} CDN-URL
 */
async function uploadQrCode(token, pngBuf) {
  const path = `qrcodes/${token}.png`;

  // Bereits hochgeladen? CDN-URL direkt zurückgeben
  const cached = await exists(path);
  if (cached) return cached;

  return upload(path, pngBuf, 'image/png');
}

/**
 * Statisches Asset hochladen (z.B. E-Mail-Logo).
 */
async function uploadAsset(filename, data, contentType) {
  return upload(`assets/${filename}`, data, contentType);
}

module.exports = { upload, remove, exists, uploadQrCode, uploadAsset, cdnUrl };
