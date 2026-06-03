-- ============================================================
--  schema_event.sql · feat/model-kbw
--  KBW Jahrestagung – event-spezifische Tabellen
--
--  Einzuspielen NACH schema.sql (Core) und schema_auth.sql:
--    psql -d tagungsapp -f schema.sql
--    psql -d tagungsapp -f schema_auth.sql
--    psql -d tagungsapp -f schema_event.sql
-- ============================================================

-- ── Teilnehmende (KBW-spezifisch erweitert) ──────────────────
--
-- Ersetzt die Core-participants-Tabelle nicht, sondern erweitert
-- sie um event-spezifische Felder per ALTER TABLE.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS reference_number VARCHAR(20)  UNIQUE,
  ADD COLUMN IF NOT EXISTS organization     VARCHAR(200),
  ADD COLUMN IF NOT EXISTS lunch_package    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meal_preference  VARCHAR(20)   -- fleisch | vegetarisch | vegan
    CHECK (meal_preference IN ('fleisch', 'vegetarisch', 'vegan'));

-- Index für schnellen Lookup per Bezugsnummer am Einlass
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_reference
  ON participants(reference_number)
  WHERE reference_number IS NOT NULL;

-- ── Sequenz für Bezugsnummer-Generierung ─────────────────────
CREATE SEQUENCE IF NOT EXISTS reference_number_seq
  START WITH 1 INCREMENT BY 1 MINVALUE 1;

-- Funktion: nächste Bezugsnummer im Format BZ-2026-001
CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS TEXT AS $$
  SELECT 'BZ-2026-' || LPAD(nextval('reference_number_seq')::TEXT, 3, '0');
$$ LANGUAGE sql;

-- Trigger: Bezugsnummer automatisch beim Anlegen setzen
CREATE OR REPLACE FUNCTION set_reference_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := generate_reference_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_reference_number ON participants;
CREATE TRIGGER trg_set_reference_number
  BEFORE INSERT ON participants
  FOR EACH ROW EXECUTE FUNCTION set_reference_number();

-- ── Fachforen ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fachforen (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id VARCHAR(20)  NOT NULL UNIQUE,   -- z.B. "forum-1" (aus event_config.json)
  title     VARCHAR(100) NOT NULL,
  subtitle  VARCHAR(200),
  room      VARCHAR(50),
  capacity  INT NOT NULL DEFAULT 100,
  sort_order INT NOT NULL DEFAULT 0
);

-- Auswahl: Teilnehmer → Fachforum (genau 1)
CREATE TABLE IF NOT EXISTS participant_fachforum (
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  fachforum_id   UUID NOT NULL REFERENCES fachforen(id)   ON DELETE CASCADE,
  selected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (participant_id)  -- nur 1 Forum pro Person
);

-- ── Programmpunkte ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programmpunkte (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id VARCHAR(20)  NOT NULL UNIQUE,
  title     VARCHAR(100) NOT NULL,
  time_label VARCHAR(10),                    -- z.B. "18:00"
  capacity  INT,                             -- NULL = unbegrenzt
  sort_order INT NOT NULL DEFAULT 0
);

-- Auswahl: Teilnehmer → Programmpunkte (bis 5)
CREATE TABLE IF NOT EXISTS participant_programmpunkte (
  participant_id   UUID NOT NULL REFERENCES participants(id)    ON DELETE CASCADE,
  programmpunkt_id UUID NOT NULL REFERENCES programmpunkte(id) ON DELETE CASCADE,
  selected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (participant_id, programmpunkt_id)
);

-- Constraint: max. 5 Programmpunkte pro Teilnehmer
CREATE OR REPLACE FUNCTION check_max_programmpunkte()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM participant_programmpunkte
    WHERE participant_id = NEW.participant_id
  ) >= 5 THEN
    RAISE EXCEPTION 'Maximal 5 Programmpunkte pro Teilnehmer erlaubt.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_max_programmpunkte ON participant_programmpunkte;
CREATE TRIGGER trg_max_programmpunkte
  BEFORE INSERT ON participant_programmpunkte
  FOR EACH ROW EXECUTE FUNCTION check_max_programmpunkte();

-- ── Kapazitätsprüfung für Fachforen ──────────────────────────
CREATE OR REPLACE FUNCTION check_fachforum_capacity()
RETURNS TRIGGER AS $$
DECLARE
  cap  INT;
  cnt  INT;
BEGIN
  SELECT f.capacity INTO cap
  FROM fachforen f WHERE f.id = NEW.fachforum_id;

  SELECT COUNT(*) INTO cnt
  FROM participant_fachforum WHERE fachforum_id = NEW.fachforum_id;

  IF cnt >= cap THEN
    RAISE EXCEPTION 'Fachforum ist ausgebucht (Kapazität: %).',  cap;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fachforum_capacity ON participant_fachforum;
CREATE TRIGGER trg_fachforum_capacity
  BEFORE INSERT ON participant_fachforum
  FOR EACH ROW EXECUTE FUNCTION check_fachforum_capacity();

-- ── View: Teilnehmer-Vollprofil ───────────────────────────────
CREATE OR REPLACE VIEW v_participant_full AS
SELECT
  p.id,
  p.reference_number,
  p.first_name,
  p.last_name,
  p.first_name || ' ' || p.last_name AS full_name,
  p.email,
  p.organization,
  p.meal_preference,
  p.lunch_package,
  p.created_at,
  t.token,
  t.checked_in,
  t.checked_in_at,
  t.last_email_sent_at,
  f.title        AS fachforum_title,
  f.subtitle     AS fachforum_subtitle,
  f.room         AS fachforum_room,
  f.option_id    AS fachforum_option_id,
  json_agg(
    jsonb_build_object(
      'id',         pp.id,
      'option_id',  pp.option_id,
      'title',      pp.title,
      'time_label', pp.time_label
    ) ORDER BY pp.sort_order
  ) FILTER (WHERE pp.id IS NOT NULL) AS programmpunkte
FROM participants p
LEFT JOIN tickets                  t   ON t.participant_id  = p.id
LEFT JOIN participant_fachforum    pf  ON pf.participant_id = p.id
LEFT JOIN fachforen                f   ON f.id              = pf.fachforum_id
LEFT JOIN participant_programmpunkte ppk ON ppk.participant_id = p.id
LEFT JOIN programmpunkte           pp  ON pp.id             = ppk.programmpunkt_id
GROUP BY p.id, t.token, t.checked_in, t.checked_in_at, t.last_email_sent_at,
         f.title, f.subtitle, f.room, f.option_id;

-- ── Seed-Daten aus event_config.json ─────────────────────────
INSERT INTO fachforen (option_id, title, subtitle, room, capacity, sort_order) VALUES
  ('forum-1', 'Fachforum 1', 'Digitale Bildung',         'Saal A', 120, 1),
  ('forum-2', 'Fachforum 2', 'Führung und Organisation', 'Saal B', 100, 2),
  ('forum-3', 'Fachforum 3', 'Gesundheit und Arbeit',    'Saal C',  80, 3),
  ('forum-4', 'Fachforum 4', 'KI und Verwaltung',        'Saal D',  90, 4)
ON CONFLICT (option_id) DO UPDATE SET
  title     = EXCLUDED.title,
  subtitle  = EXCLUDED.subtitle,
  room      = EXCLUDED.room,
  capacity  = EXCLUDED.capacity;

INSERT INTO programmpunkte (option_id, title, time_label, capacity, sort_order) VALUES
  ('prog-1', 'Abendempfang',    '18:00', NULL, 1),
  ('prog-2', 'Stadtführung',    '14:00',   40, 2),
  ('prog-3', 'Netzwerk-Dinner', '19:30',   80, 3),
  ('prog-4', 'Kulturprogramm',  '16:00',   60, 4),
  ('prog-5', 'Abschlussrunde',  '17:00', NULL, 5)
ON CONFLICT (option_id) DO UPDATE SET
  title      = EXCLUDED.title,
  time_label = EXCLUDED.time_label,
  capacity   = EXCLUDED.capacity;
