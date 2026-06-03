/**
 * QR-Code-Generierung mit optionalem Bunny-CDN-Caching.
 *
 * Strategie:
 *   1. Bunny konfiguriert → QR als PNG-Buffer erzeugen, zu Bunny hochladen,
 *      CDN-URL zurückgeben (beim nächsten Aufruf direkt aus CDN).
 *   2. Bunny nicht konfiguriert → base64 Data-URL zurückgeben (Fallback).
 */

const QRCode = require('qrcode');
const bunny  = require('./bunny');

const QR_OPTS = {
  width:  400,
  margin: 2,
  color:  { dark: '#0a0a0a', light: '#ffffff' },
};

/**
 * @param {string} token  – Ticket-UUID
 * @returns {{ url: string, type: 'cdn'|'dataurl' }}
 */
async function getQrUrl(token) {
  const content = `${process.env.APP_BASE_URL || 'https://tagung.example.com'}/checkin/${token}`;
  const bunnyConfigured = !!(process.env.BUNNY_STORAGE_ZONE && process.env.BUNNY_STORAGE_KEY);

  if (bunnyConfigured) {
    // Bereits gecacht?
    const cached = await bunny.exists(`qrcodes/${token}.png`);
    if (cached) return { url: cached, type: 'cdn' };

    // Neu generieren & hochladen
    const pngBuffer = await QRCode.toBuffer(content, { ...QR_OPTS, type: 'png' });
    const cdnUrl    = await bunny.uploadQrCode(token, pngBuffer);
    return { url: cdnUrl, type: 'cdn' };
  }

  // Fallback: base64 Data-URL
  const dataUrl = await QRCode.toDataURL(content, QR_OPTS);
  return { url: dataUrl, type: 'dataurl' };
}

/**
 * Für E-Mail-Templates: gibt immer eine einbettbare URL zurück.
 * Bei CDN → externe URL (img src).
 * Bei Fallback → base64 Data-URL (inline).
 */
async function getQrForEmail(token) {
  return getQrUrl(token);
}

module.exports = { getQrUrl, getQrForEmail };
