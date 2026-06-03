-- ============================================================
--  Tagungsapp – Auth-Schema (ergänzt schema.sql)
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'scanner', 'readonly');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  display_name  VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'readonly',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Auth-Sessions (getrennt von Konferenz-Sessions!)
CREATE TABLE auth_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,          -- 64-Byte Hex, im httpOnly-Cookie
  ip          INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '8 hours',
  revoked     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_auth_sessions_token   ON auth_sessions(token);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);

-- ── last_email_sent_at Spalte zu tickets hinzufügen ──────────
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ; (Passwort muss nach dem ersten Login geändert werden) ──
-- Passwort: "ChangeMe123!" – Hash mit bcrypt (cost 12) erzeugen:
--   node -e "const b=require('bcryptjs');b.hash('ChangeMe123!',12).then(console.log)"
-- Danach diesen INSERT mit dem echten Hash ausführen:
INSERT INTO users (email, display_name, password_hash, role) VALUES
  ('admin@tagung.de', 'Admin', '$REPLACE_WITH_BCRYPT_HASH', 'admin');

-- ── Rollenübersicht ───────────────────────────────────────────
-- admin    → alle Seiten, Nutzer verwalten, Daten schreiben
-- scanner  → nur Einlass (POST /api/tickets/checkin)
-- readonly → Übersicht, Teilnehmende & Sessions nur lesen
