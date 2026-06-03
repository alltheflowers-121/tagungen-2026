require('dotenv').config();
const express      = require('express');
const cookieParser = require('cookie-parser');
const db           = require('./db');

const authRouter         = require('./routes/auth');
const participantsRouter = require('./routes/participants');
const selectionsRouter   = require('./routes/selections');
const ticketsRouter      = require('./routes/tickets');
const emailRouter        = require('./routes/email');
const cdnRouter          = require('./routes/cdn');

const { requireAuth, requireAdmin, requireScanner, requireReadonly } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// CORS: nur Dashboard-Origin erlaubt (Cookies funktionieren nur same-origin oder mit credentials)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = process.env.DASHBOARD_ORIGIN || 'http://localhost:5173';
  if (origin === allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Logging
app.use((req, _res, next) => {
  const user = req.user ? `[${req.user.email}]` : '[anon]';
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${user}`);
  next();
});

// ── Auth-Routen (öffentlich: nur /login) ──────────────────────
app.use('/auth', authRouter);

// ── Geschützte API-Routen ─────────────────────────────────────
app.use('/api/participants',
  requireAuth, requireReadonly,
  participantsRouter
);

app.use('/api',
  requireAuth, requireReadonly,
  selectionsRouter
);

// Tickets: QR lesen = readonly; Check-in = scanner+
app.use('/api/tickets', requireAuth, (req, res, next) => {
  if (req.method === 'POST' && req.path === '/checkin') {
    return requireScanner(req, res, next);
  }
  return requireReadonly(req, res, next);
}, ticketsRouter);

// E-Mail: nur Admin
app.use('/api/email', requireAuth, requireAdmin, emailRouter);

// CDN-Verwaltung: nur Admin
app.use('/api/cdn', requireAuth, requireAdmin, cdnRouter);

// ── Health-Check (öffentlich) ──────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── 404 & Error-Handler ────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Endpunkt nicht gefunden.' }));
app.use((err, _req, res, _next) => {
  console.error('Unbehandelter Fehler:', err);
  res.status(500).json({ error: 'Interner Serverfehler.' });
});

// ── Server starten ─────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\nTagungsapp-API → http://localhost:${PORT}`);

  // SMTP-Verbindung beim Start prüfen
  try {
    const { verifyConnection } = require('./email/transport');
    await verifyConnection();
    console.log('✓ SMTP-Verbindung OK');
  } catch (e) {
    console.warn(`⚠ SMTP nicht erreichbar: ${e.message}`);
  }

  console.log('\n E-Mail:');
  console.log('  POST   /api/email/ticket/:participantId   → Einzelversand');
  console.log('  POST   /api/email/ticket-bulk             → Massenversand');
  console.log('\n Auth:');
  console.log('  POST   /auth/login');
  console.log('  POST   /auth/logout');
  console.log('  GET    /auth/me');
  console.log('  GET    /auth/sessions');
  console.log('  POST   /auth/change-password');
  console.log('\n Nutzerverwaltung (Admin):');
  console.log('  GET    /auth/users');
  console.log('  POST   /auth/users');
  console.log('  PATCH  /auth/users/:id');
  console.log('  DELETE /auth/users/:id');
  console.log('  POST   /auth/users/:id/reset-password');
  console.log('\n API (geschützt):');
  console.log('  GET    /api/participants       readonly+');
  console.log('  POST   /api/participants       admin');
  console.log('  PUT    /api/participants/:id/selections  admin');
  console.log('  GET    /api/sessions           readonly+');
  console.log('  GET    /api/tickets/:token     readonly+');
  console.log('  POST   /api/tickets/checkin    scanner+');
});
