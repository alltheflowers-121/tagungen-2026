-- ============================================================
--  Tagungsapp – Datenbankschema
-- ============================================================

-- Teilnehmende
CREATE TABLE participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  company     VARCHAR(200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verfügbare Sessions (Vorträge, Workshops, …)
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  location    VARCHAR(100),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  capacity    INT NOT NULL DEFAULT 50
);

-- Essenoptionen
CREATE TABLE food_options (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  VARCHAR(100) NOT NULL,   -- z.B. "Vegetarisch", "Vegan", "Standard"
  day   DATE                     -- NULL = gilt für alle Tage
);

-- Auswahl der Teilnehmenden: Sessions
CREATE TABLE participant_sessions (
  participant_id  UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (participant_id, session_id)
);

-- Auswahl der Teilnehmenden: Essen
CREATE TABLE participant_food (
  participant_id   UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  food_option_id   UUID NOT NULL REFERENCES food_options(id) ON DELETE CASCADE,
  PRIMARY KEY (participant_id, food_option_id)
);

-- Tickets (mit QR-Token)
CREATE TABLE tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL UNIQUE REFERENCES participants(id) ON DELETE CASCADE,
  token           UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),  -- steht im QR-Code
  checked_in      BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at   TIMESTAMPTZ,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für schnelles Token-Lookup beim Scan
CREATE INDEX idx_tickets_token ON tickets(token);
