# Tagungsapp · KBW e.V.

Digitale Teilnehmerverwaltung, QR-Eintrittskarten und Admin-Dashboard für Tagungen des Kommunalen Bildungswerks e.V.

**Repository:** https://github.com/KBW-eV/bunny-script-standalone-tickets-v2

---

## Projektstruktur

```
bunny-script-standalone-tickets-v2/
│
├── static/           ← GitHub Pages Prototyp (kein Build, läuft im Browser)
├── api/              ← Node.js / Express REST-API
├── dashboard/        ← React Admin-Dashboard (Vite)
├── configs/          ← Generierte event_config.json für alle 21 Tagungen
├── templates/        ← Vorlagen + Checkliste für neue Events
├── generate-configs.js  ← Erzeugt alle Configs neu aus einer Quelle
├── setup-branches.sh    ← Legt alle 21 Git-Branches automatisch an
├── .gitignore
└── README.md
```

---

## Setup (einmalig)

```bash
git clone https://github.com/KBW-eV/bunny-script-standalone-tickets-v2.git
cd bunny-script-standalone-tickets-v2

# Alle 21 Event-Branches anlegen
bash setup-branches.sh

# Alles pushen
git push origin --all
```

---

## Branch-Strategie

```
main
│   Core-Code: API, Auth, CDN, Email, Dashboard-Shell
│   Wird NIE event-spezifisch verändert
│
├── feat/model-personaltage            → personaltage.kbw.de
├── feat/model-auslaenderrecht         → auslaenderrecht.kbw.de
├── feat/model-beamtenrecht            → beamtenrecht.kbw.de
├── feat/model-betreuungsrecht         → betreuungsrecht.kbw.de
├── feat/model-datenschutz             → datenschutz.kbw.de
├── feat/model-fuehrungstage           → fuehrungstage.kbw.de
├── feat/model-gemeinnuetzigkeitsrecht → gemeinnuetzigkeitsrecht.kbw.de
├── feat/model-gleichstellung          → gleichstellung.kbw.de
├── feat/model-insolvenzrecht          → insolvenzrecht.kbw.de
├── feat/model-jugendhilfe             → jugendhilfe.kbw.de
├── feat/model-kindesunterhalt         → kindesunterhalt.kbw.de
├── feat/model-lohnpfaendung           → lohnpfaendung.kbw.de
├── feat/model-oeffentliche-finanzen   → oeffentliche-finanzen.kbw.de
├── feat/model-personalvertretungsrecht→ personalvertretungsrecht.kbw.de
├── feat/model-sozialrecht-sgb-ix      → sozialrecht-sgb-ix.kbw.de
├── feat/model-sozialrecht-sgb-xii     → sozialrecht-sgb-xii.kbw.de
├── feat/model-staatsangehoerigkeitsrecht → staatsangehoerigkeitsrecht.kbw.de
├── feat/model-steuerrecht             → steuerrecht.kbw.de
├── feat/model-vollstreckungsrecht     → vollstreckungsrecht.kbw.de
├── feat/model-vormundschaft           → vormundschaft.kbw.de
└── feat/model-waffenrecht             → waffenrecht.kbw.de
```

### Neues Event anlegen
```bash
git checkout main
git checkout -b feat/model-EVENTNAME
cp templates/event_config.TEMPLATE.json api/event_config.json
cp templates/config.event.TEMPLATE.js   static/config/event.js
# Werte anpassen → committen → pushen → deployen
```

---

## Event deployen

```bash
git checkout feat/model-personaltage

cd dashboard
cp .env.example .env
# BUNNY_STORAGE_KEY + BUNNY_API_KEY in .env eintragen

npm install
node deploy.js --dry-run   # erst testen
node deploy.js             # deployen → personaltage.kbw.de live
```

---

## Datenmodell

### Core-Tabellen (`schema.sql`) · Branch: `main`

```
participants          Basisregistrierung
├── id                UUID PK
├── first_name        VARCHAR
├── last_name         VARCHAR
├── email             VARCHAR UNIQUE
└── created_at        TIMESTAMPTZ

tickets               QR-Eintrittskarte (1:1 zu Teilnehmer)
├── id                UUID PK
├── participant_id    UUID FK UNIQUE
├── token             UUID UNIQUE  ← im QR-Code
├── checked_in        BOOLEAN
├── checked_in_at     TIMESTAMPTZ
└── last_email_sent_at TIMESTAMPTZ

sessions / food_options / participant_sessions / participant_food
```

### Auth-Tabellen (`schema_auth.sql`) · Branch: `main`

```
users                 Dashboard-Konten
├── role              ENUM(admin, scanner, readonly)
└── password_hash     bcrypt cost 12

auth_sessions         httpOnly-Cookie-Sessions (8h)
├── token             64-Byte Hex
└── expires_at        TIMESTAMPTZ
```

### Event-Tabellen (`schema_event.sql`) · Branch: `feat/model-*`

```
participants (ERWEITERT)
├── reference_number  VARCHAR  → auto: PT-2026-001
├── organization      VARCHAR
├── meal_preference   ENUM(fleisch, vegetarisch, vegan)
└── lunch_package     BOOLEAN

fachforen + programmpunkte + Verknüpfungstabellen
v_participant_full   VIEW (Vollprofil)
```

---

## Rollen

| Bereich              | admin | scanner | readonly |
|----------------------|:-----:|:-------:|:--------:|
| Dashboard Übersicht  | ✓     | ✓       | ✓        |
| Teilnehmende lesen   | ✓     | –       | ✓        |
| Registrieren         | ✓     | –       | –        |
| QR-Code abrufen      | ✓     | –       | ✓        |
| Ticket-E-Mail        | ✓     | –       | –        |
| Einlass / Check-in   | ✓     | ✓       | –        |
| Nutzerverwaltung     | ✓     | –       | –        |

---

## Technologien

| Bereich   | Stack                                         |
|-----------|-----------------------------------------------|
| API       | Node.js, Express, PostgreSQL, bcryptjs        |
| Dashboard | React 18, Vite, Recharts                      |
| Static    | Vanilla JS ES-Module, kein Build-Schritt      |
| CDN       | Bunny CDN (Storage + Pull Zone pro Event)     |
| E-Mail    | Nodemailer, SMTP / Gmail                      |
| Auth      | httpOnly Session-Cookie, 8h                   |
| QR-Code   | qrcode (npm), PNG/SVG/Base64                  |
| Fonts     | Source Sans 3 Variable, Bootstrap Icons       |

---

*KBW e.V. · Kommunales Bildungswerk · kbw.de*
