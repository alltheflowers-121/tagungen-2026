/**
 * Gibt das HTML für die Ticket-E-Mail zurück.
 * @param {object} params
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {string} params.company
 * @param {string} params.eventName
 * @param {string} params.eventDate      – z.B. "15. März 2025"
 * @param {string} params.eventLocation  – z.B. "Congresshalle Frankfurt"
 * @param {string} params.qrDataUrl      – base64 PNG data-URL
 * @param {string} params.token          – UUID (für Fußzeile)
 * @param {string[]} params.sessions     – Titel der gebuchten Sessions
 * @param {string[]} params.foodOptions  – Essenauswahl
 */
function ticketEmailHtml({
  firstName,
  lastName,
  company,
  eventName,
  eventDate,
  eventLocation,
  qrDataUrl,
  token,
  sessions = [],
  foodOptions = [],
}) {
  const sessionRows = sessions.length
    ? sessions.map((s) => `
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f0f0f0;">
            ◷ ${s}
          </td>
        </tr>`).join('')
    : `<tr><td style="padding:6px 0;font-size:14px;color:#888;">Keine Sessions gebucht</td></tr>`;

  const foodRows = foodOptions.length
    ? foodOptions.map((f) => `<span style="display:inline-block;background:#fff8ee;color:#b87a00;border:1px solid #f0d890;border-radius:4px;padding:3px 10px;font-size:13px;margin:2px 4px 2px 0;">${f}</span>`).join('')
    : `<span style="font-size:13px;color:#888;">Keine Essenauswahl</span>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Dein Ticket – ${eventName}</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f1;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f1;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0a0a0a;border-radius:12px 12px 0 0;padding:28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">
                      Tagungs<span style="color:#e8a020;">App</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#555;font-family:monospace;letter-spacing:0.1em;text-transform:uppercase;">
                      Eintrittskarte
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Amber stripe -->
          <tr>
            <td style="background:#e8a020;height:4px;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px;">

              <!-- Greeting -->
              <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0a0a0a;letter-spacing:-0.02em;">
                Hallo, ${firstName}! 👋
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">
                Deine Anmeldung für <strong>${eventName}</strong> ist bestätigt.
                Zeige den QR-Code am Einlass vor.
              </p>

              <!-- Event info -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fafafa;border:1px solid #eeeeee;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:11px;font-family:monospace;letter-spacing:0.1em;text-transform:uppercase;color:#aaa;padding-bottom:4px;">
                          Veranstaltung
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:17px;font-weight:700;color:#0a0a0a;padding-bottom:16px;">
                          ${eventName}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:13px;color:#555;padding-right:24px;">
                                📅 ${eventDate || '—'}
                              </td>
                              <td style="font-size:13px;color:#555;">
                                📍 ${eventLocation || '—'}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${company ? `
                      <tr>
                        <td style="font-size:13px;color:#888;padding-top:8px;">
                          🏢 ${company}
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- QR Code -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center"
                    style="background:#0a0a0a;border-radius:12px;padding:28px;">
                    <img
                      src="${qrDataUrl}"
                      width="200"
                      height="200"
                      alt="QR-Code Eintrittskarte"
                      style="display:block;border-radius:8px;"
                    />
                    <p style="margin:16px 0 0;font-size:11px;font-family:monospace;color:#555;letter-spacing:0.06em;">
                      ${token.slice(0, 8).toUpperCase()} ··· ${token.slice(-8).toUpperCase()}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Sessions -->
              <p style="margin:0 0 10px;font-size:12px;font-family:monospace;letter-spacing:0.08em;text-transform:uppercase;color:#aaa;">
                Gebuchte Sessions
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                ${sessionRows}
              </table>

              <!-- Food -->
              <p style="margin:0 0 10px;font-size:12px;font-family:monospace;letter-spacing:0.08em;text-transform:uppercase;color:#aaa;">
                Essenauswahl
              </p>
              <div style="margin-bottom:28px;">${foodRows}</div>

              <!-- CTA note -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fff8ee;border-left:3px solid #e8a020;border-radius:0 6px 6px 0;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;color:#7a5500;line-height:1.6;">
                      <strong>Hinweis:</strong> Bitte speichere diese E-Mail oder mache einen Screenshot des QR-Codes.
                      Das Ticket ist personalisiert und kann nur einmal verwendet werden.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0a0a0a;border-radius:0 0 12px 12px;padding:20px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#444;line-height:1.6;">
                    Diese E-Mail wurde automatisch von TagungsApp generiert.<br/>
                    Bei Fragen wende dich an das Organisationsteam.
                  </td>
                  <td align="right" style="font-size:11px;font-family:monospace;color:#333;">
                    TagungsApp · Admin
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

module.exports = { ticketEmailHtml };
