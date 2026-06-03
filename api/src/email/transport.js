const nodemailer = require('nodemailer');

let _transport = null;

function getTransport() {
  if (_transport) return _transport;

  _transport = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',   // true = Port 465, false = STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Für Gmail: 'smtp.gmail.com', port 587, secure false
    // App-Passwort unter: myaccount.google.com → Sicherheit → App-Passwörter
  });

  return _transport;
}

async function verifyConnection() {
  const transport = getTransport();
  await transport.verify();
}

module.exports = { getTransport, verifyConnection };
